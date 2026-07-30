const express = require('express')
const { getMasterDistrict, upsertMasterDistrict } = require('../controllers/master-district.controller')

const masterDistrictRouter = express.Router()

masterDistrictRouter.get('/', getMasterDistrict)
masterDistrictRouter.post('/', upsertMasterDistrict)

module.exports = {
  masterDistrictRouter,
}
