const express = require('express')
const { getLiquidationLiquidation, upsertLiquidationLiquidation } = require('../controllers/liquidation-liquidation.controller')

const liquidationLiquidationRouter = express.Router()

liquidationLiquidationRouter.get('/', getLiquidationLiquidation)
liquidationLiquidationRouter.post('/', upsertLiquidationLiquidation)

module.exports = {
  liquidationLiquidationRouter,
}
