const express = require('express')
const {
  getLiquidation,
  getLiquidationDetail,
  getLiquidationActivity,
  createLiquidation,
  updateLiquidation,
  approveLiquidation,
  rejectLiquidation,
  verifyLiquidation,
  completeLiquidation,
  markLiquidationIncomplete,
} = require('../controllers/liquidation-liquidation.controller')

const liquidationRouter = express.Router()

liquidationRouter.get('/', getLiquidation)
liquidationRouter.get('/activity', getLiquidationActivity)
liquidationRouter.get('/:id', getLiquidationDetail)

liquidationRouter.post('/', createLiquidation)
liquidationRouter.put('/update', updateLiquidation)
liquidationRouter.put('/approve', approveLiquidation)
liquidationRouter.put('/reject', rejectLiquidation)
liquidationRouter.put('/verify', verifyLiquidation)
liquidationRouter.put('/complete', completeLiquidation)
liquidationRouter.put('/incomplete', markLiquidationIncomplete)

module.exports = { liquidationRouter }
