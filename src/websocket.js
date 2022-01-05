const url = require('url')
const wslib = require('ws')
const jwt = require('jsonwebtoken')
const { SECRET } = require('./config/config')
const { WebSocket } = require('ws')

const wsClients = new Map()

module.exports = {
    wsClients: wsClients,
    configureWebsocket: (expressServer) => {
        // Define the WebSocket server. Here, the server mounts to the `/ws` route of the Express JS server.
        const wss = new wslib.Server({ server: expressServer, path: '/ws' })

        wss.on('connection', (ws, req) => {
            const token = url.parse(req.url, true).query.token
            try {
                // Authenticate socket
                const decoded = jwt.verify(token, SECRET)
                console.log(decoded)
                // Store socket
                wsClients.set(decoded.username, ws)
                ws.isAlive = true
                ws.session = decoded
                console.log(`New Websocket connection established for ${decoded.username}-${decoded.id}`)
            } catch (err) {
                console.error("Websocket connection rejected, invalid JWT")
                ws.close()
                return
            }

            // Handlers
            ws.on('pong', () => { ws.isAlive = true })
            ws.on('close', () => {
                console.log(`Closing websocket for ${ws.session?.username}-${ws.session?.id}`)
                wsClients.delete(ws.session?.id)
                ws.close()
            })
            ws.on('message', (data) => {
                try {
                    console.log(data.toString())
                    const decoded = jwt.verify(token, SECRET)
                    // Do something with the messages
                    try {
                        const parsedData = JSON.parse(data)
                        switch (parsedData.cmd.toUpperCase()) {
                            case "SEND":
                                const targetWS = wsClients.get(parsedData.target)
                                if (!targetWS)
                                    ws.send("User not online")
                                else {
                                    // targetWS.send(parsedData.data)
                                    wss.clients.forEach((client) => {
                                        client.send(parsedData.data)
                                    })
                                }
                                break
                            default:
                                throw new Error("Invalid command")
                        }
                    } catch (err) {
                        console.error(`Websocket ${ws.session?.username}-${ws.session?.id} invalid command`)
                        ws.send("Invalid command")
                    }
                } catch (err) {
                    console.error(`Websocket ${ws.session?.username}-${ws.session?.id} terminating, invalid JWT`)
                    ws.close()
                }
            })
        })

        const interval = setInterval(() => {
            wss.clients.forEach((ws) => {
                console.log(`Pinging socket: ${ws.session?.username}-${ws.session?.id}`)
                if (!ws.isAlive) return ws.terminate()
                ws.isAlive = false
                ws.ping(() => { })
            })
        }, 10000)
    }
}