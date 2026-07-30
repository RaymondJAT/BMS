const express = require('express')
const { getMasterParticulars, upsertMasterParticulars } = require('../controllers/master-particulars.controller')

const masterParticularsRouter = express.Router()

masterParticularsRouter.get('/', getMasterParticulars)
masterParticularsRouter.post('/', upsertMasterParticulars)

module.exports = {
  masterParticularsRouter,
}
