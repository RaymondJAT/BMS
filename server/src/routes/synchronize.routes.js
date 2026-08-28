const express = require('express')
const { runSync } = require('../controllers/synchronize.controller')

const synchronizeRouter = express.Router()

synchronizeRouter.post('/run', runSync)

module.exports = {
  synchronizeRouter,
}
