const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterParticulars
 * @description Update and insert Particulars
 */
const upsertMasterParticulars = async (req, res) => {
  // #swagger.tags = ['Master Particulars']
  // #swagger.description = 'Upsert Particulars'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Particulars id'
  //   }
  //   #swagger.parameters['code'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Particulars code'
  //   }
  //   #swagger.parameters['name'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Particulars name'
  //   }
  //   #swagger.parameters['type'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Particulars type'
  //   }
  //   #swagger.parameters['description'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Particulars description'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Particulars status'
  //   }
  */
  
  // Destructure only the non-system keys from req.body
  const { id, code, name, type, description, status } = req.body
  
  let query

  try {
    if (id) {
      let updateData = {}
      if (code !== undefined) updateData[Master.Particulars.cols.code] = code
      if (name !== undefined) updateData[Master.Particulars.cols.name] = name
      if (type !== undefined) updateData[Master.Particulars.cols.type] = type
      if (description !== undefined) updateData[Master.Particulars.cols.description] = description
      if (status !== undefined) updateData[Master.Particulars.cols.status] = status

      if (Master.Particulars.cols.updatedAt) updateData[Master.Particulars.cols.updatedAt] = new Date()
      if (Master.Particulars.cols.updatedBy) updateData[Master.Particulars.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.Particulars)
          .update(updateData)
          .where(Master.Particulars.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!code) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.Particulars)
        .insert({
          [Master.Particulars.cols.code]: code,
          [Master.Particulars.cols.name]: name,
          [Master.Particulars.cols.type]: type,
          [Master.Particulars.cols.description]: description,
          [Master.Particulars.cols.status]: status,
          ...( Master.Particulars.cols.createdBy ? { [Master.Particulars.cols.createdBy]: userId } : {} ),
          ...( Master.Particulars.cols.createdAt ? { [Master.Particulars.cols.createdAt]: new Date() } : {} ),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Particulars not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Particulars' })
  }
}

/**
 * @name getMasterParticulars
 * @description Get all Particulars records
 */
const getMasterParticulars = async (req, res) => {
  // #swagger.tags = ['Master Particulars']
  // #swagger.description = 'Get all Particulars records'

  try {
    const { sql, bindings } = SQL.model(Master.Particulars)
      .select([
        Master.Particulars.cols.id,
        Master.Particulars.cols.code,
        Master.Particulars.cols.name,
        Master.Particulars.cols.type,
        Master.Particulars.cols.description,
        Master.Particulars.cols.status,
        Master.Particulars.cols.createdAt
      ])
      // .where(Master.Particulars.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Particulars records' })
  }
}

module.exports = {
  getMasterParticulars,
  upsertMasterParticulars
}
