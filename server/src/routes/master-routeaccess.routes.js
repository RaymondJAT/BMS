const express = require('express')
const { getMasterRouteAccess, upsertMasterRouteAccess } = require('../controllers/master-routeaccess.controller')

const masterRouteAccessRouter = express.Router()

masterRouteAccessRouter.get('/', getMasterRouteAccess)
masterRouteAccessRouter.post('/', upsertMasterRouteAccess)

module.exports = {
  masterRouteAccessRouter,
}
