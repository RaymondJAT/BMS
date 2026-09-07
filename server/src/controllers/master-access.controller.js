const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name upsertMasterAccess
 * @description Create or update an Access Role record.
 */
const upsertMasterAccess = async (req, res) => {
  // #swagger.tags = ['Master Access']
  // #swagger.description = 'Create or update an Access Role (e.g. Requester, Team Leader, Fund Custodian, Finance, Administrator).'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /*
    #swagger.parameters['id'] = { in: 'formData', type: 'integer', required: false, description: 'Access role id — omit to create, include to update' }
    #swagger.parameters['name'] = { in: 'formData', type: 'string', required: true, description: 'Access role name' }
    #swagger.parameters['status'] = { in: 'formData', type: 'string', required: false, description: 'ACTIVE or INACTIVE, defaults to ACTIVE on create' }
  */

  const { id, name, status } = req.body
  const userId = req.userId || req.user?.id || 1

  let query

  try {
    if (id) {
      const updateData = {}
      if (name !== undefined) updateData[Master.Access.cols.name] = name
      if (status !== undefined) updateData[Master.Access.cols.status] = status

      if (Master.Access.cols.updatedAt) updateData[Master.Access.cols.updatedAt] = new Date()
      if (Master.Access.cols.updatedBy) updateData[Master.Access.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      }
      query = SQL.model(Master.Access).update(updateData).where(Master.Access.pk, id).build()
    } else {
      if (!name) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.Access)
        .insert({
          [Master.Access.cols.name]: name,
          [Master.Access.cols.status]: status || 'ACTIVE',
          ...(Master.Access.cols.createdBy ? { [Master.Access.cols.createdBy]: userId } : {}),
          ...(Master.Access.cols.createdAt ? { [Master.Access.cols.createdAt]: new Date() } : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Access role not found' })
    }

    return res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.error('Error in upsertMasterAccess:', error)
    return res.status(500).json({ message: 'Error processing Access record' })
  }
}

/**
 * @name getMasterAccess
 * @description Get all Access Role records.
 */
const getMasterAccess = async (req, res) => {
  // #swagger.tags = ['Master Access']
  // #swagger.description = 'Get all Access Role records.'

  try {
    const { sql, bindings } = SQL.model(Master.Access)
      .select([
        Master.Access.cols.id,
        Master.Access.cols.name,
        Master.Access.cols.status,
        Master.Access.cols.createdAt,
      ])
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getMasterAccess:', error)
    return res.status(500).json({ message: 'Error retrieving Access records' })
  }
}

module.exports = {
  getMasterAccess,
  upsertMasterAccess,
}
