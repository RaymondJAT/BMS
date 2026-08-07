const express = require('express')
const {
  getCashDisbursement,
  upsertCashDisbursement,
  issueCashDisbursement,
  returnCashDisbursement,
  recordExpendedCashDisbursement,
  reimburseCashDisbursement,
  getCashDisbursementFile,
  upsertCashDisbursementFile,
  getCashDisbursementActivity,
  upsertCashDisbursementActivity,
} = require('../controllers/cash-disbursement.controller')

const cashDisbursementRouter = express.Router()

cashDisbursementRouter.get('/', getCashDisbursement)
cashDisbursementRouter.post('/', upsertCashDisbursement)

cashDisbursementRouter.post('/issue', issueCashDisbursement)
cashDisbursementRouter.post('/return', returnCashDisbursement)
cashDisbursementRouter.post('/expend', recordExpendedCashDisbursement)
cashDisbursementRouter.post('/reimburse', reimburseCashDisbursement)

cashDisbursementRouter.get('/file', getCashDisbursementFile)
cashDisbursementRouter.post('/file', upsertCashDisbursementFile)
cashDisbursementRouter.get('/activity', getCashDisbursementActivity)
cashDisbursementRouter.post('/activity', upsertCashDisbursementActivity)

module.exports = {
  cashDisbursementRouter,
}
