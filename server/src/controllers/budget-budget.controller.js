const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Budget } = require('../database/models/Budget')
const SQL = new SQLQueryBuilder()

/**
 * Transaction() expects an array of { sql, values }, but the query builder's
 * .build() returns { sql, bindings }. This adapts one to the other.
 */
const toTxQuery = ({ sql, bindings }) => ({ sql, values: bindings })

/**
 * @name upsertBudgetBudget
 * @description Create a new budget or top-up/update an existing budget.
 *              Automatically records entries into Budget History.
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
      description: 'Budget allocation amount'
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
          Budget.Budget.cols.status,
          Budget.Budget.cols.department_id,
        ])
        .where(Budget.Budget.pk, id)
        .build()

      const [existingBudget] = await Query(existingQuery.sql, existingQuery.bindings)

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
 * @description Soft delete budget by setting status to UNAVAILABLE
 */
const softDeleteBudget = async (req, res) => {
  // #swagger.tags = ['Budget']
  // #swagger.description = 'Soft delete budget record (sets status to UNAVAILABLE)'
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

    return res.status(200).json({ message: 'Budget set to UNAVAILABLE (Soft deleted)' })
  } catch (error) {
    console.error('Error in softDeleteBudget:', error)
    return res.status(500).json({ message: 'Error soft deleting Budget record' })
  }
}

/**
 * @name getBudgetBudget
 * @description Get active Budget records (excludes UNAVAILABLE by default)
 */
const getBudgetBudget = async (req, res) => {
  // #swagger.tags = ['Budget']
  // #swagger.description = 'Get all Budget records (filters out CLOSED unless requested)'
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
    let queryBuilder = SQL.model(Budget.Budget).select([
      Budget.Budget.cols.id,
      Budget.Budget.cols.department_id,
      Budget.Budget.cols.type,
      Budget.Budget.cols.amount,
      Budget.Budget.cols.status,
      Budget.Budget.cols.createdAt,
    ])

    if (includeClosed !== 'true') {
      queryBuilder = queryBuilder.where(Budget.Budget.cols.status, '!=', 'CLOSED')
    }

    const { sql, bindings } = queryBuilder.build()
    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getBudgetBudget:', error)
    return res.status(500).json({ message: 'Error retrieving Budget records' })
  }
}

/**
 * @name getBudgetHistory
 * @description Get all Budget History audit records for a specific budget or overall
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
