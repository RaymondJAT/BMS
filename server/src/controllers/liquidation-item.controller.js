const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Liquidation } = require('../database/models/Liquidation')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertLiquidationItem
 * @description Update and insert Item
 */
const upsertLiquidationItem = async (req, res) => {
  // #swagger.tags = ['Liquidation']
  // #swagger.description = 'Upsert Item'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item id'
  //   }
  //   #swagger.parameters['liquidation_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item liquidation_id'
  //   }
  //   #swagger.parameters['date'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item date'
  //   }
  //   #swagger.parameters['rt'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item rt'
  //   }
  //   #swagger.parameters['store_name'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item store_name'
  //   }
  //   #swagger.parameters['particulars'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item particulars'
  //   }
  //   #swagger.parameters['from'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item from'
  //   }
  //   #swagger.parameters['to'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item to'
  //   }
  //   #swagger.parameters['mode_of_transportation_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item mode_of_transportation_id'
  //   }
  //   #swagger.parameters['amount'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Item amount'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const {
    id,
    liquidation_id,
    date,
    rt,
    store_name,
    particulars,
    from,
    to,
    mode_of_transportation_id,
    amount,
  } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (liquidation_id !== undefined)
        updateData[Liquidation.Item.cols.liquidation_id] = liquidation_id
      if (date !== undefined) updateData[Liquidation.Item.cols.date] = date
      if (rt !== undefined) updateData[Liquidation.Item.cols.rt] = rt
      if (store_name !== undefined) updateData[Liquidation.Item.cols.store_name] = store_name
      if (particulars !== undefined) updateData[Liquidation.Item.cols.particulars] = particulars
      if (from !== undefined) updateData[Liquidation.Item.cols.from] = from
      if (to !== undefined) updateData[Liquidation.Item.cols.to] = to
      if (mode_of_transportation_id !== undefined)
        updateData[Liquidation.Item.cols.mode_of_transportation_id] = mode_of_transportation_id
      if (amount !== undefined) updateData[Liquidation.Item.cols.amount] = amount

      if (Liquidation.Item.cols.updatedAt) updateData[Liquidation.Item.cols.updatedAt] = new Date()
      if (Liquidation.Item.cols.updatedBy) updateData[Liquidation.Item.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Liquidation.Item)
          .update(updateData)
          .where(Liquidation.Item.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!liquidation_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Liquidation.Item)
        .insert({
          [Liquidation.Item.cols.liquidation_id]: liquidation_id,
          [Liquidation.Item.cols.date]: date,
          [Liquidation.Item.cols.rt]: rt,
          [Liquidation.Item.cols.store_name]: store_name,
          [Liquidation.Item.cols.particulars]: particulars,
          [Liquidation.Item.cols.from]: from,
          [Liquidation.Item.cols.to]: to,
          [Liquidation.Item.cols.mode_of_transportation_id]: mode_of_transportation_id,
          [Liquidation.Item.cols.amount]: amount,
          ...(Liquidation.Item.cols.createdBy ? { [Liquidation.Item.cols.createdBy]: userId } : {}),
          ...(Liquidation.Item.cols.createdAt
            ? { [Liquidation.Item.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Item not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Item' })
  }
}

/**
 * @name getLiquidationItem
 * @description Get all Item records
 */
const getLiquidationItem = async (req, res) => {
  // #swagger.tags = ['Liquidation']
  // #swagger.description = 'Get all Item records'

  try {
    const { sql, bindings } = SQL.model(Liquidation.Item)
      .select([
        Liquidation.Item.cols.id,
        Liquidation.Item.cols.liquidation_id,
        Liquidation.Item.cols.date,
        Liquidation.Item.cols.rt,
        Liquidation.Item.cols.store_name,
        Liquidation.Item.cols.particulars,
        Liquidation.Item.cols.from,
        Liquidation.Item.cols.to,
        Liquidation.Item.cols.mode_of_transportation_id,
        Liquidation.Item.cols.amount,
      ])
      // .where(Liquidation.Item.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Item records' })
  }
}

module.exports = {
  getLiquidationItem,
  upsertLiquidationItem,
}
