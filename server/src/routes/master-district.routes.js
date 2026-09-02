const express = require('express')
const {
  getMasterDistrict,
  upsertMasterDistrict,
  importMasterDistrict,
} = require('../controllers/master-district.controller')

const masterDistrictRouter = express.Router()

masterDistrictRouter.get('/', getMasterDistrict)
masterDistrictRouter.post('/', upsertMasterDistrict)
masterDistrictRouter.post('/import', importMasterDistrict)

module.exports = {
  masterDistrictRouter,
}
