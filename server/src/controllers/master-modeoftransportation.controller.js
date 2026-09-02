const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name upsertMasterModeOfTransportation
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

  const { id, name, status } = req.body
  const userId = req.user?.id || req.session?.userId || null
  let query

  try {
    if (id) {
      const updateData = {}
      if (name !== undefined) updateData[Master.ModeOfTransportation.cols.name] = name
      if (status !== undefined) updateData[Master.ModeOfTransportation.cols.status] = status

      if (Master.ModeOfTransportation.cols.updatedAt) {
        updateData[Master.ModeOfTransportation.cols.updatedAt] = new Date()
      }
      if (Master.ModeOfTransportation.cols.updatedBy && userId) {
        updateData[Master.ModeOfTransportation.cols.updatedBy] = userId
      }

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data provided to update' })
      }

      query = SQL.model(Master.ModeOfTransportation)
        .update(updateData)
        .where(Master.ModeOfTransportation.pk, id)
        .build()
    } else {
      if (!name) {
        return res.status(400).json({ message: 'Missing required field: name' })
      }

      const insertData = {
        [Master.ModeOfTransportation.cols.name]: name,
        [Master.ModeOfTransportation.cols.status]: status || 'ACTIVE',
      }

      if (Master.ModeOfTransportation.cols.createdBy && userId) {
        insertData[Master.ModeOfTransportation.cols.createdBy] = userId
      }
      if (Master.ModeOfTransportation.cols.createdAt) {
        insertData[Master.ModeOfTransportation.cols.createdAt] = new Date()
      }

      query = SQL.model(Master.ModeOfTransportation).insert(insertData).build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'ModeOfTransportation not found' })
    }

    return res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
      data: { id: id || result.insertId },
    })
  } catch (error) {
    console.error('upsertMasterModeOfTransportation error:', error)
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
        Master.ModeOfTransportation.cols.createdAt,
      ])
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json({
      status: 'SUCCESS',
      data: result,
    })
  } catch (error) {
    console.error('getMasterModeOfTransportation error:', error)
    return res.status(500).json({ message: 'Error retrieving ModeOfTransportation records' })
  }
}

/**
 * @name bulkImportMasterModeOfTransportation
 * @description Bulk insert ModeOfTransportation records from CSV
 */
const bulkImportMasterModeOfTransportation = async (req, res) => {
  // #swagger.tags = ['Master ModeOfTransportation']
  // #swagger.description = 'Bulk import ModeOfTransportation records'

  const { items } = req.body

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Invalid or empty items array' })
  }

  const queries = items.map((item) => {
    return SQL.model(Master.ModeOfTransportation)
      .insert({
        [Master.ModeOfTransportation.cols.name]: item.mmot_name || item.name,
        [Master.ModeOfTransportation.cols.status]: item.mmot_status || item.status || 'ACTIVE',
      })
      .build()
  })

  try {
    await Transaction(queries)
    return res.status(201).json({ message: 'Successfully imported transportation records' })
  } catch (error) {
    console.error('bulkImportMasterModeOfTransportation error:', error)
    return res.status(500).json({ message: 'Error performing bulk import' })
  }
}

module.exports = {
  getMasterModeOfTransportation,
  upsertMasterModeOfTransportation,
  bulkImportMasterModeOfTransportation,
}
