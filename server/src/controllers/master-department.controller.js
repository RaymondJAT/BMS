const { Query, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterDepartment
 * @description Update and insert Department
 */
const upsertMasterDepartment = async (req, res) => {
  // #swagger.tags = ['Master Department']
  // #swagger.description = 'Upsert Department'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded', 'application/json']
  /* 
    #swagger.parameters['id'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Department id'
    }
    #swagger.parameters['code'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Department code'
    }
    #swagger.parameters['name'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Department name'
    }
    #swagger.parameters['status'] = {
      in: 'formData',
      type: 'string',
      required: false,
      description: 'Department status'
    }
  */

  // TEMP: fallback user ID until auth middleware is connected
  const userId = req.userId || req.user?.id || 1
  const { id, code, name, status } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (code !== undefined) updateData[Master.Department.cols.code] = code
      if (name !== undefined) updateData[Master.Department.cols.name] = name
      if (status !== undefined) updateData[Master.Department.cols.status] = status

      if (Master.Department.cols.updatedAt)
        updateData[Master.Department.cols.updatedAt] = new Date()
      if (Master.Department.cols.updatedBy) updateData[Master.Department.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.Department)
          .update(updateData)
          .where(Master.Department.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts
      if (!code || !name) {
        return res.status(400).json({ message: 'Missing required fields: code and name' })
      }

      query = SQL.model(Master.Department)
        .insert({
          [Master.Department.cols.code]: code,
          [Master.Department.cols.name]: name,
          [Master.Department.cols.status]: status || 'ACTIVE',
          ...(Master.Department.cols.createdBy
            ? { [Master.Department.cols.createdBy]: userId }
            : {}),
          ...(Master.Department.cols.createdAt
            ? { [Master.Department.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Department not found' })
    }

    return res.status(id ? 200 : 201).json({
      message: id ? 'Updated successfully' : 'Created successfully',
      id: id || result.insertId,
    })
  } catch (error) {
    console.error('Error in upsertMasterDepartment:', error)
    return res.status(500).json({ message: 'Error processing Department' })
  }
}

/**
 * @name getMasterDepartment
 * @description Get all Department records
 */
const getMasterDepartment = async (req, res) => {
  // #swagger.tags = ['Master Department']
  // #swagger.description = 'Get all Department records'

  try {
    const { sql, bindings } = SQL.model(Master.Department)
      .select([
        Master.Department.cols.id,
        Master.Department.cols.code,
        Master.Department.cols.name,
        Master.Department.cols.status,
        Master.Department.cols.createdAt,
      ])
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getMasterDepartment:', error)
    return res.status(500).json({ message: 'Error retrieving Department records' })
  }
}

module.exports = {
  getMasterDepartment,
  upsertMasterDepartment,
}
