const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterAccess
 * @description Update and insert Access
 */
const upsertMasterAccess = async (req, res) => {
  // #swagger.tags = ['Master Access']
  // #swagger.description = 'Upsert Access'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Access id'
  //   }
  //   #swagger.parameters['name'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Access name'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Access status'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const { id, name, status } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (name !== undefined) updateData[Master.Access.cols.name] = name
      if (status !== undefined) updateData[Master.Access.cols.status] = status

      if (Master.Access.cols.updatedAt) updateData[Master.Access.cols.updatedAt] = new Date()
      if (Master.Access.cols.updatedBy) updateData[Master.Access.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.Access).update(updateData).where(Master.Access.pk, id).build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!name) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.Access)
        .insert({
          [Master.Access.cols.name]: name,
          [Master.Access.cols.status]: status,
          ...(Master.Access.cols.createdBy ? { [Master.Access.cols.createdBy]: userId } : {}),
          ...(Master.Access.cols.createdAt ? { [Master.Access.cols.createdAt]: new Date() } : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Access not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Access' })
  }
}

/**
 * @name getMasterAccess
 * @description Get all Access records
 */
const getMasterAccess = async (req, res) => {
  // #swagger.tags = ['Master Access']
  // #swagger.description = 'Get all Access records'

  try {
    const { sql, bindings } = SQL.model(Master.Access)
      .select([
        Master.Access.cols.id,
        Master.Access.cols.name,
        Master.Access.cols.status,
        Master.Access.cols.createdAt,
      ])
      // .where(Master.Access.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Access records' })
  }
}

module.exports = {
  getMasterAccess,
  upsertMasterAccess,
}
