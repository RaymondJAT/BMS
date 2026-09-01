const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterUser
 * @description Update and insert User
 */
const upsertMasterUser = async (req, res) => {
  // #swagger.tags = ['Master User']
  // #swagger.description = 'Upsert User'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'User id'
  //   }
  //   #swagger.parameters['employee_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'User employee_id'
  //   }
  //   #swagger.parameters['username'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'User username'
  //   }
  //   #swagger.parameters['password'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'User password'
  //   }
  //   #swagger.parameters['access'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'User access role ID'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'User status'
  //   }
  */

  // Destructure non-system keys from req.body (supporting both access and access_id for v1 compatibility)
  const { id, employee_id, username, password, access, access_id, status } = req.body
  const roleAccess = access !== undefined ? access : access_id
  const currentUserId = req.user?.id || req.user?.user_id || null

  let query

  try {
    if (id) {
      let updateData = {}
      if (employee_id !== undefined) updateData[Master.User.cols.employee_id] = employee_id
      if (username !== undefined) updateData[Master.User.cols.username] = username
      if (password !== undefined) updateData[Master.User.cols.password] = password
      if (roleAccess !== undefined && Master.User.cols.access) {
        updateData[Master.User.cols.access] = roleAccess
      }
      if (status !== undefined) updateData[Master.User.cols.status] = status

      if (Master.User.cols.updatedAt) updateData[Master.User.cols.updatedAt] = new Date()
      if (Master.User.cols.updatedBy && currentUserId)
        updateData[Master.User.cols.updatedBy] = currentUserId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.User).update(updateData).where(Master.User.pk, id).build()
      }
    } else {
      // Basic validation for inserts
      if (!username || !password) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.User)
        .insert({
          [Master.User.cols.employee_id]: employee_id,
          [Master.User.cols.username]: username,
          [Master.User.cols.password]: password,
          ...(Master.User.cols.access ? { [Master.User.cols.access]: roleAccess } : {}),
          [Master.User.cols.status]: status || 'ACTIVE',
          ...(Master.User.cols.createdBy && currentUserId
            ? { [Master.User.cols.createdBy]: currentUserId }
            : {}),
          ...(Master.User.cols.createdAt ? { [Master.User.cols.createdAt]: new Date() } : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)
    const affected = result?.affectedRows || result?.[0]?.affectedRows || 0

    if (id && affected === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing User' })
  }
}

/**
 * @name getMasterUser
 * @description Get all User records
 */
const getMasterUser = async (req, res) => {
  // #swagger.tags = ['Master User']
  // #swagger.description = 'Get all User records'

  try {
    const selectCols = [
      `${Master.User.table}.${Master.User.cols.id} AS id`,
      `${Master.User.table}.${Master.User.cols.id} AS user_id`,
      `${Master.User.table}.${Master.User.cols.username} AS username`,
      `${Master.User.table}.${Master.User.cols.password} AS password`,
      `${Master.User.table}.${Master.User.cols.status} AS status`,
    ]

    // Select the employee code from Master.Employee if available, falling back to User table's FK
    if (Master.Employee && Master.Employee.table && Master.Employee.cols.employee_id) {
      selectCols.push(`${Master.Employee.table}.${Master.Employee.cols.employee_id} AS employee_id`)
    } else {
      selectCols.push(`${Master.User.table}.${Master.User.cols.employee_id} AS employee_id`)
    }

    if (Master.User.cols.access) {
      selectCols.push(`${Master.User.table}.${Master.User.cols.access} AS access_id`)
    }

    if (Master.Employee && Master.Employee.table && Master.Employee.cols.fullname) {
      selectCols.push(`${Master.Employee.table}.${Master.Employee.cols.fullname} AS fullname`)
    }

    if (Master.User.cols.createdAt) {
      selectCols.push(`${Master.User.table}.${Master.User.cols.createdAt} AS createdAt`)
    }

    let builder = SQL.model(Master.User).select(selectCols)

    if (Master.Employee && Master.Employee.table) {
      builder = builder.leftJoin(
        Master.Employee.table,
        `${Master.User.table}.${Master.User.cols.employee_id}`,
        `${Master.Employee.table}.${Master.Employee.pk}`,
      )
    }

    const { sql, bindings } = builder.build()

    const result = await Query(sql, bindings)

    // Ensure normalized array response regardless of raw MySQL driver format [rows, fields] vs rows
    const usersData = Array.isArray(result)
      ? Array.isArray(result[0])
        ? result[0]
        : result
      : result?.data || []

    return res.status(200).json(usersData)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving User records' })
  }
}

module.exports = {
  getMasterUser,
  upsertMasterUser,
}
