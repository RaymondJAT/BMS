const express = require('express')
const { getMasterUser, upsertMasterUser } = require('../controllers/master-user.controller')

const masterUserRouter = express.Router()

masterUserRouter.get('/', getMasterUser)
masterUserRouter.post('/', upsertMasterUser)

module.exports = {
  masterUserRouter,
}
