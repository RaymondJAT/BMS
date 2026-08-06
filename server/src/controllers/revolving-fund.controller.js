const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Revolving } = require('../database/models/Revolving')
const { Closed } = require('../database/models/Closed')

const SQL = new SQLQueryBuilder()

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
    bank_account_id,
  } = req.body

  try {
    if (id) {
      // ==========================================
      // UPDATE FLOW
      // ==========================================
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

      if (Revolving.Fund.cols.updatedAt) updateData[Revolving.Fund.cols.updatedAt] = new Date()
      if (Revolving.Fund.cols.updatedBy) updateData[Revolving.Fund.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data provided to update' })
      }

      const query = SQL.model(Revolving.Fund)
        .update(updateData)
        .where(Revolving.Fund.pk, id)
        .build()

      const result = await Query(query.sql, query.bindings)

      if (result.affectedRows === 0) {
        return res.status(404).json({ message: 'Revolving Fund not found' })
      }

      if (Revolving.FundActivity) {
        const activityQuery = SQL.model(Revolving.FundActivity)
          .insert({
            [Revolving.FundActivity.cols.revolving_fund_id]: id,
            [Revolving.FundActivity.cols.remarks]: `Revolving Fund updated (Status: ${
              updateData[Revolving.Fund.cols.status] || 'N/A'
            })`,
            [Revolving.FundActivity.cols.user_id]: userId,
            ...(Revolving.FundActivity.cols.createdAt
              ? { [Revolving.FundActivity.cols.createdAt]: new Date() }
              : {}),
          })
          .build()

        await Query(activityQuery.sql, activityQuery.bindings)
      }

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

      const budgetQuery = await Query(
        `SELECT b_id, b_amount, b_type, b_department_id FROM budget WHERE b_id = ?`,
        [budget_id],
      )
      if (!budgetQuery || budgetQuery.length === 0) {
        return res.status(400).json({ message: 'Invalid budget ID' })
      }

      const budgetData = budgetQuery[0]
      const departmentId = budgetData.b_department_id
      const budgetType = budgetData.b_type

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

      if (parseNum(budgetData.b_amount) < beginningAmount) {
        return res.status(400).json({ message: 'Insufficient budget amount balance.' })
      }

      const now = new Date()
      const currentYear = parseNum(year, now.getFullYear())
      const currentMonth = parseNum(month, now.getMonth() + 1)
      const startDateVal = start_date || todayStr
      const endDateVal = end_date || null
      const initialIssued = parseNum(issued)

      const initialStatus = status || (initialIssued > 0 ? 'ON REVIEW' : 'OPEN')

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
          ...(Revolving.Fund.cols.createdBy ? { [Revolving.Fund.cols.createdBy]: userId } : {}),
          ...(Revolving.Fund.cols.createdAt ? { [Revolving.Fund.cols.createdAt]: new Date() } : {}),
        })
        .build()

      const resFund = await Query(insertFundQuery.sql, insertFundQuery.bindings)
      const newFundId = resFund.insertId

      if (newFundId && Revolving.FundActivity) {
        const activityQuery = SQL.model(Revolving.FundActivity)
          .insert({
            [Revolving.FundActivity.cols.revolving_fund_id]: newFundId,
            [Revolving.FundActivity.cols.remarks]:
              `Initial fund created (Status: ${initialStatus}, Amount: ₱${totalFundAmount.toFixed(
                2,
              )})`,
            [Revolving.FundActivity.cols.user_id]: userId,
            ...(Revolving.FundActivity.cols.createdAt
              ? { [Revolving.FundActivity.cols.createdAt]: new Date() }
              : {}),
          })
          .build()

        await Query(activityQuery.sql, activityQuery.bindings)
      }

      if (addedAmount > 0) {
        const updatedBudgetAmount = parseNum(budgetData.b_amount) + addedAmount
        await Query(`UPDATE budget SET b_amount = ? WHERE b_id = ?`, [
          updatedBudgetAmount,
          budget_id,
        ])
        await Query(
          `INSERT INTO budget_history (bh_budget_id, bh_amount, bh_date, bh_type) VALUES (?, ?, ?, 'DEBIT')`,
          [budget_id, addedAmount, todayStr],
        )
      }

      if (addedAmount > 0 && bank_account_id) {
        const yyyy = now.getFullYear()
        const mm = String(now.getMonth() + 1).padStart(2, '0')

        const countQuery = await Query(
          `SELECT COUNT(*) AS current_count FROM transaction WHERE t_reference_id LIKE ?`,
          [`BA-${yyyy}-${mm}%`],
        )
        const currentCount = countQuery[0]?.current_count || 0
        const sequence = `BA-${yyyy}-${mm}-${String(currentCount + 1).padStart(4, '0')}`

        const deptQuery = await Query(
          `SELECT md_description FROM master_department WHERE md_id = ?`,
          [departmentId],
        )
        const departmentName = deptQuery[0]?.md_description || ''

        const transactionResult = await Query(
          `INSERT INTO transaction (
            t_bank_account_id, t_reference_id, t_type, t_category, t_description, 
            t_from_id, t_to_id, t_amount, t_net_amount, t_gross_amount, 
            t_datetime, t_created_by, t_updated_by, t_updated_at, t_status
          ) VALUES (?, ?, 'DEBIT', 'Budget', ?, 1, 2, ?, ?, ?, NOW(), ?, ?, NOW(), 'Paid')`,
          [
            bank_account_id,
            sequence,
            `Budget allocation for ${departmentName}`,
            addedAmount,
            addedAmount,
            addedAmount,
            userId,
            userId,
          ],
        )

        const transactionId = transactionResult.insertId

        if (transactionId) {
          await Query(
            `INSERT INTO transaction_history (
              th_transaction_id, th_from_id, th_to_id, th_status, th_created_by, th_created_at, th_amount
            ) VALUES (?, 1, 2, 'Paid', ?, NOW(), ?)`,
            [transactionId, userId, -addedAmount],
          )
        }
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
 * @description Submit or Report Revolving Fund reconciliation (Sets SubmitRevolvingFund status to BALANCED/SHORT/OVER, and updates parent fund to CLOSED/CLEARED)
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
    status, // Expected: 'BALANCED', 'SHORT', or 'OVER'
    created_by,
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

      if (ClosedModel.cols.updatedAt) updateData[ClosedModel.cols.updatedAt] = new Date()
      if (ClosedModel.cols.updatedBy) updateData[ClosedModel.cols.updatedBy] = userId

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
      // Create new submission record
      if (!revolving_fund_id) {
        return res.status(400).json({ message: 'Missing required field: revolving_fund_id' })
      }

      const validSubmitStatuses = ['BALANCED', 'SHORT', 'OVER']
      const submitStatus =
        status && validSubmitStatuses.includes(status.toUpperCase())
          ? status.toUpperCase()
          : 'BALANCED'

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
          ...(ClosedModel.cols.createdAt ? { [ClosedModel.cols.createdAt]: new Date() } : {}),
        })
        .build()

      const insertResult = await Query(insertQuery.sql, insertQuery.bindings)
      closedRecordId = insertResult.insertId

      const fundDetails = await Query(`SELECT rf_outstanding FROM revolving_fund WHERE rf_id = ?`, [
        revolving_fund_id,
      ])

      const outstandingAmount = fundDetails[0] ? parseNum(fundDetails[0].rf_outstanding) : 0
      const targetParentStatus = outstandingAmount > 0 ? 'CLOSED' : 'CLEARED'

      const updateParentQuery = SQL.model(Revolving.Fund)
        .update({
          [Revolving.Fund.cols.status]: targetParentStatus,
        })
        .where(Revolving.Fund.pk, revolving_fund_id)
        .build()

      await Query(updateParentQuery.sql, updateParentQuery.bindings)

      if (Revolving.FundActivity) {
        const activityQuery = SQL.model(Revolving.FundActivity)
          .insert({
            [Revolving.FundActivity.cols.revolving_fund_id]: revolving_fund_id,
            [Revolving.FundActivity.cols.remarks]:
              `Revolving Fund submitted/reported with reconciliation status: ${submitStatus}. Parent status changed to ${targetParentStatus}.`,
            [Revolving.FundActivity.cols.user_id]: userId,
            ...(Revolving.FundActivity.cols.createdAt
              ? { [Revolving.FundActivity.cols.createdAt]: new Date() }
              : {}),
          })
          .build()

        await Query(activityQuery.sql, activityQuery.bindings)
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
