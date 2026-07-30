const { v4: uuidv4 } = require('uuid')
const { Query, Transaction, SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Master } = require('../database/models/Master')
const SQL = new SQLQueryBuilder()

/**
 * @name UpsertMasterWallet
 * @description Update and insert Wallet
 */
const upsertMasterWallet = async (req, res) => {
  // #swagger.tags = ['Master Wallet']
  // #swagger.description = 'Upsert Wallet'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Wallet id'
  //   }
  //   #swagger.parameters['employee_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Wallet employee_id'
  //   }
  //   #swagger.parameters['previous_amount'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Wallet previous_amount'
  //   }
  //   #swagger.parameters['current_amount'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'Wallet current_amount'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const { id, employee_id, previous_amount, current_amount } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (employee_id !== undefined) updateData[Master.Wallet.cols.employee_id] = employee_id
      if (previous_amount !== undefined)
        updateData[Master.Wallet.cols.previous_amount] = previous_amount
      if (current_amount !== undefined)
        updateData[Master.Wallet.cols.current_amount] = current_amount

      if (Master.Wallet.cols.updatedAt) updateData[Master.Wallet.cols.updatedAt] = new Date()
      if (Master.Wallet.cols.updatedBy) updateData[Master.Wallet.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.Wallet).update(updateData).where(Master.Wallet.pk, id).build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!employee_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.Wallet)
        .insert({
          [Master.Wallet.cols.employee_id]: employee_id,
          [Master.Wallet.cols.previous_amount]: previous_amount,
          [Master.Wallet.cols.current_amount]: current_amount,
          ...(Master.Wallet.cols.createdBy ? { [Master.Wallet.cols.createdBy]: userId } : {}),
          ...(Master.Wallet.cols.createdAt ? { [Master.Wallet.cols.createdAt]: new Date() } : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'Wallet not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing Wallet' })
  }
}

/**
 * @name UpsertMasterWalletActivity
 * @description Update and insert WalletActivity
 */
const upsertMasterWalletActivity = async (req, res) => {
  // #swagger.tags = ['Master Wallet']
  // #swagger.description = 'Upsert WalletActivity'
  // #swagger.autoBody = false
  // #swagger.consumes = ['application/x-www-form-urlencoded']
  /* 
  //   #swagger.parameters['id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'WalletActivity id'
  //   }
  //   #swagger.parameters['wallet_id'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'WalletActivity wallet_id'
  //   }
  //   #swagger.parameters['date'] = {
  //     in: 'formData',
  //     type: 'string',
  //     required: false,
  //     description: 'WalletActivity date'
  //   }
  */

  // Destructure only the non-system keys from req.body
  const { id, wallet_id, date } = req.body

  let query

  try {
    if (id) {
      let updateData = {}
      if (wallet_id !== undefined) updateData[Master.WalletActivity.cols.wallet_id] = wallet_id
      if (date !== undefined) updateData[Master.WalletActivity.cols.date] = date

      if (Master.WalletActivity.cols.updatedAt)
        updateData[Master.WalletActivity.cols.updatedAt] = new Date()
      if (Master.WalletActivity.cols.updatedBy)
        updateData[Master.WalletActivity.cols.updatedBy] = userId

      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({ message: 'No data to update' })
      } else {
        query = SQL.model(Master.WalletActivity)
          .update(updateData)
          .where(Master.WalletActivity.pk, id)
          .build()
      }
    } else {
      // Basic validation for inserts (modify as needed)
      if (!wallet_id) {
        return res.status(400).json({ message: 'Missing required fields' })
      }

      query = SQL.model(Master.WalletActivity)
        .insert({
          [Master.WalletActivity.cols.wallet_id]: wallet_id,
          [Master.WalletActivity.cols.date]: date,
          ...(Master.WalletActivity.cols.createdBy
            ? { [Master.WalletActivity.cols.createdBy]: userId }
            : {}),
          ...(Master.WalletActivity.cols.createdAt
            ? { [Master.WalletActivity.cols.createdAt]: new Date() }
            : {}),
        })
        .build()
    }

    const result = await Query(query.sql, query.bindings)

    if (id && result.affectedRows === 0) {
      return res.status(404).json({ message: 'WalletActivity not found' })
    }

    res.status(200).json({
      message: id ? 'Updated successfully' : 'Created successfully',
    })
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error processing WalletActivity' })
  }
}

/**
 * @name getMasterWallet
 * @description Get all Wallet records
 */
const getMasterWallet = async (req, res) => {
  // #swagger.tags = ['Master Wallet']
  // #swagger.description = 'Get all Wallet records'

  try {
    const { sql, bindings } = SQL.model(Master.Wallet)
      .select([
        Master.Wallet.cols.id,
        Master.Wallet.cols.employee_id,
        Master.Wallet.cols.previous_amount,
        Master.Wallet.cols.current_amount,
      ])
      // .where(Master.Wallet.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving Wallet records' })
  }
}

/**
 * @name getMasterWalletActivity
 * @description Get all WalletActivity records
 */
const getMasterWalletActivity = async (req, res) => {
  // #swagger.tags = ['Master Wallet']
  // #swagger.description = 'Get all WalletActivity records'

  try {
    const { sql, bindings } = SQL.model(Master.WalletActivity)
      .select([
        Master.WalletActivity.cols.id,
        Master.WalletActivity.cols.wallet_id,
        Master.WalletActivity.cols.date,
        Master.WalletActivity.cols.createdAt,
      ])
      // .where(Master.WalletActivity.cols.companyId, companyId) // Uncomment if company-scoped
      .build()

    const result = await Query(sql, bindings)

    return res.status(200).json(result)
  } catch (error) {
    console.log(error)
    return res.status(500).json({ message: 'Error retrieving WalletActivity records' })
  }
}

module.exports = {
  getMasterWallet,
  upsertMasterWallet,
  getMasterWalletActivity,
  upsertMasterWalletActivity,
}
