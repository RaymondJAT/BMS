const express = require('express')
const { login, logout, checkSession } = require('../controllers/auth.controller')
const { auth } = require('../middlewares/auth.middleware')

const authRouter = express.Router()

authRouter.post('/login', login)
authRouter.post('/logout', logout)
authRouter.get('/me', auth, checkSession)

module.exports = { authRouter }
