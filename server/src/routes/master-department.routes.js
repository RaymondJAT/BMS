const express = require('express')
const { getMasterDepartment, upsertMasterDepartment } = require('../controllers/master-department.controller')

const masterDepartmentRouter = express.Router()

masterDepartmentRouter.get('/', getMasterDepartment)
masterDepartmentRouter.post('/', upsertMasterDepartment)

module.exports = {
  masterDepartmentRouter,
}
