const express = require('express')
const { getMasterPosition, upsertMasterPosition } = require('../controllers/master-position.controller')

const masterPositionRouter = express.Router()

masterPositionRouter.get('/', getMasterPosition)
masterPositionRouter.post('/', upsertMasterPosition)

module.exports = {
  masterPositionRouter,
}
