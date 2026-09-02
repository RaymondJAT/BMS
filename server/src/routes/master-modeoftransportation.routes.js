const express = require('express')
const {
  getMasterModeOfTransportation,
  upsertMasterModeOfTransportation,
  bulkImportMasterModeOfTransportation,
} = require('../controllers/master-modeoftransportation.controller')

const masterModeOfTransportationRouter = express.Router()

// Fetch all mode of transportation records
masterModeOfTransportationRouter.get('/', getMasterModeOfTransportation)

// Create or update single mode of transportation entry
masterModeOfTransportationRouter.post('/', upsertMasterModeOfTransportation)

// Bulk import mode of transportation records 
masterModeOfTransportationRouter.post('/import', bulkImportMasterModeOfTransportation)

module.exports = {
  masterModeOfTransportationRouter,
}
