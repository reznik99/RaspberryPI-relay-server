
const LocalStrategy = require('passport-local').Strategy
const JWTstrategy = require('passport-jwt').Strategy
const ExtractJWT = require('passport-jwt').ExtractJwt
import { v4 } from 'uuid'

export const authInit = (passport) => {
    passport.serializeUser(function (user, done) {
        done(null, user.id)
    })

    passport.use('login', new LocalStrategy({ usernameField: 'username', passwordField: 'password', session: false, }, (username, password, done) => {
        // Invalid
        if (username != process.env.LOGIN || password != process.env.PASSWORD)
            return done(null, false, { message: 'Invalid username and/or password' });

        // Valid
        const id = v4()
        return done(null, { username, id });
    }))

    const opts = {
        jwtFromRequest: ExtractJWT.fromAuthHeaderWithScheme('JWT'),
        secretOrKey: process.env.JWT_SECRET,
    };

    passport.use('jwt', new JWTstrategy(opts, (jwt_payload, done) => {
        return done(null, jwt_payload);
    }))
}
