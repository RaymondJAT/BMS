const express = require('express')
const {
  getCashRequest,
  createCashRequest,
  approveCashRequest,
  rejectCashRequest,
  updateCashRequest,
  completeCashRequest,
  getCashRequestActivity,
} = require('../controllers/cash-request.controller')

const cashRequestRouter = express.Router()

cashRequestRouter.get('/', getCashRequest)
cashRequestRouter.get('/activity', getCashRequestActivity)

cashRequestRouter.post('/', createCashRequest)
cashRequestRouter.put('/approve', approveCashRequest)
cashRequestRouter.put('/reject', rejectCashRequest)
cashRequestRouter.put('/update', updateCashRequest)
cashRequestRouter.put('/complete', completeCashRequest)

module.exports = {
  cashRequestRouter,
}
