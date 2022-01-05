const jwt = require('jsonwebtoken')
const jwtSecret = require('./config/config')

const createRoutes = (app, passport) => {

    app.post('/login', (req, res, next) => {
        passport.authenticate('login', (err, user, info) => {
            if (err) {
                console.error(`error ${err}`)
                res.status(500)
            }

            else if (info !== undefined) {
                console.error(info.message)
                if (info.message === 'Invalid username and/or password')
                    res.status(401).send(info.message)
                else
                    res.status(403).send(info.message)
            } else {
                req.logIn(user, () => {
                    const token = jwt.sign(user, jwtSecret.secret, {
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

    app.get('/validateToken', (req, res, next) => {
        console.log(`/validateToken called`)
        passport.authenticate('jwt', (err, user, info) => {
            if (err || info !== undefined) {
                console.error(info.message || err)
                res.status(401).send({ valid: false }) // token expired!
            } else {
                res.status(200).send({ valid: true })  // token valid
            }
        })(req, res, next)
    })
}

module.exports = createRoutes
