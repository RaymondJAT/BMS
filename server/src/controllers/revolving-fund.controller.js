const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Revolving } = require('../database/models/Revolving')
const { Closed } = require('../database/models/Closed')
const { Budget } = require('../database/models/Budget')
const { Cash } = require('../database/models/Cash')

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

const formatDate = (date = new Date()) => {
  const yyyy = date.getFullYear()
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

const getDateBounds = () => {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)

  return {
    todayStr: formatDate(today),
    yesterdayStr: formatDate(yesterday),
  }
}

/**
 * Transaction() expects an array of { sql, values }, but the query builder's
 * .build() returns { sql, bindings }. This adapts one to the other.
 */
const toTxQuery = ({ sql, bindings }) => ({ sql, values: bindings })

const getBudgetById = async (id) => {
  const { sql, bindings } = SQL.model(Budget.Budget)
    .select(Budget.Budget.select)
    .where(Budget.Budget.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Budget.Budget)
}

/**
 * Needed so a top-up (add_amount) can compute its delta against the
 * fund's CURRENT added/total_fund/balance server-side, instead of trusting
 * whatever cumulative totals the client sent — those can be stale (e.g. a
 * second edit landing before the first one's response refreshed the UI).
 */
const getRevolvingFundById = async (id) => {
  const { sql, bindings } = SQL.model(Revolving.Fund)
    .select(Revolving.Fund.select)
    .where(Revolving.Fund.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Revolving.Fund)
}

/**
 * Builds the budget update + budget_history insert as Transaction-ready
 * query objects, WITHOUT executing them, using the Budget model (not raw
 * SQL) so this stays consistent with the Budget and Cash Disbursement
 * controllers' source of truth.
 *
 * @param {object} budgetRow - row previously fetched via getBudgetById
 * @param {number} delta - positive to credit (increase budget), negative to
 *   debit (decrease budget). Money DEPLOYED from the budget into a fund is
 *   always a debit (negative); money returned to the budget is a credit
 *   (positive). Matches the convention used in cashDisbursementController.js.
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

/**
 * True if the given fund has any UNLIQUIDATED cash_disbursement rows that
 * ORIGINATED from it (cd.revolving_fund_id === fundId). Since a
 * disbursement's revolving_fund_id is always its ORIGINAL fund and never
 * changes — even after a cross-fund return/reimburse liquidates it against
 * a different fund (see returnCashDisbursement in
 * cashDisbursementController.js) — this only counts a fund's own
 * transactions, never ones it merely helped liquidate for another fund.
 */
const hasUnliquidatedDisbursements = async (fundId) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .select([Cash.Disbursement.cols.id])
    .where(Cash.Disbursement.cols.revolving_fund_id, fundId)
    .where(Cash.Disbursement.cols.status, 'UNLIQUIDATED')
    .build()
  const rows = await Query(sql, bindings)
  return rows.length > 0
}

// ==========================================
// CONTROLLERS
// ==========================================

/**
 * @name upsertRevolvingFund
 * @description Create or update a Revolving Fund entry
 */
const upsertRevolvingFund = async (req, res) => {
  // #swagger.tags = ['Revolving Fund']
  // #swagger.description = 'Create a new Revolving Fund or update an existing one.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']

  const userId = req.userId || req.user?.id || req.body.user_id || 1

  const {
    id,
    budget_id,
    year,
    month,
    start_date,
    end_date,
    beginning,
    added,
    total_fund,
    issued,
    returned,
    outstanding,
    amount_expended,
    ending,
    liquidated,
    balance,
    status,
    add_amount,
  } = req.body

  try {
    if (id) {
      // ==========================================
      // UPDATE FLOW
      // ==========================================
      const existingFund = await getRevolvingFundById(id)

      if (!existingFund) {
        return res.status(404).json({ message: 'Revolving Fund not found' })
      }

      const updateData = {}
      if (budget_id !== undefined) updateData[Revolving.Fund.cols.budget_id] = budget_id
      if (year !== undefined) updateData[Revolving.Fund.cols.year] = parseNum(year)
      if (month !== undefined) updateData[Revolving.Fund.cols.month] = parseNum(month)
      if (start_date !== undefined) updateData[Revolving.Fund.cols.start_date] = start_date
      if (end_date !== undefined) updateData[Revolving.Fund.cols.end_date] = end_date
      if (beginning !== undefined) updateData[Revolving.Fund.cols.beginning] = parseNum(beginning)
      if (added !== undefined) updateData[Revolving.Fund.cols.added] = parseNum(added)
      if (total_fund !== undefined)
        updateData[Revolving.Fund.cols.total_fund] = parseNum(total_fund)
      if (issued !== undefined) updateData[Revolving.Fund.cols.issued] = parseNum(issued)
      if (returned !== undefined) updateData[Revolving.Fund.cols.returned] = parseNum(returned)
      if (outstanding !== undefined)
        updateData[Revolving.Fund.cols.outstanding] = parseNum(outstanding)
      if (amount_expended !== undefined)
        updateData[Revolving.Fund.cols.amount_expended] = parseNum(amount_expended)
      if (ending !== undefined) updateData[Revolving.Fund.cols.ending] = parseNum(ending)
      if (liquidated !== undefined)
        updateData[Revolving.Fund.cols.liquidated] = parseNum(liquidated)
      if (balance !== undefined) updateData[Revolving.Fund.cols.balance] = parseNum(balance)

      if (status !== undefined) {
        updateData[Revolving.Fund.cols.status] = status
      } else if (issued !== undefined && parseNum(issued) > 0) {
        updateData[Revolving.Fund.cols.status] = 'ON REVIEW'
      }

      // Top-up: add_amount is the literal amount being added THIS call.
      // Computed here from the fund's current row (existingFund), not from
      // whatever added/total_fund/balance the client sent above — so a
      // second top-up of ₱2,000 always means "+₱2,000 from wherever the
      // fund currently is", not "overwrite added with 2,000". This
      // intentionally takes precedence over any raw added/total_fund/
      // balance fields set from the request above.
      const topUpAmount = add_amount !== undefined ? parseNum(add_amount) : 0
      let budgetChangeQueries = []
      let topUpRemarks = null

      if (topUpAmount > 0) {
        if (existingFund[Revolving.Fund.cols.status] === 'CLOSED') {
          return res.status(400).json({ message: 'Cannot add funds to a closed revolving fund.' })
        }

        const newAdded = parseNum(existingFund[Revolving.Fund.cols.added]) + topUpAmount
        const newTotalFund = parseNum(existingFund[Revolving.Fund.cols.total_fund]) + topUpAmount
        const newBalance = parseNum(existingFund[Revolving.Fund.cols.balance]) + topUpAmount

        updateData[Revolving.Fund.cols.added] = newAdded
        updateData[Revolving.Fund.cols.total_fund] = newTotalFund
        updateData[Revolving.Fund.cols.balance] = newBalance

        const fundBudgetId = existingFund[Revolving.Fund.cols.budget_id]
        const budgetRow = await getBudgetById(fundBudgetId)
        if (!budgetRow) {
          return res
            .status(400)
            .json({ message: `Associated budget ${fundBudgetId} not found for top-up.` })
        }

        const currentBudgetAmount = parseNum(budgetRow[Budget.Budget.cols.amount])
        if (currentBudgetAmount < topUpAmount) {
          return res.status(400).json({ message: 'Insufficient budget amount balance for top-up.' })
        }

        // Deploying money from the budget into a fund DEBITS the budget
        // (money leaves the available pool and becomes locked in the
        // fund) — mirrors the convention used everywhere in
        // cashDisbursementController.js (issue/reimburse debit the
        // budget, returns credit it).
        budgetChangeQueries = buildBudgetChangeQueries(
          budgetRow,
          -topUpAmount,
          budgetRow[Budget.Budget.cols.department_id],
          userId,
          `Top-up for Revolving Fund #${id}`,
        )

        topUpRemarks = `Topped up ₱${topUpAmount.toFixed(2)} — added (${newAdded}), total fund (${newTotalFund}), balance (${newBalance}).`
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data provided to update' })
      }

      const query = SQL.model(Revolving.Fund)
        .update(updateData)
        .where(Revolving.Fund.pk, id)
        .build()

      // The RF update and its activity log both reference an id we already
      // know (no generated-id dependency), so they batch into one real,
      // all-or-nothing transaction — along with the budget effect queries
      // when this update is a top-up.
      const queries = [toTxQuery(query)]

      if (Revolving.FundActivity) {
        const activityQuery = SQL.model(Revolving.FundActivity)
          .insert({
            [Revolving.FundActivity.cols.revolving_fund_id]: id,
            [Revolving.FundActivity.cols.remarks]:
              topUpRemarks ||
              `Revolving Fund updated (Status: ${updateData[Revolving.Fund.cols.status] || 'N/A'})`,
            [Revolving.FundActivity.cols.user_id]: userId,
          })
          .build()

        queries.push(toTxQuery(activityQuery))
      }

      queries.push(...budgetChangeQueries)

      await Transaction(queries)

      return res.status(200).json({
        message: 'Revolving fund updated successfully',
        id,
      })
    } else {
      // ==========================================
      // CREATE FLOW
      // ==========================================
      if (!budget_id) {
        return res.status(400).json({ message: 'Budget id is required' })
      }

      const { todayStr, yesterdayStr } = getDateBounds()

      const budgetRow = await getBudgetById(budget_id)
      if (!budgetRow) {
        return res.status(400).json({ message: 'Invalid budget ID' })
      }

      const departmentId = budgetRow[Budget.Budget.cols.department_id]
      const budgetType = budgetRow[Budget.Budget.cols.type]

      const unclosedYesterdayQuery = await Query(
        `SELECT 
          rf_start_date AS start_date, 
          CONCAT(md_description, '-', b_type) AS name, 
          rf_status 
        FROM revolving_fund 
        INNER JOIN budget ON rf_budget_id = b_id 
        INNER JOIN master_department ON b_department_id = md_id 
        WHERE DATE(rf_start_date) = ? 
          AND rf_budget_id = ? 
          AND rf_status IN ('ON REVIEW', 'OPEN')`,
        [yesterdayStr, budget_id],
      )

      if (unclosedYesterdayQuery.length > 0) {
        const existingName = unclosedYesterdayQuery.map((rf) => rf.name).join(', ')
        return res.status(400).json({
          message: `Revolving fund with type(s) ${existingName} is still not closed from Yesterday`,
        })
      }

      const todayExistingQuery = await Query(
        `SELECT b_type FROM revolving_fund 
        INNER JOIN budget ON rf_budget_id = b_id 
        WHERE DATE(rf_start_date) = ? 
          AND b_department_id = ? 
          AND (b_type = 'CASH' OR b_type = 'GCASH')`,
        [todayStr, departmentId],
      )

      if (todayExistingQuery.some((rf) => rf.b_type === budgetType)) {
        return res.status(400).json({
          message: `Revolving fund with type ${budgetType} already exists for this department today.`,
        })
      }

      const beginningAmount = parseNum(beginning)
      const addedAmount = parseNum(added)
      const totalFundAmount =
        total_fund !== undefined ? parseNum(total_fund) : beginningAmount + addedAmount

      // Both beginning and added leave the budget's available pool and
      // become locked in the fund, so both must be covered by the
      // budget's current balance — not beginning alone.
      const deployedAmount = beginningAmount + addedAmount
      const currentBudgetAmount = parseNum(budgetRow[Budget.Budget.cols.amount])

      if (currentBudgetAmount < deployedAmount) {
        return res.status(400).json({ message: 'Insufficient budget amount balance.' })
      }

      const now = new Date()
      const currentYear = parseNum(year, now.getFullYear())
      const currentMonth = parseNum(month, now.getMonth() + 1)
      const startDateVal = start_date || todayStr
      const endDateVal = end_date || null
      const initialIssued = parseNum(issued)

      const initialStatus = status || (initialIssued > 0 ? 'ON REVIEW' : 'OPEN')

      // rf_id is an autoincrement INTEGER. Everything below (activity log,
      // budget update) needs this generated id, and Transaction() can't
      // return generated ids mid-batch, so this insert stays standalone.
      const insertFundQuery = SQL.model(Revolving.Fund)
        .insert({
          [Revolving.Fund.cols.budget_id]: budget_id,
          [Revolving.Fund.cols.year]: currentYear,
          [Revolving.Fund.cols.month]: currentMonth,
          [Revolving.Fund.cols.start_date]: startDateVal,
          [Revolving.Fund.cols.end_date]: endDateVal,
          [Revolving.Fund.cols.beginning]: beginningAmount,
          [Revolving.Fund.cols.added]: addedAmount,
          [Revolving.Fund.cols.total_fund]: totalFundAmount,
          [Revolving.Fund.cols.issued]: initialIssued,
          [Revolving.Fund.cols.returned]: parseNum(returned),
          [Revolving.Fund.cols.outstanding]: parseNum(outstanding),
          [Revolving.Fund.cols.amount_expended]: parseNum(amount_expended),
          [Revolving.Fund.cols.ending]: parseNum(ending),
          [Revolving.Fund.cols.liquidated]: parseNum(liquidated),
          [Revolving.Fund.cols.balance]:
            balance !== undefined ? parseNum(balance) : totalFundAmount,
          [Revolving.Fund.cols.status]: initialStatus,
        })
        .build()

      const resFund = await Query(insertFundQuery.sql, insertFundQuery.bindings)
      const newFundId = resFund.insertId

      try {
        const queries = []

        if (Revolving.FundActivity) {
          const activityQuery = SQL.model(Revolving.FundActivity)
            .insert({
              [Revolving.FundActivity.cols.revolving_fund_id]: newFundId,
              [Revolving.FundActivity.cols.remarks]:
                `Initial fund created (Status: ${initialStatus}, Amount: ₱${totalFundAmount.toFixed(
                  2,
                )})`,
              [Revolving.FundActivity.cols.user_id]: userId,
            })
            .build()

          queries.push(toTxQuery(activityQuery))
        }

        // Deploying money from the budget into a new fund DEBITS the
        // budget — money leaves the available pool. Covers both the
        // initial `beginning` balance and any `added` amount, since both
        // represent money moving out of the budget at creation time.
        if (deployedAmount > 0) {
          queries.push(
            ...buildBudgetChangeQueries(
              budgetRow,
              -deployedAmount,
              departmentId,
              userId,
              `Initial funding for Revolving Fund #${newFundId}`,
            ),
          )
        }

        if (queries.length > 0) {
          await Transaction(queries)
        }
      } catch (txError) {
        // Compensate: the RF row committed above, but the downstream batch
        // failed — remove the orphaned RF row so we don't leave a fund with
        // no matching activity log / budget effect.
        try {
          const { sql: delSql, bindings: delBindings } = SQL.model(Revolving.Fund)
            .delete()
            .where(Revolving.Fund.pk, newFundId)
            .build()
          await Query(delSql, delBindings)
        } catch (compensationError) {
          console.error(
            `CRITICAL: failed to compensate orphaned revolving_fund id ${newFundId} after transaction failure:`,
            compensationError,
          )
        }
        throw txError
      }

      return res.status(200).json({
        message: 'Revolving fund created successfully',
        id: newFundId,
      })
    }
  } catch (error) {
    console.error('Error in upsertRevolvingFund:', error)
    return res
      .status(500)
      .json({ message: 'Error processing Revolving Fund record', error: error.message })
  }
}

/**
 * @name upsertClosedRevolvingFund
 * @description Submit/Report a Revolving Fund = CLOSE and SURRENDER it.
 *              Returns the fund's current rf_balance (remaining cash not
 *              committed to any Cash Disbursement) to its connected Budget,
 *              zeroes rf_balance, and sets status to CLOSED — never
 *              CLEARED directly, even with zero outstanding disbursements.
 *              Existing UNLIQUIDATED Cash Disbursements are left untouched
 *              and can still be liquidated afterward (see
 *              cashDisbursementController.js), which is the only path that
 *              can later move this fund from CLOSED to CLEARED. Blocked
 *              entirely if the fund is already CLOSED/CLEARED, so the same
 *              remaining cash can never be returned twice.
 */
const upsertClosedRevolvingFund = async (req, res) => {
  const userId = req.userId || req.user?.id || req.body.created_by || 1

  const {
    id,
    revolving_fund_id,
    beginning,
    cash_inflow,
    cash_outflow,
    ending,
    cashonhand,
    gcash,
    total_cash,
    sub_total,
    status,
    created_by,
    end_date,
  } = req.body

  const ClosedModel = Closed.RevolvingFund

  try {
    let closedRecordId = id

    if (id) {
      // Update existing submission record
      const updateData = {}
      if (revolving_fund_id !== undefined)
        updateData[ClosedModel.cols.revolving_fund_id] = revolving_fund_id
      if (beginning !== undefined) updateData[ClosedModel.cols.beginning] = parseNum(beginning)
      if (cash_inflow !== undefined)
        updateData[ClosedModel.cols.cash_inflow] = parseNum(cash_inflow)
      if (cash_outflow !== undefined)
        updateData[ClosedModel.cols.cash_outflow] = parseNum(cash_outflow)
      if (ending !== undefined) updateData[ClosedModel.cols.ending] = parseNum(ending)
      if (cashonhand !== undefined) updateData[ClosedModel.cols.cashonhand] = parseNum(cashonhand)
      if (gcash !== undefined) updateData[ClosedModel.cols.gcash] = parseNum(gcash)
      if (total_cash !== undefined) updateData[ClosedModel.cols.total_cash] = parseNum(total_cash)
      if (sub_total !== undefined) updateData[ClosedModel.cols.sub_total] = parseNum(sub_total)
      if (status !== undefined) updateData[ClosedModel.cols.status] = status
      if (created_by !== undefined) updateData[ClosedModel.cols.created_by] = created_by

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data provided to update' })
      }

      const updateQuery = SQL.model(ClosedModel)
        .update(updateData)
        .where(ClosedModel.pk, id)
        .build()
      const updateResult = await Query(updateQuery.sql, updateQuery.bindings)

      if (updateResult.affectedRows === 0) {
        return res.status(404).json({ message: 'Submitted Revolving Fund record not found' })
      }
    } else {
      // Create new submission record = SURRENDER the Revolving Fund.
      if (!revolving_fund_id) {
        return res.status(400).json({ message: 'Missing required field: revolving_fund_id' })
      }

      const validSubmitStatuses = ['BALANCED', 'SHORT', 'OVER']
      const submitStatus =
        status && validSubmitStatuses.includes(status.toUpperCase())
          ? status.toUpperCase()
          : 'BALANCED'

      // Submitting/reporting a fund means CLOSING and SURRENDERING it. The
      // fund's own rf_balance IS "remaining unused cash" — this codebase
      // already maintains it incrementally everywhere else (issue debits
      // it, a return/edit-decrease credits it back — see
      // cashDisbursementController.js), so it's exactly "fund amount minus
      // cash already committed to Cash Disbursements" with no extra
      // computation. Fetched fresh here (never trusted from the client) so
      // the amount actually swept to the budget can't be spoofed or stale.
      const rf = await getRevolvingFundById(revolving_fund_id)
      if (!rf) {
        return res.status(404).json({ message: 'Revolving fund not found' })
      }

      const rfStatus = rf[Revolving.Fund.cols.status]
      if (rfStatus === 'CLOSED' || rfStatus === 'CLEARED') {
        return res.status(400).json({
          message: `Revolving fund is already ${rfStatus} and cannot be submitted/surrendered again.`,
        })
      }

      const remainingCash = Math.round(parseNum(rf[Revolving.Fund.cols.balance]) * 100) / 100

      let budgetQueries = []
      let budgetReturnRemark = null

      if (remainingCash > 0) {
        const budgetId = rf[Revolving.Fund.cols.budget_id]
        const budgetRow = budgetId ? await getBudgetById(budgetId) : null

        if (!budgetRow) {
          return res.status(400).json({
            message: `Associated budget ${budgetId ?? '(none)'} not found — cannot return remaining cash.`,
          })
        }

        if (budgetRow[Budget.Budget.cols.status] === 'CLOSED') {
          return res.status(400).json({
            message: 'Cannot surrender this fund because its connected budget is CLOSED.',
          })
        }

        budgetQueries = buildBudgetChangeQueries(
          budgetRow,
          remainingCash,
          budgetRow[Budget.Budget.cols.department_id],
          userId,
          `Remaining cash surrendered from Revolving Fund #${revolving_fund_id} on submit/report — ₱${remainingCash.toFixed(2)} returned.`,
        )

        budgetReturnRemark = `₱${remainingCash.toFixed(2)} returned to Budget #${budgetId}.`
      }

      // crf_id is an autoincrement INTEGER — nothing downstream actually
      // needs it (the parent-status update and activity log only need
      // revolving_fund_id, already known), but the insert still can't
      // report its own insertId back through Transaction(), so it stays
      // standalone for consistency with the rest of this file's pattern.
      const insertQuery = SQL.model(ClosedModel)
        .insert({
          [ClosedModel.cols.revolving_fund_id]: revolving_fund_id,
          [ClosedModel.cols.beginning]: parseNum(beginning),
          [ClosedModel.cols.cash_inflow]: parseNum(cash_inflow),
          [ClosedModel.cols.cash_outflow]: parseNum(cash_outflow),
          [ClosedModel.cols.ending]: parseNum(ending),
          [ClosedModel.cols.cashonhand]: parseNum(cashonhand),
          [ClosedModel.cols.gcash]: parseNum(gcash),
          [ClosedModel.cols.total_cash]: parseNum(total_cash),
          [ClosedModel.cols.sub_total]: parseNum(sub_total),
          [ClosedModel.cols.status]: submitStatus,
          [ClosedModel.cols.created_by]: created_by || userId,
        })
        .build()

      const insertResult = await Query(insertQuery.sql, insertQuery.bindings)
      closedRecordId = insertResult.insertId

      try {
        // Status is decided by THIS fund's own outstanding transactions —
        // not by whether it happened to be used as someone else's
        // liquidation target. A disbursement counts toward a fund only via
        // cd.revolving_fund_id (its ORIGINAL fund), so a fund that was only
        // ever used to receive a cross-fund return/reimburse for another
        // fund's disbursement has zero of its own and goes straight to
        // CLEARED — it never passes through CLOSED. See
        // hasUnliquidatedDisbursements above.
        const hasOwnUnliquidated = await hasUnliquidatedDisbursements(revolving_fund_id)
        const newFundStatus = hasOwnUnliquidated ? 'CLOSED' : 'CLEARED'

        const updateParentQuery = SQL.model(Revolving.Fund)
          .update({
            [Revolving.Fund.cols.status]: newFundStatus,
            [Revolving.Fund.cols.balance]: 0,
            [Revolving.Fund.cols.ending]: remainingCash,
            ...(end_date !== undefined ? { [Revolving.Fund.cols.end_date]: end_date } : {}),
          })
          .where(Revolving.Fund.pk, revolving_fund_id)
          .build()

        const queries = [toTxQuery(updateParentQuery)]

        if (Revolving.FundActivity) {
          const activityQuery = SQL.model(Revolving.FundActivity)
            .insert({
              [Revolving.FundActivity.cols.revolving_fund_id]: revolving_fund_id,
              [Revolving.FundActivity.cols.remarks]:
                `Revolving Fund submitted/reported (reconciliation: ${submitStatus}) and surrendered. Status: ${newFundStatus}.` +
                (budgetReturnRemark ? ` ${budgetReturnRemark}` : ' No remaining cash to return.'),
              [Revolving.FundActivity.cols.user_id]: userId,
            })
            .build()

          queries.push(toTxQuery(activityQuery))
        }

        queries.push(...budgetQueries)

        await Transaction(queries)
      } catch (txError) {
        // Compensate: the closed-fund submission committed above, but
        // updating the parent fund's status/balance (and returning cash
        // to the budget) failed — remove the orphaned submission rather
        // than leave a reconciliation record whose parent fund was never
        // actually closed or credited back.
        try {
          const { sql: delSql, bindings: delBindings } = SQL.model(ClosedModel)
            .delete()
            .where(ClosedModel.pk, closedRecordId)
            .build()
          await Query(delSql, delBindings)
        } catch (compensationError) {
          console.error(
            `CRITICAL: failed to compensate orphaned closed_revolving_fund id ${closedRecordId} after transaction failure:`,
            compensationError,
          )
        }
        throw txError
      }
    }

    return res.status(200).json({
      message: id
        ? 'Submitted Revolving Fund record updated successfully'
        : 'Revolving Fund submitted and reconciled successfully',
      id: closedRecordId,
    })
  } catch (error) {
    console.error('Error in upsertClosedRevolvingFund:', error)
    return res
      .status(500)
      .json({ message: 'Error processing Closed Revolving Fund record', error: error.message })
  }
}

/**
 * @name upsertRevolvingFundActivity
 * @description Log activity entries manually
 */
const upsertRevolvingFundActivity = async (req, res) => {
  const userId = req.userId || req.user?.id || req.body.user_id || 1
  const { id, revolving_fund_id, remarks, user_id } = req.body

  try {
    let query
    if (id) {
      const updateData = {}
      if (revolving_fund_id !== undefined)
        updateData[Revolving.FundActivity.cols.revolving_fund_id] = revolving_fund_id
      if (remarks !== undefined) updateData[Revolving.FundActivity.cols.remarks] = remarks
      if (user_id !== undefined) updateData[Revolving.FundActivity.cols.user_id] = user_id

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data provided to update' })
      }

      query = SQL.model(Revolving.FundActivity)
        .update(updateData)
        .where(Revolving.FundActivity.pk, id)
        .build()
    } else {
      if (!revolving_fund_id || !remarks) {
        return res
          .status(400)
          .json({ message: 'Missing required fields: revolving_fund_id and remarks are required' })
      }

      query = SQL.model(Revolving.FundActivity)
        .insert({
          [Revolving.FundActivity.cols.revolving_fund_id]: revolving_fund_id,
          [Revolving.FundActivity.cols.remarks]: remarks,
          [Revolving.FundActivity.cols.user_id]: user_id || userId,
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'FundActivity record not found' })
    }

    return res.status(200).json({
      message: id ? 'Activity log updated successfully' : 'Activity log created successfully',
    })
  } catch (error) {
    console.error('Error in upsertRevolvingFundActivity:', error)
    return res
      .status(500)
      .json({ message: 'Error processing Revolving Fund Activity record', error: error.message })
  }
}

/**
 * @name getRevolvingFund
 */
const getRevolvingFund = async (req, res) => {
  const { status, budget_id } = req.query

  try {
    let queryBuilder = SQL.model(Revolving.Fund).select([
      Revolving.Fund.cols.id,
      Revolving.Fund.cols.budget_id,
      Revolving.Fund.cols.year,
      Revolving.Fund.cols.month,
      Revolving.Fund.cols.start_date,
      Revolving.Fund.cols.end_date,
      Revolving.Fund.cols.beginning,
      Revolving.Fund.cols.added,
      Revolving.Fund.cols.total_fund,
      Revolving.Fund.cols.issued,
      Revolving.Fund.cols.returned,
      Revolving.Fund.cols.outstanding,
      Revolving.Fund.cols.amount_expended,
      Revolving.Fund.cols.ending,
      Revolving.Fund.cols.liquidated,
      Revolving.Fund.cols.balance,
      Revolving.Fund.cols.status,
      Revolving.Fund.cols.createdAt,
    ])

    if (status) queryBuilder = queryBuilder.where(Revolving.Fund.cols.status, status)
    if (budget_id) queryBuilder = queryBuilder.where(Revolving.Fund.cols.budget_id, budget_id)

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getRevolvingFund:', error)
    return res
      .status(500)
      .json({ message: 'Error retrieving Revolving Fund records', error: error.message })
  }
}

/**
 * @name getRevolvingFundActivity
 */
const getRevolvingFundActivity = async (req, res) => {
  const { revolving_fund_id } = req.query

  try {
    let queryBuilder = SQL.model(Revolving.FundActivity).select([
      Revolving.FundActivity.cols.id,
      Revolving.FundActivity.cols.revolving_fund_id,
      Revolving.FundActivity.cols.remarks,
      Revolving.FundActivity.cols.user_id,
      Revolving.FundActivity.cols.createdAt,
    ])

    if (revolving_fund_id) {
      queryBuilder = queryBuilder.where(
        Revolving.FundActivity.cols.revolving_fund_id,
        revolving_fund_id,
      )
    }

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getRevolvingFundActivity:', error)
    return res
      .status(500)
      .json({ message: 'Error retrieving Revolving Fund Activity records', error: error.message })
  }
}

/**
 * @name getClosedRevolvingFund
 */
const getClosedRevolvingFund = async (req, res) => {
  const { revolving_fund_id } = req.query
  const ClosedModel = Closed.RevolvingFund

  try {
    let queryBuilder = SQL.model(ClosedModel).select([
      ClosedModel.cols.id,
      ClosedModel.cols.revolving_fund_id,
      ClosedModel.cols.beginning,
      ClosedModel.cols.cash_inflow,
      ClosedModel.cols.cash_outflow,
      ClosedModel.cols.ending,
      ClosedModel.cols.cashonhand,
      ClosedModel.cols.gcash,
      ClosedModel.cols.total_cash,
      ClosedModel.cols.sub_total,
      ClosedModel.cols.status,
      ClosedModel.cols.created_by,
      ClosedModel.cols.createdAt,
    ])

    if (revolving_fund_id) {
      queryBuilder = queryBuilder.where(ClosedModel.cols.revolving_fund_id, revolving_fund_id)
    }

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getClosedRevolvingFund:', error)
    return res
      .status(500)
      .json({ message: 'Error retrieving Closed Revolving Fund records', error: error.message })
  }
}

module.exports = {
  getRevolvingFund,
  upsertRevolvingFund,
  getRevolvingFundActivity,
  upsertRevolvingFundActivity,
  getClosedRevolvingFund,
  upsertClosedRevolvingFund,
}
