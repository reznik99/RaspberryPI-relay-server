import { sign } from 'jsonwebtoken'
import { wsClients } from './websocket'

export const createRoutes = (app, passport) => {

    app.post('/rpi-relay/login', (req, res, next) => {
        passport.authenticate('login', (err, user, info) => {
            if (err) {
                console.error(`error ${err}`)
                res.status(500)
            }
            else if (info !== undefined) {
                console.error(info.message)
                res.status(403).send(info.message)
            } else {
                console.log(user)
                const isRobot = req.body.isRobot ? true : false
                req.logIn(user, () => {
                    const token = sign({ ...user, isRobot }, process.env.JWT_SECRET, {
                        expiresIn: 60 * 60,
                    })
                    res.status(200).send({
                        auth: true,
                        token,
                        message: 'user found & logged in',
                    })
                })
            }
        })(req, res, next)
    })

    app.get('/rpi-relay/listRobots', (req, res, next) => {
        console.log(`/listRobots called`)
        passport.authenticate('jwt', (err, user, info) => {
            if (err || info) {
                console.error(info.message || err)
                res.status(401).send({ valid: false }) // token expired!
            } else {
                const robotList = []
                wsClients.forEach((client, name) => {
                    if (client.session.isRobot) robotList.push(client.session)
                })
                res.status(200).send(robotList)
            }
        })(req, res, next)
    })

    app.get('/rpi-relay/validateToken', (req, res, next) => {
        console.log(`/validateToken called`)
        passport.authenticate('jwt', (err, user, info) => {
            if (err || info) {
                console.error(info.message || err)
                res.status(401).send({ valid: false }) // token expired!
            } else {
                res.status(200).send({ valid: true })  // token valid
            }
        })(req, res, next)
    })
}
