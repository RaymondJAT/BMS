const express = require('express')
const {
  getCashDisbursement,
  upsertCashDisbursement,
  getCashDisbursementFile,
  upsertCashDisbursementFile,
  getCashDisbursementActivity,
  upsertCashDisbursementActivity,
} = require('../controllers/cash-disbursement.controller')

const cashDisbursementRouter = express.Router()

cashDisbursementRouter.get('/', getCashDisbursement)
cashDisbursementRouter.post('/', upsertCashDisbursement)
cashDisbursementRouter.get('/file', getCashDisbursementFile)
cashDisbursementRouter.post('/file', upsertCashDisbursementFile)
cashDisbursementRouter.get('/activity', getCashDisbursementActivity)
cashDisbursementRouter.post('/activity', upsertCashDisbursementActivity)

module.exports = {
  cashDisbursementRouter,
}
