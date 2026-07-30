const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Cash } = require('../database/models/Cash')
const SQL = new SQLQueryBuilder()

/**
 * @name upsertCashDisbursement
 * @description Update and insert Disbursement
 */
const upsertCashDisbursement = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Upsert Disbursement'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement id'
    }
    #swagger.parameters['date_issued'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement date_issued'
    }
    #swagger.parameters['received_by'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement received_by'
    }
    #swagger.parameters['revolving_fund_id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement revolving_fund_id'
    }
    #swagger.parameters['department_id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement department_id'
    }
    #swagger.parameters['particulars'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement particulars'
    }
    #swagger.parameters['amount_issued'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Disbursement amount_issued'
    }
    #swagger.parameters['cash_voucher'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement cash_voucher'
    }
    #swagger.parameters['amount_returned'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Disbursement amount_returned'
    }
    #swagger.parameters['outstanding_amount'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Disbursement outstanding_amount'
    }
    #swagger.parameters['amount_expended'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'Disbursement amount_expended'
    }
    #swagger.parameters['status'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Disbursement status'
    }
  */

  const userId = req.user ? req.user.id : null

  const {
    id,
    date_issued,
    received_by,
    revolving_fund_id,
    department_id,
    particulars,
    amount_issued,
    cash_voucher,
    amount_returned,
    outstanding_amount,
    amount_expended,
    status,
  } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (date_issued !== undefined) updateData[Cash.Disbursement.cols.date_issued] = date_issued
      if (received_by !== undefined) updateData[Cash.Disbursement.cols.received_by] = received_by
      if (revolving_fund_id !== undefined)
        updateData[Cash.Disbursement.cols.revolving_fund_id] = revolving_fund_id
      if (department_id !== undefined)
        updateData[Cash.Disbursement.cols.department_id] = department_id
      if (particulars !== undefined) updateData[Cash.Disbursement.cols.particulars] = particulars
      if (amount_issued !== undefined)
        updateData[Cash.Disbursement.cols.amount_issued] = amount_issued
      if (cash_voucher !== undefined) updateData[Cash.Disbursement.cols.cash_voucher] = cash_voucher
      if (amount_returned !== undefined)
        updateData[Cash.Disbursement.cols.amount_returned] = amount_returned
      if (outstanding_amount !== undefined)
        updateData[Cash.Disbursement.cols.outstanding_amount] = outstanding_amount
      if (amount_expended !== undefined)
        updateData[Cash.Disbursement.cols.amount_expended] = amount_expended
      if (status !== undefined) updateData[Cash.Disbursement.cols.status] = status

      if (Cash.Disbursement.cols.updatedAt)
        updateData[Cash.Disbursement.cols.updatedAt] = new Date()
      if (Cash.Disbursement.cols.updatedBy && userId)
        updateData[Cash.Disbursement.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Cash.Disbursement)
          .update(updateData)
          .where(Cash.Disbursement.pk, id)
          .build()
      }
    } else {
      if (!date_issued) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Cash.Disbursement)
        .insert({
          [Cash.Disbursement.cols.date_issued]: date_issued,
          [Cash.Disbursement.cols.received_by]: received_by,
          [Cash.Disbursement.cols.revolving_fund_id]: revolving_fund_id,
          [Cash.Disbursement.cols.department_id]: department_id,
          [Cash.Disbursement.cols.particulars]: particulars,
          [Cash.Disbursement.cols.amount_issued]: amount_issued,
          [Cash.Disbursement.cols.cash_voucher]: cash_voucher,
          [Cash.Disbursement.cols.amount_returned]: amount_returned,
          [Cash.Disbursement.cols.outstanding_amount]: outstanding_amount,
          [Cash.Disbursement.cols.amount_expended]: amount_expended,
          [Cash.Disbursement.cols.status]: status,
          ...(Cash.Disbursement.cols.createdBy && userId
            ? { [Cash.Disbursement.cols.createdBy]: userId }
            : {}),
          ...(Cash.Disbursement.cols.createdAt
            ? { [Cash.Disbursement.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Disbursement not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error processing Disbursement' })
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
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'DisbursementFile id'
    }
    #swagger.parameters['cash_disbursement_id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'DisbursementFile cash_disbursement_id'
    }
    #swagger.parameters['image'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'DisbursementFile image'
    }
  */

  const userId = req.user ? req.user.id : null
  const { id, cash_disbursement_id, image } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (cash_disbursement_id !== undefined)
        updateData[Cash.DisbursementFile.cols.cash_disbursement_id] = cash_disbursement_id
      if (image !== undefined) updateData[Cash.DisbursementFile.cols.image] = image

      if (Cash.DisbursementFile.cols.updatedAt)
        updateData[Cash.DisbursementFile.cols.updatedAt] = new Date()
      if (Cash.DisbursementFile.cols.updatedBy && userId)
        updateData[Cash.DisbursementFile.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Cash.DisbursementFile)
          .update(updateData)
          .where(Cash.DisbursementFile.pk, id)
          .build()
      }
    } else {
      if (!cash_disbursement_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Cash.DisbursementFile)
        .insert({
          [Cash.DisbursementFile.cols.cash_disbursement_id]: cash_disbursement_id,
          [Cash.DisbursementFile.cols.image]: image,
          ...(Cash.DisbursementFile.cols.createdBy && userId
            ? { [Cash.DisbursementFile.cols.createdBy]: userId }
            : {}),
          ...(Cash.DisbursementFile.cols.createdAt
            ? { [Cash.DisbursementFile.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'DisbursementFile not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error processing DisbursementFile' })
  }
}

/**
 * @name upsertCashDisbursementActivity
 * @description Update and insert DisbursementActivity
 */
const upsertCashDisbursementActivity = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Upsert DisbursementActivity'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'DisbursementActivity id'
    }
    #swagger.parameters['cash_disbursement_id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'DisbursementActivity cash_disbursement_id'
    }
    #swagger.parameters['amount'] = {
      in: 'formData',
      type: 'number',
      required: false,
      description: 'DisbursementActivity amount'
    }
    #swagger.parameters['remarks'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'DisbursementActivity remarks'
    }
    #swagger.parameters['particulars'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'DisbursementActivity particulars'
    }
  */

  const userId = req.user ? req.user.id : null
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

      if (Cash.DisbursementActivity.cols.updatedAt)
        updateData[Cash.DisbursementActivity.cols.updatedAt] = new Date()
      if (Cash.DisbursementActivity.cols.updatedBy && userId)
        updateData[Cash.DisbursementActivity.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Cash.DisbursementActivity)
          .update(updateData)
          .where(Cash.DisbursementActivity.pk, id)
          .build()
      }
    } else {
      if (!cash_disbursement_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Cash.DisbursementActivity)
        .insert({
          [Cash.DisbursementActivity.cols.cash_disbursement_id]: cash_disbursement_id,
          [Cash.DisbursementActivity.cols.amount]: amount,
          [Cash.DisbursementActivity.cols.remarks]: remarks,
          [Cash.DisbursementActivity.cols.particulars]: particulars,
          ...(Cash.DisbursementActivity.cols.createdBy && userId
            ? { [Cash.DisbursementActivity.cols.createdBy]: userId }
            : {}),
          ...(Cash.DisbursementActivity.cols.createdAt
            ? { [Cash.DisbursementActivity.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'DisbursementActivity not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error processing DisbursementActivity' })
  }
}

/**
 * @name getCashDisbursement
 * @description Get all Disbursement records
 */
const getCashDisbursement = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Get all Disbursement records'

  try {
    const { sql, bindings } = SQL.model(Cash.Disbursement)
      .select([
        Cash.Disbursement.cols.id,
        Cash.Disbursement.cols.date_issued,
        Cash.Disbursement.cols.received_by,
        Cash.Disbursement.cols.revolving_fund_id,
        Cash.Disbursement.cols.department_id,
        Cash.Disbursement.cols.particulars,
        Cash.Disbursement.cols.amount_issued,
        Cash.Disbursement.cols.cash_voucher,
        Cash.Disbursement.cols.amount_returned,
        Cash.Disbursement.cols.outstanding_amount,
        Cash.Disbursement.cols.amount_expended,
        Cash.Disbursement.cols.status,
        Cash.Disbursement.cols.createdAt,
      ])
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error retrieving Disbursement records' })
  }
}

/**
 * @name getCashDisbursementFile
 * @description Get all DisbursementFile records
 */
const getCashDisbursementFile = async (req, res) => {
  // #swagger.tags = ['Cash Disbursement']
  // #swagger.description = 'Get all DisbursementFile records'

  try {
    const { sql, bindings } = SQL.model(Cash.DisbursementFile)
      .select([
        Cash.DisbursementFile.cols.id,
        Cash.DisbursementFile.cols.cash_disbursement_id,
        Cash.DisbursementFile.cols.image,
        Cash.DisbursementFile.cols.createdAt,
      ])
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error(error)
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

  try {
    const { sql, bindings } = SQL.model(Cash.DisbursementActivity)
      .select([
        Cash.DisbursementActivity.cols.id,
        Cash.DisbursementActivity.cols.cash_disbursement_id,
        Cash.DisbursementActivity.cols.amount,
        Cash.DisbursementActivity.cols.remarks,
        Cash.DisbursementActivity.cols.particulars,
        Cash.DisbursementActivity.cols.createdAt,
      ])
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Error retrieving DisbursementActivity records' })
  }
}

module.exports = {
  getCashDisbursement,
  upsertCashDisbursement,
  getCashDisbursementFile,
  upsertCashDisbursementFile,
  getCashDisbursementActivity,
  upsertCashDisbursementActivity,
}
