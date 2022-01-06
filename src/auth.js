
const LocalStrategy = require('passport-local').Strategy
const JWTstrategy = require('passport-jwt').Strategy
const ExtractJWT = require('passport-jwt').ExtractJwt
const uuid = require('uuid')
const { SECRET, LOGIN, PASSWORD } = require('./config/config')

module.exports = {
    authInit: (passport) => {
        passport.serializeUser(function (user, done) {
            done(null, user.id)
        });

        passport.deserializeUser(function (id, done) {
            User.findById(id, function (err, user) {
                done(err, user)
            });
        });

        passport.use('login', new LocalStrategy({ usernameField: 'username', passwordField: 'password', session: false, }, (username, password, done) => {
            // Invalid
            if (username != LOGIN || password != PASSWORD)
                return done(null, false, { message: 'Invalid username and/or password' });

            // Valid
            const id = uuid.v4()
            return done(null, { username, id });
        }))

        const opts = {
            jwtFromRequest: ExtractJWT.fromAuthHeaderWithScheme('JWT'),
            secretOrKey: SECRET,
        };

        passport.use('jwt', new JWTstrategy(opts, (jwt_payload, done) => {
            return done(null, jwt_payload);
        }))
    }
}
