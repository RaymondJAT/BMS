const express = require('express')
const {
  getLiquidationActivity,
  upsertLiquidationActivity,
} = require('../controllers/liquidation-activity.controller')

const liquidationActivityRouter = express.Router()

liquidationActivityRouter.get('/', getLiquidationActivity)
liquidationActivityRouter.post('/', upsertLiquidationActivity)

module.exports = {
  liquidationActivityRouter,
}
