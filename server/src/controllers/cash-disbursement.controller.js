const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Cash } = require('../database/models/Cash')
const { Revolving } = require('../database/models/Revolving')
const { Budget } = require('../database/models/Budget')
const SQL = new SQLQueryBuilder()

const wrapRow = (row, model) => {
  if (!row || !model?.cols) return row
  const reverse = {}
  for (const [key, dbCol] of Object.entries(model.cols)) {
    if (dbCol !== key) reverse[dbCol] = key
  }
  return new Proxy(row, {
    get(target, prop, receiver) {
      if (prop in target) return Reflect.get(target, prop, receiver)
      if (typeof prop === 'string' && reverse[prop] !== undefined) return target[reverse[prop]]
      return undefined
    },
  })
}

// ==========================================
// HELPER UTILITIES
// ==========================================

const parseNum = (val, defaultVal = 0) => {
  if (val === null || val === undefined) return defaultVal
  const parsed = parseFloat(val)
  return isNaN(parsed) ? defaultVal : parsed
}

/**
 * Transaction() expects an array of { sql, values }, but the query builder's
 * .build() returns { sql, bindings }. This adapts one to the other.
 */
const toTxQuery = ({ sql, bindings }) => ({ sql, values: bindings })

/**
 * A cash voucher may back at most 2 cash_disbursement rows
 * (e.g. an issue row + one reimbursement row). Prevents runaway
 * duplicate rows against the same voucher number.
 */
const checkCashVoucherLimit = async (cashVoucher) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .select([Cash.Disbursement.cols.id])
    .where(Cash.Disbursement.cols.cash_voucher, cashVoucher)
    .build()
  const rows = await Query(sql, bindings)
  return rows.length
}

const getCashDisbursementById = async (id) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .select(Cash.Disbursement.select)
    .where(Cash.Disbursement.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Cash.Disbursement)
}

const getRevolvingFundById = async (id) => {
  const { sql, bindings } = SQL.model(Revolving.Fund)
    .select(Revolving.Fund.select)
    .where(Revolving.Fund.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Revolving.Fund)
}

const getBudgetById = async (id) => {
  const { sql, bindings } = SQL.model(Budget.Budget)
    .select(Budget.Budget.select)
    .where(Budget.Budget.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Budget.Budget)
}

/**
 * cash_disbursement_activity.cda_particulars is a free-text STRING(300)
 * column with no FK — unlike cash_disbursement.cd_particulars, which is an
 * FK integer to master_particulars.mpt_id. Every activity-log call site
 * only has the id on hand, so this resolves it to master_particulars.mpt_name
 * before insert. mpt_status (ACTIVE/INACTIVE/DELETED) is intentionally not
 * filtered on here — an activity log should keep the historical label even
 * if the particulars entry is later deactivated or soft-deleted.
 */
const getParticularsNameById = async (particularsId) => {
  const rows = await Query(`SELECT mpt_name FROM master_particulars WHERE mpt_id = ?`, [
    particularsId,
  ])
  return rows[0]?.mpt_name || null
}

/**
 * Recomputes a cash_disbursement row's outstanding amount and status
 * from its issued/returned/expended totals.
 */
const computeCdStatus = (issued, returned, expended) => {
  const outstanding = Math.max(0, parseNum(issued) - parseNum(returned) - parseNum(expended))
  const status = outstanding === 0 ? 'LIQUIDATED' : 'UNLIQUIDATED'
  return { outstanding, status }
}

/**
 * Recomputes a revolving_fund's status from its liquidated total vs total_fund.
 * Note: v2's revolving_fund has no rf_unliquidated column — "unliquidated"
 * is always issued - liquidated, computed on read, never stored.
 * A fund already reported/CLOSED (see closed_revolving_fund) is left alone
 * here; only OPEN / ON REVIEW / CLEARED are managed by disbursement activity.
 */
const computeRfStatus = (currentStatus, liquidated, totalFund) => {
  if (currentStatus === 'CLOSED' || currentStatus === 'RETURN') return currentStatus
  if (parseNum(liquidated) >= parseNum(totalFund) && parseNum(totalFund) > 0) return 'CLEARED'
  return 'ON REVIEW'
}

/**
 * Builds the budget update + budget_history insert as Transaction-ready
 * query objects, WITHOUT executing them. The caller must have already
 * fetched budgetRow (e.g. via getBudgetById) so the previous amount is known.
 *
 * @param {object} budgetRow - row previously fetched via getBudgetById
 * @param {number} delta - positive to credit (increase), negative to debit (decrease)
 * @param {number} departmentId
 * @param {number} userId
 * @param {string} [remarks]
 * @returns {{sql:string, values:Array}[]} two query objects: [budgetUpdate, historyInsert]
 */
const buildBudgetChangeQueries = (budgetRow, delta, departmentId, userId, remarks) => {
  const previousAmount = parseNum(budgetRow[Budget.Budget.cols.amount])
  const newAmount = previousAmount + delta

  const updateQuery = SQL.model(Budget.Budget)
    .update({ [Budget.Budget.cols.amount]: newAmount })
    .where(Budget.Budget.pk, budgetRow[Budget.Budget.cols.id])
    .build()

  const historyQuery = SQL.model(Budget.History)
    .insert({
      [Budget.History.cols.budget_id]: budgetRow[Budget.Budget.cols.id],
      [Budget.History.cols.amount]: Math.abs(delta),
      [Budget.History.cols.previous_amount]: previousAmount,
      [Budget.History.cols.new_amount]: newAmount,
      [Budget.History.cols.remarks]: remarks || null,
      [Budget.History.cols.department_id]: departmentId,
      [Budget.History.cols.type]: budgetRow[Budget.Budget.cols.type],
      [Budget.History.cols.date]: new Date(),
      [Budget.History.cols.created_by]: userId,
    })
    .build()

  return [toTxQuery(updateQuery), toTxQuery(historyQuery)]
}

const buildCdActivityInsert = (cashDisbursementId, amount, remarks, particulars) => {
  const query = SQL.model(Cash.DisbursementActivity)
    .insert({
      [Cash.DisbursementActivity.cols.cash_disbursement_id]: cashDisbursementId,
      [Cash.DisbursementActivity.cols.amount]: amount,
      [Cash.DisbursementActivity.cols.remarks]: remarks,
      [Cash.DisbursementActivity.cols.particulars]: particulars,
    })
    .build()
  return toTxQuery(query)
}

const buildRfActivityInsert = (revolvingFundId, remarks, userId) => {
  const query = SQL.model(Revolving.FundActivity)
    .insert({
      [Revolving.FundActivity.cols.revolving_fund_id]: revolvingFundId,
      [Revolving.FundActivity.cols.remarks]: remarks,
      [Revolving.FundActivity.cols.user_id]: userId,
    })
    .build()
  return toTxQuery(query)
}

const buildRfUpdate = (revolvingFundId, updateData) => {
  const query = SQL.model(Revolving.Fund)
    .update(updateData)
    .where(Revolving.Fund.pk, revolvingFundId)
    .build()
  return toTxQuery(query)
}

const buildCdUpdate = (cashDisbursementId, updateData) => {
  const query = SQL.model(Cash.Disbursement)
    .update(updateData)
    .where(Cash.Disbursement.pk, cashDisbursementId)
    .build()
  return toTxQuery(query)
}

// ==========================================
// METADATA-ONLY UPSERT
// ==========================================

/**
 * @name upsertCashDisbursement
 * @description Create or update a cash disbursement's METADATA only
 *              (received_by, revolving_fund_id, department_id, particulars, cash_voucher).
 *              Amount and status fields are intentionally not editable here —
 *              use issueCashDisbursement / returnCashDisbursement /
 *              recordExpendedCashDisbursement / reimburseCashDisbursement instead,
 *              so cash_disbursement never drifts out of sync with revolving_fund/budget.
 */
const upsertCashDisbursement = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Upsert Disbursement metadata (no amount/status fields — use the action endpoints for those)'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement id (update if present, create if blank — create still requires an initial issue via issueCashDisbursement)'
    }
    #swagger.parameters['received_by'] = {
      in: 'formData',
      type: 'integer',
      required: false,
      description: 'Employee id (master_employee.me_id) who received the disbursement'
    }
    #swagger.parameters['department_id'] = {
      in: 'formData',
      type: 'integer',
      required: false,
      description: 'Department id (master_department.md_id)'
    }
    #swagger.parameters['particulars'] = {
      in: 'formData',
      type: 'integer',
      required: false,
      description: 'Particulars id (master_particulars.mpt_id)'
    }
    #swagger.parameters['cash_voucher'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Cash voucher number'
    }
  */

  const { id, received_by, department_id, particulars, cash_voucher } = req.body

  if (!id) {
    return res.status(400).json({
      message:
        'Metadata-only upsert requires an existing disbursement id. To create a new disbursement, use issueCashDisbursement.',
    })
  }

  try {
    const updateData = {}
    if (received_by !== undefined) updateData[Cash.Disbursement.cols.received_by] = received_by
    if (department_id !== undefined)
      updateData[Cash.Disbursement.cols.department_id] = department_id
    if (particulars !== undefined) updateData[Cash.Disbursement.cols.particulars] = particulars
    if (cash_voucher !== undefined) updateData[Cash.Disbursement.cols.cash_voucher] = cash_voucher

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No metadata fields provided to update' })
    }

    const { sql, bindings } = SQL.model(Cash.Disbursement)
      .update(updateData)
      .where(Cash.Disbursement.pk, id)
      .build()

    const result = await Query(sql, bindings)

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Disbursement not found' })
    }

    return res.status(200).json({ message: 'Disbursement metadata updated successfully' })
  } catch (error) {
    console.error('Error in upsertCashDisbursement:', error)
    return res.status(500).json({ message: 'Error processing Disbursement' })
  }
}

// ==========================================
// ACTION: ISSUE
// ==========================================

/**
 * @name issueCashDisbursement
 * @description Issue cash from a Revolving Fund to an employee. Creates the
 *              cash_disbursement row and cascades: revolving_fund (issued↑,
 *              outstanding↑, balance↓) and budget (debit), plus activity logs.
 */
const issueCashDisbursement = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Issue cash against a Revolving Fund. Cascades to revolving_fund and budget.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['revolving_fund_id'] = { in: 'formData', type: 'integer', required: true, description: 'Revolving Fund id to issue from' }
    #swagger.parameters['received_by'] = { in: 'formData', type: 'integer', required: true, description: 'Employee id (master_employee.me_id)' }
    #swagger.parameters['department_id'] = { in: 'formData', type: 'integer', required: true, description: 'Department id (master_department.md_id)' }
    #swagger.parameters['particulars'] = { in: 'formData', type: 'integer', required: true, description: 'Particulars id (master_particulars.mpt_id)' }
    #swagger.parameters['amount_issued'] = { in: 'formData', type: 'number', required: true, description: 'Amount to issue' }
    #swagger.parameters['cash_voucher'] = { in: 'formData', type: 'string', required: true, description: 'Cash voucher number' }
    #swagger.parameters['date_issued'] = { in: 'formData', type: 'string', required: false, description: 'Issue date, defaults to now' }
  */

  // TEMP: no auth wired up yet — default to a placeholder test user.
  // Replace this fallback (and remove the TEMP comment) once auth is in.
  const userId = req.userId || req.user?.id || 1

  const {
    revolving_fund_id,
    received_by,
    department_id,
    particulars,
    amount_issued,
    cash_voucher,
    date_issued,
  } = req.body

  if (!revolving_fund_id || !received_by || !department_id || !particulars || !cash_voucher) {
    return res.status(400).json({
      message:
        'Missing required fields: revolving_fund_id, received_by, department_id, particulars, cash_voucher',
    })
  }

  const issueAmount = parseNum(amount_issued)
  if (issueAmount <= 0) {
    return res.status(400).json({ message: 'amount_issued must be greater than zero' })
  }

  try {
    const voucherCount = await checkCashVoucherLimit(cash_voucher)
    if (voucherCount >= 2) {
      return res
        .status(400)
        .json({ message: `Cash voucher '${cash_voucher}' already has 2 associated disbursements.` })
    }

    const rf = await getRevolvingFundById(revolving_fund_id)
    if (!rf) {
      return res.status(404).json({ message: 'Revolving fund not found' })
    }

    const currentBalance = parseNum(rf[Revolving.Fund.cols.balance])
    if (currentBalance < issueAmount) {
      return res.status(400).json({ message: 'Insufficient revolving fund balance.' })
    }

    const { outstanding, status } = computeCdStatus(issueAmount, 0, 0)

    // Step 1: insert the CD row on its own — its auto-increment id is needed
    // by the activity log below, and Transaction() can't return generated
    // ids mid-batch, so this can't be folded into the same transaction.
    const insertCdQuery = SQL.model(Cash.Disbursement)
      .insert({
        [Cash.Disbursement.cols.date_issued]: date_issued || new Date(),
        [Cash.Disbursement.cols.received_by]: received_by,
        [Cash.Disbursement.cols.revolving_fund_id]: revolving_fund_id,
        [Cash.Disbursement.cols.department_id]: department_id,
        [Cash.Disbursement.cols.particulars]: particulars,
        [Cash.Disbursement.cols.amount_issued]: issueAmount,
        [Cash.Disbursement.cols.cash_voucher]: cash_voucher,
        [Cash.Disbursement.cols.amount_returned]: 0,
        [Cash.Disbursement.cols.outstanding_amount]: outstanding,
        [Cash.Disbursement.cols.amount_expended]: 0,
        [Cash.Disbursement.cols.status]: status,
      })
      .build()

    const cdResult = await Query(insertCdQuery.sql, insertCdQuery.bindings)
    const newCdId = cdResult.insertId

    // Step 2: batch everything downstream into one real transaction —
    // activity log, RF update + activity, budget update + history.
    try {
      const newRfIssued = parseNum(rf[Revolving.Fund.cols.issued]) + issueAmount
      const newRfOutstanding = parseNum(rf[Revolving.Fund.cols.outstanding]) + issueAmount
      const newRfBalance = currentBalance - issueAmount
      const newRfStatus = computeRfStatus(
        rf[Revolving.Fund.cols.status],
        rf[Revolving.Fund.cols.liquidated],
        rf[Revolving.Fund.cols.total_fund],
      )

      const budgetRow = await getBudgetById(rf[Revolving.Fund.cols.budget_id])
      if (!budgetRow) throw new Error(`Budget ${rf[Revolving.Fund.cols.budget_id]} not found`)

      const particularsName = await getParticularsNameById(particulars)

      const queries = [
        buildCdActivityInsert(
          newCdId,
          issueAmount,
          `Issued amount: ₱${issueAmount.toFixed(2)}`,
          particularsName,
        ),
        buildRfUpdate(revolving_fund_id, {
          [Revolving.Fund.cols.issued]: newRfIssued,
          [Revolving.Fund.cols.outstanding]: newRfOutstanding,
          [Revolving.Fund.cols.balance]: newRfBalance,
          [Revolving.Fund.cols.status]: newRfStatus,
        }),
        buildRfActivityInsert(
          revolving_fund_id,
          `Issued ₱${issueAmount.toFixed(2)} — issued (${newRfIssued}), outstanding (${newRfOutstanding}), balance (${newRfBalance}), status: ${newRfStatus}.`,
          userId,
        ),
        ...buildBudgetChangeQueries(
          budgetRow,
          -issueAmount,
          department_id,
          userId,
          `Cash disbursement issued (CV ${cash_voucher})`,
        ),
      ]

      await Transaction(queries)
    } catch (txError) {
      // Compensate: the CD row was committed on its own above, but the
      // downstream batch failed — remove the orphaned CD row so we don't
      // leave a disbursement with no matching RF/budget effect.
      try {
        const { sql: delSql, bindings: delBindings } = SQL.model(Cash.Disbursement)
          .delete()
          .where(Cash.Disbursement.pk, newCdId)
          .build()
        await Query(delSql, delBindings)
      } catch (compensationError) {
        console.error(
          `CRITICAL: failed to compensate orphaned cash_disbursement id ${newCdId} after transaction failure:`,
          compensationError,
        )
      }
      throw txError
    }

    return res.status(201).json({ message: 'Cash issued successfully', id: newCdId })
  } catch (error) {
    console.error('Error in issueCashDisbursement:', error)
    return res.status(500).json({ message: 'Error issuing cash disbursement' })
  }
}

// ==========================================
// ACTION: RETURN
// ==========================================

/**
 * @name returnCashDisbursement
 * @description Record a return of unused issued cash against an existing
 *              disbursement. Cascades: revolving_fund (returned↑, liquidated↑,
 *              balance↑) and budget (credit).
 */
const returnCashDisbursement = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Record a return against an existing disbursement. Cascades to revolving_fund and budget.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = { in: 'formData', type: 'integer', required: true, description: 'Cash disbursement id' }
    #swagger.parameters['amount_return'] = { in: 'formData', type: 'number', required: true, description: 'Amount being returned' }
  */

  const userId = req.userId || req.user?.id || 1
  const { id, amount_return } = req.body

  if (!id) {
    return res.status(400).json({ message: 'Missing required field: id' })
  }

  const returnAmount = parseNum(amount_return)
  if (returnAmount <= 0) {
    return res.status(400).json({ message: 'amount_return must be greater than zero' })
  }

  try {
    const cd = await getCashDisbursementById(id)
    if (!cd) {
      return res.status(404).json({ message: 'Disbursement not found' })
    }

    const currentIssued = parseNum(cd[Cash.Disbursement.cols.amount_issued])
    const currentReturned = parseNum(cd[Cash.Disbursement.cols.amount_returned])
    const currentExpended = parseNum(cd[Cash.Disbursement.cols.amount_expended])
    const currentOutstanding = parseNum(cd[Cash.Disbursement.cols.outstanding_amount])

    if (returnAmount > currentOutstanding) {
      return res.status(400).json({
        message: `Return amount (${returnAmount}) exceeds outstanding amount (${currentOutstanding}).`,
      })
    }

    const rf = await getRevolvingFundById(cd[Cash.Disbursement.cols.revolving_fund_id])
    if (!rf) {
      return res.status(404).json({ message: 'Associated revolving fund not found' })
    }

    // TODO(transaction): wrap in Transaction() — see note in issueCashDisbursement.

    const newReturned = currentReturned + returnAmount
    const { outstanding: newOutstanding, status: newCdStatus } = computeCdStatus(
      currentIssued,
      newReturned,
      currentExpended,
    )

    const newRfReturned = parseNum(rf[Revolving.Fund.cols.returned]) + returnAmount
    const newRfLiquidated = parseNum(rf[Revolving.Fund.cols.liquidated]) + returnAmount
    const newRfBalance = parseNum(rf[Revolving.Fund.cols.balance]) + returnAmount
    const newRfOutstanding = Math.max(
      0,
      parseNum(rf[Revolving.Fund.cols.outstanding]) - returnAmount,
    )
    const newRfStatus = computeRfStatus(
      rf[Revolving.Fund.cols.status],
      newRfLiquidated,
      rf[Revolving.Fund.cols.total_fund],
    )

    const budgetRow = await getBudgetById(rf[Revolving.Fund.cols.budget_id])
    if (!budgetRow) {
      return res.status(404).json({ message: 'Associated budget not found' })
    }

    const particularsName = await getParticularsNameById(cd[Cash.Disbursement.cols.particulars])

    const queries = [
      buildCdUpdate(id, {
        [Cash.Disbursement.cols.amount_returned]: newReturned,
        [Cash.Disbursement.cols.outstanding_amount]: newOutstanding,
        [Cash.Disbursement.cols.status]: newCdStatus,
      }),
      buildCdActivityInsert(
        id,
        returnAmount,
        `Returned amount: ₱${returnAmount.toFixed(2)}`,
        particularsName,
      ),
      buildRfUpdate(rf[Revolving.Fund.cols.id], {
        [Revolving.Fund.cols.returned]: newRfReturned,
        [Revolving.Fund.cols.liquidated]: newRfLiquidated,
        [Revolving.Fund.cols.balance]: newRfBalance,
        [Revolving.Fund.cols.outstanding]: newRfOutstanding,
        [Revolving.Fund.cols.status]: newRfStatus,
      }),
      buildRfActivityInsert(
        rf[Revolving.Fund.cols.id],
        `Returned ₱${returnAmount.toFixed(2)} — returned (${newRfReturned}), liquidated (${newRfLiquidated}), balance (${newRfBalance}), outstanding (${newRfOutstanding}), status: ${newRfStatus}.`,
        userId,
      ),
      ...buildBudgetChangeQueries(
        budgetRow,
        returnAmount,
        cd[Cash.Disbursement.cols.department_id],
        userId,
        `Cash disbursement return (CV ${cd[Cash.Disbursement.cols.cash_voucher]})`,
      ),
    ]

    await Transaction(queries)

    return res.status(200).json({ message: 'Return recorded successfully' })
  } catch (error) {
    console.error('Error in returnCashDisbursement:', error)
    return res.status(500).json({ message: 'Error recording return' })
  }
}

// ==========================================
// ACTION: RECORD EXPENDED
// ==========================================

/**
 * @name recordExpendedCashDisbursement
 * @description Record spending against previously issued cash. Cascades:
 *              revolving_fund (amount_expended↑, liquidated↑). Does NOT
 *              touch budget — the budget was already debited at issue time;
 *              re-debiting here would double-count (this was a real bug in
 *              BMS v1's updatecash_disbursement_cv_new).
 */
const recordExpendedCashDisbursement = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Record expended amount against an existing disbursement. Cascades to revolving_fund only (budget already debited at issue).'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = { in: 'formData', type: 'integer', required: true, description: 'Cash disbursement id' }
    #swagger.parameters['amount_expended'] = { in: 'formData', type: 'number', required: true, description: 'Amount being recorded as expended' }
  */

  const userId = req.userId || req.user?.id || 1
  const { id, amount_expended } = req.body

  if (!id) {
    return res.status(400).json({ message: 'Missing required field: id' })
  }

  const expendedAmount = parseNum(amount_expended)
  if (expendedAmount <= 0) {
    return res.status(400).json({ message: 'amount_expended must be greater than zero' })
  }

  try {
    const cd = await getCashDisbursementById(id)
    if (!cd) {
      return res.status(404).json({ message: 'Disbursement not found' })
    }

    const currentIssued = parseNum(cd[Cash.Disbursement.cols.amount_issued])
    const currentReturned = parseNum(cd[Cash.Disbursement.cols.amount_returned])
    const currentExpended = parseNum(cd[Cash.Disbursement.cols.amount_expended])
    const currentOutstanding = parseNum(cd[Cash.Disbursement.cols.outstanding_amount])

    if (expendedAmount > currentOutstanding) {
      return res.status(400).json({
        message: `Expended amount (${expendedAmount}) exceeds outstanding amount (${currentOutstanding}).`,
      })
    }

    const rf = await getRevolvingFundById(cd[Cash.Disbursement.cols.revolving_fund_id])
    if (!rf) {
      return res.status(404).json({ message: 'Associated revolving fund not found' })
    }

    // TODO(transaction): wrap in Transaction() — see note in issueCashDisbursement.

    const newExpended = currentExpended + expendedAmount
    const { outstanding: newOutstanding, status: newCdStatus } = computeCdStatus(
      currentIssued,
      currentReturned,
      newExpended,
    )

    const newRfExpended = parseNum(rf[Revolving.Fund.cols.amount_expended]) + expendedAmount
    const newRfLiquidated = parseNum(rf[Revolving.Fund.cols.liquidated]) + expendedAmount
    const newRfOutstanding = Math.max(
      0,
      parseNum(rf[Revolving.Fund.cols.outstanding]) - expendedAmount,
    )
    const newRfStatus = computeRfStatus(
      rf[Revolving.Fund.cols.status],
      newRfLiquidated,
      rf[Revolving.Fund.cols.total_fund],
    )

    const particularsName = await getParticularsNameById(cd[Cash.Disbursement.cols.particulars])

    const queries = [
      buildCdUpdate(id, {
        [Cash.Disbursement.cols.amount_expended]: newExpended,
        [Cash.Disbursement.cols.outstanding_amount]: newOutstanding,
        [Cash.Disbursement.cols.status]: newCdStatus,
      }),
      buildCdActivityInsert(
        id,
        expendedAmount,
        `Expended amount: ₱${expendedAmount.toFixed(2)}`,
        particularsName,
      ),
      buildRfUpdate(rf[Revolving.Fund.cols.id], {
        [Revolving.Fund.cols.amount_expended]: newRfExpended,
        [Revolving.Fund.cols.liquidated]: newRfLiquidated,
        [Revolving.Fund.cols.outstanding]: newRfOutstanding,
        [Revolving.Fund.cols.status]: newRfStatus,
      }),
      buildRfActivityInsert(
        rf[Revolving.Fund.cols.id],
        `Expended ₱${expendedAmount.toFixed(2)} — expended (${newRfExpended}), liquidated (${newRfLiquidated}), outstanding (${newRfOutstanding}), status: ${newRfStatus}.`,
        userId,
      ),
    ]

    await Transaction(queries)

    return res.status(200).json({ message: 'Expended amount recorded successfully' })
  } catch (error) {
    console.error('Error in recordExpendedCashDisbursement:', error)
    return res.status(500).json({ message: 'Error recording expended amount' })
  }
}

// ==========================================
// ACTION: REIMBURSE
// ==========================================

/**
 * @name reimburseCashDisbursement
 * @description Reimburse an employee for out-of-pocket spending, modeled as
 *              a fresh disbursement that is immediately fully liquidated.
 *              Creates a new cash_disbursement row. Cascades: revolving_fund
 *              (issued↑, amount_expended↑, liquidated↑, balance↓) and
 *              budget (debit), same as an issue.
 */
const reimburseCashDisbursement = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Reimburse an employee (new, immediately-liquidated disbursement). Cascades to revolving_fund and budget.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['revolving_fund_id'] = { in: 'formData', type: 'integer', required: true, description: 'Revolving Fund id to reimburse from' }
    #swagger.parameters['received_by'] = { in: 'formData', type: 'integer', required: true, description: 'Employee id (master_employee.me_id)' }
    #swagger.parameters['department_id'] = { in: 'formData', type: 'integer', required: true, description: 'Department id (master_department.md_id)' }
    #swagger.parameters['particulars'] = { in: 'formData', type: 'integer', required: true, description: 'Particulars id (master_particulars.mpt_id)' }
    #swagger.parameters['amount_reimburse'] = { in: 'formData', type: 'number', required: true, description: 'Amount to reimburse' }
    #swagger.parameters['cash_voucher'] = { in: 'formData', type: 'string', required: true, description: 'Cash voucher number' }
  */

  const userId = req.userId || req.user?.id || 1

  const {
    revolving_fund_id,
    received_by,
    department_id,
    particulars,
    amount_reimburse,
    cash_voucher,
  } = req.body

  if (!revolving_fund_id || !received_by || !department_id || !particulars || !cash_voucher) {
    return res.status(400).json({
      message:
        'Missing required fields: revolving_fund_id, received_by, department_id, particulars, cash_voucher',
    })
  }

  const reimburseAmount = parseNum(amount_reimburse)
  if (reimburseAmount <= 0) {
    return res.status(400).json({ message: 'amount_reimburse must be greater than zero' })
  }

  try {
    const voucherCount = await checkCashVoucherLimit(cash_voucher)
    if (voucherCount >= 2) {
      return res
        .status(400)
        .json({ message: `Cash voucher '${cash_voucher}' already has 2 associated disbursements.` })
    }

    const rf = await getRevolvingFundById(revolving_fund_id)
    if (!rf) {
      return res.status(404).json({ message: 'Revolving fund not found' })
    }

    const currentBalance = parseNum(rf[Revolving.Fund.cols.balance])
    if (currentBalance < reimburseAmount) {
      return res.status(400).json({ message: 'Insufficient revolving fund balance.' })
    }

    // Step 1: insert the CD row on its own — see note in issueCashDisbursement
    // on why this can't be folded into the same transaction as the rest.
    const insertCdQuery = SQL.model(Cash.Disbursement)
      .insert({
        [Cash.Disbursement.cols.date_issued]: new Date(),
        [Cash.Disbursement.cols.received_by]: received_by,
        [Cash.Disbursement.cols.revolving_fund_id]: revolving_fund_id,
        [Cash.Disbursement.cols.department_id]: department_id,
        [Cash.Disbursement.cols.particulars]: particulars,
        [Cash.Disbursement.cols.amount_issued]: reimburseAmount,
        [Cash.Disbursement.cols.cash_voucher]: cash_voucher,
        [Cash.Disbursement.cols.amount_returned]: 0,
        [Cash.Disbursement.cols.outstanding_amount]: 0,
        [Cash.Disbursement.cols.amount_expended]: reimburseAmount,
        [Cash.Disbursement.cols.status]: 'LIQUIDATED',
      })
      .build()

    const cdResult = await Query(insertCdQuery.sql, insertCdQuery.bindings)
    const newCdId = cdResult.insertId

    // Step 2: batch everything downstream into one real transaction.
    try {
      const newRfIssued = parseNum(rf[Revolving.Fund.cols.issued]) + reimburseAmount
      const newRfExpended = parseNum(rf[Revolving.Fund.cols.amount_expended]) + reimburseAmount
      const newRfLiquidated = parseNum(rf[Revolving.Fund.cols.liquidated]) + reimburseAmount
      const newRfBalance = currentBalance - reimburseAmount
      const newRfStatus = computeRfStatus(
        rf[Revolving.Fund.cols.status],
        newRfLiquidated,
        rf[Revolving.Fund.cols.total_fund],
      )

      const budgetRow = await getBudgetById(rf[Revolving.Fund.cols.budget_id])
      if (!budgetRow) throw new Error(`Budget ${rf[Revolving.Fund.cols.budget_id]} not found`)

      const particularsName = await getParticularsNameById(particulars)

      const queries = [
        buildCdActivityInsert(
          newCdId,
          reimburseAmount,
          `Reimbursed amount: ₱${reimburseAmount.toFixed(2)}`,
          particularsName,
        ),
        buildRfUpdate(revolving_fund_id, {
          [Revolving.Fund.cols.issued]: newRfIssued,
          [Revolving.Fund.cols.amount_expended]: newRfExpended,
          [Revolving.Fund.cols.liquidated]: newRfLiquidated,
          [Revolving.Fund.cols.balance]: newRfBalance,
          [Revolving.Fund.cols.status]: newRfStatus,
        }),
        buildRfActivityInsert(
          revolving_fund_id,
          `Reimbursed ₱${reimburseAmount.toFixed(2)} — issued (${newRfIssued}), expended (${newRfExpended}), liquidated (${newRfLiquidated}), balance (${newRfBalance}), status: ${newRfStatus}.`,
          userId,
        ),
        ...buildBudgetChangeQueries(
          budgetRow,
          -reimburseAmount,
          department_id,
          userId,
          `Cash disbursement reimbursement (CV ${cash_voucher})`,
        ),
      ]

      await Transaction(queries)
    } catch (txError) {
      try {
        const { sql: delSql, bindings: delBindings } = SQL.model(Cash.Disbursement)
          .delete()
          .where(Cash.Disbursement.pk, newCdId)
          .build()
        await Query(delSql, delBindings)
      } catch (compensationError) {
        console.error(
          `CRITICAL: failed to compensate orphaned cash_disbursement id ${newCdId} after transaction failure:`,
          compensationError,
        )
      }
      throw txError
    }

    return res.status(201).json({ message: 'Reimbursement recorded successfully', id: newCdId })
  } catch (error) {
    console.error('Error in reimburseCashDisbursement:', error)
    return res.status(500).json({ message: 'Error recording reimbursement' })
  }
}

// ==========================================
// READ ENDPOINTS
// ==========================================

/**
 * @name getCashDisbursement
 * @description Get all Disbursement records, optionally filtered
 */
const getCashDisbursement = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Get all Disbursement records'
  /* 
    #swagger.parameters['revolving_fund_id'] = { in: 'query', type: 'integer', required: false, description: 'Filter by revolving fund id' }
    #swagger.parameters['status'] = { in: 'query', type: 'string', required: false, description: 'Filter by status (LIQUIDATED / UNLIQUIDATED)' }
  */

  const { revolving_fund_id, status } = req.query

  try {
    let queryBuilder = SQL.model(Cash.Disbursement).select(Cash.Disbursement.select)

    if (revolving_fund_id) {
      queryBuilder = queryBuilder.where(Cash.Disbursement.cols.revolving_fund_id, revolving_fund_id)
    }
    if (status) {
      queryBuilder = queryBuilder.where(Cash.Disbursement.cols.status, status)
    }

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getCashDisbursement:', error)
    return res.status(500).json({ message: 'Error retrieving Disbursement records' })
  }
}

/**
 * @name upsertCashDisbursementFile
 * @description Update and insert DisbursementFile
 */
const upsertCashDisbursementFile = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Upsert DisbursementFile'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = { in: 'formData', type: 'string', required: false, description: 'DisbursementFile id' }
    #swagger.parameters['cash_disbursement_id'] = { in: 'formData', type: 'string', required: false, description: 'DisbursementFile cash_disbursement_id' }
    #swagger.parameters['image'] = { in: 'formData', type: 'string', required: false, description: 'DisbursementFile image' }
  */

  const { id, cash_disbursement_id, image } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (cash_disbursement_id !== undefined)
        updateData[Cash.DisbursementFile.cols.cash_disbursement_id] = cash_disbursement_id
      if (image !== undefined) updateData[Cash.DisbursementFile.cols.image] = image

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      }

      query = SQL.model(Cash.DisbursementFile)
        .update(updateData)
        .where(Cash.DisbursementFile.pk, id)
        .build()
    } else {
      if (!cash_disbursement_id || !image) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Cash.DisbursementFile)
        .insert({
          [Cash.DisbursementFile.cols.cash_disbursement_id]: cash_disbursement_id,
          [Cash.DisbursementFile.cols.image]: image,
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'DisbursementFile not found' })
    }

    return res
      .status(id ? 200 : 201)
      .json({ message: id ? 'Updated successfully' : 'Created successfully' })
  } catch (error) {
    console.error('Error in upsertCashDisbursementFile:', error)
    return res.status(500).json({ message: 'Error processing DisbursementFile' })
  }
}

/**
 * @name getCashDisbursementFile
 * @description Get all DisbursementFile records
 */
const getCashDisbursementFile = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Get all DisbursementFile records'
  /* 
    #swagger.parameters['cash_disbursement_id'] = { in: 'query', type: 'string', required: false, description: 'Filter by cash disbursement id' }
  */

  const { cash_disbursement_id } = req.query

  try {
    let queryBuilder = SQL.model(Cash.DisbursementFile).select(Cash.DisbursementFile.select)

    if (cash_disbursement_id) {
      queryBuilder = queryBuilder.where(
        Cash.DisbursementFile.cols.cash_disbursement_id,
        cash_disbursement_id,
      )
    }

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getCashDisbursementFile:', error)
    return res.status(500).json({ message: 'Error retrieving DisbursementFile records' })
  }
}

/**
 * @name getCashDisbursementActivity
 * @description Get all DisbursementActivity records
 */
const getCashDisbursementActivity = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Get all DisbursementActivity records'
  /* 
    #swagger.parameters['cash_disbursement_id'] = { in: 'query', type: 'string', required: false, description: 'Filter by cash disbursement id' }
  */

  const { cash_disbursement_id } = req.query

  try {
    let queryBuilder = SQL.model(Cash.DisbursementActivity).select(Cash.DisbursementActivity.select)

    if (cash_disbursement_id) {
      queryBuilder = queryBuilder.where(
        Cash.DisbursementActivity.cols.cash_disbursement_id,
        cash_disbursement_id,
      )
    }

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getCashDisbursementActivity:', error)
    return res.status(500).json({ message: 'Error retrieving DisbursementActivity records' })
  }
}

/**
 * @name upsertCashDisbursementActivity
 * @description Manually insert/update a DisbursementActivity log entry
 *              (the action endpoints above log automatically; this remains
 *              available for manual/admin entries)
 */
const upsertCashDisbursementActivity = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Upsert DisbursementActivity'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = { in: 'formData', type: 'string', required: false, description: 'DisbursementActivity id' }
    #swagger.parameters['cash_disbursement_id'] = { in: 'formData', type: 'string', required: false, description: 'DisbursementActivity cash_disbursement_id' }
    #swagger.parameters['amount'] = { in: 'formData', type: 'number', required: false, description: 'DisbursementActivity amount' }
    #swagger.parameters['remarks'] = { in: 'formData', type: 'string', required: false, description: 'DisbursementActivity remarks' }
    #swagger.parameters['particulars'] = { in: 'formData', type: 'string', required: false, description: 'DisbursementActivity particulars' }
  */

  const { id, cash_disbursement_id, amount, remarks, particulars } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (cash_disbursement_id !== undefined)
        updateData[Cash.DisbursementActivity.cols.cash_disbursement_id] = cash_disbursement_id
      if (amount !== undefined) updateData[Cash.DisbursementActivity.cols.amount] = amount
      if (remarks !== undefined) updateData[Cash.DisbursementActivity.cols.remarks] = remarks
      if (particulars !== undefined)
        updateData[Cash.DisbursementActivity.cols.particulars] = particulars

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      }

      query = SQL.model(Cash.DisbursementActivity)
        .update(updateData)
        .where(Cash.DisbursementActivity.pk, id)
        .build()
    } else {
      if (!cash_disbursement_id || amount === undefined || !remarks || !particulars) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Cash.DisbursementActivity)
        .insert({
          [Cash.DisbursementActivity.cols.cash_disbursement_id]: cash_disbursement_id,
          [Cash.DisbursementActivity.cols.amount]: amount,
          [Cash.DisbursementActivity.cols.remarks]: remarks,
          [Cash.DisbursementActivity.cols.particulars]: particulars,
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'DisbursementActivity not found' })
    }

    return res
      .status(id ? 200 : 201)
      .json({ message: id ? 'Updated successfully' : 'Created successfully' })
  } catch (error) {
    console.error('Error in upsertCashDisbursementActivity:', error)
    return res.status(500).json({ message: 'Error processing DisbursementActivity' })
  }
}

module.exports = {
  getCashDisbursement,
  upsertCashDisbursement,
  issueCashDisbursement,
  returnCashDisbursement,
  recordExpendedCashDisbursement,
  reimburseCashDisbursement,
  getCashDisbursementFile,
  upsertCashDisbursementFile,
  getCashDisbursementActivity,
  upsertCashDisbursementActivity,
}
