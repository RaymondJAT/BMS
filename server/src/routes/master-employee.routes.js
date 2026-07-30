const express = require('express')
const { getMasterEmployee, upsertMasterEmployee } = require('../controllers/master-employee.controller')

const masterEmployeeRouter = express.Router()

masterEmployeeRouter.get('/', getMasterEmployee)
masterEmployeeRouter.post('/', upsertMasterEmployee)

module.exports = {
  masterEmployeeRouter,
}
