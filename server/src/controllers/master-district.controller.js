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
 * @description Get District records. Supports optional server-side
 *              search-on-type for the Liquidation form's Store field
 *              (~4.5k rows — too many to ever load or render as a full
 *              <select>):
 *                - `search`: matches store_name or store_number
 *                  (case-insensitive substring), with store names that
 *                  START WITH the term ranked above ones that merely
 *                  contain it.
 *                - `limit`: caps the result count (1–50). Omitted →
 *                  no limit, preserving the original "return everything"
 *                  behavior for existing callers (e.g. the Districts
 *                  admin page) that don't pass it.
 *                - `status`: optional exact-match filter (e.g. ACTIVE),
 *                  also opt-in — omitted keeps every status, as before.
 *              With no query params at all, this returns exactly what it
 *              always did.
 */
const getMasterDistrict = async (req, res) => {
  // #swagger.tags = ['Master District']
  // #swagger.description = 'Get District records, optionally filtered/limited for search-on-type.'
  /*
    #swagger.parameters['search'] = { in: 'query', type: 'string', required: false, description: 'Search store_name/store_number' }
    #swagger.parameters['limit'] = { in: 'query', type: 'integer', required: false, description: 'Max rows (1-50). Omit for no limit.' }
    #swagger.parameters['status'] = { in: 'query', type: 'string', required: false, description: 'Exact status filter, e.g. ACTIVE' }
  */

  const { search, limit, status } = req.query
  const parsedLimit = limit ? Math.min(Math.max(parseInt(limit, 10) || 0, 1), 50) : null

  try {
    const conditions = []
    const params = []

    if (status) {
      conditions.push('mdt_status = ?')
      params.push(status)
    }

    const trimmedSearch = search ? String(search).trim() : ''
    if (trimmedSearch) {
      const term = `%${trimmedSearch}%`
      conditions.push('(mdt_store_name LIKE ? OR mdt_store_number LIKE ?)')
      params.push(term, term)
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    // Only impose an explicit order when searching, so a plain
    // no-params call stays byte-for-byte identical to the original
    // (implicit DB order) — no surprise ordering change for existing
    // consumers.
    let orderClause = ''
    if (trimmedSearch) {
      orderClause = 'ORDER BY CASE WHEN mdt_store_name LIKE ? THEN 0 ELSE 1 END, mdt_store_name ASC'
      params.push(`${trimmedSearch}%`)
    }

    const limitClause = parsedLimit ? 'LIMIT ?' : ''
    const finalParams = parsedLimit ? [...params, parsedLimit] : params

    const rows = await Query(
      `SELECT
         mdt_id AS id,
         mdt_store_number AS store_number,
         mdt_store_name AS store_name,
         mdt_region AS region,
         mdt_city_province AS city_province,
         mdt_status AS status,
         mdt_createdAt AS createdAt
       FROM master_district
       ${whereClause}
       ${orderClause}
       ${limitClause}`,
      finalParams,
    )

    return res.status(200).json(rows)
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
