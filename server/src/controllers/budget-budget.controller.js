const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Budget } = require('../database/models/Budget')
const SQL = new SQLQueryBuilder()

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
      type: 'string',
      required: true,
      description: 'Department ID'
    }
    #swagger.parameters['type'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Budget type e.g., INITIAL, TOP_UP, OPERATIONAL'
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

  const userId = req.userId || req.user?.id || 'SYSTEM'
  const { id, department_id, type, amount, date, remarks } = req.body

  try {
    // -------------------------------------------------------------
    // 1. UPDATE / TOP-UP EXISTING BUDGET
    // -------------------------------------------------------------
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

      if (existingBudget[Budget.Budget.cols.status] === 'UNAVAILABLE') {
        return res.status(400).json({ message: 'Cannot update an unavailable (deleted) budget' })
      }

      const currentAmount = parseFloat(existingBudget[Budget.Budget.cols.amount] || 0)
      const addedAmount = amount !== undefined ? parseFloat(amount) : 0
      const newTotalAmount = currentAmount + addedAmount

      let updateData = {}
      if (department_id !== undefined) updateData[Budget.Budget.cols.department_id] = department_id
      if (type !== undefined) updateData[Budget.Budget.cols.type] = type
      if (amount !== undefined) updateData[Budget.Budget.cols.amount] = newTotalAmount

      if (Budget.Budget.cols.updatedAt) updateData[Budget.Budget.cols.updatedAt] = new Date()
      if (Budget.Budget.cols.updatedBy) updateData[Budget.Budget.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No valid data provided for update' })
      }

      const updateQuery = SQL.model(Budget.Budget)
        .update(updateData)
        .where(Budget.Budget.pk, id)
        .build()

      await Query(updateQuery.sql, updateQuery.bindings)

      // Automatically log transaction in budget history if amount changed
      if (addedAmount !== 0) {
        const historyQuery = SQL.model(Budget.History)
          .insert({
            [Budget.History.cols.budget_id]: id,
            [Budget.History.cols.department_id]:
              department_id || existingBudget[Budget.Budget.cols.department_id],
            [Budget.History.cols.type]: type || 'TOP_UP',
            [Budget.History.cols.amount]: addedAmount,
            [Budget.History.cols.date]: date || new Date(),
            ...(Budget.History.cols.createdBy ? { [Budget.History.cols.createdBy]: userId } : {}),
            ...(Budget.History.cols.createdAt
              ? { [Budget.History.cols.createdAt]: new Date() }
              : {}),
          })
          .build()

        await Query(historyQuery.sql, historyQuery.bindings)
      }

      return res.status(200).json({ message: 'Budget updated successfully' })
    }

    // -------------------------------------------------------------
    // 2. CREATE NEW BUDGET
    // -------------------------------------------------------------
    if (!department_id || amount === undefined) {
      return res.status(400).json({ message: 'Missing required fields: department_id and amount' })
    }

    const newBudgetId = uuidv4()
    const initialAmount = parseFloat(amount)

    const insertBudgetQuery = SQL.model(Budget.Budget)
      .insert({
        [Budget.Budget.pk]: newBudgetId,
        [Budget.Budget.cols.department_id]: department_id,
        [Budget.Budget.cols.type]: type || 'INITIAL',
        [Budget.Budget.cols.amount]: initialAmount,
        [Budget.Budget.cols.status]: 'ACTIVE',
        ...(Budget.Budget.cols.createdBy ? { [Budget.Budget.cols.createdBy]: userId } : {}),
        ...(Budget.Budget.cols.createdAt ? { [Budget.Budget.cols.createdAt]: new Date() } : {}),
      })
      .build()

    await Query(insertBudgetQuery.sql, insertBudgetQuery.bindings)

    // Automatically record initial history allocation ledger entry
    const insertHistoryQuery = SQL.model(Budget.History)
      .insert({
        [Budget.History.cols.budget_id]: newBudgetId,
        [Budget.History.cols.department_id]: department_id,
        [Budget.History.cols.type]: type || 'INITIAL',
        [Budget.History.cols.amount]: initialAmount,
        [Budget.History.cols.date]: date || new Date(),
        ...(Budget.History.cols.createdBy ? { [Budget.History.cols.createdBy]: userId } : {}),
        ...(Budget.History.cols.createdAt ? { [Budget.History.cols.createdAt]: new Date() } : {}),
      })
      .build()

    await Query(insertHistoryQuery.sql, insertHistoryQuery.bindings)

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
  const userId = req.userId || req.user?.id || 'SYSTEM'

  if (!id) {
    return res.status(400).json({ message: 'Budget ID is required' })
  }

  try {
    const updateData = {
      [Budget.Budget.cols.status]: 'UNAVAILABLE',
    }

    if (Budget.Budget.cols.updatedAt) updateData[Budget.Budget.cols.updatedAt] = new Date()
    if (Budget.Budget.cols.updatedBy) updateData[Budget.Budget.cols.updatedBy] = userId

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
  // #swagger.description = 'Get all Budget records (filters out UNAVAILABLE unless requested)'
  /* 
    #swagger.parameters['includeUnavailable'] = {
      in: 'query',
      type: 'boolean',
      required: false,
      description: 'Set to true to include soft-deleted (UNAVAILABLE) budget records'
    }
  */

  const { includeUnavailable } = req.query

  try {
    let queryBuilder = SQL.model(Budget.Budget).select([
      Budget.Budget.cols.id,
      Budget.Budget.cols.department_id,
      Budget.Budget.cols.type,
      Budget.Budget.cols.amount,
      Budget.Budget.cols.status,
      Budget.Budget.cols.createdAt,
    ])

    if (includeUnavailable !== 'true') {
      queryBuilder = queryBuilder.where(Budget.Budget.cols.status, '!=', 'UNAVAILABLE')
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
