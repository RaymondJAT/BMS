const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Cash } = require('../database/models/Cash')
const { Revolving } = require('../database/models/Revolving')
const { Budget } = require('../database/models/Budget')
const SQL = new SQLQueryBuilder()

// ==========================================
// HELPER UTILITIES
// ==========================================

const parseNum = (val, defaultVal = 0) => {
  if (val === null || val === undefined) return defaultVal
  const parsed = parseFloat(val)
  return isNaN(parsed) ? defaultVal : parsed
}

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
  return row || null
}

const getRevolvingFundById = async (id) => {
  const { sql, bindings } = SQL.model(Revolving.Fund)
    .select(Revolving.Fund.select)
    .where(Revolving.Fund.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return row || null
}

const getBudgetById = async (id) => {
  const { sql, bindings } = SQL.model(Budget.Budget)
    .select(Budget.Budget.select)
    .where(Budget.Budget.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return row || null
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
 * Applies a delta to a budget's amount and writes the paired budget_history
 * row, using the Budget model (not raw SQL) so this stays consistent with
 * the dedicated Budget controller's source of truth.
 *
 * @param {number} budgetId
 * @param {number} delta - positive to credit (increase), negative to debit (decrease)
 * @param {'DEBIT'|'CREDIT'} historyType
 * @param {number} departmentId
 * @param {number} userId
 * @param {string} [remarks]
 */
const applyBudgetChange = async (budgetId, delta, historyType, departmentId, userId, remarks) => {
  const budgetRow = await getBudgetById(budgetId)
  if (!budgetRow) throw new Error(`Budget ${budgetId} not found`)

  const previousAmount = parseNum(budgetRow[Budget.Budget.cols.amount])
  const newAmount = previousAmount + delta

  const { sql: updateSql, bindings: updateBindings } = SQL.model(Budget.Budget)
    .update({ [Budget.Budget.cols.amount]: newAmount })
    .where(Budget.Budget.pk, budgetId)
    .build()
  await Query(updateSql, updateBindings)

  const { sql: historySql, bindings: historyBindings } = SQL.model(Budget.History)
    .insert({
      [Budget.History.cols.budget_id]: budgetId,
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
  await Query(historySql, historyBindings)

  return newAmount
}

const logCdActivity = async (cashDisbursementId, amount, remarks, particulars) => {
  const { sql, bindings } = SQL.model(Cash.DisbursementActivity)
    .insert({
      [Cash.DisbursementActivity.cols.cash_disbursement_id]: cashDisbursementId,
      [Cash.DisbursementActivity.cols.amount]: amount,
      [Cash.DisbursementActivity.cols.remarks]: remarks,
      [Cash.DisbursementActivity.cols.particulars]: particulars,
    })
    .build()
  await Query(sql, bindings)
}

const logRfActivity = async (revolvingFundId, remarks, userId) => {
  const { sql, bindings } = SQL.model(Revolving.FundActivity)
    .insert({
      [Revolving.FundActivity.cols.revolving_fund_id]: revolvingFundId,
      [Revolving.FundActivity.cols.remarks]: remarks,
      [Revolving.FundActivity.cols.user_id]: userId,
    })
    .build()
  await Query(sql, bindings)
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

    // TODO(transaction): wrap the writes below in Transaction() once its
    // call signature is confirmed — this sequence spans cash_disbursement,
    // cash_disbursement_activity, revolving_fund, revolving_fund_activity,
    // budget, and budget_history, and must be all-or-nothing.

    const { outstanding, status } = computeCdStatus(issueAmount, 0, 0)

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

    await logCdActivity(
      newCdId,
      issueAmount,
      `Issued amount: ₱${issueAmount.toFixed(2)}`,
      particulars,
    )

    const newRfIssued = parseNum(rf[Revolving.Fund.cols.issued]) + issueAmount
    const newRfOutstanding = parseNum(rf[Revolving.Fund.cols.outstanding]) + issueAmount
    const newRfBalance = currentBalance - issueAmount
    const newRfStatus = computeRfStatus(
      rf[Revolving.Fund.cols.status],
      rf[Revolving.Fund.cols.liquidated],
      rf[Revolving.Fund.cols.total_fund],
    )

    const { sql: rfUpdateSql, bindings: rfUpdateBindings } = SQL.model(Revolving.Fund)
      .update({
        [Revolving.Fund.cols.issued]: newRfIssued,
        [Revolving.Fund.cols.outstanding]: newRfOutstanding,
        [Revolving.Fund.cols.balance]: newRfBalance,
        [Revolving.Fund.cols.status]: newRfStatus,
      })
      .where(Revolving.Fund.pk, revolving_fund_id)
      .build()
    await Query(rfUpdateSql, rfUpdateBindings)

    await logRfActivity(
      revolving_fund_id,
      `Issued ₱${issueAmount.toFixed(2)} — issued (${newRfIssued}), outstanding (${newRfOutstanding}), balance (${newRfBalance}), status: ${newRfStatus}.`,
      userId,
    )

    await applyBudgetChange(
      rf[Revolving.Fund.cols.budget_id],
      -issueAmount,
      'DEBIT',
      department_id,
      userId,
      `Cash disbursement issued (CV ${cash_voucher})`,
    )

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

    const { sql: cdUpdateSql, bindings: cdUpdateBindings } = SQL.model(Cash.Disbursement)
      .update({
        [Cash.Disbursement.cols.amount_returned]: newReturned,
        [Cash.Disbursement.cols.outstanding_amount]: newOutstanding,
        [Cash.Disbursement.cols.status]: newCdStatus,
      })
      .where(Cash.Disbursement.pk, id)
      .build()
    await Query(cdUpdateSql, cdUpdateBindings)

    await logCdActivity(
      id,
      returnAmount,
      `Returned amount: ₱${returnAmount.toFixed(2)}`,
      cd[Cash.Disbursement.cols.particulars],
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

    const { sql: rfUpdateSql, bindings: rfUpdateBindings } = SQL.model(Revolving.Fund)
      .update({
        [Revolving.Fund.cols.returned]: newRfReturned,
        [Revolving.Fund.cols.liquidated]: newRfLiquidated,
        [Revolving.Fund.cols.balance]: newRfBalance,
        [Revolving.Fund.cols.outstanding]: newRfOutstanding,
        [Revolving.Fund.cols.status]: newRfStatus,
      })
      .where(Revolving.Fund.pk, rf[Revolving.Fund.cols.id])
      .build()
    await Query(rfUpdateSql, rfUpdateBindings)

    await logRfActivity(
      rf[Revolving.Fund.cols.id],
      `Returned ₱${returnAmount.toFixed(2)} — returned (${newRfReturned}), liquidated (${newRfLiquidated}), balance (${newRfBalance}), outstanding (${newRfOutstanding}), status: ${newRfStatus}.`,
      userId,
    )

    await applyBudgetChange(
      rf[Revolving.Fund.cols.budget_id],
      returnAmount,
      'CREDIT',
      cd[Cash.Disbursement.cols.department_id],
      userId,
      `Cash disbursement return (CV ${cd[Cash.Disbursement.cols.cash_voucher]})`,
    )

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

    const { sql: cdUpdateSql, bindings: cdUpdateBindings } = SQL.model(Cash.Disbursement)
      .update({
        [Cash.Disbursement.cols.amount_expended]: newExpended,
        [Cash.Disbursement.cols.outstanding_amount]: newOutstanding,
        [Cash.Disbursement.cols.status]: newCdStatus,
      })
      .where(Cash.Disbursement.pk, id)
      .build()
    await Query(cdUpdateSql, cdUpdateBindings)

    await logCdActivity(
      id,
      expendedAmount,
      `Expended amount: ₱${expendedAmount.toFixed(2)}`,
      cd[Cash.Disbursement.cols.particulars],
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

    const { sql: rfUpdateSql, bindings: rfUpdateBindings } = SQL.model(Revolving.Fund)
      .update({
        [Revolving.Fund.cols.amount_expended]: newRfExpended,
        [Revolving.Fund.cols.liquidated]: newRfLiquidated,
        [Revolving.Fund.cols.outstanding]: newRfOutstanding,
        [Revolving.Fund.cols.status]: newRfStatus,
      })
      .where(Revolving.Fund.pk, rf[Revolving.Fund.cols.id])
      .build()
    await Query(rfUpdateSql, rfUpdateBindings)

    await logRfActivity(
      rf[Revolving.Fund.cols.id],
      `Expended ₱${expendedAmount.toFixed(2)} — expended (${newRfExpended}), liquidated (${newRfLiquidated}), outstanding (${newRfOutstanding}), status: ${newRfStatus}.`,
      userId,
    )

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

    // TODO(transaction): wrap in Transaction() — see note in issueCashDisbursement.

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

    await logCdActivity(
      newCdId,
      reimburseAmount,
      `Reimbursed amount: ₱${reimburseAmount.toFixed(2)}`,
      particulars,
    )

    const newRfIssued = parseNum(rf[Revolving.Fund.cols.issued]) + reimburseAmount
    const newRfExpended = parseNum(rf[Revolving.Fund.cols.amount_expended]) + reimburseAmount
    const newRfLiquidated = parseNum(rf[Revolving.Fund.cols.liquidated]) + reimburseAmount
    const newRfBalance = currentBalance - reimburseAmount
    const newRfStatus = computeRfStatus(
      rf[Revolving.Fund.cols.status],
      newRfLiquidated,
      rf[Revolving.Fund.cols.total_fund],
    )

    const { sql: rfUpdateSql, bindings: rfUpdateBindings } = SQL.model(Revolving.Fund)
      .update({
        [Revolving.Fund.cols.issued]: newRfIssued,
        [Revolving.Fund.cols.amount_expended]: newRfExpended,
        [Revolving.Fund.cols.liquidated]: newRfLiquidated,
        [Revolving.Fund.cols.balance]: newRfBalance,
        [Revolving.Fund.cols.status]: newRfStatus,
      })
      .where(Revolving.Fund.pk, revolving_fund_id)
      .build()
    await Query(rfUpdateSql, rfUpdateBindings)

    await logRfActivity(
      revolving_fund_id,
      `Reimbursed ₱${reimburseAmount.toFixed(2)} — issued (${newRfIssued}), expended (${newRfExpended}), liquidated (${newRfLiquidated}), balance (${newRfBalance}), status: ${newRfStatus}.`,
      userId,
    )

    await applyBudgetChange(
      rf[Revolving.Fund.cols.budget_id],
      -reimburseAmount,
      'DEBIT',
      department_id,
      userId,
      `Cash disbursement reimbursement (CV ${cash_voucher})`,
    )

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
