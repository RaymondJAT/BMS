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
  const userId = req.user?.id || req.user?.user_id || null

  let query

  try {
    if (id) {
      let updateData = {}
      if (code !== undefined) updateData[Master.Particulars.cols.code] = code
      if (name !== undefined) updateData[Master.Particulars.cols.name] = name
      if (type !== undefined) updateData[Master.Particulars.cols.type] = type
      if (description !== undefined) updateData[Master.Particulars.cols.description] = description
      if (status !== undefined) updateData[Master.Particulars.cols.status] = status

      if (Master.Particulars.cols.updatedAt)
        updateData[Master.Particulars.cols.updatedAt] = new Date()
      if (Master.Particulars.cols.updatedBy && userId)
        updateData[Master.Particulars.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.Particulars)
          .update(updateData)
          .where(Master.Particulars.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts
      if (!code) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.Particulars)
        .insert({
          [Master.Particulars.cols.code]: code,
          [Master.Particulars.cols.name]: name,
          [Master.Particulars.cols.type]: type,
          [Master.Particulars.cols.description]: description,
          [Master.Particulars.cols.status]: status || 'ACTIVE',
          ...(Master.Particulars.cols.createdBy && userId
            ? { [Master.Particulars.cols.createdBy]: userId }
            : {}),
          ...(Master.Particulars.cols.createdAt
            ? { [Master.Particulars.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)
    const affected = result?.affectedRows || result?.[0]?.affectedRows || 0

    if (id && affected === 0) {
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
        `${Master.Particulars.table}.${Master.Particulars.cols.id} AS id`,
        `${Master.Particulars.table}.${Master.Particulars.cols.code} AS code`,
        `${Master.Particulars.table}.${Master.Particulars.cols.name} AS name`,
        `${Master.Particulars.table}.${Master.Particulars.cols.type} AS type`,
        `${Master.Particulars.table}.${Master.Particulars.cols.description} AS description`,
        `${Master.Particulars.table}.${Master.Particulars.cols.status} AS status`,
        `${Master.Particulars.table}.${Master.Particulars.cols.createdAt} AS createdAt`,
      ])
      .build()

    const result = await Query(sql, bindings)

    const data = Array.isArray(result)
      ? Array.isArray(result[0])
        ? result[0]
        : result
      : result?.data || []

    return res.status(200).json(data)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Particulars records' })
  }
}

/**
 * @name importMasterParticulars
 * @description Batch insert imported Particulars from CSV payload
 */
const importMasterParticulars = async (req, res) => {
  // #swagger.tags = ['Master Particulars']
  // #swagger.description = 'Import array of Particulars from CSV parse'
  /* 
    #swagger.parameters['body'] = {
      in: 'body',
      description: 'Array of particular objects parsed from CSV',
      required: true,
      schema: [{
        code: 'P-101',
        name: 'Office Supplies',
        type: 'Expense',
        description: 'Monthly office materials',
        status: 'ACTIVE'
      }]
    }
  */

  const items = Array.isArray(req.body) ? req.body : req.body?.items || []
  const userId = req.user?.id || req.user?.user_id || null

  if (!items.length) {
    return res.status(400).json({ message: 'No valid rows provided in CSV import' })
  }

  try {
    // Clean and normalize keys from CSV parsing (handles spacing, trailing characters, case)
    const insertPayloads = items
      .map((row, idx) => {
        // Extract properties defensively regardless of CSV casing or whitespace
        const code = row.code || row.Code || row['CODE'] || `P-${Date.now()}-${idx}`
        const name = row.name || row.Name || row['NAME'] || 'Unnamed Particular'
        const type = row.type || row.Type || row['TYPE'] || 'General'
        const description = row.description || row.Description || row['DESCRIPTION'] || ''
        const rawStatus = row.status || row.Status || row['STATUS'] || 'ACTIVE'

        return {
          [Master.Particulars.cols.code]: String(code).trim(),
          [Master.Particulars.cols.name]: String(name).trim(),
          [Master.Particulars.cols.type]: String(type).trim(),
          [Master.Particulars.cols.description]: String(description).trim(),
          [Master.Particulars.cols.status]: String(rawStatus).trim().toUpperCase(),
          ...(Master.Particulars.cols.createdBy && userId
            ? { [Master.Particulars.cols.createdBy]: userId }
            : {}),
          ...(Master.Particulars.cols.createdAt
            ? { [Master.Particulars.cols.createdAt]: new Date() }
            : {}),
        }
      })
      .filter((payload) => payload[Master.Particulars.cols.code])

    if (!insertPayloads.length) {
      return res.status(400).json({ message: 'No parseable rows found in CSV' })
    }

    const query = SQL.model(Master.Particulars).insert(insertPayloads).build()
    await Query(query.sql, query.bindings)

    return res.status(200).json({
      message: `Successfully imported ${insertPayloads.length} particulars`,
      count: insertPayloads.length,
    })
  } catch (error) {
    console.log('Error executing importMasterParticulars:', error)
    return res.status(500).json({ message: 'Error executing bulk import for Particulars' })
  }
}

module.exports = {
  getMasterParticulars,
  upsertMasterParticulars,
  importMasterParticulars,
}
