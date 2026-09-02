const express = require('express')
const {
  getMasterParticulars,
  upsertMasterParticulars,
  importMasterParticulars,
} = require('../controllers/master-particulars.controller')

const masterParticularsRouter = express.Router()

masterParticularsRouter.get('/', getMasterParticulars)
masterParticularsRouter.post('/', upsertMasterParticulars)
masterParticularsRouter.post('/import', importMasterParticulars)

module.exports = {
  masterParticularsRouter,
}
