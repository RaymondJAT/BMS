const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterEmployee
 * @description Update and insert Employee
 */
const upsertMasterEmployee = async (req, res) => {
  // #swagger.tags = ['Master Employee']
  // #swagger.description = 'Upsert Employee'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Employee id'
  //   }
  //   #swagger.parameters['fullname'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Employee fullname'
  //   }
  //   #swagger.parameters['department_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Employee department_id'
  //   }
  //   #swagger.parameters['position_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Employee position_id'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Employee status'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const { id, fullname, department_id, position_id, status } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (fullname !== undefined) updateData[Master.Employee.cols.fullname] = fullname
      if (department_id !== undefined)
        updateData[Master.Employee.cols.department_id] = department_id
      if (position_id !== undefined) updateData[Master.Employee.cols.position_id] = position_id
      if (status !== undefined) updateData[Master.Employee.cols.status] = status

      if (Master.Employee.cols.updatedAt) updateData[Master.Employee.cols.updatedAt] = new Date()
      if (Master.Employee.cols.updatedBy) updateData[Master.Employee.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.Employee).update(updateData).where(Master.Employee.pk, id).build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!fullname) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.Employee)
        .insert({
          [Master.Employee.cols.fullname]: fullname,
          [Master.Employee.cols.department_id]: department_id,
          [Master.Employee.cols.position_id]: position_id,
          [Master.Employee.cols.status]: status,
          ...(Master.Employee.cols.createdBy ? { [Master.Employee.cols.createdBy]: userId } : {}),
          ...(Master.Employee.cols.createdAt
            ? { [Master.Employee.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Employee not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Employee' })
  }
}

/**
 * @name getMasterEmployee
 * @description Get all Employee records with department name and position description
 */
const getMasterEmployee = async (req, res) => {
  // #swagger.tags = ['Master Employee']
  // #swagger.description = 'Get all Employee records'

  try {
    const { sql, bindings } = SQL.model(Master.Employee)
      .select([
        `${Master.Employee.table}.${Master.Employee.cols.id} AS id`,
        `${Master.Employee.table}.${Master.Employee.cols.id} AS employee_id`,
        `${Master.Employee.table}.${Master.Employee.cols.fullname} AS fullname`,
        `${Master.Employee.table}.${Master.Employee.cols.department_id} AS department_id`,
        `${Master.Department.table}.${Master.Department.cols.name} AS department_name`,
        `${Master.Employee.table}.${Master.Employee.cols.position_id} AS position_id`,
        `${Master.Position.table}.${Master.Position.cols.description} AS position_name`,
        `${Master.Employee.table}.${Master.Employee.cols.status} AS status`,
        `${Master.Employee.table}.${Master.Employee.cols.createdAt} AS createdAt`,
      ])
      .leftJoin(
        Master.Department.table,
        `${Master.Employee.table}.${Master.Employee.cols.department_id}`,
        `${Master.Department.table}.${Master.Department.pk}`,
      )
      .leftJoin(
        Master.Position.table,
        `${Master.Employee.table}.${Master.Employee.cols.position_id}`,
        `${Master.Position.table}.${Master.Position.pk}`,
      )
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Employee records' })
  }
}

module.exports = {
  getMasterEmployee,
  upsertMasterEmployee,
}
