const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterPosition
 * @description Update and insert Position
 */
const upsertMasterPosition = async (req, res) => {
  // #swagger.tags = ['Master Position']
  // #swagger.description = 'Upsert Position'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Position id'
  //   }
  //   #swagger.parameters['code'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Position code'
  //   }
  //   #swagger.parameters['description'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Position description'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Position status'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const { id, code, description, status } = req.body

  const userId = req.userId || req.user?.id || 1

  let query

  try {
    if (id) {
      let updateData = {}
      if (code !== undefined) updateData[Master.Position.cols.code] = code
      if (description !== undefined) updateData[Master.Position.cols.description] = description
      if (status !== undefined) updateData[Master.Position.cols.status] = status

      if (Master.Position.cols.updatedAt) updateData[Master.Position.cols.updatedAt] = new Date()
      if (Master.Position.cols.updatedBy) updateData[Master.Position.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.Position).update(updateData).where(Master.Position.pk, id).build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!code) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.Position)
        .insert({
          [Master.Position.cols.code]: code,
          [Master.Position.cols.description]: description,
          [Master.Position.cols.status]: status,
          ...(Master.Position.cols.createdBy ? { [Master.Position.cols.createdBy]: userId } : {}),
          ...(Master.Position.cols.createdAt
            ? { [Master.Position.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Position not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Position' })
  }
}

/**
 * @name getMasterPosition
 * @description Get all Position records
 */
const getMasterPosition = async (req, res) => {
  // #swagger.tags = ['Master Position']
  // #swagger.description = 'Get all Position records'

  try {
    const { sql, bindings } = SQL.model(Master.Position)
      .select([
        Master.Position.cols.id,
        Master.Position.cols.code,
        Master.Position.cols.description,
        Master.Position.cols.status,
        Master.Position.cols.createdAt,
      ])
      // .where(Master.Position.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Position records' })
  }
}

module.exports = {
  getMasterPosition,
  upsertMasterPosition,
}
