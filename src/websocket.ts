import url from 'url'
import { WebSocket, Server, RawData } from 'ws'
import jwt from 'jsonwebtoken'

interface Socket extends WebSocket {
    session: Session
    isAlive: boolean
}
interface Session extends jwt.JwtPayload {
    id: string
    username: string
    isRobot: boolean
}
interface Command {
    cmd: string
    data: string
    target: string
}

export const wsClients: Map<string, Socket> = new Map()

export const configureWebsocket = (expressServer) => {
    // Define the WebSocket server. Here, the server mounts to the `/ws` route of the Express JS server.
    const wss = new Server({ server: expressServer, path: '/rpi-relay/ws' })

    wss.on('connection', (ws: Socket, req) => {
        const token: string = url.parse(req.url, true).query.token as string
        try {
            // Authenticate socket
            const decoded: Session = jwt.verify(token, process.env.JWT_SECRET) as Session

            // Store socket
            ws.isAlive = true
            ws.session = decoded
            wsClients.set(decoded.id, ws)

            console.log(`New Websocket connection established for ${decoded.username}-${decoded.id}`)
        } catch (err) {
            console.error("Websocket connection rejected, invalid JWT")
            ws.close()
            return
        }

        // Handlers
        ws.on('pong', () => { ws.isAlive = true })
        ws.on('close', () => {
            console.log(`Closing websocket for ${ws.session.username}-${ws.session.id}`)
            wsClients.delete(ws.session.id)
            ws.close()
        })
        ws.on('message', (data) => {
            try {
                // Verify JWT if it has expired
                jwt.verify(token, process.env.JWT_SECRET)
                handleData(ws, data.toString())
            }
            catch (err) {
                console.error(`Websocket ${ws.session.username}-${ws.session.id} terminating, invalid JWT`)
                ws.close()
            }
        })
    })

    const interval = setInterval(() => {
        wsClients.forEach((ws) => {
            console.log(`Pinging socket: ${ws.session.username}-${ws.session.id}`)
            if (!ws.isAlive) return ws.terminate()
            ws.isAlive = false
            ws.ping(() => { })
        })
    }, 10000)
}

const handleData = (sender: Socket, data: string) => {
    try {
        const parsedData = JSON.parse(data) as Command
        const targetWS = wsClients.get(parsedData.target)
        // If target defined but not present throw error
        if (parsedData.target && !targetWS) throw new Error("Target not online!")
        // Handle command
        switch (parsedData.cmd.toUpperCase()) {
            case "TX_CMD":
                targetWS.send(parsedData.data)
                break
            case "TX_PING":
                sender.send(data)
                break
            default:
                throw new Error("Invalid command!")
        }
    } catch (err) {
        console.error(`Error: Websocket ${sender.session.username}-${sender.session.id} invalid command`)
        sender.send(err)
    }
}