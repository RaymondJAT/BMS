const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Cash } = require('../database/models/Cash')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertCashRequest
 * @description Update and insert Request
 */
const upsertCashRequest = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Upsert Request'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request id'
  //   }
  //   #swagger.parameters['reference_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request reference_id'
  //   }
  //   #swagger.parameters['cv_number'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request cv_number'
  //   }
  //   #swagger.parameters['purpose'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request purpose'
  //   }
  //   #swagger.parameters['project'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request project'
  //   }
  //   #swagger.parameters['employee_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request employee_id'
  //   }
  //   #swagger.parameters['department_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request department_id'
  //   }
  //   #swagger.parameters['team_lead'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request team_lead'
  //   }
  //   #swagger.parameters['request_date'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request request_date'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request status'
  //   }
  //   #swagger.parameters['updated_at'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Request updated_at'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const {
    id,
    reference_id,
    cv_number,
    purpose,
    project,
    employee_id,
    department_id,
    team_lead,
    request_date,
    status,
    updated_at,
  } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (reference_id !== undefined) updateData[Cash.Request.cols.reference_id] = reference_id
      if (cv_number !== undefined) updateData[Cash.Request.cols.cv_number] = cv_number
      if (purpose !== undefined) updateData[Cash.Request.cols.purpose] = purpose
      if (project !== undefined) updateData[Cash.Request.cols.project] = project
      if (employee_id !== undefined) updateData[Cash.Request.cols.employee_id] = employee_id
      if (department_id !== undefined) updateData[Cash.Request.cols.department_id] = department_id
      if (team_lead !== undefined) updateData[Cash.Request.cols.team_lead] = team_lead
      if (request_date !== undefined) updateData[Cash.Request.cols.request_date] = request_date
      if (status !== undefined) updateData[Cash.Request.cols.status] = status
      if (updated_at !== undefined) updateData[Cash.Request.cols.updated_at] = updated_at

      if (Cash.Request.cols.updatedAt) updateData[Cash.Request.cols.updatedAt] = new Date()
      if (Cash.Request.cols.updatedBy) updateData[Cash.Request.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Cash.Request).update(updateData).where(Cash.Request.pk, id).build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!reference_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Cash.Request)
        .insert({
          [Cash.Request.cols.reference_id]: reference_id,
          [Cash.Request.cols.cv_number]: cv_number,
          [Cash.Request.cols.purpose]: purpose,
          [Cash.Request.cols.project]: project,
          [Cash.Request.cols.employee_id]: employee_id,
          [Cash.Request.cols.department_id]: department_id,
          [Cash.Request.cols.team_lead]: team_lead,
          [Cash.Request.cols.request_date]: request_date,
          [Cash.Request.cols.status]: status,
          [Cash.Request.cols.updated_at]: updated_at,
          ...(Cash.Request.cols.createdBy ? { [Cash.Request.cols.createdBy]: userId } : {}),
          ...(Cash.Request.cols.createdAt ? { [Cash.Request.cols.createdAt]: new Date() } : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Request not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Request' })
  }
}

/**
 * @name UpsertCashRequestActivity
 * @description Update and insert RequestActivity
 */
const upsertCashRequestActivity = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Upsert RequestActivity'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RequestActivity id'
  //   }
  // #swagger.parameters['user_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RequestActivity user_id'
  //   }
  //   #swagger.parameters['cash_request_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RequestActivity cash_request_id'
  //   }
  //   #swagger.parameters['action'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RequestActivity action'
  //   }
  // #swagger.parameter['remarks'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'RequestActivity remarks'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const { id, user_id, cash_request_id, action, remarks } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (user_id !== undefined) updateData[Cash.RequestActivity.cols.user_id] = user_id
      if (cash_request_id !== undefined)
        updateData[Cash.RequestActivity.cols.cash_request_id] = cash_request_id
      if (action !== undefined) updateData[Cash.RequestActivity.cols.action] = action
      if (remarks !== undefined) updateData[Cash.RequestActivity.cols.remarks] = remarks

      if (Cash.RequestActivity.cols.updatedAt)
        updateData[Cash.RequestActivity.cols.updatedAt] = new Date()
      if (Cash.RequestActivity.cols.updatedBy)
        updateData[Cash.RequestActivity.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Cash.RequestActivity)
          .update(updateData)
          .where(Cash.RequestActivity.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!user_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Cash.RequestActivity)
        .insert({
          [Cash.RequestActivity.cols.user_id]: user_id,
          [Cash.RequestActivity.cols.cash_request_id]: cash_request_id,
          [Cash.RequestActivity.cols.action]: action,
          [Cash.RequestActivity.cols.remarks]: remarks,
          ...(Cash.RequestActivity.cols.createdBy
            ? { [Cash.RequestActivity.cols.createdBy]: userId }
            : {}),
          ...(Cash.RequestActivity.cols.createdAt
            ? { [Cash.RequestActivity.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'RequestActivity not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing RequestActivity' })
  }
}

/**
 * @name getCashRequest
 * @description Get all Request records
 */
const getCashRequest = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Get all Request records'

  try {
    const { sql, bindings } = SQL.model(Cash.Request)
      .select([
        Cash.Request.cols.id,
        Cash.Request.cols.reference_id,
        Cash.Request.cols.cv_number,
        Cash.Request.cols.purpose,
        Cash.Request.cols.project,
        Cash.Request.cols.employee_id,
        Cash.Request.cols.department_id,
        Cash.Request.cols.team_lead,
        Cash.Request.cols.request_date,
        Cash.Request.cols.status,
        Cash.Request.cols.createdAt,
        Cash.Request.cols.updated_at,
      ])
      // .where(Cash.Request.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Request records' })
  }
}

/**
 * @name getCashRequestActivity
 * @description Get all RequestActivity records
 */
const getCashRequestActivity = async (req, res) => {
  // #swagger.tags = ['Cash Request']
  // #swagger.description = 'Get all RequestActivity records'

  try {
    const { sql, bindings } = SQL.model(Cash.RequestActivity)
      .select([
        Cash.RequestActivity.cols.id,
        Cash.RequestActivity.cols.user_id,
        Cash.RequestActivity.cols.cash_request_id,
        Cash.RequestActivity.cols.action,
        Cash.RequestActivity.cols.remarks,
        Cash.RequestActivity.cols.createdAt,
      ])
      // .where(Cash.RequestActivity.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving RequestActivity records' })
  }
}

module.exports = {
  getCashRequest,
  upsertCashRequest,
  getCashRequestActivity,
  upsertCashRequestActivity,
}
