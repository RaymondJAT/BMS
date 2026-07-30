const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Liquidation } = require('../database/models/Liquidation')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertLiquidationActivity
 * @description Update and insert Activity
 */
const upsertLiquidationActivity = async (req, res) => {
  // #swagger.tags = ['Liquidation']
  // #swagger.description = 'Upsert Activity'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Activity id'
  //   }
  //   #swagger.parameters['liquidation_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Activity liquidation_id'
  //   }
  //   #swagger.parameters['action'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Activity action'
  //   }
  //   #swagger.parameters['remarks'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Activity remarks'
  //   }
  //   #swagger.parameters['receipt'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Activity receipt'
  //   }
  //   #swagger.parameters['created_by'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Activity created_by'
  //   }
  */
  
  // Destructure only the non-system keys from req.body
  const { id, liquidation_id, action, remarks, receipt, created_by } = req.body
  
  let query

  try {
    if (id) {
      let updateData = {}
      if (liquidation_id !== undefined) updateData[Liquidation.Activity.cols.liquidation_id] = liquidation_id
      if (action !== undefined) updateData[Liquidation.Activity.cols.action] = action
      if (remarks !== undefined) updateData[Liquidation.Activity.cols.remarks] = remarks
      if (receipt !== undefined) updateData[Liquidation.Activity.cols.receipt] = receipt
      if (created_by !== undefined) updateData[Liquidation.Activity.cols.created_by] = created_by

      if (Liquidation.Activity.cols.updatedAt) updateData[Liquidation.Activity.cols.updatedAt] = new Date()
      if (Liquidation.Activity.cols.updatedBy) updateData[Liquidation.Activity.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Liquidation.Activity)
          .update(updateData)
          .where(Liquidation.Activity.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!liquidation_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Liquidation.Activity)
        .insert({
          [Liquidation.Activity.cols.liquidation_id]: liquidation_id,
          [Liquidation.Activity.cols.action]: action,
          [Liquidation.Activity.cols.remarks]: remarks,
          [Liquidation.Activity.cols.receipt]: receipt,
          [Liquidation.Activity.cols.created_by]: created_by,
          ...( Liquidation.Activity.cols.createdBy ? { [Liquidation.Activity.cols.createdBy]: userId } : {} ),
          ...( Liquidation.Activity.cols.createdAt ? { [Liquidation.Activity.cols.createdAt]: new Date() } : {} ),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Activity not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Activity' })
  }
}

/**
 * @name getLiquidationActivity
 * @description Get all Activity records
 */
const getLiquidationActivity = async (req, res) => {
  // #swagger.tags = ['Liquidation']
  // #swagger.description = 'Get all Activity records'

  try {
    const { sql, bindings } = SQL.model(Liquidation.Activity)
      .select([
        Liquidation.Activity.cols.id,
        Liquidation.Activity.cols.liquidation_id,
        Liquidation.Activity.cols.action,
        Liquidation.Activity.cols.remarks,
        Liquidation.Activity.cols.receipt,
        Liquidation.Activity.cols.created_by,
        Liquidation.Activity.cols.createdAt
      ])
      // .where(Liquidation.Activity.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Activity records' })
  }
}

module.exports = {
  getLiquidationActivity,
  upsertLiquidationActivity
}
