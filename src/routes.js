const jwt = require('jsonwebtoken')
const { SECRET } = require('./config/config')
const { wsClients } = require('./websocket')

const createRoutes = (app, passport) => {

    app.post('/login', (req, res, next) => {
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
                const robot = req.body.robot ? true : false
                req.logIn(user, () => {
                    const token = jwt.sign({ ...user, robot }, SECRET, {
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

    app.get('/listRobots', (req, res, next) => {
        console.log(`/listRobots called`)
        passport.authenticate('jwt', (err, user, info) => {
            if (err || info) {
                console.error(info.message || err)
                res.status(401).send({ valid: false }) // token expired!
            } else {
                const robotList = []
                wsClients.forEach((client, name) => {
                    if (client.session?.robot) robotList.push(client.session)
                })
                res.status(200).send(robotList)
            }
        })(req, res, next)
    })

    app.get('/validateToken', (req, res, next) => {
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

module.exports = {
    createRoutes
}
