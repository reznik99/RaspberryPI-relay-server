import * as dotenv from "dotenv"
dotenv.config({ path: __dirname + '/.env' })

import express from 'express'
import passport from 'passport'
import bodyParser from 'body-parser'
import { createRoutes } from './src/routes'
import { authInit } from './src/auth'
import { configureWebsocket } from './src/websocket'
import cors from 'cors'

const PORT = process.env.PORT || 1234
const app = express()

//middleware
app.use(cors())
app.use(bodyParser.json())
app.use(passport.initialize())

//authentication and routes
authInit(passport)
createRoutes(app, passport)

//listen
const expressServer = app.listen(PORT, () => {
    console.info(`RaspberryPI Relay Server listening on ${PORT}`)
})

configureWebsocket(expressServer)