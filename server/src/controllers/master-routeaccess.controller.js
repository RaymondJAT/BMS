const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterRouteAccess
 * @description Update and insert RouteAccess
 */
const upsertMasterRouteAccess = async (req, res) => {
  // #swagger.tags = ['Master RouteAccess']
  // #swagger.description = 'Upsert RouteAccess'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RouteAccess id'
  //   }
  //   #swagger.parameters['access_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RouteAccess access_id'
  //   }
  //   #swagger.parameters['name'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RouteAccess name'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RouteAccess status'
  //   }
  */
  
  // Destructure only the non-system keys from req.body
  const { id, access_id, name, status } = req.body
  
  let query

  try {
    if (id) {
      let updateData = {}
      if (access_id !== undefined) updateData[Master.RouteAccess.cols.access_id] = access_id
      if (name !== undefined) updateData[Master.RouteAccess.cols.name] = name
      if (status !== undefined) updateData[Master.RouteAccess.cols.status] = status

      if (Master.RouteAccess.cols.updatedAt) updateData[Master.RouteAccess.cols.updatedAt] = new Date()
      if (Master.RouteAccess.cols.updatedBy) updateData[Master.RouteAccess.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.RouteAccess)
          .update(updateData)
          .where(Master.RouteAccess.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!access_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.RouteAccess)
        .insert({
          [Master.RouteAccess.cols.access_id]: access_id,
          [Master.RouteAccess.cols.name]: name,
          [Master.RouteAccess.cols.status]: status,
          ...( Master.RouteAccess.cols.createdBy ? { [Master.RouteAccess.cols.createdBy]: userId } : {} ),
          ...( Master.RouteAccess.cols.createdAt ? { [Master.RouteAccess.cols.createdAt]: new Date() } : {} ),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'RouteAccess not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing RouteAccess' })
  }
}

/**
 * @name getMasterRouteAccess
 * @description Get all RouteAccess records
 */
const getMasterRouteAccess = async (req, res) => {
  // #swagger.tags = ['Master RouteAccess']
  // #swagger.description = 'Get all RouteAccess records'

  try {
    const { sql, bindings } = SQL.model(Master.RouteAccess)
      .select([
        Master.RouteAccess.cols.id,
        Master.RouteAccess.cols.access_id,
        Master.RouteAccess.cols.name,
        Master.RouteAccess.cols.status,
        Master.RouteAccess.cols.createdAt
      ])
      // .where(Master.RouteAccess.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving RouteAccess records' })
  }
}

module.exports = {
  getMasterRouteAccess,
  upsertMasterRouteAccess
}
