const express = require('express')
const {
  getMasterRouteAccess,
  upsertMasterRouteAccess,
  getRouteCatalog,
} = require('../controllers/master-routeaccess.controller')

const masterRouteAccessRouter = express.Router()

masterRouteAccessRouter.get('/routes', getRouteCatalog)
masterRouteAccessRouter.get('/', getMasterRouteAccess)
masterRouteAccessRouter.post('/', upsertMasterRouteAccess)

module.exports = {
  masterRouteAccessRouter,
}
