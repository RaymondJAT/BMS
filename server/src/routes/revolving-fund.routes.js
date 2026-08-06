const express = require('express')
const {
  getRevolvingFund,
  upsertRevolvingFund,
  getRevolvingFundActivity,
  upsertRevolvingFundActivity,
  getClosedRevolvingFund,
  upsertClosedRevolvingFund,
} = require('../controllers/revolving-fund.controller')

const revolvingFundRouter = express.Router()

revolvingFundRouter.get('/', getRevolvingFund)
revolvingFundRouter.post('/', upsertRevolvingFund)
revolvingFundRouter.get('/activity', getRevolvingFundActivity)
revolvingFundRouter.post('/activity', upsertRevolvingFundActivity)
revolvingFundRouter.get('/closed', getClosedRevolvingFund)
revolvingFundRouter.post('/closed', upsertClosedRevolvingFund)

module.exports = {
  revolvingFundRouter,
}
