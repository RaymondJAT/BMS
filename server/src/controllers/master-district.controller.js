const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterDistrict
 * @description Update and insert District
 */
const upsertMasterDistrict = async (req, res) => {
  // #swagger.tags = ['Master District']
  // #swagger.description = 'Upsert District'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']

  const userId = req.user?.id || req.user?.userId || req.body?.userId || null
  const { id, store_number, store_name, region, city_province, status } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (store_number !== undefined) updateData[Master.District.cols.store_number] = store_number
      if (store_name !== undefined) updateData[Master.District.cols.store_name] = store_name
      if (region !== undefined) updateData[Master.District.cols.region] = region
      if (city_province !== undefined)
        updateData[Master.District.cols.city_province] = city_province
      if (status !== undefined) updateData[Master.District.cols.status] = status

      if (Master.District.cols.updatedAt) updateData[Master.District.cols.updatedAt] = new Date()
      if (Master.District.cols.updatedBy && userId)
        updateData[Master.District.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.District).update(updateData).where(Master.District.pk, id).build()
      }
    } else {
      if (!store_number) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.District)
        .insert({
          [Master.District.cols.store_number]: store_number,
          [Master.District.cols.store_name]: store_name,
          [Master.District.cols.region]: region,
          [Master.District.cols.city_province]: city_province,
          [Master.District.cols.status]: status || 'ACTIVE',
          ...(Master.District.cols.createdBy && userId
            ? { [Master.District.cols.createdBy]: userId }
            : {}),
          ...(Master.District.cols.createdAt
            ? { [Master.District.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'District not found' })
    }

    return res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.error('Error in upsertMasterDistrict:', error)
    return res.status(500).json({ message: 'Error processing District' })
  }
}

/**
 * @name getMasterDistrict
 * @description Get all District records
 */
const getMasterDistrict = async (req, res) => {
  // #swagger.tags = ['Master District']
  // #swagger.description = 'Get all District records'

  try {
    const { sql, bindings } = SQL.model(Master.District)
      .select([
        Master.District.cols.id,
        Master.District.cols.store_number,
        Master.District.cols.store_name,
        Master.District.cols.region,
        Master.District.cols.city_province,
        Master.District.cols.status,
        Master.District.cols.createdAt,
      ])
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error in getMasterDistrict:', error)
    return res.status(500).json({ message: 'Error retrieving District records' })
  }
}

/**
 * @name importMasterDistrict
 * @description Bulk insert district records inside a transaction
 */
const importMasterDistrict = async (req, res) => {
  // #swagger.tags = ['Master District']
  // #swagger.description = 'Import District records from array payload'

  const userId = req.user?.id || req.user?.userId || req.body?.userId || null
  const items = Array.isArray(req.body) ? req.body : req.body?.items

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: 'Invalid or empty items array provided' })
  }

  try {
    const queries = []

    for (const item of items) {
      const storeNumber = item.store_number || item.storeNumber || item.mdt_store_number
      const storeName = item.store_name || item.storeName || item.mdt_store_name
      const region = item.region || item.mdt_region || ''
      const cityProvince = item.city_province || item.cityProvince || item.mdt_city_province || ''
      const status = item.status || item.mdt_status || 'ACTIVE'

      if (!storeNumber) continue

      const builtQuery = SQL.model(Master.District)
        .insert({
          [Master.District.cols.store_number]: storeNumber,
          [Master.District.cols.store_name]: storeName,
          [Master.District.cols.region]: region,
          [Master.District.cols.city_province]: cityProvince,
          [Master.District.cols.status]: status,
          ...(Master.District.cols.createdBy && userId
            ? { [Master.District.cols.createdBy]: userId }
            : {}),
          ...(Master.District.cols.createdAt
            ? { [Master.District.cols.createdAt]: new Date() }
            : {}),
        })
        .build()

      queries.push({
        sql: builtQuery.sql,
        values: builtQuery.bindings,
      })
    }

    if (queries.length === 0) {
      return res.status(400).json({ message: 'No valid district records found to import' })
    }

    await Transaction(queries)

    return res.status(200).json({
      message: 'District records imported successfully',
      count: queries.length,
    })
  } catch (error) {
    console.error('Error in importMasterDistrict:', error)
    return res.status(500).json({ message: 'Error importing District records' })
  }
}

module.exports = {
  getMasterDistrict,
  upsertMasterDistrict,
  importMasterDistrict,
}
