const express = require('express')
const { getMasterProject, upsertMasterProject } = require('../controllers/master-project.controller')

const masterProjectRouter = express.Router()

masterProjectRouter.get('/', getMasterProject)
masterProjectRouter.post('/', upsertMasterProject)

module.exports = {
  masterProjectRouter,
}
