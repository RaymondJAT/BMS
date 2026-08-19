const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
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

/**
 * Transaction() expects an array of { sql, values }, but the query builder's
 * .build() returns { sql, bindings }. This adapts one to the other.
 */
const toTxQuery = ({ sql, bindings }) => ({ sql, values: bindings })

/**
 * @name upsertBudgetBudget
 * @description Create a new budget or top-up/update an existing budget.
 *              Automatically records entries into Budget History.
 *
 *              b_amount is THE Total Budget figure (Beginning + every
 *              Finance-driven top-up made through this endpoint). It is
 *              deliberately NEVER touched anywhere else in the codebase —
 *              not by Revolving Fund creation/top-up/closure, not by Cash
 *              Disbursement amount edits (see revolvingFundController.js
 *              and cashDisbursementController.js). Those flows instead
 *              validate against a LIVE "remaining budget" computed as
 *              Total Budget minus the actual current sum of Revolving Fund
 *              balance+outstanding for that budget — never by writing to
 *              this row — so it can never drift out of sync with reality.
 *
 *              b_beginning_amount is set ONCE at creation and never
 *              changes again, even on subsequent top-ups. Additional
 *              Allocation is therefore always derivable as
 *              (b_amount - b_beginning_amount), with no separate ledger
 *              needed for it.
 */
const upsertBudgetBudget = async (req, res) => {
  // #swagger.tags = ['Budget']
  // #swagger.description = 'Upsert Budget record and create corresponding history entry'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Budget ID (Pass to update/top-up existing budget, leave blank to insert)'
    }
    #swagger.parameters['department_id'] = {
      in: 'formData',
      type: 'integer',
      required: true,
      description: 'Department ID (must reference an existing master_department record)'
    }
    #swagger.parameters['type'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Budget type: INITIAL, TOP_UP, or OPERATIONAL'
    }
    #swagger.parameters['amount'] = {
      in: 'formData',
      type: 'number',
      required: true,
      description: 'Budget allocation amount (initial amount on create, additional top-up amount on update)'
    }
    #swagger.parameters['date'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Effective date (YYYY-MM-DD)'
    }
    #swagger.parameters['remarks'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Remarks or justification for the allocation/top-up'
    }
  */

  // TEMP: no auth wired up yet — default to a placeholder test user.
  // b_createdBy / bh_created_by are NOT NULL FKs to master_user, so this
  // must match an existing master_user.mu_id row for inserts to succeed.
  // Replace this fallback (and remove the TEMP comment) once auth is in.
  const userId = req.userId || req.user?.id || 1
  const { id, department_id, type, amount, date, remarks } = req.body

  try {
    // update / top up existing budget
    if (id) {
      const existingQuery = SQL.model(Budget.Budget)
        .select([
          Budget.Budget.cols.id,
          Budget.Budget.cols.amount,
          Budget.Budget.cols.beginning_amount,
          Budget.Budget.cols.status,
          Budget.Budget.cols.department_id,
        ])
        .where(Budget.Budget.pk, id)
        .build()

      const [existingBudgetRaw] = await Query(existingQuery.sql, existingQuery.bindings)
      const existingBudget = wrapRow(existingBudgetRaw, Budget.Budget)

      if (!existingBudget) {
        return res.status(404).json({ message: 'Budget not found' })
      }

      if (existingBudget[Budget.Budget.cols.status] === 'CLOSED') {
        return res.status(400).json({ message: 'Cannot update a closed budget' })
      }

      const currentAmount = parseFloat(existingBudget[Budget.Budget.cols.amount] || 0)
      const addedAmount = amount !== undefined ? parseFloat(amount) : 0
      const newTotalAmount = currentAmount + addedAmount

      const updateData = {}
      if (department_id !== undefined) updateData[Budget.Budget.cols.department_id] = department_id
      if (type !== undefined) updateData[Budget.Budget.cols.type] = type
      if (amount !== undefined) updateData[Budget.Budget.cols.amount] = newTotalAmount
      // b_beginning_amount is intentionally NEVER included here — it's
      // fixed at creation for the lifetime of the budget.

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No valid data provided for update' })
      }

      const updateQuery = SQL.model(Budget.Budget)
        .update(updateData)
        .where(Budget.Budget.pk, id)
        .build()

      // Both the budget update and its history entry reference an id we
      // already know (no generated-id dependency), so they can be batched
      // into one real, all-or-nothing transaction.
      const queries = [toTxQuery(updateQuery)]

      if (addedAmount !== 0) {
        const historyQuery = SQL.model(Budget.History)
          .insert({
            [Budget.History.cols.budget_id]: id,
            [Budget.History.cols.amount]: addedAmount,
            [Budget.History.cols.previous_amount]: currentAmount,
            [Budget.History.cols.new_amount]: newTotalAmount,
            [Budget.History.cols.remarks]: remarks || null,
            [Budget.History.cols.department_id]:
              department_id || existingBudget[Budget.Budget.cols.department_id],
            [Budget.History.cols.type]: type || 'CASH',
            [Budget.History.cols.date]: date || new Date(),
            [Budget.History.cols.created_by]: userId,
          })
          .build()

        queries.push(toTxQuery(historyQuery))
      }

      await Transaction(queries)

      return res.status(200).json({ message: 'Budget updated successfully' })
    }

    // create new budget
    if (!department_id || amount === undefined) {
      return res.status(400).json({ message: 'Missing required fields: department_id and amount' })
    }

    const initialAmount = parseFloat(amount)

    // b_id is an autoincrement INTEGER — never set it manually. The history
    // insert below needs this generated id, and Transaction() can't return
    // generated ids mid-batch, so this insert stays standalone.
    const insertBudgetQuery = SQL.model(Budget.Budget)
      .insert({
        [Budget.Budget.cols.department_id]: department_id,
        [Budget.Budget.cols.type]: type || 'CASH',
        [Budget.Budget.cols.amount]: initialAmount,
        // Beginning Amount = the initial allocation, fixed for good —
        // equal to amount only at this instant of creation.
        [Budget.Budget.cols.beginning_amount]: initialAmount,
        [Budget.Budget.cols.status]: 'ACTIVE',
        [Budget.Budget.cols.createdBy]: userId,
      })
      .build()

    const insertResult = await Query(insertBudgetQuery.sql, insertBudgetQuery.bindings)
    const newBudgetId = insertResult.insertId

    try {
      const insertHistoryQuery = SQL.model(Budget.History)
        .insert({
          [Budget.History.cols.budget_id]: newBudgetId,
          [Budget.History.cols.amount]: initialAmount,
          [Budget.History.cols.previous_amount]: 0,
          [Budget.History.cols.new_amount]: initialAmount,
          [Budget.History.cols.remarks]: remarks || null,
          [Budget.History.cols.department_id]: department_id,
          [Budget.History.cols.type]: type || 'CASH',
          [Budget.History.cols.date]: date || new Date(),
          [Budget.History.cols.created_by]: userId,
        })
        .build()

      await Transaction([toTxQuery(insertHistoryQuery)])
    } catch (txError) {
      // Compensate: the budget row committed above, but its history entry
      // failed — remove the orphaned budget row rather than leave a budget
      // with no allocation ledger entry.
      try {
        const { sql: delSql, bindings: delBindings } = SQL.model(Budget.Budget)
          .delete()
          .where(Budget.Budget.pk, newBudgetId)
          .build()
        await Query(delSql, delBindings)
      } catch (compensationError) {
        console.error(
          `CRITICAL: failed to compensate orphaned budget id ${newBudgetId} after transaction failure:`,
          compensationError,
        )
      }
      throw txError
    }

    return res.status(201).json({
      message: 'Budget created successfully',
      id: newBudgetId,
    })
  } catch (error) {
    console.error('Error in upsertBudgetBudget:', error)
    return res.status(500).json({ message: 'Error processing Budget record' })
  }
}

/**
 * @name softDeleteBudget
 * @description Soft delete budget by setting status to CLOSED
 */
const softDeleteBudget = async (req, res) => {
  // #swagger.tags = ['Budget']
  // #swagger.description = 'Soft delete budget record (sets status to CLOSED)'
  /* 
    #swagger.parameters['id'] = {
      in: 'path',
      type: 'string',
      required: true,
      description: 'Budget ID to soft delete'
    }
  */

  const { id } = req.params

  if (!id) {
    return res.status(400).json({ message: 'Budget ID is required' })
  }

  try {
    const updateData = {
      [Budget.Budget.cols.status]: 'CLOSED',
    }

    const { sql, bindings } = SQL.model(Budget.Budget)
      .update(updateData)
      .where(Budget.Budget.pk, id)
      .build()

    const result = await Query(sql, bindings)

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Budget record not found' })
    }

    return res.status(200).json({ message: 'Budget set to CLOSED (Soft deleted)' })
  } catch (error) {
    console.error('Error in softDeleteBudget:', error)
    return res.status(500).json({ message: 'Error soft deleting Budget record' })
  }
}

/**
 * @name getBudgetBudget
 * @description Get active Budget records (excludes CLOSED by default),
 *              each enriched with every derived financial figure computed
 *              LIVE from the actual revolving_fund / cash_disbursement
 *              rows — never from a manually-maintained counter:
 *
 *              - beginning_amount: fixed at creation, never changes.
 *              - amount / total_budget: Beginning + all Finance top-ups
 *                (the only thing that ever writes to b_amount).
 *              - additional_allocation: total_budget - beginning_amount.
 *              - deployed_to_revolving_funds: SUM(rf_balance +
 *                rf_outstanding) across every fund tied to this budget —
 *                money currently locked outside Finance's control, whether
 *                idle in a fund or still out with a Requester. Naturally
 *                shrinks when a fund closes (balance sweeps to 0) or a
 *                disbursement is returned; naturally grows on top-up or
 *                issue. This is what actually gates new Revolving Fund
 *                creation/top-up (see revolvingFundController.js).
 *              - remaining_budget: total_budget - deployed_to_revolving_funds.
 *              - utilization_percent: deployed_to_revolving_funds /
 *                total_budget * 100.
 *              - cash_disbursement_utilized: SUM(cd_amount_issued -
 *                cd_amount_returned) across every disbursement whose
 *                ORIGINAL fund belongs to this budget — a SUBSET of
 *                deployed_to_revolving_funds representing money that has
 *                actually left a fund into a Requester's hands and hasn't
 *                been given back. Shown as a separate, additional metric
 *                (per the Deployment-vs-Utilization distinction) — never
 *                subtracted a second time from total_budget, to avoid
 *                double-counting the same money against two different
 *                totals.
 *              - cash_disbursement_utilization_percent:
 *                cash_disbursement_utilized / deployed_to_revolving_funds * 100.
 */
const getBudgetBudget = async (req, res) => {
  // #swagger.tags = ['Budget']
  // #swagger.description = 'Get all Budget records (filters out CLOSED unless requested), enriched with live-derived deployed/remaining/utilization figures'
  /* 
    #swagger.parameters['includeClosed'] = {
      in: 'query',
      type: 'boolean',
      required: false,
      description: 'Set to true to include soft-deleted (CLOSED) budget records'
    }
  */

  const { includeClosed } = req.query

  try {
    const whereClause = includeClosed === 'true' ? '' : `WHERE b.b_status != 'CLOSED'`

    const rows = await Query(`
      SELECT
        b.b_id AS id,
        b.b_department_id AS department_id,
        b.b_type AS type,
        b.b_amount AS amount,
        b.b_beginning_amount AS beginning_amount,
        b.b_status AS status,
        b.b_createdAt AS createdAt,
        COALESCE(rf.deployed, 0) AS deployed_to_revolving_funds,
        COALESCE(cd.utilized, 0) AS cash_disbursement_utilized
      FROM budget b
         LEFT JOIN (
        SELECT rf_budget_id,
          SUM(
            CASE
              WHEN rf_status IN ('CLOSED', 'CLEARED')
               THEN GREATEST(rf_total_fund - rf_ending, 0)
             ELSE rf_total_fund
            END
          ) AS deployed
         FROM revolving_fund
         GROUP BY rf_budget_id
       ) rf ON rf.rf_budget_id = b.b_id
      LEFT JOIN (
        SELECT r.rf_budget_id, SUM(c.cd_amount_issued - c.cd_amount_returned) AS utilized
        FROM cash_disbursement c
        INNER JOIN revolving_fund r ON r.rf_id = c.cd_revolving_fund_id
        GROUP BY r.rf_budget_id
      ) cd ON cd.rf_budget_id = b.b_id
      ${whereClause}
    `)

    const result = rows.map((row) => {
      const amount = Math.round(parseFloat(row.amount || 0) * 100) / 100
      const beginningAmount = Math.round(parseFloat(row.beginning_amount || 0) * 100) / 100
      const additionalAllocation = Math.round((amount - beginningAmount) * 100) / 100
      const deployed = Math.round(parseFloat(row.deployed_to_revolving_funds || 0) * 100) / 100
      const utilized = Math.round(parseFloat(row.cash_disbursement_utilized || 0) * 100) / 100
      const remaining = Math.round((amount - deployed) * 100) / 100
      const utilizationPercent = amount > 0 ? Math.round((deployed / amount) * 10000) / 100 : 0
      const cdUtilizationPercent =
        deployed > 0 ? Math.round((utilized / deployed) * 10000) / 100 : 0

      return {
        ...row,
        amount,
        beginning_amount: beginningAmount,
        additional_allocation: additionalAllocation,
        total_budget: amount,
        deployed_to_revolving_funds: deployed,
        remaining_budget: remaining,
        utilization_percent: utilizationPercent,
        cash_disbursement_utilized: utilized,
        cash_disbursement_utilization_percent: cdUtilizationPercent,
      }
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getBudgetBudget:', error)
    return res.status(500).json({ message: 'Error retrieving Budget records' })
  }
}

/**
 * @name getBudgetHistory
 * @description Get all Budget History audit records for a specific budget or overall.
 *              Since RF/CD flows no longer write to this table (see
 *              upsertBudgetBudget's docstring), every row here is now
 *              purely a Finance-driven allocation event: the initial
 *              creation entry plus any subsequent top-ups.
 */
const getBudgetHistory = async (req, res) => {
  // #swagger.tags = ['Budget']
  // #swagger.description = 'Get Budget History records filtered by budget_id'
  /* 
    #swagger.parameters['budget_id'] = {
      in: 'query',
      type: 'string',
      required: false,
      description: 'Filter history by specific Budget ID'
    }
  */

  const { budget_id } = req.query

  try {
    let queryBuilder = SQL.model(Budget.History).select([
      Budget.History.cols.id,
      Budget.History.cols.budget_id,
      Budget.History.cols.department_id,
      Budget.History.cols.type,
      Budget.History.cols.amount,
      Budget.History.cols.previous_amount,
      Budget.History.cols.new_amount,
      Budget.History.cols.remarks,
      Budget.History.cols.date,
      Budget.History.cols.createdAt,
    ])

    if (budget_id) {
      queryBuilder = queryBuilder.where(Budget.History.cols.budget_id, budget_id)
    }

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getBudgetHistory:', error)
    return res.status(500).json({ message: 'Error retrieving Budget History records' })
  }
}

module.exports = {
  getBudgetBudget,
  getBudgetHistory,
  upsertBudgetBudget,
  softDeleteBudget,
}
