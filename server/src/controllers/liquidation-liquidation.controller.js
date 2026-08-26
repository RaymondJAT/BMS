const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Liquidation } = require('../database/models/Liquidation')
const { Cash } = require('../database/models/Cash')
const { Revolving } = require('../database/models/Revolving')
const SQL = new SQLQueryBuilder()

// ==========================================
// SHARED HELPERS (duplicated per this codebase's per-controller convention)
// ==========================================

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

const parseNum = (val, defaultVal = 0) => {
  if (val === null || val === undefined) return defaultVal
  const parsed = parseFloat(val)
  return isNaN(parsed) ? defaultVal : parsed
}

const toTxQuery = ({ sql, bindings }) => ({ sql, values: bindings })

const NON_ISSUABLE_RF_STATUSES = ['CLOSED', 'CLEARED', 'RETURN']

const computeCdStatus = (issued, returned, expended) => {
  const raw = parseNum(issued) - parseNum(returned) - parseNum(expended)
  const outstanding = Math.max(0, Math.round(raw * 100) / 100)
  const status = outstanding === 0 ? 'LIQUIDATED' : 'UNLIQUIDATED'
  return { outstanding, status }
}

const computeRfStatus = (currentStatus, hasActivity) => {
  if (currentStatus === 'CLOSED' || currentStatus === 'CLEARED' || currentStatus === 'RETURN') {
    return currentStatus
  }
  return hasActivity ? 'ON REVIEW' : currentStatus
}

const requireRole = (req, res, allowedRoles) => {
  const role = req.userRole || req.user?.role
  if (!role) {
    console.warn(
      `WARNING: role check skipped (no auth wired up yet) — endpoint requires one of [${allowedRoles.join(', ')}]`,
    )
    return true
  }
  if (!allowedRoles.includes(role)) {
    res
      .status(403)
      .json({
        message: `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
      })
    return false
  }
  return true
}

const getLiquidationById = async (id) => {
  const { sql, bindings } = SQL.model(Liquidation.Liquidation)
    .select(Liquidation.Liquidation.select)
    .where(Liquidation.Liquidation.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Liquidation.Liquidation)
}

const getLiquidationByCashRequestId = async (cashRequestId) => {
  const { sql, bindings } = SQL.model(Liquidation.Liquidation)
    .select(Liquidation.Liquidation.select)
    .where(Liquidation.Liquidation.cols.cash_request_id, cashRequestId)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Liquidation.Liquidation)
}

const getCashRequestById = async (id) => {
  const { sql, bindings } = SQL.model(Cash.Request)
    .select(Cash.Request.select)
    .where(Cash.Request.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Cash.Request)
}

const getDisbursementByCashRequestId = async (cashRequestId) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .select(Cash.Disbursement.select)
    .where(Cash.Disbursement.cols.cash_request_id, cashRequestId)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Cash.Disbursement)
}

const getDisbursementById = async (id) => {
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

/**
 * l_id has no dedicated reference-id column (unlike cash_request's
 * cr_reference_id) — derived rather than stored, to avoid inventing a
 * migration for something purely cosmetic.
 */
const toReferenceId = (id) => `LQ-${String(id).padStart(6, '0')}`

/**
 * True if this employee has a COMPLETED Cash Request whose Cash
 * Disbursement is still UNLIQUIDATED — independent of whether a
 * liquidation row exists yet (§3). Reused as-is by cash-request.controller.js.
 */
const hasOutstandingLiquidation = async (employeeId) => {
  const rows = await Query(
    `SELECT cd.cd_id
     FROM cash_disbursement cd
     INNER JOIN cash_request cr ON cr.cr_id = cd.cd_cash_request_id
     WHERE cr.cr_employee_id = ? AND cr.cr_status = 'COMPLETED' AND cd.cd_status = 'UNLIQUIDATED'
     LIMIT 1`,
    [employeeId],
  )
  return rows.length > 0
}
module.exports.hasOutstandingLiquidation = hasOutstandingLiquidation

const getCashRequestEligibility = async (req, res) => {
  const { employee_id } = req.query
  if (!employee_id)
    return res.status(400).json({ message: 'Missing required query param: employee_id' })
  try {
    const blocked = await hasOutstandingLiquidation(employee_id)
    return res.status(200).json({
      eligible: !blocked,
      message: blocked
        ? 'You cannot create a new Cash Request until your previous Cash Request has been fully liquidated.'
        : null,
    })
  } catch (error) {
    console.error('Error in getCashRequestEligibility:', error)
    return res.status(500).json({ message: 'Error checking eligibility' })
  }
}

/**
 * Every liquidation_item column below is NOT NULL per the migration —
 * date, rt, store_name, particulars, from, to, mode_of_transportation_id,
 * amount. No optional fields at line level in this schema.
 */
const validateItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 'At least one liquidation line is required.'
  }
  for (const item of items) {
    if (
      !item.date ||
      !item.rt ||
      !item.store_name ||
      !item.particulars ||
      !item.from ||
      !item.to ||
      !item.mode_of_transportation_id
    ) {
      return 'Each line requires date, RT#, store name, particulars, from, to, and mode of transportation.'
    }
    if (parseNum(item.amount) <= 0) {
      return 'Each line requires an amount greater than zero.'
    }
  }
  return null
}

const sumItemAmounts = (items) => items.reduce((sum, item) => sum + parseNum(item.amount), 0)

const buildItemInsertData = (liquidationId, item) => ({
  [Liquidation.Item.cols.liquidation_id]: liquidationId,
  [Liquidation.Item.cols.date]: item.date,
  [Liquidation.Item.cols.rt]: item.rt,
  [Liquidation.Item.cols.store_name]: item.store_name,
  [Liquidation.Item.cols.particulars]: item.particulars,
  [Liquidation.Item.cols.from]: item.from,
  [Liquidation.Item.cols.to]: item.to,
  [Liquidation.Item.cols.mode_of_transportation_id]: item.mode_of_transportation_id,
  [Liquidation.Item.cols.amount]: parseNum(item.amount),
})

// ==========================================
// WORKFLOW: CREATE (Requester) -> PENDING
// ==========================================

/**
 * @name createLiquidation
 * @description Requester submits a Liquidation for their own COMPLETED
 *              Cash Request. l_amount_obtained snapshots the linked Cash
 *              Disbursement's cd_amount_issued; l_amount_expended and
 *              l_reimburse_return are computed server-side from `items`,
 *              never trusted from the client.
 *
 *              `receipt` (Base64) is REQUIRED here — la_receipt is
 *              NOT NULL on liquidation_activity, and the schema attaches
 *              receipts at the submission/activity level, not per line
 *              item (liquidation_item has no receipt column).
 *
 *              l_reimburse_return sign convention: positive = Cash to
 *              Return (Requester owes the company), negative =
 *              Reimbursement (company owes the Requester).
 */
const createLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { cash_request_id, description, receipt, items } = req.body

  if (!cash_request_id || !description) {
    return res
      .status(400)
      .json({ message: 'Missing required fields: cash_request_id, description' })
  }
  if (!receipt) {
    return res.status(400).json({ message: 'A receipt image is required to submit a liquidation.' })
  }
  const itemError = validateItems(items)
  if (itemError) return res.status(400).json({ message: itemError })

  try {
    const cr = await getCashRequestById(cash_request_id)
    if (!cr) return res.status(404).json({ message: 'Cash request not found' })
    if (cr[Cash.Request.cols.status] !== 'COMPLETED') {
      return res.status(400).json({ message: 'Only a COMPLETED Cash Request can be liquidated.' })
    }

    const existing = await getLiquidationByCashRequestId(cash_request_id)
    if (existing) {
      return res.status(400).json({
        message: 'A liquidation already exists for this cash request.',
        liquidation_id: existing[Liquidation.Liquidation.cols.id],
      })
    }

    const cd = await getDisbursementByCashRequestId(cash_request_id)
    if (!cd)
      return res.status(400).json({ message: 'No Cash Disbursement found for this Cash Request.' })
    if (cd[Cash.Disbursement.cols.status] !== 'UNLIQUIDATED') {
      return res
        .status(400)
        .json({ message: 'This Cash Disbursement has already been liquidated.' })
    }

    const cashObtained = parseNum(cd[Cash.Disbursement.cols.amount_issued])
    const totalExpended = sumItemAmounts(items)
    const reimburseReturn = Math.round((cashObtained - totalExpended) * 100) / 100

    // l_id is autoincrement and the items/activity below need it, so this
    // insert stays standalone — same constraint as issueCashDisbursement.
    const insertQuery = SQL.model(Liquidation.Liquidation)
      .insert({
        [Liquidation.Liquidation.cols.cash_request_id]: cash_request_id,
        [Liquidation.Liquidation.cols.description]: description,
        [Liquidation.Liquidation.cols.amount_obtained]: cashObtained,
        [Liquidation.Liquidation.cols.amount_expended]: totalExpended,
        [Liquidation.Liquidation.cols.reimburse_return]: reimburseReturn,
        [Liquidation.Liquidation.cols.status]: 'PENDING',
      })
      .build()

    const insertResult = await Query(insertQuery.sql, insertQuery.bindings)
    const newLiquidationId = insertResult.insertId

    try {
      const itemQueries = items.map((item) =>
        toTxQuery(
          SQL.model(Liquidation.Item).insert(buildItemInsertData(newLiquidationId, item)).build(),
        ),
      )
      const activityQuery = SQL.model(Liquidation.Activity)
        .insert({
          [Liquidation.Activity.cols.liquidation_id]: newLiquidationId,
          [Liquidation.Activity.cols.action]: 'REQUESTED',
          [Liquidation.Activity.cols.remarks]:
            `Liquidation ${toReferenceId(newLiquidationId)} submitted for ₱${totalExpended.toFixed(2)}.`,
          [Liquidation.Activity.cols.receipt]: receipt,
          [Liquidation.Activity.cols.created_by]: userId,
        })
        .build()

      await Transaction([...itemQueries, toTxQuery(activityQuery)])
    } catch (txError) {
      try {
        const { sql: delSql, bindings: delBindings } = SQL.model(Liquidation.Liquidation)
          .delete()
          .where(Liquidation.Liquidation.pk, newLiquidationId)
          .build()
        await Query(delSql, delBindings)
      } catch (compensationError) {
        console.error(
          `CRITICAL: failed to compensate orphaned liquidation id ${newLiquidationId}:`,
          compensationError,
        )
      }
      throw txError
    }

    return res
      .status(201)
      .json({
        message: 'Liquidation submitted successfully',
        id: newLiquidationId,
        reference_id: toReferenceId(newLiquidationId),
      })
  } catch (error) {
    console.error('Error in createLiquidation:', error)
    return res.status(500).json({ message: 'Error creating liquidation' })
  }
}

// ==========================================
// WORKFLOW: UPDATE (Requester, PENDING/REJECTED/INCOMPLETE only)
// ==========================================

const updateLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, description, receipt, items } = req.body

  if (!id) return res.status(400).json({ message: 'Missing required field: id' })

  const itemError = items !== undefined ? validateItems(items) : null
  if (itemError) return res.status(400).json({ message: itemError })

  try {
    const lq = await getLiquidationById(id)
    if (!lq) return res.status(404).json({ message: 'Liquidation not found' })

    const currentStatus = lq[Liquidation.Liquidation.cols.status]
    if (!['PENDING', 'REJECTED', 'INCOMPLETE'].includes(currentStatus)) {
      return res.status(400).json({
        message: `Cannot edit a liquidation with status ${currentStatus}. Only PENDING, REJECTED, or INCOMPLETE liquidations can be edited.`,
      })
    }

    const updateData = { [Liquidation.Liquidation.cols.status]: 'PENDING' }
    if (description !== undefined)
      updateData[Liquidation.Liquidation.cols.description] = description

    let totalExpended = parseNum(lq[Liquidation.Liquidation.cols.amount_expended])
    if (items !== undefined) {
      totalExpended = sumItemAmounts(items)
      updateData[Liquidation.Liquidation.cols.amount_expended] = totalExpended
      const cashObtained = parseNum(lq[Liquidation.Liquidation.cols.amount_obtained])
      updateData[Liquidation.Liquidation.cols.reimburse_return] =
        Math.round((cashObtained - totalExpended) * 100) / 100
    }

    const queries = [
      toTxQuery(
        SQL.model(Liquidation.Liquidation)
          .update(updateData)
          .where(Liquidation.Liquidation.pk, id)
          .build(),
      ),
    ]

    if (items !== undefined) {
      queries.push(
        toTxQuery(
          SQL.model(Liquidation.Item)
            .delete()
            .where(Liquidation.Item.cols.liquidation_id, id)
            .build(),
        ),
      )
      items.forEach((item) => {
        queries.push(
          toTxQuery(SQL.model(Liquidation.Item).insert(buildItemInsertData(id, item)).build()),
        )
      })
    }

    queries.push(
      toTxQuery(
        SQL.model(Liquidation.Activity)
          .insert({
            [Liquidation.Activity.cols.liquidation_id]: id,
            [Liquidation.Activity.cols.action]: 'REQUESTED',
            [Liquidation.Activity.cols.remarks]:
              currentStatus === 'PENDING'
                ? 'Edited while pending Team Leader approval.'
                : `Edited and resubmitted after being returned as ${currentStatus} — back in the Team Leader queue.`,
            // la_receipt is NOT NULL — '' satisfies the constraint when no
            // new receipt is attached on this edit.
            [Liquidation.Activity.cols.receipt]: receipt || '',
            [Liquidation.Activity.cols.created_by]: userId,
          })
          .build(),
      ),
    )

    await Transaction(queries)
    return res.status(200).json({ message: 'Liquidation updated and resubmitted successfully' })
  } catch (error) {
    console.error('Error in updateLiquidation:', error)
    return res.status(500).json({ message: 'Error updating liquidation' })
  }
}

// ==========================================
// WORKFLOW: TEAM LEADER APPROVE (PENDING -> APPROVED)
// ==========================================

const approveLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!id) return res.status(400).json({ message: 'Missing required field: id' })
  if (!requireRole(req, res, ['TEAM_LEAD', 'ADMIN'])) return

  try {
    const lq = await getLiquidationById(id)
    if (!lq) return res.status(404).json({ message: 'Liquidation not found' })
    if (lq[Liquidation.Liquidation.cols.status] !== 'PENDING') {
      return res
        .status(400)
        .json({
          message: `Cannot approve a liquidation with status ${lq[Liquidation.Liquidation.cols.status]}. Only PENDING liquidations can be approved.`,
        })
    }

    const updateQuery = SQL.model(Liquidation.Liquidation)
      .update({ [Liquidation.Liquidation.cols.status]: 'APPROVED' })
      .where(Liquidation.Liquidation.pk, id)
      .build()
    const activityQuery = SQL.model(Liquidation.Activity)
      .insert({
        [Liquidation.Activity.cols.liquidation_id]: id,
        [Liquidation.Activity.cols.action]: 'CHECKED',
        [Liquidation.Activity.cols.remarks]: remarks || 'Checked and approved by Team Leader.',
        [Liquidation.Activity.cols.receipt]: '',
        [Liquidation.Activity.cols.created_by]: userId,
      })
      .build()

    await Transaction([toTxQuery(updateQuery), toTxQuery(activityQuery)])
    return res.status(200).json({ message: 'Liquidation approved successfully' })
  } catch (error) {
    console.error('Error in approveLiquidation:', error)
    return res.status(500).json({ message: 'Error approving liquidation' })
  }
}

// ==========================================
// WORKFLOW: REJECT (Team Leader while PENDING, Fund Custodian while APPROVED)
// ==========================================

/**
 * la_action has no dedicated value distinguishing "rejected" from "which
 * stage rejected it" — same constraint that forced the stage-prefix
 * technique in rejectCashRequest. Reused here.
 */
const rejectLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!id) return res.status(400).json({ message: 'Missing required field: id' })
  if (!remarks)
    return res
      .status(400)
      .json({ message: 'Missing required field: remarks (reason for rejection)' })
  if (!requireRole(req, res, ['TEAM_LEAD', 'FUND_CUSTODIAN', 'ADMIN'])) return

  try {
    const lq = await getLiquidationById(id)
    if (!lq) return res.status(404).json({ message: 'Liquidation not found' })

    const currentStatus = lq[Liquidation.Liquidation.cols.status]
    if (!['PENDING', 'APPROVED'].includes(currentStatus)) {
      return res
        .status(400)
        .json({ message: `Cannot reject a liquidation with status ${currentStatus}.` })
    }

    const rejectingStage = currentStatus === 'PENDING' ? 'Team Leader' : 'Fund Custodian'
    const prefixedRemarks = `Rejected by ${rejectingStage}: ${remarks}`

    const updateQuery = SQL.model(Liquidation.Liquidation)
      .update({ [Liquidation.Liquidation.cols.status]: 'REJECTED' })
      .where(Liquidation.Liquidation.pk, id)
      .build()
    const activityQuery = SQL.model(Liquidation.Activity)
      .insert({
        [Liquidation.Activity.cols.liquidation_id]: id,
        [Liquidation.Activity.cols.action]: 'REJECTED',
        [Liquidation.Activity.cols.remarks]: prefixedRemarks,
        [Liquidation.Activity.cols.receipt]: '',
        [Liquidation.Activity.cols.created_by]: userId,
      })
      .build()

    await Transaction([toTxQuery(updateQuery), toTxQuery(activityQuery)])
    return res.status(200).json({ message: 'Liquidation rejected successfully' })
  } catch (error) {
    console.error('Error in rejectLiquidation:', error)
    return res.status(500).json({ message: 'Error rejecting liquidation' })
  }
}

// ==========================================
// WORKFLOW: FUND CUSTODIAN VERIFY (APPROVED -> VERIFIED)
// ==========================================

const verifyLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!id) return res.status(400).json({ message: 'Missing required field: id' })
  if (!requireRole(req, res, ['FUND_CUSTODIAN', 'ADMIN'])) return

  try {
    const lq = await getLiquidationById(id)
    if (!lq) return res.status(404).json({ message: 'Liquidation not found' })
    if (lq[Liquidation.Liquidation.cols.status] !== 'APPROVED') {
      return res
        .status(400)
        .json({
          message: `Cannot verify a liquidation with status ${lq[Liquidation.Liquidation.cols.status]}. Only APPROVED liquidations can be verified.`,
        })
    }

    const updateQuery = SQL.model(Liquidation.Liquidation)
      .update({ [Liquidation.Liquidation.cols.status]: 'VERIFIED' })
      .where(Liquidation.Liquidation.pk, id)
      .build()
    const activityQuery = SQL.model(Liquidation.Activity)
      .insert({
        [Liquidation.Activity.cols.liquidation_id]: id,
        [Liquidation.Activity.cols.action]: 'APPROVED',
        [Liquidation.Activity.cols.remarks]: remarks || 'Verified by Fund Custodian.',
        [Liquidation.Activity.cols.receipt]: '',
        [Liquidation.Activity.cols.created_by]: userId,
      })
      .build()

    await Transaction([toTxQuery(updateQuery), toTxQuery(activityQuery)])
    return res.status(200).json({ message: 'Liquidation verified successfully' })
  } catch (error) {
    console.error('Error in verifyLiquidation:', error)
    return res.status(500).json({ message: 'Error verifying liquidation' })
  }
}

// ==========================================
// WORKFLOW: FINANCE COMPLETE (VERIFIED -> COMPLETED), settles the CD
// ==========================================

/**
 * @name completeLiquidation
 * @description Finance's final post-audit action — the ONLY step that
 *              touches Cash Disbursement / Revolving Fund. Mirrors the
 *              settlement cascades already in cashDisbursementController.js
 *              (expended posting + own-fund return branch) rather than
 *              inventing a new one. Uses l_amount_obtained/l_amount_expended
 *              as already stored — these are recomputed on every
 *              create/update, so by VERIFIED (no further edits possible)
 *              they're already final.
 */
const completeLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!id) return res.status(400).json({ message: 'Missing required field: id' })
  if (!requireRole(req, res, ['FINANCE', 'ADMIN'])) return

  try {
    const lq = await getLiquidationById(id)
    if (!lq) return res.status(404).json({ message: 'Liquidation not found' })
    if (lq[Liquidation.Liquidation.cols.status] !== 'VERIFIED') {
      return res
        .status(400)
        .json({
          message: `Cannot complete a liquidation with status ${lq[Liquidation.Liquidation.cols.status]}. Only VERIFIED liquidations can be completed.`,
        })
    }

    const cashRequestId = lq[Liquidation.Liquidation.cols.cash_request_id]
    const cd = await getDisbursementByCashRequestId(cashRequestId)
    if (!cd) return res.status(404).json({ message: 'Associated cash disbursement not found' })
    if (cd[Cash.Disbursement.cols.status] === 'LIQUIDATED') {
      return res.status(400).json({ message: 'This cash disbursement is already liquidated.' })
    }

    const cashReceived = parseNum(lq[Liquidation.Liquidation.cols.amount_obtained])
    const totalLiquidated = parseNum(lq[Liquidation.Liquidation.cols.amount_expended])
    const currentIssued = parseNum(cd[Cash.Disbursement.cols.amount_issued])
    const currentReturned = parseNum(cd[Cash.Disbursement.cols.amount_returned])

    const expendedToPost = Math.min(totalLiquidated, currentIssued - currentReturned)
    const cashToReturn = Math.max(0, cashReceived - totalLiquidated)
    const reimbursementOwed = Math.max(0, totalLiquidated - cashReceived)

    const newExpended = parseNum(cd[Cash.Disbursement.cols.amount_expended]) + expendedToPost
    const newReturned = currentReturned + cashToReturn
    const { outstanding: newOutstanding, status: newCdStatus } = computeCdStatus(
      currentIssued,
      newReturned,
      newExpended,
    )

    const rfId = cd[Cash.Disbursement.cols.revolving_fund_id]
    const rf = await getRevolvingFundById(rfId)
    if (!rf) return res.status(404).json({ message: 'Associated revolving fund not found' })

    const newRfLiquidated =
      parseNum(rf[Revolving.Fund.cols.liquidated]) + expendedToPost + cashToReturn
    const newRfExpended = parseNum(rf[Revolving.Fund.cols.amount_expended]) + expendedToPost
    const newRfBalance = parseNum(rf[Revolving.Fund.cols.balance]) + cashToReturn
    const newRfOutstanding = Math.max(
      0,
      parseNum(rf[Revolving.Fund.cols.outstanding]) - expendedToPost - cashToReturn,
    )
    const newRfStatus = computeRfStatus(rf[Revolving.Fund.cols.status], true)

    const cdId = cd[Cash.Disbursement.cols.id]
    const queries = [
      toTxQuery(
        SQL.model(Cash.Disbursement)
          .update({
            [Cash.Disbursement.cols.amount_expended]: newExpended,
            [Cash.Disbursement.cols.amount_returned]: newReturned,
            [Cash.Disbursement.cols.outstanding_amount]: newOutstanding,
            [Cash.Disbursement.cols.status]: newCdStatus,
          })
          .where(Cash.Disbursement.pk, cdId)
          .build(),
      ),
      toTxQuery(
        SQL.model(Cash.DisbursementActivity)
          .insert({
            [Cash.DisbursementActivity.cols.cash_disbursement_id]: cdId,
            [Cash.DisbursementActivity.cols.amount]: totalLiquidated,
            [Cash.DisbursementActivity.cols.remarks]:
              `Settled via Liquidation ${toReferenceId(id)} — expended ₱${expendedToPost.toFixed(2)}, returned ₱${cashToReturn.toFixed(2)}.`,
            [Cash.DisbursementActivity.cols.particulars]: 'Liquidation Settlement',
          })
          .build(),
      ),
      toTxQuery(
        SQL.model(Revolving.Fund)
          .update({
            [Revolving.Fund.cols.liquidated]: newRfLiquidated,
            [Revolving.Fund.cols.amount_expended]: newRfExpended,
            [Revolving.Fund.cols.balance]: newRfBalance,
            [Revolving.Fund.cols.outstanding]: newRfOutstanding,
            [Revolving.Fund.cols.status]: newRfStatus,
          })
          .where(Revolving.Fund.pk, rfId)
          .build(),
      ),
      toTxQuery(
        SQL.model(Liquidation.Liquidation)
          .update({ [Liquidation.Liquidation.cols.status]: 'COMPLETED' })
          .where(Liquidation.Liquidation.pk, id)
          .build(),
      ),
      toTxQuery(
        SQL.model(Liquidation.Activity)
          .insert({
            [Liquidation.Activity.cols.liquidation_id]: id,
            [Liquidation.Activity.cols.action]: 'RECEIVED',
            [Liquidation.Activity.cols.remarks]:
              remarks ||
              `Post-audit completed. Cash Disbursement settled — status: ${newCdStatus}.`,
            [Liquidation.Activity.cols.receipt]: '',
            [Liquidation.Activity.cols.created_by]: userId,
          })
          .build(),
      ),
    ]

    await Transaction(queries)

    return res.status(200).json({
      message: 'Liquidation completed successfully',
      cash_disbursement_status: newCdStatus,
      cash_to_return: cashToReturn,
      reimbursement_owed: reimbursementOwed,
    })
  } catch (error) {
    console.error('Error in completeLiquidation:', error)
    return res.status(500).json({ message: 'Error completing liquidation', error: error.message })
  }
}

/**
 * @name markLiquidationIncomplete
 * @description Finance flags a VERIFIED liquidation for correction
 *              without treating it as a Team-Leader/Fund-Custodian
 *              rejection (§8). la_action has no INCOMPLETE value, so this
 *              reuses REJECTED with a distinguishing remarks prefix —
 *              same technique as rejectLiquidation's stage prefix. Does
 *              NOT touch Cash Disbursement/Revolving Fund — nothing was
 *              settled.
 */
const markLiquidationIncomplete = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!id) return res.status(400).json({ message: 'Missing required field: id' })
  if (!remarks)
    return res.status(400).json({ message: 'Missing required field: remarks (what is incomplete)' })
  if (!requireRole(req, res, ['FINANCE', 'ADMIN'])) return

  try {
    const lq = await getLiquidationById(id)
    if (!lq) return res.status(404).json({ message: 'Liquidation not found' })
    if (lq[Liquidation.Liquidation.cols.status] !== 'VERIFIED') {
      return res
        .status(400)
        .json({
          message: `Cannot mark incomplete a liquidation with status ${lq[Liquidation.Liquidation.cols.status]}. Only VERIFIED liquidations can be marked incomplete.`,
        })
    }

    const updateQuery = SQL.model(Liquidation.Liquidation)
      .update({ [Liquidation.Liquidation.cols.status]: 'INCOMPLETE' })
      .where(Liquidation.Liquidation.pk, id)
      .build()
    const activityQuery = SQL.model(Liquidation.Activity)
      .insert({
        [Liquidation.Activity.cols.liquidation_id]: id,
        [Liquidation.Activity.cols.action]: 'REJECTED',
        [Liquidation.Activity.cols.remarks]: `Marked INCOMPLETE by Finance: ${remarks}`,
        [Liquidation.Activity.cols.receipt]: '',
        [Liquidation.Activity.cols.created_by]: userId,
      })
      .build()

    await Transaction([toTxQuery(updateQuery), toTxQuery(activityQuery)])
    return res.status(200).json({ message: 'Liquidation marked incomplete' })
  } catch (error) {
    console.error('Error in markLiquidationIncomplete:', error)
    return res.status(500).json({ message: 'Error marking liquidation incomplete' })
  }
}

// ==========================================
// READ ENDPOINTS (joined to cash_request since employee/department/
// reference aren't stored on liquidation itself)
// ==========================================

const getLiquidation = async (req, res) => {
  const { status, employee_id, cash_request_id } = req.query
  try {
    const conditions = []
    const params = []
    if (status) {
      conditions.push('l.l_status = ?')
      params.push(status)
    }
    if (employee_id) {
      conditions.push('cr.cr_employee_id = ?')
      params.push(employee_id)
    }
    if (cash_request_id) {
      conditions.push('l.l_cash_request_id = ?')
      params.push(cash_request_id)
    }
    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const rows = await Query(
      `SELECT
         l.l_id AS id,
         CONCAT('LQ-', LPAD(l.l_id, 6, '0')) AS reference_id,
         l.l_cash_request_id AS cash_request_id,
         l.l_description AS description,
         l.l_amount_obtained AS amount_obtained,
         l.l_amount_expended AS amount_expended,
         l.l_reimburse_return AS reimburse_return,
         l.l_status AS status,
         l.l_createdAt AS createdAt,
         cr.cr_reference_id AS cash_request_reference_id,
         cr.cr_employee_id AS employee_id,
         cr.cr_department_id AS department_id,
         cr.cr_project AS project
       FROM liquidation l
       INNER JOIN cash_request cr ON cr.cr_id = l.l_cash_request_id
       ${whereClause}
       ORDER BY l.l_id DESC`,
      params,
    )
    return res.status(200).json(rows)
  } catch (error) {
    console.error('Error in getLiquidation:', error)
    return res.status(500).json({ message: 'Error retrieving liquidations' })
  }
}

const getLiquidationDetail = async (req, res) => {
  const { id } = req.params
  try {
    const rows = await Query(
      `SELECT
         l.l_id AS id,
         CONCAT('LQ-', LPAD(l.l_id, 6, '0')) AS reference_id,
         l.l_cash_request_id AS cash_request_id,
         l.l_description AS description,
         l.l_amount_obtained AS amount_obtained,
         l.l_amount_expended AS amount_expended,
         l.l_reimburse_return AS reimburse_return,
         l.l_status AS status,
         l.l_createdAt AS createdAt,
         cr.cr_reference_id AS cash_request_reference_id,
         cr.cr_employee_id AS employee_id,
         cr.cr_department_id AS department_id,
         cr.cr_project AS project
       FROM liquidation l
       INNER JOIN cash_request cr ON cr.cr_id = l.l_cash_request_id
       WHERE l.l_id = ?`,
      [id],
    )
    const lq = rows[0]
    if (!lq) return res.status(404).json({ message: 'Liquidation not found' })

    const items = await Query(
      `SELECT
         li_id AS id,
         li_liquidation_id AS liquidation_id,
         li_date AS date,
         li_rt AS rt,
         li_store_name AS store_name,
         li_particulars AS particulars,
         li_from AS \`from\`,
         li_to AS \`to\`,
         li_mode_of_transportation_id AS mode_of_transportation_id,
         li_amount AS amount
       FROM liquidation_item
       WHERE li_liquidation_id = ?`,
      [id],
    )

    return res.status(200).json({ ...lq, items })
  } catch (error) {
    console.error('Error in getLiquidationDetail:', error)
    return res.status(500).json({ message: 'Error retrieving liquidation detail' })
  }
}

const getLiquidationActivity = async (req, res) => {
  const { liquidation_id } = req.query
  try {
    let queryBuilder = SQL.model(Liquidation.Activity).select(Liquidation.Activity.select)
    if (liquidation_id)
      queryBuilder = queryBuilder.where(Liquidation.Activity.cols.liquidation_id, liquidation_id)
    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)
    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getLiquidationActivity:', error)
    return res.status(500).json({ message: 'Error retrieving liquidation activity' })
  }
}

module.exports = {
  getLiquidation,
  getLiquidationDetail,
  getLiquidationActivity,
  createLiquidation,
  updateLiquidation,
  approveLiquidation,
  rejectLiquidation,
  verifyLiquidation,
  completeLiquidation,
  markLiquidationIncomplete,
  getCashRequestEligibility,
  hasOutstandingLiquidation,
}
