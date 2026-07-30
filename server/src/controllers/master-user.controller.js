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
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'User status'
  //   }
  */
  
  // Destructure only the non-system keys from req.body
  const { id, employee_id, username, password, status } = req.body
  
  let query

  try {
    if (id) {
      let updateData = {}
      if (employee_id !== undefined) updateData[Master.User.cols.employee_id] = employee_id
      if (username !== undefined) updateData[Master.User.cols.username] = username
      if (password !== undefined) updateData[Master.User.cols.password] = password
      if (status !== undefined) updateData[Master.User.cols.status] = status

      if (Master.User.cols.updatedAt) updateData[Master.User.cols.updatedAt] = new Date()
      if (Master.User.cols.updatedBy) updateData[Master.User.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.User)
          .update(updateData)
          .where(Master.User.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!employee_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.User)
        .insert({
          [Master.User.cols.employee_id]: employee_id,
          [Master.User.cols.username]: username,
          [Master.User.cols.password]: password,
          [Master.User.cols.status]: status,
          ...( Master.User.cols.createdBy ? { [Master.User.cols.createdBy]: userId } : {} ),
          ...( Master.User.cols.createdAt ? { [Master.User.cols.createdAt]: new Date() } : {} ),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
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
    const { sql, bindings } = SQL.model(Master.User)
      .select([
        Master.User.cols.id,
        Master.User.cols.employee_id,
        Master.User.cols.username,
        Master.User.cols.password,
        Master.User.cols.status,
        Master.User.cols.createdAt
      ])
      // .where(Master.User.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving User records' })
  }
}

module.exports = {
  getMasterUser,
  upsertMasterUser
}
