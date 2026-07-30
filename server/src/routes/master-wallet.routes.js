const express = require('express')
const {
  getMasterWallet,
  upsertMasterWallet,
  getMasterWalletActivity,
  upsertMasterWalletActivity,
} = require('../controllers/master-wallet.controller')

const masterWalletRouter = express.Router()

masterWalletRouter.get('/', getMasterWallet)
masterWalletRouter.post('/', upsertMasterWallet)
masterWalletRouter.get('/activity', getMasterWalletActivity)
masterWalletRouter.post('/activity', upsertMasterWalletActivity)

module.exports = {
  masterWalletRouter,
}
