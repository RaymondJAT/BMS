const express = require('express')
const { getLiquidationItem, upsertLiquidationItem } = require('../controllers/liquidation-item.controller')

const liquidationItemRouter = express.Router()

liquidationItemRouter.get('/', getLiquidationItem)
liquidationItemRouter.post('/', upsertLiquidationItem)

module.exports = {
  liquidationItemRouter,
}
