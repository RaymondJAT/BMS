const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const { EncryptString } = require('../utilities/cryptography.util')
const SQL = new SQLQueryBuilder()

const accessRoleExists = async (accessId) => {
  const rows = await Query(
    `SELECT ${Master.Access.pk} AS id
     FROM ${Master.Access.table}
     WHERE ${Master.Access.pk} = ? AND ${Master.Access.cols.status} = 'ACTIVE'`,
    [accessId],
  )
  return Boolean(rows?.[0]?.id)
}

const upsertMasterUser = async (req, res) => {
  const { id, employee_id, username, password, access, access_id, status } = req.body
  const roleAccess = access !== undefined ? access : access_id
  const currentUserId = req.user?.id || req.user?.user_id || null

  let query

  try {
    if (roleAccess !== undefined) {
      const valid = await accessRoleExists(roleAccess)
      if (!valid) {
        return res.status(400).json({ message: 'Invalid or inactive access role' })
      }
    }

    if (id) {
      let updateData = {}
      if (employee_id !== undefined) updateData[Master.User.cols.employee_id] = employee_id
      if (username !== undefined) updateData[Master.User.cols.username] = username
      if (password !== undefined) updateData[Master.User.cols.password] = EncryptString(password)
      if (roleAccess !== undefined) updateData[Master.User.cols.access_id] = roleAccess
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
      if (!username || !password) {
        return res.status(400).json({ message: 'Missing required fields' })
      }
      if (roleAccess === undefined) {
        return res.status(400).json({ message: 'access (role) is required' })
      }

      query = SQL.model(Master.User)
        .insert({
          [Master.User.cols.employee_id]: employee_id,
          [Master.User.cols.username]: username,
          [Master.User.cols.password]: EncryptString(password),
          [Master.User.cols.access_id]: roleAccess,
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

const getMasterUser = async (req, res) => {
  try {
    const selectCols = [
      `${Master.User.table}.${Master.User.cols.id} AS id`,
      `${Master.User.table}.${Master.User.cols.id} AS user_id`,
      `${Master.User.table}.${Master.User.cols.username} AS username`,
      `${Master.User.table}.${Master.User.cols.status} AS status`,
      `${Master.User.table}.${Master.User.cols.access_id} AS access_id`,
    ]

    if (Master.Employee?.table && Master.Employee.cols.employee_id) {
      selectCols.push(`${Master.Employee.table}.${Master.Employee.cols.employee_id} AS employee_id`)
    } else {
      selectCols.push(`${Master.User.table}.${Master.User.cols.employee_id} AS employee_id`)
    }

    if (Master.Access?.table && Master.Access.cols.name) {
      selectCols.push(`${Master.Access.table}.${Master.Access.cols.name} AS access_name`)
    }

    if (Master.Employee?.table && Master.Employee.cols.fullname) {
      selectCols.push(`${Master.Employee.table}.${Master.Employee.cols.fullname} AS fullname`)
    }

    if (Master.User.cols.createdAt) {
      selectCols.push(`${Master.User.table}.${Master.User.cols.createdAt} AS createdAt`)
    }

    let builder = SQL.model(Master.User).select(selectCols)

    if (Master.Employee?.table) {
      builder = builder.leftJoin(
        Master.Employee.table,
        `${Master.User.table}.${Master.User.cols.employee_id}`,
        `${Master.Employee.table}.${Master.Employee.pk}`,
      )
    }

    if (Master.Access?.table) {
      builder = builder.leftJoin(
        Master.Access.table,
        `${Master.User.table}.${Master.User.cols.access_id}`,
        `${Master.Access.table}.${Master.Access.pk}`,
      )
    }

    const { sql, bindings } = builder.build()
    const result = await Query(sql, bindings)

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
