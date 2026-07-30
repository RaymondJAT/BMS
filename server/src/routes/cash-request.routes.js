const express = require('express')
const {
  getCashRequest,
  upsertCashRequest,
  getCashRequestActivity,
  upsertCashRequestActivity,
} = require('../controllers/cash-request.controller')

const cashRequestRouter = express.Router()

cashRequestRouter.get('/', getCashRequest)
cashRequestRouter.post('/', upsertCashRequest)
cashRequestRouter.get('/activity', getCashRequestActivity)
cashRequestRouter.post('/activity', upsertCashRequestActivity)

module.exports = {
  cashRequestRouter,
}
