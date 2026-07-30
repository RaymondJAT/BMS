const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Red } = require('../database/models/Red')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertRedFlag
 * @description Update and insert Flag
 */
const upsertRedFlag = async (req, res) => {
  // #swagger.tags = ['Flag']
  // #swagger.description = 'Upsert Flag'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag id'
  //   }
  //   #swagger.parameters['liquidation_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag liquidation_id'
  //   }
  //   #swagger.parameters['liquidation_item_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag liquidation_item_id'
  //   }
  //   #swagger.parameters['from'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag from'
  //   }
  //   #swagger.parameters['to'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag to'
  //   }
  //   #swagger.parameters['mode_of_transportation_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag mode_of_transportation_id'
  //   }
  //   #swagger.parameters['min_amount'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag min_amount'
  //   }
  //   #swagger.parameters['max_amount'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag max_amount'
  //   }
  //   #swagger.parameters['amount'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag amount'
  //   }
  //   #swagger.parameters['created_by'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag created_by'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag status'
  //   }
  //   #swagger.parameters['approval_status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag approval_status'
  //   }
  //   #swagger.parameters['updated_by'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag updated_by'
  //   }
  //   #swagger.parameters['resolution_remarks'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Flag resolution_remarks'
  //   }
  */
  
  // Destructure only the non-system keys from req.body
  const { id, liquidation_id, liquidation_item_id, from, to, mode_of_transportation_id, min_amount, max_amount, amount, created_by, status, approval_status, updated_by, resolution_remarks } = req.body
  
  let query

  try {
    if (id) {
      let updateData = {}
      if (liquidation_id !== undefined) updateData[Red.Flag.cols.liquidation_id] = liquidation_id
      if (liquidation_item_id !== undefined) updateData[Red.Flag.cols.liquidation_item_id] = liquidation_item_id
      if (from !== undefined) updateData[Red.Flag.cols.from] = from
      if (to !== undefined) updateData[Red.Flag.cols.to] = to
      if (mode_of_transportation_id !== undefined) updateData[Red.Flag.cols.mode_of_transportation_id] = mode_of_transportation_id
      if (min_amount !== undefined) updateData[Red.Flag.cols.min_amount] = min_amount
      if (max_amount !== undefined) updateData[Red.Flag.cols.max_amount] = max_amount
      if (amount !== undefined) updateData[Red.Flag.cols.amount] = amount
      if (created_by !== undefined) updateData[Red.Flag.cols.created_by] = created_by
      if (status !== undefined) updateData[Red.Flag.cols.status] = status
      if (approval_status !== undefined) updateData[Red.Flag.cols.approval_status] = approval_status
      if (updated_by !== undefined) updateData[Red.Flag.cols.updated_by] = updated_by
      if (resolution_remarks !== undefined) updateData[Red.Flag.cols.resolution_remarks] = resolution_remarks

      if (Red.Flag.cols.updatedAt) updateData[Red.Flag.cols.updatedAt] = new Date()
      if (Red.Flag.cols.updatedBy) updateData[Red.Flag.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Red.Flag)
          .update(updateData)
          .where(Red.Flag.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!liquidation_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Red.Flag)
        .insert({
          [Red.Flag.cols.liquidation_id]: liquidation_id,
          [Red.Flag.cols.liquidation_item_id]: liquidation_item_id,
          [Red.Flag.cols.from]: from,
          [Red.Flag.cols.to]: to,
          [Red.Flag.cols.mode_of_transportation_id]: mode_of_transportation_id,
          [Red.Flag.cols.min_amount]: min_amount,
          [Red.Flag.cols.max_amount]: max_amount,
          [Red.Flag.cols.amount]: amount,
          [Red.Flag.cols.created_by]: created_by,
          [Red.Flag.cols.status]: status,
          [Red.Flag.cols.approval_status]: approval_status,
          [Red.Flag.cols.updated_by]: updated_by,
          [Red.Flag.cols.resolution_remarks]: resolution_remarks,
          ...( Red.Flag.cols.createdBy ? { [Red.Flag.cols.createdBy]: userId } : {} ),
          ...( Red.Flag.cols.createdAt ? { [Red.Flag.cols.createdAt]: new Date() } : {} ),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Flag not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Flag' })
  }
}

/**
 * @name getRedFlag
 * @description Get all Flag records
 */
const getRedFlag = async (req, res) => {
  // #swagger.tags = ['Flag']
  // #swagger.description = 'Get all Flag records'

  try {
    const { sql, bindings } = SQL.model(Red.Flag)
      .select([
        Red.Flag.cols.id,
        Red.Flag.cols.liquidation_id,
        Red.Flag.cols.liquidation_item_id,
        Red.Flag.cols.from,
        Red.Flag.cols.to,
        Red.Flag.cols.mode_of_transportation_id,
        Red.Flag.cols.min_amount,
        Red.Flag.cols.max_amount,
        Red.Flag.cols.amount,
        Red.Flag.cols.created_by,
        Red.Flag.cols.status,
        Red.Flag.cols.approval_status,
        Red.Flag.cols.updated_by,
        Red.Flag.cols.resolution_remarks,
        Red.Flag.cols.createdAt,
        Red.Flag.cols.updatedAt
      ])
      // .where(Red.Flag.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Flag records' })
  }
}

module.exports = {
  getRedFlag,
  upsertRedFlag
}
