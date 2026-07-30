const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Revolving } = require('../database/models/Revolving')
const SQL = new SQLQueryBuilder()

/**
 * @name upsertRevolvingFund
 * @description Update and insert Revolving Fund records
 */
const upsertRevolvingFund = async (req, res) => {
  // #swagger.tags = ['Revolving Fund']
  // #swagger.description = 'Create a new Revolving Fund or update an existing one.'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'integer',
      required: false,
      description: 'Fund ID (Pass to update, leave blank to insert)'
    }
    #swagger.parameters['budget_id'] = {
      in: 'formData',
      type: 'integer',
      required: true,
      description: 'Parent Budget ID'
    }
    #swagger.parameters['year'] = {
      in: 'formData',
      type: 'integer',
      required: true,
      description: 'Fiscal Year (e.g., 2026)'
    }
    #swagger.parameters['month'] = {
      in: 'formData',
      type: 'integer',
      required: true,
      description: 'Month integer (1-12)'
    }
    #swagger.parameters['start_date'] = {
      in: 'formData',
      type: 'string',
      required: true,
      description: 'Cycle start date (YYYY-MM-DD)'
    }
    #swagger.parameters['end_date'] = {
      in: 'formData',
      type: 'string',
      required: true,
      description: 'Cycle end date (YYYY-MM-DD)'
    }
    #swagger.parameters['beginning'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Beginning balance'
    }
    #swagger.parameters['added'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Added fund amount'
    }
    #swagger.parameters['total_fund'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Total fund amount (Beginning + Added)'
    }
    #swagger.parameters['issued'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Total cash issued'
    }
    #swagger.parameters['returned'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Total cash returned'
    }
    #swagger.parameters['outstanding'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Net outstanding cash (Issued - Returned)'
    }
    #swagger.parameters['amount_expended'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Total amount expended'
    }
    #swagger.parameters['ending'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Ending cash on hand'
    }
    #swagger.parameters['liquidated'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Total liquidated amount'
    }
    #swagger.parameters['balance'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Net remaining available balance'
    }
    #swagger.parameters['status'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Fund Status: OPEN, CLOSED, ON REVIEW, CLEARED, RETURN'
    }
  */

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
  } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (budget_id !== undefined) updateData[Revolving.Fund.cols.budget_id] = budget_id
      if (year !== undefined) updateData[Revolving.Fund.cols.year] = year
      if (month !== undefined) updateData[Revolving.Fund.cols.month] = month
      if (start_date !== undefined) updateData[Revolving.Fund.cols.start_date] = start_date
      if (end_date !== undefined) updateData[Revolving.Fund.cols.end_date] = end_date
      if (beginning !== undefined) updateData[Revolving.Fund.cols.beginning] = parseFloat(beginning)
      if (added !== undefined) updateData[Revolving.Fund.cols.added] = parseFloat(added)
      if (total_fund !== undefined)
        updateData[Revolving.Fund.cols.total_fund] = parseFloat(total_fund)
      if (issued !== undefined) updateData[Revolving.Fund.cols.issued] = parseFloat(issued)
      if (returned !== undefined) updateData[Revolving.Fund.cols.returned] = parseFloat(returned)
      if (outstanding !== undefined)
        updateData[Revolving.Fund.cols.outstanding] = parseFloat(outstanding)
      if (amount_expended !== undefined)
        updateData[Revolving.Fund.cols.amount_expended] = parseFloat(amount_expended)
      if (ending !== undefined) updateData[Revolving.Fund.cols.ending] = parseFloat(ending)
      if (liquidated !== undefined)
        updateData[Revolving.Fund.cols.liquidated] = parseFloat(liquidated)
      if (balance !== undefined) updateData[Revolving.Fund.cols.balance] = parseFloat(balance)
      if (status !== undefined) updateData[Revolving.Fund.cols.status] = status

      if (Revolving.Fund.cols.updatedAt) updateData[Revolving.Fund.cols.updatedAt] = new Date()
      if (Revolving.Fund.cols.updatedBy) updateData[Revolving.Fund.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data provided to update' })
      }

      query = SQL.model(Revolving.Fund).update(updateData).where(Revolving.Fund.pk, id).build()
    } else {
      if (!budget_id || !year || !month || !start_date || !end_date) {
        return res.status(400).json({
          message:
            'Missing required fields: budget_id, year, month, start_date, and end_date are required',
        })
      }

      query = SQL.model(Revolving.Fund)
        .insert({
          [Revolving.Fund.cols.budget_id]: budget_id,
          [Revolving.Fund.cols.year]: year,
          [Revolving.Fund.cols.month]: month,
          [Revolving.Fund.cols.start_date]: start_date,
          [Revolving.Fund.cols.end_date]: end_date,
          [Revolving.Fund.cols.beginning]: beginning ? parseFloat(beginning) : 0,
          [Revolving.Fund.cols.added]: added ? parseFloat(added) : 0,
          [Revolving.Fund.cols.total_fund]: total_fund ? parseFloat(total_fund) : 0,
          [Revolving.Fund.cols.issued]: issued ? parseFloat(issued) : 0,
          [Revolving.Fund.cols.returned]: returned ? parseFloat(returned) : 0,
          [Revolving.Fund.cols.outstanding]: outstanding ? parseFloat(outstanding) : 0,
          [Revolving.Fund.cols.amount_expended]: amount_expended ? parseFloat(amount_expended) : 0,
          [Revolving.Fund.cols.ending]: ending ? parseFloat(ending) : 0,
          [Revolving.Fund.cols.liquidated]: liquidated ? parseFloat(liquidated) : 0,
          [Revolving.Fund.cols.balance]: balance ? parseFloat(balance) : 0,
          [Revolving.Fund.cols.status]: status || 'OPEN',
          ...(Revolving.Fund.cols.createdBy ? { [Revolving.Fund.cols.createdBy]: userId } : {}),
          ...(Revolving.Fund.cols.createdAt ? { [Revolving.Fund.cols.createdAt]: new Date() } : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Revolving Fund not found' })
    }

    const activeFundId = id || result.insertId

    // Automatically record an audit activity log entry
    if (activeFundId && Revolving.FundActivity) {
      const activityText = id
        ? `Revolving Fund updated (Status: ${status || 'N/A'})`
        : `Revolving Fund initialized for ${year}-${month}`

      const activityQuery = SQL.model(Revolving.FundActivity)
        .insert({
          [Revolving.FundActivity.cols.revolving_fund_id]: activeFundId,
          [Revolving.FundActivity.cols.remarks]: activityText,
          [Revolving.FundActivity.cols.user_id]: userId,
          ...(Revolving.FundActivity.cols.createdAt
            ? { [Revolving.FundActivity.cols.createdAt]: new Date() }
            : {}),
        })
        .build()

      await Query(activityQuery.sql, activityQuery.bindings)
    }

    return res.status(200).json({
      message: id ? 'Revolving fund updated successfully' : 'Revolving fund created successfully',
      id: activeFundId,
    })
  } catch (error) {
    console.error('Error in upsertRevolvingFund:', error)
    return res.status(500).json({ message: 'Error processing Revolving Fund record' })
  }
}

/**
 * @name upsertRevolvingFundActivity
 * @description Create or update an explicit activity log entry
 */
const upsertRevolvingFundActivity = async (req, res) => {
  // #swagger.tags = ['Revolving Fund']
  // #swagger.description = 'Create or update an explicit activity log entry for a Revolving Fund'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'integer',
      required: false,
      description: 'Activity Log ID (Pass to update, leave blank to insert)'
    }
    #swagger.parameters['revolving_fund_id'] = {
      in: 'formData',
      type: 'integer',
      required: true,
      description: 'Revolving Fund ID'
    }
    #swagger.parameters['remarks'] = {
      in: 'formData',
      type: 'string',
      required: true,
      description: 'Activity notes or remark text'
    }
    #swagger.parameters['user_id'] = {
      in: 'formData',
      type: 'integer',
      required: false,
      description: 'User ID taking the action'
    }
  */

  const userId = req.userId || req.user?.id || req.body.user_id || 1
  const { id, revolving_fund_id, remarks, user_id } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (revolving_fund_id !== undefined)
        updateData[Revolving.FundActivity.cols.revolving_fund_id] = revolving_fund_id
      if (remarks !== undefined) updateData[Revolving.FundActivity.cols.remarks] = remarks
      if (user_id !== undefined) updateData[Revolving.FundActivity.cols.user_id] = user_id

      if (Revolving.FundActivity.cols.updatedAt)
        updateData[Revolving.FundActivity.cols.updatedAt] = new Date()
      if (Revolving.FundActivity.cols.updatedBy)
        updateData[Revolving.FundActivity.cols.updatedBy] = userId

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
          ...(Revolving.FundActivity.cols.createdBy
            ? { [Revolving.FundActivity.cols.createdBy]: userId }
            : {}),
          ...(Revolving.FundActivity.cols.createdAt
            ? { [Revolving.FundActivity.cols.createdAt]: new Date() }
            : {}),
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
    return res.status(500).json({ message: 'Error processing Revolving Fund Activity record' })
  }
}

/**
 * @name upsertClosedRevolvingFund
 * @description Close out a Revolving Fund and record final cash count reconciliation
 */
const upsertClosedRevolvingFund = async (req, res) => {
  // #swagger.tags = ['Revolving Fund']
  // #swagger.description = 'Record final closure and cash count reconciliation for a Revolving Fund'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'integer',
      required: false,
      description: 'Closed Revolving Fund ID (Pass to update, leave blank to insert)'
    }
    #swagger.parameters['revolving_fund_id'] = {
      in: 'formData',
      type: 'integer',
      required: true,
      description: 'Revolving Fund ID to be closed'
    }
    #swagger.parameters['beginning'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Beginning cash balance'
    }
    #swagger.parameters['cash_inflow'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Total cash inflow during period'
    }
    #swagger.parameters['cash_outflow'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Total cash outflow during period'
    }
    #swagger.parameters['ending'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Expected ending cash balance'
    }
    #swagger.parameters['cashonhand'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Physical cash on hand counted'
    }
    #swagger.parameters['gcash'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'GCash digital balance counted'
    }
    #swagger.parameters['total_cash'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Actual total cash (Cash On Hand + GCash)'
    }
    #swagger.parameters['sub_total'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Subtotal calculation'
    }
    #swagger.parameters['status'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Reconciliation status: BALANCED, SHORT, OVER'
    }
    #swagger.parameters['created_by'] = {
      in: 'formData',
      type: 'integer',
      required: false,
      description: 'Auditor/User ID who performed the closure'
    }
  */

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
  } = req.body

  const ClosedModel = Revolving.Closed || Revolving.ClosedRevolvingFund

  let query

  try {
    if (id) {
      let updateData = {}
      if (revolving_fund_id !== undefined)
        updateData[ClosedModel.cols.revolving_fund_id] = revolving_fund_id
      if (beginning !== undefined) updateData[ClosedModel.cols.beginning] = parseFloat(beginning)
      if (cash_inflow !== undefined)
        updateData[ClosedModel.cols.cash_inflow] = parseFloat(cash_inflow)
      if (cash_outflow !== undefined)
        updateData[ClosedModel.cols.cash_outflow] = parseFloat(cash_outflow)
      if (ending !== undefined) updateData[ClosedModel.cols.ending] = parseFloat(ending)
      if (cashonhand !== undefined) updateData[ClosedModel.cols.cashonhand] = parseFloat(cashonhand)
      if (gcash !== undefined) updateData[ClosedModel.cols.gcash] = parseFloat(gcash)
      if (total_cash !== undefined) updateData[ClosedModel.cols.total_cash] = parseFloat(total_cash)
      if (sub_total !== undefined) updateData[ClosedModel.cols.sub_total] = parseFloat(sub_total)
      if (status !== undefined) updateData[ClosedModel.cols.status] = status
      if (created_by !== undefined) updateData[ClosedModel.cols.created_by] = created_by

      if (ClosedModel.cols.updatedAt) updateData[ClosedModel.cols.updatedAt] = new Date()
      if (ClosedModel.cols.updatedBy) updateData[ClosedModel.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data provided to update' })
      }

      query = SQL.model(ClosedModel).update(updateData).where(ClosedModel.pk, id).build()
    } else {
      if (!revolving_fund_id) {
        return res.status(400).json({ message: 'Missing required field: revolving_fund_id' })
      }

      query = SQL.model(ClosedModel)
        .insert({
          [ClosedModel.cols.revolving_fund_id]: revolving_fund_id,
          [ClosedModel.cols.beginning]: beginning ? parseFloat(beginning) : 0,
          [ClosedModel.cols.cash_inflow]: cash_inflow ? parseFloat(cash_inflow) : 0,
          [ClosedModel.cols.cash_outflow]: cash_outflow ? parseFloat(cash_outflow) : 0,
          [ClosedModel.cols.ending]: ending ? parseFloat(ending) : 0,
          [ClosedModel.cols.cashonhand]: cashonhand ? parseFloat(cashonhand) : 0,
          [ClosedModel.cols.gcash]: gcash ? parseFloat(gcash) : 0,
          [ClosedModel.cols.total_cash]: total_cash ? parseFloat(total_cash) : 0,
          [ClosedModel.cols.sub_total]: sub_total ? parseFloat(sub_total) : 0,
          [ClosedModel.cols.status]: status || 'BALANCED',
          [ClosedModel.cols.created_by]: created_by || userId,
          ...(ClosedModel.cols.createdAt ? { [ClosedModel.cols.createdAt]: new Date() } : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Closed Revolving Fund record not found' })
    }

    // Automatically update parent fund status to CLOSED when a closure entry is logged
    if (!id && revolving_fund_id) {
      const updateParentFundQuery = SQL.model(Revolving.Fund)
        .update({
          [Revolving.Fund.cols.status]: 'CLOSED',
        })
        .where(Revolving.Fund.pk, revolving_fund_id)
        .build()

      await Query(updateParentFundQuery.sql, updateParentFundQuery.bindings)
    }

    return res.status(200).json({
      message: id
        ? 'Closed Revolving Fund updated successfully'
        : 'Revolving Fund closed successfully',
    })
  } catch (error) {
    console.error('Error in upsertClosedRevolvingFund:', error)
    return res.status(500).json({ message: 'Error processing Closed Revolving Fund record' })
  }
}

/**
 * @name getRevolvingFund
 * @description Get all Revolving Fund records
 */
const getRevolvingFund = async (req, res) => {
  // #swagger.tags = ['Revolving Fund']
  // #swagger.description = 'Retrieve all Revolving Fund records with optional status filtering'
  /* 
    #swagger.parameters['status'] = {
      in: 'query',
      type: 'string',
      required: false,
      description: 'Filter by fund status (OPEN, CLOSED, ON REVIEW, CLEARED, RETURN)'
    }
    #swagger.parameters['budget_id'] = {
      in: 'query',
      type: 'integer',
      required: false,
      description: 'Filter by Parent Budget ID'
    }
  */

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
    return res.status(500).json({ message: 'Error retrieving Revolving Fund records' })
  }
}

/**
 * @name getRevolvingFundActivity
 * @description Get all Revolving Fund Activity records
 */
const getRevolvingFundActivity = async (req, res) => {
  // #swagger.tags = ['Revolving Fund']
  // #swagger.description = 'Retrieve Revolving Fund Activity logs filtered by revolving_fund_id'
  /* 
    #swagger.parameters['revolving_fund_id'] = {
      in: 'query',
      type: 'integer',
      required: false,
      description: 'Filter logs by Revolving Fund ID'
    }
  */

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
    return res.status(500).json({ message: 'Error retrieving Revolving Fund Activity records' })
  }
}

/**
 * @name getClosedRevolvingFund
 * @description Get all Closed Revolving Fund records
 */
const getClosedRevolvingFund = async (req, res) => {
  // #swagger.tags = ['Revolving Fund']
  // #swagger.description = 'Retrieve Closed Revolving Fund records'
  /* 
    #swagger.parameters['revolving_fund_id'] = {
      in: 'query',
      type: 'integer',
      required: false,
      description: 'Filter closure records by Revolving Fund ID'
    }
  */

  const { revolving_fund_id } = req.query
  const ClosedModel = Revolving.Closed || Revolving.ClosedRevolvingFund

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
    return res.status(500).json({ message: 'Error retrieving Closed Revolving Fund records' })
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
