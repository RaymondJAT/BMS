const express = require('express')
const { getRedFlag, upsertRedFlag } = require('../controllers/red-flag.controller')

const redFlagRouter = express.Router()

redFlagRouter.get('/', getRedFlag)
redFlagRouter.post('/', upsertRedFlag)

module.exports = {
  redFlagRouter,
}
