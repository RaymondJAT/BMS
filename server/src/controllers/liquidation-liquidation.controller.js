const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Liquidation } = require('../database/models/Liquidation')
const { Cash } = require('../database/models/Cash')
const { Revolving } = require('../database/models/Revolving')
const SQL = new SQLQueryBuilder()

// ==========================================
// ROW ACCESS (duplicated per this codebase's per-controller convention)
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

const getRevolvingFundById = async (id) => {
  const { sql, bindings } = SQL.model(Revolving.Fund)
    .select(Revolving.Fund.select)
    .where(Revolving.Fund.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Revolving.Fund)
}

/**
 * True if this employee has a COMPLETED Cash Request whose Cash
 * Disbursement is still UNLIQUIDATED. Settlement (and the resulting
 * LIQUIDATED status) happens at verifyLiquidation, not completeLiquidation
 * (see verifyLiquidation's docstring) — so this unblocks a Requester's
 * next Cash Request as soon as the Fund Custodian verifies, without
 * waiting for Finance's post-audit sign-off.
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

/**
 * True if the given fund has any UNLIQUIDATED cash_disbursement rows
 * OTHER than the one currently being settled. Duplicated from
 * cashDisbursementController.js — see that file's copy for full rationale.
 */
const hasOtherUnliquidatedDisbursements = async (fundId, excludeCdId) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .select([Cash.Disbursement.cols.id])
    .where(Cash.Disbursement.cols.revolving_fund_id, fundId)
    .where(Cash.Disbursement.cols.status, 'UNLIQUIDATED')
    .build()
  const rows = await Query(sql, bindings)
  return rows.some((r) => String(r.id) !== String(excludeCdId))
}

/**
 * A cash voucher may back at most 2 cash_disbursement rows (issue row +
 * one reimbursement row). Duplicated from cashDisbursementController.js
 * so a Liquidation-driven reimbursement obeys the same limit as a manual
 * one.
 */
const checkCashVoucherLimit = async (cashVoucher) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .select([Cash.Disbursement.cols.id])
    .where(Cash.Disbursement.cols.cash_voucher, cashVoucher)
    .build()
  const rows = await Query(sql, bindings)
  return rows.length
}

// ==========================================
// STATUS / MATH HELPERS
// ==========================================

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

/**
 * Decides whether a CLOSED fund should auto-transition to CLEARED as part
 * of this settlement. Duplicated from cashDisbursementController.js. Only
 * ever fires CLOSED -> CLEARED.
 */
const resolveClosedFundStatus = async (
  currentStatus,
  newOutstanding,
  fundId,
  settlingCdId,
  settlingCdNewStatus,
) => {
  if (currentStatus !== 'CLOSED') return currentStatus
  if (newOutstanding > 0 || settlingCdNewStatus !== 'LIQUIDATED') return 'CLOSED'
  const stillUnliquidated = await hasOtherUnliquidatedDisbursements(fundId, settlingCdId)
  return stillUnliquidated ? 'CLOSED' : 'CLEARED'
}

/**
 * l_id has no dedicated reference-id column (unlike cash_request's
 * cr_reference_id) — derived rather than stored, to avoid inventing a
 * migration for something purely cosmetic.
 */
const toReferenceId = (id) => `LQ-${String(id).padStart(6, '0')}`

/** "A, B, or C" — used to phrase the allowed-status list in error messages. */
const joinWithOr = (items) => {
  if (items.length <= 1) return items.join('')
  if (items.length === 2) return items.join(' or ')
  return `${items.slice(0, -1).join(', ')}, or ${items[items.length - 1]}`
}

// ==========================================
// WORKFLOW GUARDS
// ==========================================

const requireRole = (req, res, allowedRoles) => {
  const role = req.userRole || req.user?.role
  if (!role) {
    console.warn(
      `WARNING: role check skipped (no auth wired up yet) — endpoint requires one of [${allowedRoles.join(', ')}]`,
    )
    return true
  }
  if (!allowedRoles.includes(role)) {
    res.status(403).json({
      message: `This action requires one of the following roles: ${allowedRoles.join(', ')}.`,
    })
    return false
  }
  return true
}

/**
 * Fetches a Liquidation by id and confirms it's in one of the statuses an
 * action is allowed to run from. Centralizes the "missing id / not found /
 * wrong status" boilerplate every workflow-transition endpoint below
 * needs. On success returns the row; on failure it writes the response
 * itself and returns null, so callers just do:
 *
 *   const lq = await loadLiquidationForAction(res, id, {...})
 *   if (!lq) return
 *
 * `pastParticiple` is optional — omit it for actions (like reject) whose
 * error message doesn't list the allowed statuses.
 */
const loadLiquidationForAction = async (
  res,
  id,
  { allowedStatuses, infinitive, pastParticiple },
) => {
  if (!id) {
    res.status(400).json({ message: 'Missing required field: id' })
    return null
  }
  const lq = await getLiquidationById(id)
  if (!lq) {
    res.status(404).json({ message: 'Liquidation not found' })
    return null
  }
  const status = lq[Liquidation.Liquidation.cols.status]
  if (!allowedStatuses.includes(status)) {
    const suffix = pastParticiple
      ? ` Only ${joinWithOr(allowedStatuses)} liquidations can be ${pastParticiple}.`
      : ''
    res
      .status(400)
      .json({ message: `Cannot ${infinitive} a liquidation with status ${status}.${suffix}` })
    return null
  }
  return lq
}

/**
 * Every liquidation_item column below is NOT NULL per the migration —
 * date, rt, store_name, particulars, from, to, mode_of_transportation_id,
 * amount. No optional fields at line level in this schema. (li_particulars
 * is its own thing — an FK on liquidation_item — unrelated to
 * cash_disbursement's purpose field; see insertReimbursementDisbursement's
 * docstring below for why those two were previously confused.)
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
// SETTLEMENT MATH (extracted from verifyLiquidation)
// ==========================================

/**
 * Given what the Liquidation says was received/spent and the ORIGINAL
 * Cash Disbursement's current totals, works out:
 *   - expendedToPost: the plain-expense portion to post
 *   - cashToReturn: unused cash coming back to the fund
 *   - reimbursementOwed: cash owed to the Requester beyond what they
 *     were given
 * Return and Reimbursement are mutually exclusive by construction — one
 * of the two is always exactly 0. Also returns the ORIGINAL disbursement's
 * new expended/returned/outstanding/status after this settlement.
 */
const computeSettlementAmounts = (cashReceived, totalLiquidated, cd) => {
  const currentIssued = parseNum(cd[Cash.Disbursement.cols.amount_issued])
  const currentReturned = parseNum(cd[Cash.Disbursement.cols.amount_returned])
  const currentExpended = parseNum(cd[Cash.Disbursement.cols.amount_expended])

  const expendedToPost = Math.min(totalLiquidated, currentIssued - currentReturned)
  const cashToReturn = Math.max(0, cashReceived - totalLiquidated)
  const reimbursementOwed = Math.max(0, totalLiquidated - cashReceived)

  const newExpended = currentExpended + expendedToPost
  const newReturned = currentReturned + cashToReturn
  const { outstanding: newOutstanding, status: newCdStatus } = computeCdStatus(
    currentIssued,
    newReturned,
    newExpended,
  )

  return {
    totalLiquidated,
    expendedToPost,
    cashToReturn,
    reimbursementOwed,
    newExpended,
    newReturned,
    newOutstanding,
    newCdStatus,
  }
}

// ==========================================
// SETTLEMENT MATH (replaces computeFundSettlement)
// ==========================================

/**
 * Splits a settlement into its two independent effects:
 *   - `original`: the AR being settled (outstanding/expended/liquidated)
 *     — ALWAYS applied to the disbursement's own original fund,
 *     regardless of that fund's status. Mirrors
 *     recordExpendedCashDisbursement's "no status guard" behavior.
 *   - `target`: the physical cash movement (Return landing + any
 *     Reimbursement issued) — applied to the SELECTED fund, which
 *     defaults to the original fund but may be redirected to a
 *     different, active fund. Mirrors returnCashDisbursement/
 *     reimburseCashDisbursement's fund-selection pattern.
 * When original and target are the same fund, both delta sets are
 * summed onto ONE row (see verifyLiquidation) and reproduce the old
 * single-fund computeFundSettlement math exactly.
 */
const computeSettlementDeltas = (settlement) => {
  const { expendedToPost, cashToReturn, reimbursementOwed } = settlement
  return {
    original: {
      outstandingDelta: -(expendedToPost + cashToReturn),
      expendedDelta: expendedToPost,
      liquidatedDelta: expendedToPost + cashToReturn,
    },
    target: {
      returnedDelta: cashToReturn,
      balanceDelta: cashToReturn - reimbursementOwed,
      issuedDelta: reimbursementOwed,
      expendedDelta: reimbursementOwed,
      liquidatedDelta: reimbursementOwed,
    },
  }
}

/** Applies a delta set (see computeSettlementDeltas) onto a fund row's current values. */
const applyFundDeltas = (fund, deltas) => ({
  issued: parseNum(fund[Revolving.Fund.cols.issued]) + (deltas.issuedDelta || 0),
  returned: parseNum(fund[Revolving.Fund.cols.returned]) + (deltas.returnedDelta || 0),
  expended: parseNum(fund[Revolving.Fund.cols.amount_expended]) + (deltas.expendedDelta || 0),
  liquidated: parseNum(fund[Revolving.Fund.cols.liquidated]) + (deltas.liquidatedDelta || 0),
  balance: parseNum(fund[Revolving.Fund.cols.balance]) + (deltas.balanceDelta || 0),
  outstanding: Math.max(
    0,
    parseNum(fund[Revolving.Fund.cols.outstanding]) + (deltas.outstandingDelta || 0),
  ),
})

/**
 * A Reimbursement pulls NEW cash out of the fund's own balance — same
 * eligibility rules as a fresh issue (issueCashDisbursement/
 * reimburseCashDisbursement). Returns an error message, or null if the
 * fund can accept it. A plain Return needs no such guard — crediting
 * unused cash back is always allowed, even against a CLOSED fund.
 */
const checkReimbursementEligibility = (rf, reimbursementOwed) => {
  if (reimbursementOwed <= 0) return null
  const status = rf[Revolving.Fund.cols.status]
  if (NON_ISSUABLE_RF_STATUSES.includes(status)) {
    return `Cannot post reimbursement — the revolving fund has status ${status}.`
  }
  if (parseNum(rf[Revolving.Fund.cols.balance]) < reimbursementOwed) {
    return 'Insufficient revolving fund balance to cover the reimbursement.'
  }
  return null
}

/**
 * Posts the Reimbursement's own excess as a brand-new, immediately
 * LIQUIDATED cash_disbursement row against the same fund the original
 * disbursement drew from — identical shape to reimburseCashDisbursement
 * in cashDisbursementController.js, sharing the original's cash_voucher
 * (the "issue row + one reimbursement row per voucher" pairing
 * checkCashVoucherLimit exists to allow).
 *
 * cd_purpose is plain free text (copied straight from the original
 * disbursement, no lookup) — cash_disbursement no longer has a
 * particulars FK/master_particulars lookup at all (that was dropped in
 * favor of this free-text purpose field; li_particulars on
 * liquidation_item is a separate, still-FK column and is unaffected).
 * Using `Cash.Disbursement.cols.particulars` here was the bug: that key
 * no longer exists on the model, so `cd[undefined]` produced `undefined`
 * as the value AND `[undefined]` as the object key, which the query
 * builder rendered as the literal column name `cd_undefined`.
 *
 * NOT linked via cash_request_id (that column is 1:1 with the original
 * disbursement elsewhere in this codebase) — traceability lives in its
 * activity-log remarks and shared voucher instead. Standalone insert
 * because its generated id feeds its own activity insert and
 * Transaction() can't return generated ids mid-batch.
 */
const insertReimbursementDisbursement = async (cd, rfId, reimbursementOwed) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .insert({
      [Cash.Disbursement.cols.date_issued]: new Date(),
      [Cash.Disbursement.cols.received_by]: cd[Cash.Disbursement.cols.received_by],
      [Cash.Disbursement.cols.revolving_fund_id]: rfId,
      [Cash.Disbursement.cols.department_id]: cd[Cash.Disbursement.cols.department_id],
      [Cash.Disbursement.cols.purpose]: cd[Cash.Disbursement.cols.purpose],
      [Cash.Disbursement.cols.amount_issued]: reimbursementOwed,
      [Cash.Disbursement.cols.cash_voucher]: cd[Cash.Disbursement.cols.cash_voucher],
      [Cash.Disbursement.cols.amount_returned]: 0,
      [Cash.Disbursement.cols.outstanding_amount]: 0,
      [Cash.Disbursement.cols.amount_expended]: reimbursementOwed,
      [Cash.Disbursement.cols.status]: 'LIQUIDATED',
    })
    .build()
  const result = await Query(sql, bindings)
  return result.insertId
}

const deleteDisbursement = async (cdId) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .delete()
    .where(Cash.Disbursement.pk, cdId)
    .build()
  await Query(sql, bindings)
}

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

    return res.status(201).json({
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

/**
 * @name updateLiquidation
 * @description Requester edits their own liquidation. Allowed only while
 *              PENDING, REJECTED, or INCOMPLETE.
 *
 *              IMPORTANT — now that settlement happens at VERIFIED (see
 *              verifyLiquidation), an edit made here while status is
 *              INCOMPLETE (i.e. AFTER the Cash Disbursement/Revolving
 *              Fund were already settled by a prior VERIFIED pass) only
 *              updates this liquidation's own row/items. It does NOT, and
 *              currently CANNOT, unwind or reapply the already-settled
 *              cash_disbursement/revolving_fund changes — resubmitting
 *              such a liquidation will hit verifyLiquidation's
 *              already-LIQUIDATED guard and be rejected. Known workflow
 *              gap flagged for a product decision, not silently handled.
 */
const updateLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, description, receipt, items } = req.body

  const itemError = items !== undefined ? validateItems(items) : null
  if (itemError) return res.status(400).json({ message: itemError })

  const lq = await loadLiquidationForAction(res, id, {
    allowedStatuses: ['PENDING', 'REJECTED', 'INCOMPLETE'],
    infinitive: 'edit',
    pastParticiple: 'edited',
  })
  if (!lq) return

  try {
    const currentStatus = lq[Liquidation.Liquidation.cols.status]
    const updateData = { [Liquidation.Liquidation.cols.status]: 'PENDING' }
    if (description !== undefined)
      updateData[Liquidation.Liquidation.cols.description] = description

    if (items !== undefined) {
      const totalExpended = sumItemAmounts(items)
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

/**
 * @name approveLiquidation
 * @description Team Leader's first-pass approval. No financial effect —
 *              settlement doesn't happen until the Fund Custodian
 *              verifies (see verifyLiquidation).
 */
const approveLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!requireRole(req, res, ['TEAM_LEAD', 'ADMIN'])) return
  const lq = await loadLiquidationForAction(res, id, {
    allowedStatuses: ['PENDING'],
    infinitive: 'approve',
    pastParticiple: 'approved',
  })
  if (!lq) return

  try {
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
 * @name rejectLiquidation
 * @description Rejects a liquidation BEFORE settlement — allowed only
 *              from PENDING (Team Leader declining) or APPROVED (Fund
 *              Custodian declining before verifying/settling). Never from
 *              VERIFIED — by then the Cash Disbursement/Revolving Fund
 *              have already been settled (see markLiquidationIncomplete
 *              for the equivalent at that stage). No financial effect
 *              either way — the money hasn't moved yet at PENDING/APPROVED.
 */
const rejectLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!remarks)
    return res
      .status(400)
      .json({ message: 'Missing required field: remarks (reason for rejection)' })
  if (!requireRole(req, res, ['TEAM_LEAD', 'FUND_CUSTODIAN', 'ADMIN'])) return

  const lq = await loadLiquidationForAction(res, id, {
    allowedStatuses: ['PENDING', 'APPROVED'],
    infinitive: 'reject',
  })
  if (!lq) return

  try {
    const currentStatus = lq[Liquidation.Liquidation.cols.status]
    // PENDING = still with the Team Leader. APPROVED = Team-Lead-approved,
    // now with the Fund Custodian. This is the only reliable, no-migration
    // way to know who was rejecting, since l_status doesn't retain it
    // after the flip to REJECTED.
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
// THIS is where settlement actually happens.
// ==========================================

/**
 * @name verifyLiquidation
 * @description Fund Custodian's verification — settles the money.
 *
 *              Fund selection: `revolving_fund_id` in the body is the
 *              SELECTED/target fund that will actually receive any Cash
 *              to Return and/or fund any Reimbursement — defaults to the
 *              ORIGINAL disbursement's own fund when omitted. Mirrors
 *              returnCashDisbursement/reimburseCashDisbursement: the
 *              ORIGINAL fund (cash_disbursement.revolving_fund_id) never
 *              changes and always owns the AR being settled here — even
 *              if it's since gone CLOSED, since CLOSED alone must never
 *              block a liquidation — but the physical cash can be
 *              redirected to a different, active fund. When original and
 *              selected are the same fund (the common case), both
 *              effects land on the same row, identical to the old
 *              single-fund behavior.
 *
 *              If settling actually needs to move cash (Cash to Return
 *              and/or Reimbursement) and the selected fund is CLOSED (or,
 *              for a Reimbursement, CLOSED/CLEARED/RETURN or under-
 *              funded — see checkReimbursementEligibility), the request
 *              is rejected so the caller can resubmit with a different
 *              revolving_fund_id. A "Fully Liquidated" settlement (no
 *              Return, no Reimbursement) needs no fund selection at all.
 */
const verifyLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks, revolving_fund_id } = req.body

  if (!requireRole(req, res, ['FUND_CUSTODIAN', 'ADMIN'])) return
  const lq = await loadLiquidationForAction(res, id, {
    allowedStatuses: ['APPROVED'],
    infinitive: 'verify',
    pastParticiple: 'verified',
  })
  if (!lq) return

  try {
    const cashRequestId = lq[Liquidation.Liquidation.cols.cash_request_id]
    const cd = await getDisbursementByCashRequestId(cashRequestId)
    if (!cd) return res.status(404).json({ message: 'Associated cash disbursement not found' })
    if (cd[Cash.Disbursement.cols.status] === 'LIQUIDATED') {
      return res.status(400).json({
        message:
          'This cash disbursement is already liquidated — this liquidation cannot be re-verified (see verifyLiquidation docstring).',
      })
    }

    const cashReceived = parseNum(lq[Liquidation.Liquidation.cols.amount_obtained])
    const totalLiquidated = parseNum(lq[Liquidation.Liquidation.cols.amount_expended])
    const settlement = computeSettlementAmounts(cashReceived, totalLiquidated, cd)
    const {
      expendedToPost,
      cashToReturn,
      reimbursementOwed,
      newExpended,
      newReturned,
      newOutstanding,
      newCdStatus,
    } = settlement

    const cdId = cd[Cash.Disbursement.cols.id]
    const cdPurpose = cd[Cash.Disbursement.cols.purpose]
    const originalFundId = cd[Cash.Disbursement.cols.revolving_fund_id]
    const targetFundId = revolving_fund_id || originalFundId
    const isCrossFund = String(targetFundId) !== String(originalFundId)

    const originalFund = await getRevolvingFundById(originalFundId)
    if (!originalFund)
      return res.status(404).json({ message: 'Associated revolving fund not found' })

    const targetFund = isCrossFund ? await getRevolvingFundById(targetFundId) : originalFund
    if (!targetFund) return res.status(404).json({ message: 'Selected revolving fund not found' })

    // A plain Return, like returnCashDisbursement, only ever blocks a
    // CLOSED target explicitly. A Reimbursement additionally goes through
    // checkReimbursementEligibility (CLOSED/CLEARED/RETURN + balance).
    const movesCash = cashToReturn > 0 || reimbursementOwed > 0
    if (movesCash && targetFund[Revolving.Fund.cols.status] === 'CLOSED') {
      return res.status(400).json({
        message:
          'Cannot settle Cash to Return / Reimbursement against a closed revolving fund — select a different fund.',
      })
    }

    const eligibilityError = checkReimbursementEligibility(targetFund, reimbursementOwed)
    if (eligibilityError) return res.status(400).json({ message: eligibilityError })

    const originalCashVoucher = cd[Cash.Disbursement.cols.cash_voucher]
    if (reimbursementOwed > 0) {
      const voucherCount = await checkCashVoucherLimit(originalCashVoucher)
      if (voucherCount >= 2) {
        return res.status(400).json({
          message: `Cash voucher '${originalCashVoucher}' already has 2 associated disbursements — cannot post an additional reimbursement.`,
        })
      }
    }

    const deltas = computeSettlementDeltas(settlement)

    const originalStatus = originalFund[Revolving.Fund.cols.status]
    const newOriginalFields = applyFundDeltas(originalFund, deltas.original)
    const newOriginalStatus =
      originalStatus === 'CLOSED'
        ? await resolveClosedFundStatus(
            originalStatus,
            newOriginalFields.outstanding,
            originalFundId,
            cdId,
            newCdStatus,
          )
        : computeRfStatus(originalStatus, true)
    const didAutoClear = originalStatus === 'CLOSED' && newOriginalStatus === 'CLEARED'

    let newTargetFields
    let newTargetStatus
    if (!isCrossFund) {
      // Same row — sum both delta sets before applying once, so neither
      // write stomps the other. Reproduces the old single-fund math.
      newTargetFields = applyFundDeltas(targetFund, {
        outstandingDelta: deltas.original.outstandingDelta,
        expendedDelta: deltas.original.expendedDelta + deltas.target.expendedDelta,
        liquidatedDelta: deltas.original.liquidatedDelta + deltas.target.liquidatedDelta,
        returnedDelta: deltas.target.returnedDelta,
        balanceDelta: deltas.target.balanceDelta,
        issuedDelta: deltas.target.issuedDelta,
      })
      newTargetStatus = newOriginalStatus
    } else {
      newTargetFields = applyFundDeltas(targetFund, deltas.target)
      newTargetStatus = computeRfStatus(
        targetFund[Revolving.Fund.cols.status],
        parseNum(targetFund[Revolving.Fund.cols.issued]) > 0 ||
          deltas.target.returnedDelta > 0 ||
          deltas.target.issuedDelta > 0,
      )
    }

    const referenceId = toReferenceId(id)

    // Standalone insert first — its generated id feeds its own activity
    // insert below, and Transaction() can't return generated ids mid-batch.
    let reimbursementCdId = null
    if (reimbursementOwed > 0) {
      reimbursementCdId = await insertReimbursementDisbursement(cd, targetFundId, reimbursementOwed)
    }

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
              `Settled via Liquidation ${referenceId} (verified by Fund Custodian) — expended ₱${expendedToPost.toFixed(2)}, returned ₱${cashToReturn.toFixed(2)}${isCrossFund ? ` (credited to Fund #${targetFundId})` : ''}.`,
            [Cash.DisbursementActivity.cols.purpose]: cdPurpose,
          })
          .build(),
      ),
    ]

    if (!isCrossFund) {
      queries.push(
        toTxQuery(
          SQL.model(Revolving.Fund)
            .update({
              [Revolving.Fund.cols.issued]: newTargetFields.issued,
              [Revolving.Fund.cols.returned]: newTargetFields.returned,
              [Revolving.Fund.cols.amount_expended]: newTargetFields.expended,
              [Revolving.Fund.cols.liquidated]: newTargetFields.liquidated,
              [Revolving.Fund.cols.balance]: newTargetFields.balance,
              [Revolving.Fund.cols.outstanding]: newTargetFields.outstanding,
              [Revolving.Fund.cols.status]: newTargetStatus,
            })
            .where(Revolving.Fund.pk, originalFundId)
            .build(),
        ),
        toTxQuery(
          SQL.model(Revolving.FundActivity)
            .insert({
              [Revolving.FundActivity.cols.revolving_fund_id]: originalFundId,
              [Revolving.FundActivity.cols.remarks]: didAutoClear
                ? `Liquidation ${referenceId} fully settled this fund's outstanding — no remaining unliquidated disbursements. Status: CLOSED → CLEARED.`
                : `Liquidation ${referenceId} settled — expended ₱${expendedToPost.toFixed(2)}, returned ₱${cashToReturn.toFixed(2)}${reimbursementOwed > 0 ? `, reimbursed ₱${reimbursementOwed.toFixed(2)}` : ''} — issued (${newTargetFields.issued}), balance (${newTargetFields.balance}), outstanding (${newTargetFields.outstanding}), status: ${newTargetStatus}.`,
              [Revolving.FundActivity.cols.user_id]: userId,
            })
            .build(),
        ),
      )
    } else {
      queries.push(
        toTxQuery(
          SQL.model(Revolving.Fund)
            .update({
              [Revolving.Fund.cols.outstanding]: newOriginalFields.outstanding,
              [Revolving.Fund.cols.amount_expended]: newOriginalFields.expended,
              [Revolving.Fund.cols.liquidated]: newOriginalFields.liquidated,
              [Revolving.Fund.cols.status]: newOriginalStatus,
            })
            .where(Revolving.Fund.pk, originalFundId)
            .build(),
        ),
        toTxQuery(
          SQL.model(Revolving.Fund)
            .update({
              [Revolving.Fund.cols.issued]: newTargetFields.issued,
              [Revolving.Fund.cols.returned]: newTargetFields.returned,
              [Revolving.Fund.cols.balance]: newTargetFields.balance,
              [Revolving.Fund.cols.status]: newTargetStatus,
            })
            .where(Revolving.Fund.pk, targetFundId)
            .build(),
        ),
        toTxQuery(
          SQL.model(Revolving.FundActivity)
            .insert({
              [Revolving.FundActivity.cols.revolving_fund_id]: originalFundId,
              [Revolving.FundActivity.cols.remarks]: didAutoClear
                ? `Liquidation ${referenceId} fully settled via cash credited to Fund #${targetFundId} — no remaining unliquidated disbursements. Status: CLOSED → CLEARED.`
                : `Liquidation ${referenceId} settled — expended ₱${expendedToPost.toFixed(2)}, return/reimbursement credited to Fund #${targetFundId} — outstanding (${newOriginalFields.outstanding}), liquidated (${newOriginalFields.liquidated}), status: ${newOriginalStatus}.`,
              [Revolving.FundActivity.cols.user_id]: userId,
            })
            .build(),
        ),
        toTxQuery(
          SQL.model(Revolving.FundActivity)
            .insert({
              [Revolving.FundActivity.cols.revolving_fund_id]: targetFundId,
              [Revolving.FundActivity.cols.remarks]:
                `Received settlement for Liquidation ${referenceId} originally issued from Fund #${originalFundId} — returned ₱${cashToReturn.toFixed(2)}${reimbursementOwed > 0 ? `, reimbursed ₱${reimbursementOwed.toFixed(2)}` : ''} — issued (${newTargetFields.issued}), balance (${newTargetFields.balance}), status: ${newTargetStatus}.`,
              [Revolving.FundActivity.cols.user_id]: userId,
            })
            .build(),
        ),
      )
    }

    queries.push(
      toTxQuery(
        SQL.model(Liquidation.Liquidation)
          .update({ [Liquidation.Liquidation.cols.status]: 'VERIFIED' })
          .where(Liquidation.Liquidation.pk, id)
          .build(),
      ),
      toTxQuery(
        SQL.model(Liquidation.Activity)
          .insert({
            [Liquidation.Activity.cols.liquidation_id]: id,
            [Liquidation.Activity.cols.action]: 'APPROVED',
            [Liquidation.Activity.cols.remarks]:
              remarks ||
              `Verified by Fund Custodian — cash disbursement settled, status: ${newCdStatus}.`,
            [Liquidation.Activity.cols.receipt]: '',
            [Liquidation.Activity.cols.created_by]: userId,
          })
          .build(),
      ),
    )

    if (reimbursementCdId) {
      queries.push(
        toTxQuery(
          SQL.model(Cash.DisbursementActivity)
            .insert({
              [Cash.DisbursementActivity.cols.cash_disbursement_id]: reimbursementCdId,
              [Cash.DisbursementActivity.cols.amount]: reimbursementOwed,
              [Cash.DisbursementActivity.cols.remarks]:
                `Reimbursement for Liquidation ${referenceId} — Cash Request #${cashRequestId}, original Disbursement #${cdId}: ₱${reimbursementOwed.toFixed(2)} spent beyond the amount originally received.`,
              [Cash.DisbursementActivity.cols.purpose]: cdPurpose,
            })
            .build(),
        ),
      )
    }

    try {
      await Transaction(queries)
    } catch (txError) {
      if (reimbursementCdId) {
        try {
          await deleteDisbursement(reimbursementCdId)
        } catch (compensationError) {
          console.error(
            `CRITICAL: failed to compensate orphaned reimbursement cash_disbursement id ${reimbursementCdId} after transaction failure:`,
            compensationError,
          )
        }
      }
      throw txError
    }

    return res.status(200).json({
      message: 'Liquidation verified successfully — cash disbursement settled.',
      cash_disbursement_status: newCdStatus,
      cash_to_return: cashToReturn,
      reimbursement_owed: reimbursementOwed,
      reimbursement_cash_disbursement_id: reimbursementCdId,
      revolving_fund_id: targetFundId,
    })
  } catch (error) {
    console.error('Error in verifyLiquidation:', error)
    return res.status(500).json({ message: 'Error verifying liquidation', error: error.message })
  }
}

// ==========================================
// WORKFLOW: FINANCE POST-AUDIT (VERIFIED -> COMPLETED)
// No financial effect — settlement already happened at VERIFIED.
// ==========================================

/**
 * @name completeLiquidation
 * @description Finance's post-audit sign-off. Settlement has ALREADY
 *              happened by this point (see verifyLiquidation) — pure
 *              record-keeping status flip, no effect on Cash Disbursement
 *              or Revolving Fund. Kept as a separate stage because
 *              Finance's review is a compliance/audit check on paperwork
 *              that already-moved money, not a financial gate.
 */
const completeLiquidation = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!requireRole(req, res, ['FINANCE', 'ADMIN'])) return
  const lq = await loadLiquidationForAction(res, id, {
    allowedStatuses: ['VERIFIED'],
    infinitive: 'complete',
    pastParticiple: 'completed',
  })
  if (!lq) return

  try {
    const updateQuery = SQL.model(Liquidation.Liquidation)
      .update({ [Liquidation.Liquidation.cols.status]: 'COMPLETED' })
      .where(Liquidation.Liquidation.pk, id)
      .build()
    const activityQuery = SQL.model(Liquidation.Activity)
      .insert({
        [Liquidation.Activity.cols.liquidation_id]: id,
        [Liquidation.Activity.cols.action]: 'RECEIVED',
        [Liquidation.Activity.cols.remarks]:
          remarks ||
          'Post-audit complete — no further financial changes (already settled at verification).',
        [Liquidation.Activity.cols.receipt]: '',
        [Liquidation.Activity.cols.created_by]: userId,
      })
      .build()

    await Transaction([toTxQuery(updateQuery), toTxQuery(activityQuery)])

    return res.status(200).json({ message: 'Liquidation post-audit completed successfully' })
  } catch (error) {
    console.error('Error in completeLiquidation:', error)
    return res.status(500).json({ message: 'Error completing liquidation' })
  }
}

/**
 * @name markLiquidationIncomplete
 * @description Finance flags a VERIFIED liquidation for correction during
 *              post-audit, without treating it as a rejection. l_action
 *              has no INCOMPLETE value, so this reuses REJECTED with a
 *              distinguishing remarks prefix — same technique as
 *              rejectLiquidation's stage prefix.
 *
 *              IMPORTANT: does NOT reverse the Cash Disbursement/Revolving
 *              Fund settlement — that already happened at verifyLiquidation
 *              and this function has no way to undo it (see that
 *              function's docstring on the resubmit/re-verify dead end
 *              this creates). Use for a documentation/paperwork issue on
 *              an already-settled liquidation, not for cases where the
 *              settled amounts themselves need to change.
 */
const markLiquidationIncomplete = async (req, res) => {
  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!remarks)
    return res.status(400).json({ message: 'Missing required field: remarks (what is incomplete)' })
  if (!requireRole(req, res, ['FINANCE', 'ADMIN'])) return

  const lq = await loadLiquidationForAction(res, id, {
    allowedStatuses: ['VERIFIED'],
    infinitive: 'mark incomplete',
    pastParticiple: 'marked incomplete',
  })
  if (!lq) return

  try {
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
