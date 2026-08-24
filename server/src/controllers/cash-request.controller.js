const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Cash } = require('../database/models/Cash')
const { Revolving } = require('../database/models/Revolving')
const SQL = new SQLQueryBuilder()

// ==========================================
// SHARED HELPERS
// (duplicated rather than imported from cashDisbursementController.js /
// revolvingFundController.js — matches this codebase's existing
// per-controller pattern; see buildBudgetChangeQueries's docstring in
// revolvingFundController.js for the same call.)
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

/**
 * Transaction() expects an array of { sql, values }, but the query builder's
 * .build() returns { sql, bindings }. This adapts one to the other.
 */
const toTxQuery = ({ sql, bindings }) => ({ sql, values: bindings })

/**
 * Fund statuses that can never accept NEW cash leaving them. Identical to
 * cashDisbursementController.js's NON_ISSUABLE_RF_STATUSES — a Cash
 * Request being completed pulls cash out of its fund exactly like a fresh
 * issue does, so the same guard applies.
 */
const NON_ISSUABLE_RF_STATUSES = ['CLOSED', 'CLEARED', 'RETURN']

/**
 * Recomputes a freshly-created cash_disbursement row's outstanding/status.
 * Copied from cashDisbursementController.js. For a Cash-Request-generated
 * disbursement this always resolves to (outstanding = amount, status =
 * UNLIQUIDATED) since returned/expended start at 0 — kept as a function
 * rather than inlined so the invariant stays obviously identical to every
 * other place a cash_disbursement row is created.
 */
const computeCdStatus = (issued, returned, expended) => {
  const raw = parseNum(issued) - parseNum(returned) - parseNum(expended)
  const outstanding = Math.max(0, Math.round(raw * 100) / 100)
  const status = outstanding === 0 ? 'LIQUIDATED' : 'UNLIQUIDATED'
  return { outstanding, status }
}

/**
 * Copied from cashDisbursementController.js. Moves a fund into ON REVIEW
 * the moment it has activity; never touches CLOSED/CLEARED/RETURN.
 */
const computeRfStatus = (currentStatus, hasActivity) => {
  if (currentStatus === 'CLOSED' || currentStatus === 'CLEARED' || currentStatus === 'RETURN') {
    return currentStatus
  }
  return hasActivity ? 'ON REVIEW' : currentStatus
}

const getCashRequestById = async (id) => {
  const { sql, bindings } = SQL.model(Cash.Request)
    .select(Cash.Request.select)
    .where(Cash.Request.pk, id)
    .build()
  const [row] = await Query(sql, bindings)
  return wrapRow(row, Cash.Request)
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
 * Duplicate-disbursement guard for §11 of the spec: at most one
 * cash_disbursement may ever reference a given cash_request_id.
 */
/**
 * cash_disbursement_activity.cda_particulars is a free-text STRING(300)
 * column with no FK — unlike cash_disbursement.cd_particulars, which is an
 * FK integer to master_particulars. Copied from
 * cashDisbursementController.js so the activity log reads the same
 * category name convention everywhere, instead of a raw id.
 */
const getParticularsNameById = async (particularsId) => {
  const rows = await Query(`SELECT mpt_name FROM master_particulars WHERE mpt_id = ?`, [
    particularsId,
  ])
  return rows[0]?.mpt_name || null
}

const getDisbursementForCashRequest = async (cashRequestId) => {
  const { sql, bindings } = SQL.model(Cash.Disbursement)
    .select([Cash.Disbursement.cols.id])
    .where(Cash.Disbursement.cols.cash_request_id, cashRequestId)
    .build()
  const rows = await Query(sql, bindings)
  return rows[0] || null
}

/**
 * Reference IDs follow the same CR-YYMMDD-#### scheme as BMS V1
 * (createcash_request in the V1 router), just recomputed here rather than
 * shared, per this file's stated no-cross-controller-imports convention.
 */
const generateReferenceId = async () => {
  const rows = await Query(
    `SELECT MAX(CAST(SUBSTRING_INDEX(cr_reference_id, '-', -1) AS UNSIGNED)) AS max_sequence
     FROM cash_request
     WHERE cr_reference_id LIKE CONCAT('CR-', DATE_FORMAT(NOW(), '%y%m%d'), '-%')`,
  )
  const maxSequence = rows[0]?.max_sequence || 0
  const now = new Date()
  const year = String(now.getFullYear()).slice(-2)
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const sequence = String(maxSequence + 1).padStart(4, '0')
  return `CR-${year}${month}${day}-${sequence}`
}

/**
 * TEMP: no real RBAC wired up yet, matching the `req.userId || req.user?.id
 * || 1` fallback used everywhere else in this codebase. Until auth lands,
 * this ENFORCES the check whenever a role is actually present on the
 * request, and only WARNS (never silently passes without a trace) when
 * it's missing — so it's visible in logs exactly which endpoints are still
 * running without real authorization, instead of that fact being invisible
 * until a permissions bug ships. Replace the `if (!role)` branch with a
 * hard 401/403 once auth is wired up.
 *
 * @param {string[]} allowedRoles
 */
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

// ==========================================
// WORKFLOW: CREATE (Requester) -> PENDING
// ==========================================

/**
 * @name createCashRequest
 * @description Requester creates a Cash Request. Status is always PENDING
 *              on creation — no Cash Disbursement, no Revolving Fund
 *              deduction, no Budget utilization happens at this stage; the
 *              request is purely a request until Team Lead approval and
 *              Fund Custodian completion (see completeCashRequest).
 *
 *              BMS V1 → V2 field mapping: V1's `Particulars` becomes V2's
 *              `Purpose`; `Project` is new in V2 and has no V1 equivalent.
 *
 *              The target Revolving Fund is checked for basic eligibility
 *              (not CLOSED/CLEARED/RETURN) at creation so a request isn't
 *              allowed to sit in PENDING/APPROVED only to fail for a
 *              reason that was already knowable up front — but balance
 *              itself is NOT checked here, since the fund's available
 *              balance can legitimately change between request and
 *              completion; that check happens for real at completion time.
 */
const createCashRequest = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Requester creates a Cash Request. Always starts PENDING — no financial effect yet.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /*
    #swagger.parameters['project'] = { in: 'formData', type: 'string', required: true, description: 'Project this request is charged against' }
    #swagger.parameters['purpose'] = { in: 'formData', type: 'string', required: true, description: 'Purpose of the request (BMS V1 Particulars equivalent)' }
    #swagger.parameters['amount'] = { in: 'formData', type: 'number', required: true, description: 'Requested amount' }
    #swagger.parameters['revolving_fund_id'] = { in: 'formData', type: 'integer', required: true, description: 'Revolving Fund this request will draw from once completed' }
    #swagger.parameters['employee_id'] = { in: 'formData', type: 'integer', required: true, description: 'Requesting employee id (master_employee.me_id)' }
    #swagger.parameters['department_id'] = { in: 'formData', type: 'integer', required: true, description: 'Department id (master_department.md_id)' }
    #swagger.parameters['team_lead'] = { in: 'formData', type: 'string', required: true, description: 'Team lead name/identifier responsible for approval' }
    #swagger.parameters['request_date'] = { in: 'formData', type: 'string', required: false, description: 'Request date, defaults to now' }
  */

  const userId = req.userId || req.user?.id || 1
  const {
    project,
    purpose,
    amount,
    revolving_fund_id,
    employee_id,
    department_id,
    team_lead,
    request_date,
  } = req.body

  if (
    !project ||
    !purpose ||
    amount === undefined ||
    !revolving_fund_id ||
    !employee_id ||
    !department_id ||
    !team_lead
  ) {
    return res.status(400).json({
      message:
        'Missing required fields: project, purpose, amount, revolving_fund_id, employee_id, department_id, team_lead',
    })
  }

  const requestAmount = parseNum(amount)
  if (requestAmount <= 0) {
    return res.status(400).json({ message: 'amount must be greater than zero' })
  }

  try {
    const rf = await getRevolvingFundById(revolving_fund_id)
    if (!rf) {
      return res.status(404).json({ message: 'Revolving fund not found' })
    }

    const rfStatus = rf[Revolving.Fund.cols.status]
    if (NON_ISSUABLE_RF_STATUSES.includes(rfStatus)) {
      return res.status(400).json({
        message: `Cannot request cash against a revolving fund with status ${rfStatus}.`,
      })
    }

    const referenceId = await generateReferenceId()

    // cr_id is autoincrement and the activity insert below needs it, so —
    // same pattern as issueCashDisbursement — this insert stays standalone
    // rather than batching into the activity's transaction.
    const insertQuery = SQL.model(Cash.Request)
      .insert({
        [Cash.Request.cols.reference_id]: referenceId,
        // cv_number is finalized at completion, not creation (mirrors V1's
        // createcash_request, which also inserts a placeholder here) —
        // cr_cv_number is NOT NULL, so an empty string stands in until
        // completeCashRequest sets the real voucher number.
        [Cash.Request.cols.cv_number]: '',
        [Cash.Request.cols.purpose]: purpose,
        [Cash.Request.cols.project]: project,
        [Cash.Request.cols.amount]: requestAmount,
        [Cash.Request.cols.revolving_fund_id]: revolving_fund_id,
        [Cash.Request.cols.employee_id]: employee_id,
        [Cash.Request.cols.department_id]: department_id,
        [Cash.Request.cols.team_lead]: team_lead,
        [Cash.Request.cols.request_date]: request_date || new Date(),
        [Cash.Request.cols.status]: 'PENDING',
      })
      .build()

    const insertResult = await Query(insertQuery.sql, insertQuery.bindings)
    const newRequestId = insertResult.insertId

    try {
      const activityQuery = SQL.model(Cash.RequestActivity)
        .insert({
          [Cash.RequestActivity.cols.user_id]: userId,
          [Cash.RequestActivity.cols.cash_request_id]: newRequestId,
          [Cash.RequestActivity.cols.action]: 'REQUESTED',
          [Cash.RequestActivity.cols.remarks]:
            `Cash request ${referenceId} created for ₱${requestAmount.toFixed(2)}.`,
        })
        .build()

      await Transaction([toTxQuery(activityQuery)])
    } catch (txError) {
      // Compensate: the request row committed above, but its activity log
      // failed — remove the orphaned request rather than leave a Cash
      // Request with no creation record.
      try {
        const { sql: delSql, bindings: delBindings } = SQL.model(Cash.Request)
          .delete()
          .where(Cash.Request.pk, newRequestId)
          .build()
        await Query(delSql, delBindings)
      } catch (compensationError) {
        console.error(
          `CRITICAL: failed to compensate orphaned cash_request id ${newRequestId} after transaction failure:`,
          compensationError,
        )
      }
      throw txError
    }

    return res.status(201).json({
      message: 'Cash request created successfully',
      id: newRequestId,
      reference_id: referenceId,
    })
  } catch (error) {
    console.error('Error in createCashRequest:', error)
    return res.status(500).json({ message: 'Error creating cash request' })
  }
}

// ==========================================
// WORKFLOW: APPROVE (Team Lead) -> APPROVED
// ==========================================

/**
 * @name approveCashRequest
 * @description Team Lead approves a PENDING Cash Request. Only flips
 *              status to APPROVED — no Cash Disbursement, no financial
 *              effect. Only PENDING requests can be approved.
 */
const approveCashRequest = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Team Lead approves a PENDING Cash Request. No financial effect — see completeCashRequest for that.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /*
    #swagger.parameters['id'] = { in: 'formData', type: 'integer', required: true, description: 'Cash request id' }
    #swagger.parameters['remarks'] = { in: 'formData', type: 'string', required: false, description: 'Optional approval remarks' }
  */

  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!id) {
    return res.status(400).json({ message: 'Missing required field: id' })
  }

  if (!requireRole(req, res, ['TEAM_LEAD', 'ADMIN'])) return

  try {
    const cr = await getCashRequestById(id)
    if (!cr) {
      return res.status(404).json({ message: 'Cash request not found' })
    }

    const currentStatus = cr[Cash.Request.cols.status]
    if (currentStatus !== 'PENDING') {
      return res.status(400).json({
        message: `Cannot approve a cash request with status ${currentStatus}. Only PENDING requests can be approved.`,
      })
    }

    const updateQuery = SQL.model(Cash.Request)
      .update({ [Cash.Request.cols.status]: 'APPROVED' })
      .where(Cash.Request.pk, id)
      .build()

    const activityQuery = SQL.model(Cash.RequestActivity)
      .insert({
        [Cash.RequestActivity.cols.user_id]: userId,
        [Cash.RequestActivity.cols.cash_request_id]: id,
        [Cash.RequestActivity.cols.action]: 'APPROVED',
        [Cash.RequestActivity.cols.remarks]: remarks || 'Approved by team lead.',
      })
      .build()

    await Transaction([toTxQuery(updateQuery), toTxQuery(activityQuery)])

    return res.status(200).json({ message: 'Cash request approved successfully' })
  } catch (error) {
    console.error('Error in approveCashRequest:', error)
    return res.status(500).json({ message: 'Error approving cash request' })
  }
}

// ==========================================
// WORKFLOW: REJECT -> REJECTED
// ==========================================

/**
 * @name rejectCashRequest
 * @description Reject a Cash Request that hasn't been completed yet.
 *              Allowed from PENDING (Team Lead declining) or APPROVED
 *              (Fund Custodian declining before releasing cash) — never
 *              from COMPLETED, which is terminal.
 */
const rejectCashRequest = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Reject a PENDING or APPROVED Cash Request. No financial effect.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /*
    #swagger.parameters['id'] = { in: 'formData', type: 'integer', required: true, description: 'Cash request id' }
    #swagger.parameters['remarks'] = { in: 'formData', type: 'string', required: true, description: 'Reason for rejection' }
  */

  const userId = req.userId || req.user?.id || 1
  const { id, remarks } = req.body

  if (!id) {
    return res.status(400).json({ message: 'Missing required field: id' })
  }
  if (!remarks) {
    return res
      .status(400)
      .json({ message: 'Missing required field: remarks (reason for rejection)' })
  }

  if (!requireRole(req, res, ['TEAM_LEAD', 'FUND_CUSTODIAN', 'ADMIN'])) return

  try {
    const cr = await getCashRequestById(id)
    if (!cr) {
      return res.status(404).json({ message: 'Cash request not found' })
    }

    const currentStatus = cr[Cash.Request.cols.status]
    if (!['PENDING', 'APPROVED'].includes(currentStatus)) {
      return res.status(400).json({
        message: `Cannot reject a cash request with status ${currentStatus}.`,
      })
    }

    const updateQuery = SQL.model(Cash.Request)
      .update({ [Cash.Request.cols.status]: 'REJECTED' })
      .where(Cash.Request.pk, id)
      .build()

    const activityQuery = SQL.model(Cash.RequestActivity)
      .insert({
        [Cash.RequestActivity.cols.user_id]: userId,
        [Cash.RequestActivity.cols.cash_request_id]: id,
        [Cash.RequestActivity.cols.action]: 'REJECTED',
        [Cash.RequestActivity.cols.remarks]: remarks,
      })
      .build()

    await Transaction([toTxQuery(updateQuery), toTxQuery(activityQuery)])

    return res.status(200).json({ message: 'Cash request rejected successfully' })
  } catch (error) {
    console.error('Error in rejectCashRequest:', error)
    return res.status(500).json({ message: 'Error rejecting cash request' })
  }
}

// ==========================================
// WORKFLOW: COMPLETE (Fund Custodian) -> COMPLETED
// Creates the Cash Disbursement (the actual financial transaction).
// ==========================================

/**
 * @name completeCashRequest
 * @description Fund Custodian completes an APPROVED Cash Request. This is
 *              the ONLY step that creates real money movement: it
 *              generates exactly one cash_disbursement row (status
 *              UNLIQUIDATED) against the request's Revolving Fund and
 *              cascades to that fund's issued/outstanding/balance/status —
 *              identical to issueCashDisbursement's cascade in
 *              cashDisbursementController.js, since completing a request
 *              IS a fresh cash issuance in every way that matters
 *              financially. It does NOT touch Budget directly, for the
 *              same reason issueCashDisbursement doesn't: the Budget was
 *              already debited when this fund was funded/topped-up, and
 *              the Budget's Deployed/Remaining figures are derived live
 *              from the fund's own balance+outstanding — never a separate
 *              counter — so nothing here can double-count.
 *
 *              The Cash Request itself is a workflow/approval record, not
 *              a financial one — its ₱ amount is never separately added to
 *              any utilization total. Only the resulting Cash Disbursement
 *              is the financial source of truth (see spec §7).
 *
 *              Idempotent: a request that's already COMPLETED, or that
 *              already has a linked cash_disbursement row for any reason,
 *              is rejected outright — at most one disbursement is ever
 *              created per request (see spec §11).
 *
 *              Project/Purpose traceability: the generated disbursement
 *              does NOT copy project/purpose onto itself. It stores
 *              cd_cash_request_id, and Project/Purpose are read by joining
 *              back to the source cash_request — see this file's header
 *              comment and the migration that added cd_cash_request_id.
 *
 *              cd_particulars is a required FK (NOT NULL) to
 *              master_particulars — a categorized lookup, unlike Purpose's
 *              free text — so it can't be left blank just because the
 *              request didn't specify one. The Fund Custodian MUST supply
 *              a valid `particulars` id at completion time to categorize
 *              the disbursement, same as every other disbursement action
 *              in cashDisbursementController.js.
 */
const completeCashRequest = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = "Fund Custodian completes an APPROVED Cash Request. Generates exactly one UNLIQUIDATED Cash Disbursement against the request's Revolving Fund. Idempotent — rejects if already COMPLETED or already linked to a disbursement."
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /*
    #swagger.parameters['id'] = { in: 'formData', type: 'integer', required: true, description: 'Cash request id' }
    #swagger.parameters['cash_voucher'] = { in: 'formData', type: 'string', required: false, description: "Cash voucher number to finalize on both the request and the generated disbursement. Defaults to the request's reference_id if not supplied." }
    #swagger.parameters['particulars'] = { in: 'formData', type: 'integer', required: true, description: 'master_particulars id to categorize the generated disbursement. Required — cd_particulars is a NOT NULL FK, and Purpose (free text) does not map to it automatically.' }
    #swagger.parameters['remarks'] = { in: 'formData', type: 'string', required: false, description: 'Optional completion remarks' }
  */

  const userId = req.userId || req.user?.id || 1
  const { id, cash_voucher, particulars, remarks } = req.body

  if (!id) {
    return res.status(400).json({ message: 'Missing required field: id' })
  }
  if (particulars === undefined || particulars === null || particulars === '') {
    return res.status(400).json({
      message:
        'Missing required field: particulars (master_particulars id) — cd_particulars is required and Purpose does not map to it automatically.',
    })
  }

  if (!requireRole(req, res, ['FUND_CUSTODIAN', 'ADMIN'])) return

  try {
    const cr = await getCashRequestById(id)
    if (!cr) {
      return res.status(404).json({ message: 'Cash request not found' })
    }

    const currentStatus = cr[Cash.Request.cols.status]

    if (currentStatus === 'COMPLETED') {
      return res.status(400).json({ message: 'This cash request has already been completed.' })
    }
    if (currentStatus !== 'APPROVED') {
      return res.status(400).json({
        message: `Cannot complete a cash request with status ${currentStatus}. Only APPROVED requests can be completed.`,
      })
    }

    const project = cr[Cash.Request.cols.project]
    const purpose = cr[Cash.Request.cols.purpose]
    if (!project || !purpose) {
      return res
        .status(400)
        .json({ message: 'Cash request is missing project/purpose and cannot be completed.' })
    }

    const requestAmount = parseNum(cr[Cash.Request.cols.amount])
    if (requestAmount <= 0) {
      return res
        .status(400)
        .json({ message: 'Cash request has an invalid amount and cannot be completed.' })
    }

    // Belt-and-suspenders duplicate guard — the status check above already
    // makes this practically unreachable (a request only ever passes
    // through APPROVED -> COMPLETED once), but this catches any row that
    // nonetheless already has a linked disbursement, e.g. from a retried
    // request after a partial failure elsewhere.
    const existingCd = await getDisbursementForCashRequest(id)
    if (existingCd) {
      return res.status(400).json({
        message: 'A cash disbursement has already been generated for this cash request.',
        cash_disbursement_id: existingCd.id,
      })
    }

    const fundId = cr[Cash.Request.cols.revolving_fund_id]
    const rf = await getRevolvingFundById(fundId)
    if (!rf) {
      return res.status(404).json({ message: 'Associated revolving fund not found' })
    }

    const rfStatus = rf[Revolving.Fund.cols.status]
    if (NON_ISSUABLE_RF_STATUSES.includes(rfStatus)) {
      return res.status(400).json({
        message: `Cannot complete — its revolving fund has status ${rfStatus}.`,
      })
    }

    const currentBalance = parseNum(rf[Revolving.Fund.cols.balance])
    if (currentBalance < requestAmount) {
      return res
        .status(400)
        .json({ message: 'Insufficient revolving fund balance to complete this cash request.' })
    }

    const particularsName = await getParticularsNameById(particulars)
    if (!particularsName) {
      return res
        .status(400)
        .json({ message: 'Invalid particulars id — no matching master_particulars entry found.' })
    }

    const finalCashVoucher =
      cash_voucher || cr[Cash.Request.cols.cv_number] || cr[Cash.Request.cols.reference_id]
    const { outstanding, status: cdStatus } = computeCdStatus(requestAmount, 0, 0)

    // Step 1: insert the CD row on its own — its generated id is needed by
    // the activity log below, and Transaction() can't return generated ids
    // mid-batch (identical constraint to issueCashDisbursement).
    const insertCdQuery = SQL.model(Cash.Disbursement)
      .insert({
        [Cash.Disbursement.cols.cash_request_id]: id,
        [Cash.Disbursement.cols.date_issued]: new Date(),
        [Cash.Disbursement.cols.received_by]: cr[Cash.Request.cols.employee_id],
        [Cash.Disbursement.cols.revolving_fund_id]: fundId,
        [Cash.Disbursement.cols.department_id]: cr[Cash.Request.cols.department_id],
        [Cash.Disbursement.cols.particulars]: particulars,
        [Cash.Disbursement.cols.amount_issued]: requestAmount,
        [Cash.Disbursement.cols.cash_voucher]: finalCashVoucher,
        [Cash.Disbursement.cols.amount_returned]: 0,
        [Cash.Disbursement.cols.outstanding_amount]: outstanding,
        [Cash.Disbursement.cols.amount_expended]: 0,
        [Cash.Disbursement.cols.status]: cdStatus,
      })
      .build()

    const cdResult = await Query(insertCdQuery.sql, insertCdQuery.bindings)
    const newCdId = cdResult.insertId

    // Step 2: batch everything downstream into one real transaction — CD
    // activity log, RF update + activity, and the cash_request's own
    // status flip + activity log all commit together or not at all.
    try {
      const newRfIssued = parseNum(rf[Revolving.Fund.cols.issued]) + requestAmount
      const newRfOutstanding = parseNum(rf[Revolving.Fund.cols.outstanding]) + requestAmount
      const newRfBalance = currentBalance - requestAmount
      const newRfStatus = computeRfStatus(rfStatus, newRfIssued > 0)

      const cdActivityQuery = SQL.model(Cash.DisbursementActivity)
        .insert({
          [Cash.DisbursementActivity.cols.cash_disbursement_id]: newCdId,
          [Cash.DisbursementActivity.cols.amount]: requestAmount,
          [Cash.DisbursementActivity.cols.remarks]:
            `Issued via Cash Request ${cr[Cash.Request.cols.reference_id]} — ${project} / ${purpose}: ₱${requestAmount.toFixed(2)}`,
          [Cash.DisbursementActivity.cols.particulars]: particularsName,
        })
        .build()

      const rfUpdateQuery = SQL.model(Revolving.Fund)
        .update({
          [Revolving.Fund.cols.issued]: newRfIssued,
          [Revolving.Fund.cols.outstanding]: newRfOutstanding,
          [Revolving.Fund.cols.balance]: newRfBalance,
          [Revolving.Fund.cols.status]: newRfStatus,
        })
        .where(Revolving.Fund.pk, fundId)
        .build()

      const rfActivityQuery = SQL.model(Revolving.FundActivity)
        .insert({
          [Revolving.FundActivity.cols.revolving_fund_id]: fundId,
          [Revolving.FundActivity.cols.remarks]:
            `Cash Request ${cr[Cash.Request.cols.reference_id]} completed and issued ₱${requestAmount.toFixed(2)} — issued (${newRfIssued}), outstanding (${newRfOutstanding}), balance (${newRfBalance}), status: ${newRfStatus}.`,
          [Revolving.FundActivity.cols.user_id]: userId,
        })
        .build()

      const crUpdateQuery = SQL.model(Cash.Request)
        .update({
          [Cash.Request.cols.status]: 'COMPLETED',
          [Cash.Request.cols.cv_number]: finalCashVoucher,
        })
        .where(Cash.Request.pk, id)
        .build()

      // action: 'RECEIVED' — matches the existing cra_action ENUM (which
      // has no COMPLETED value) and mirrors V1's own mapping of a
      // completed/received cash request to the RECEIVED activity action.
      const crActivityQuery = SQL.model(Cash.RequestActivity)
        .insert({
          [Cash.RequestActivity.cols.user_id]: userId,
          [Cash.RequestActivity.cols.cash_request_id]: id,
          [Cash.RequestActivity.cols.action]: 'RECEIVED',
          [Cash.RequestActivity.cols.remarks]:
            remarks ||
            `Completed by fund custodian — cash disbursement #${newCdId} created (₱${requestAmount.toFixed(2)}).`,
        })
        .build()

      await Transaction([
        toTxQuery(cdActivityQuery),
        toTxQuery(rfUpdateQuery),
        toTxQuery(rfActivityQuery),
        toTxQuery(crUpdateQuery),
        toTxQuery(crActivityQuery),
      ])
    } catch (txError) {
      // Compensate: the CD row committed above, but the downstream batch
      // (RF cascade + cash_request completion) failed — remove the
      // orphaned CD row so the cash request is never left APPROVED while a
      // disbursement silently exists against it with no matching RF effect
      // or completion record.
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

    return res.status(200).json({
      message: 'Cash request completed successfully — cash disbursement created.',
      cash_request_id: id,
      cash_disbursement_id: newCdId,
    })
  } catch (error) {
    console.error('Error in completeCashRequest:', error)
    return res.status(500).json({ message: 'Error completing cash request', error: error.message })
  }
}

// ==========================================
// READ ENDPOINTS
// ==========================================

/**
 * @name getCashRequest
 * @description Get Cash Request records, optionally filtered by status or
 *              requesting employee.
 */
const getCashRequest = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Get all Cash Request records'
  /*
    #swagger.parameters['status'] = { in: 'query', type: 'string', required: false, description: 'Filter by status (PENDING/APPROVED/COMPLETED/REJECTED)' }
    #swagger.parameters['employee_id'] = { in: 'query', type: 'integer', required: false, description: 'Filter by requesting employee id' }
  */

  const { status, employee_id } = req.query

  try {
    let queryBuilder = SQL.model(Cash.Request).select(Cash.Request.select)

    if (status) queryBuilder = queryBuilder.where(Cash.Request.cols.status, status)
    if (employee_id) queryBuilder = queryBuilder.where(Cash.Request.cols.employee_id, employee_id)

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getCashRequest:', error)
    return res.status(500).json({ message: 'Error retrieving Cash Request records' })
  }
}

/**
 * @name getCashRequestActivity
 * @description Get Cash Request activity/audit records, optionally
 *              filtered by cash_request_id.
 */
const getCashRequestActivity = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Get Cash Request activity records'
  /*
    #swagger.parameters['cash_request_id'] = { in: 'query', type: 'integer', required: false, description: 'Filter by cash request id' }
  */

  const { cash_request_id } = req.query

  try {
    let queryBuilder = SQL.model(Cash.RequestActivity).select(Cash.RequestActivity.select)

    if (cash_request_id) {
      queryBuilder = queryBuilder.where(Cash.RequestActivity.cols.cash_request_id, cash_request_id)
    }

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getCashRequestActivity:', error)
    return res.status(500).json({ message: 'Error retrieving Cash Request Activity records' })
  }
}

module.exports = {
  getCashRequest,
  createCashRequest,
  approveCashRequest,
  rejectCashRequest,
  completeCashRequest,
  getCashRequestActivity,
}
