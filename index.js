
const express = require('express'),
    passport = require('passport'),
    bodyParser = require('body-parser'),
    createRoutes = require('./src/routes'),
    auth = require('./src/auth')

const PORT = process.env.PORT || 1234
const app = express()

//middleware
app.use(bodyParser.json())
app.use(passport.initialize())

//authentication and routes
auth(passport)
createRoutes(app, passport)

//listen
const expressServer = app.listen(PORT, () => {
    console.info(`RaspberryPI Relay Server listening on ${PORT}`)
})

// configureWebsocket(expressServer)