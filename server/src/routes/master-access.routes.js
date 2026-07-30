const express = require('express')
const { getMasterAccess, upsertMasterAccess } = require('../controllers/master-access.controller')

const masterAccessRouter = express.Router()

masterAccessRouter.get('/', getMasterAccess)
masterAccessRouter.post('/', upsertMasterAccess)
masterAccessRouter.put('/:id', upsertMasterAccess)

module.exports = {
  masterAccessRouter,
}
