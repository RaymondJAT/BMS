const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Liquidation } = require('../database/models/Liquidation')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertLiquidationLiquidation
 * @description Update and insert Liquidation
 */
const upsertLiquidationLiquidation = async (req, res) => {
  // #swagger.tags = ['Liquidation']
  // #swagger.description = 'Upsert Liquidation'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Liquidation id'
  //   }
  //   #swagger.parameters['cash_request_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Liquidation cash_request_id'
  //   }
  //   #swagger.parameters['description'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Liquidation description'
  //   }
  //   #swagger.parameters['amount_obtained'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Liquidation amount_obtained'
  //   }
  //   #swagger.parameters['amount_expended'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Liquidation amount_expended'
  //   }
  //   #swagger.parameters['reimburse_return'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Liquidation reimburse_return'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Liquidation status'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const {
    id,
    cash_request_id,
    description,
    amount_obtained,
    amount_expended,
    reimburse_return,
    status,
  } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (cash_request_id !== undefined)
        updateData[Liquidation.Liquidation.cols.cash_request_id] = cash_request_id
      if (description !== undefined)
        updateData[Liquidation.Liquidation.cols.description] = description
      if (amount_obtained !== undefined)
        updateData[Liquidation.Liquidation.cols.amount_obtained] = amount_obtained
      if (amount_expended !== undefined)
        updateData[Liquidation.Liquidation.cols.amount_expended] = amount_expended
      if (reimburse_return !== undefined)
        updateData[Liquidation.Liquidation.cols.reimburse_return] = reimburse_return
      if (status !== undefined) updateData[Liquidation.Liquidation.cols.status] = status

      if (Liquidation.Liquidation.cols.updatedAt)
        updateData[Liquidation.Liquidation.cols.updatedAt] = new Date()
      if (Liquidation.Liquidation.cols.updatedBy)
        updateData[Liquidation.Liquidation.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Liquidation.Liquidation)
          .update(updateData)
          .where(Liquidation.Liquidation.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!cash_request_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Liquidation.Liquidation)
        .insert({
          [Liquidation.Liquidation.cols.cash_request_id]: cash_request_id,
          [Liquidation.Liquidation.cols.description]: description,
          [Liquidation.Liquidation.cols.amount_obtained]: amount_obtained,
          [Liquidation.Liquidation.cols.amount_expended]: amount_expended,
          [Liquidation.Liquidation.cols.reimburse_return]: reimburse_return,
          [Liquidation.Liquidation.cols.status]: status,
          ...(Liquidation.Liquidation.cols.createdBy
            ? { [Liquidation.Liquidation.cols.createdBy]: userId }
            : {}),
          ...(Liquidation.Liquidation.cols.createdAt
            ? { [Liquidation.Liquidation.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Liquidation not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Liquidation' })
  }
}

/**
 * @name getLiquidationLiquidation
 * @description Get all Liquidation records
 */
const getLiquidationLiquidation = async (req, res) => {
  // #swagger.tags = ['Liquidation']
  // #swagger.description = 'Get all Liquidation records'

  try {
    const { sql, bindings } = SQL.model(Liquidation.Liquidation)
      .select([
        Liquidation.Liquidation.cols.id,
        Liquidation.Liquidation.cols.cash_request_id,
        Liquidation.Liquidation.cols.description,
        Liquidation.Liquidation.cols.amount_obtained,
        Liquidation.Liquidation.cols.amount_expended,
        Liquidation.Liquidation.cols.reimburse_return,
        Liquidation.Liquidation.cols.status,
        Liquidation.Liquidation.cols.createdAt,
      ])
      // .where(Liquidation.Liquidation.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Liquidation records' })
  }
}

module.exports = {
  getLiquidationLiquidation,
  upsertLiquidationLiquidation,
}
