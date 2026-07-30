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
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'District id'
  //   }
  //   #swagger.parameters['store_number'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'District store_number'
  //   }
  //   #swagger.parameters['store_name'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'District store_name'
  //   }
  //   #swagger.parameters['region'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'District region'
  //   }
  //   #swagger.parameters['city_province'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'District city_province'
  //   }
  //   #swagger.parameters['status'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'District status'
  //   }
  */
  
  // Destructure only the non-system keys from req.body
  const { id, store_number, store_name, region, city_province, status } = req.body
  
  let query

  try {
    if (id) {
      let updateData = {}
      if (store_number !== undefined) updateData[Master.District.cols.store_number] = store_number
      if (store_name !== undefined) updateData[Master.District.cols.store_name] = store_name
      if (region !== undefined) updateData[Master.District.cols.region] = region
      if (city_province !== undefined) updateData[Master.District.cols.city_province] = city_province
      if (status !== undefined) updateData[Master.District.cols.status] = status

      if (Master.District.cols.updatedAt) updateData[Master.District.cols.updatedAt] = new Date()
      if (Master.District.cols.updatedBy) updateData[Master.District.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.District)
          .update(updateData)
          .where(Master.District.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!store_number) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.District)
        .insert({
          [Master.District.cols.store_number]: store_number,
          [Master.District.cols.store_name]: store_name,
          [Master.District.cols.region]: region,
          [Master.District.cols.city_province]: city_province,
          [Master.District.cols.status]: status,
          ...( Master.District.cols.createdBy ? { [Master.District.cols.createdBy]: userId } : {} ),
          ...( Master.District.cols.createdAt ? { [Master.District.cols.createdAt]: new Date() } : {} ),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'District not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
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
        Master.District.cols.createdAt
      ])
      // .where(Master.District.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving District records' })
  }
}

module.exports = {
  getMasterDistrict,
  upsertMasterDistrict
}
