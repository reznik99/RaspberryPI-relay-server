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
    sender?: string
}

interface Lobby {
    viewers: Socket[]
    controller: Socket
    robot: Socket
}

export const robots: Map<string, Lobby> = new Map()

export const configureWebsocket = (expressServer) => {
    // Define the WebSocket server. Here, the server mounts to the `/ws` route of the Express JS server.
    const wss = new Server({ server: expressServer, path: '/rpi-relay/ws' })

    wss.on('connection', (ws: Socket, req) => {
        const queryString = url.parse(req.url, true).query
        const token = queryString.token as string
        const lobbyID = queryString.lobby as string
        const view = queryString.view as string
        try {
            // Authenticate socket
            const decoded: Session = jwt.verify(token, process.env.JWT_SECRET) as Session

            // Store socket
            ws.isAlive = true
            ws.session = decoded
            // new socket is a viewer
            if (lobbyID && view === "true") {
                console.log(`New Websocket viewer ${decoded.username}-${decoded.id}`)
                robots.get(lobbyID).viewers.push(ws)
            }
            // new socket is a controller
            if (lobbyID && view === "false") {
                console.log(`New Websocket controller ${decoded.username}-${decoded.id}`)
                robots.get(lobbyID).controller = ws
            }
            // new socket is a robot
            if (!lobbyID && !view && decoded.isRobot) {
                console.log(`New Websocket robot ${decoded.username}-${decoded.id}`)
                const lobby: Lobby = {
                    viewers: [],
                    controller: null,
                    robot: ws
                }
                robots.set(decoded.id, lobby)
            }
        } catch (err) {
            console.error("Websocket connection rejected, invalid JWT")
            ws.close()
            return
        }

        // Handlers
        ws.on('pong', () => { ws.isAlive = true })
        ws.on('close', () => {
            console.log(`Closing websocket for ${ws.session.username}-${ws.session.id}`)
            // Delete socket instance from lobby
            for (let lobby of robots) {
                const [id, Lobby] = lobby
                // Robot has disconnected. Delete Lobby
                if (ws.session.id === id) {
                    // TODO: Close all other sockets in this lobby
                    robots.delete(id)
                }
                // Viewer has disconnected. Remove from lobby
                else if (Lobby.viewers.includes(ws)) {
                    const index = Lobby.viewers.indexOf(ws)
                    if (index > -1) {
                        Lobby.viewers.splice(index, 1)
                    }
                }
                // Controller has disconnected. Remove from lobby
                else if (Lobby.controller === ws) {
                    Lobby.controller = null
                }
            }
            // Close websocket at server level
            ws.close()
        })
        ws.on('message', (data) => {
            try {
                // Verify JWT if it has expired
                jwt.verify(token, process.env.JWT_SECRET)
            }
            catch (err) {
                console.error(`Websocket ${ws.session.username}-${ws.session.id} terminating, invalid JWT`)
                ws.close()
            }
            handleData(ws, data.toString())
        })
    })

    const interval = setInterval(() => {
        robots.forEach((lobby) => {
            // Ping viewer sockets
            lobby.viewers.forEach((ws) => pingSocket(ws))
            // Ping controller socket
            if (lobby.controller) pingSocket(lobby.controller)
            // Ping controller socket
            if (lobby.robot) pingSocket(lobby.robot)
        })
    }, 10000)
}

const pingSocket = (ws: Socket) => {
    console.log(`Pinging socket: ${ws.session.username}-${ws.session.id}`)
    if (!ws.isAlive) return ws.terminate()
    ws.isAlive = false
    ws.ping(() => { })
}

const handleData = (sender: Socket, data: string) => {
    try {
        const parsedData = JSON.parse(data) as Command
        const targetRobotInstance = [...robots].find((val) => val[0] === parsedData.target || val[0] === sender.session.id)
        const targetRobot = targetRobotInstance ? targetRobotInstance[1].robot : null
        const targetViewer = targetRobotInstance ? targetRobotInstance[1].viewers.find(viewer => viewer.session.id === parsedData.target) : null
        const targetController = targetRobotInstance ? targetRobotInstance[1].controller : null
        // If target defined but not present throw error
        if (parsedData.target && (!targetRobot && !targetViewer && !targetController && parsedData.target !== "server")) throw new Error("Target not online!")
        // Handle command
        switch (parsedData.cmd.toUpperCase()) {
            case "TX_CMD":
                targetRobot.send(data)
                break
            case "TX_PING":
                // Ping meant for server, reply
                if (parsedData.target === "server") {
                    const srvPingTX: Command = {
                        ...parsedData,
                        target: sender.session.id,
                        sender: "server"
                    }
                    // Send ping response to client for server ping
                    sender.send(JSON.stringify(srvPingTX))
                }
                // Ping meant for robot or user
                else {
                    const pingTX: Command = {
                        ...parsedData,
                        sender: sender.session.id
                    }

                    if (targetViewer && targetViewer.session.id === parsedData.target) {
                        // Forward ping packet to viewer for e2e ping calc
                        console.log("Proxy ping to Viewer")
                        targetViewer.send(JSON.stringify(pingTX))
                    } else if (targetController && targetController.session.id === parsedData.target) {
                        // Forward ping packet to controller for e2e ping calc
                        console.log("Proxy ping to Controller")
                        targetController.send(JSON.stringify(pingTX))
                    } else if (targetRobot && targetRobot.session.id === parsedData.target) {
                        // Forward ping packet to robot for e2e ping calc
                        console.log("Proxy ping to Robot")
                        targetRobot.send(JSON.stringify(pingTX))
                    }
                }
                break
            default:
                throw new Error("Invalid command!")
        }
    } catch (err) {
        console.error(`Error: Websocket ${sender.session.username}-${sender.session.id} invalid command`)
        console.error(`Error: ${err}`)
    }
}