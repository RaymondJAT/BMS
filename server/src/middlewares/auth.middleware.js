'use strict'
require('dotenv').config()
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { logger } = require('../utilities/logger.util')
const { EncryptString } = require('../utilities/cryptography.util')
const { SQLQueryBuilder } = require('../database/utilities/queries.util')
const { Query } = require('../database/utilities/queries.util')
const rateLimit = require('express-rate-limit')
const path = require('path')
const fs = require('fs')

const SQL = new SQLQueryBuilder()

require('dotenv').config()

const auth = async (req, res, next) => {
  try {
    let token = req.session?.jwt

    if (!token && req.headers['authorization']) {
      const parts = req.headers['authorization'].split(' ')
      token = parts.length === 2 ? parts[1] : parts[0]
    }

    if (!token) {
      return handleUnauthorized(req, res)
    }

    const decodedUser = jwt.verify(token, process.env.SECRET_KEY)

    req.context = {
      ...decodedUser,
    }

    req.userId = decodedUser.mu_id ?? decodedUser.id ?? null
    req.userRole = decodedUser.role ?? null
    req.user = {
      id: req.userId,
      username: decodedUser.mu_username ?? decodedUser.username ?? null,
      fullname: decodedUser.mu_fullname ?? decodedUser.fullname ?? null,
      access: decodedUser.mu_access ?? decodedUser.access ?? null,
      role: req.userRole,
      status: decodedUser.mu_status ?? decodedUser.status ?? null,
    }

    return next()
  } catch (err) {
    console.log(err)
    return handleUnauthorized(req, res, 'Authentication failed.')
  }
}

const handleUnauthorized = (req, res, message = 'Unauthorized: Please login.') => {
  res.status(401)

  if (req.accepts('html')) {
    const filePath = path.join(__dirname, '..', 'views', '401.html')

    fs.readFile(filePath, 'utf8', (err, htmlData) => {
      if (err) {
        return res.send(`<h1>Access Denied</h1><p>${message}</p>`)
      }

      const finalHtml = htmlData.replace('{{ERROR_MESSAGE}}', message)

      res.send(finalHtml)
    })
    return
  }

  return res.json({ message })
}

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: 'Too many OTP requests, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
})

module.exports = { auth, otpLimiter }
