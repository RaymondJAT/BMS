const express = require('express')
const { getMasterModeOfTransportation, upsertMasterModeOfTransportation } = require('../controllers/master-modeoftransportation.controller')

const masterModeOfTransportationRouter = express.Router()

masterModeOfTransportationRouter.get('/', getMasterModeOfTransportation)
masterModeOfTransportationRouter.post('/', upsertMasterModeOfTransportation)

module.exports = {
  masterModeOfTransportationRouter,
}
