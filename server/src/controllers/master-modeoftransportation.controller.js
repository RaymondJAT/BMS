const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterModeOfTransportation
 * @description Update and insert ModeOfTransportation
 */
const upsertMasterModeOfTransportation = async (req, res) => {
  // #swagger.tags = ['Master ModeOfTransportation']
  // #swagger.description = 'Upsert ModeOfTransportation'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'ModeOfTransportation id'
  //   }
  //   #swagger.parameters['name'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'ModeOfTransportation name'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'ModeOfTransportation status'
  //   }
  */
  
  // Destructure only the non-system keys from req.body
  const { id, name, status } = req.body
  
  let query

  try {
    if (id) {
      let updateData = {}
      if (name !== undefined) updateData[Master.ModeOfTransportation.cols.name] = name
      if (status !== undefined) updateData[Master.ModeOfTransportation.cols.status] = status

      if (Master.ModeOfTransportation.cols.updatedAt) updateData[Master.ModeOfTransportation.cols.updatedAt] = new Date()
      if (Master.ModeOfTransportation.cols.updatedBy) updateData[Master.ModeOfTransportation.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.ModeOfTransportation)
          .update(updateData)
          .where(Master.ModeOfTransportation.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!name) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.ModeOfTransportation)
        .insert({
          [Master.ModeOfTransportation.cols.name]: name,
          [Master.ModeOfTransportation.cols.status]: status,
          ...( Master.ModeOfTransportation.cols.createdBy ? { [Master.ModeOfTransportation.cols.createdBy]: userId } : {} ),
          ...( Master.ModeOfTransportation.cols.createdAt ? { [Master.ModeOfTransportation.cols.createdAt]: new Date() } : {} ),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'ModeOfTransportation not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing ModeOfTransportation' })
  }
}

/**
 * @name getMasterModeOfTransportation
 * @description Get all ModeOfTransportation records
 */
const getMasterModeOfTransportation = async (req, res) => {
  // #swagger.tags = ['Master ModeOfTransportation']
  // #swagger.description = 'Get all ModeOfTransportation records'

  try {
    const { sql, bindings } = SQL.model(Master.ModeOfTransportation)
      .select([
        Master.ModeOfTransportation.cols.id,
        Master.ModeOfTransportation.cols.name,
        Master.ModeOfTransportation.cols.status,
        Master.ModeOfTransportation.cols.createdAt
      ])
      // .where(Master.ModeOfTransportation.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving ModeOfTransportation records' })
  }
}

module.exports = {
  getMasterModeOfTransportation,
  upsertMasterModeOfTransportation
}
