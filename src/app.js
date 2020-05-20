const express = require('express');
const passport = require('passport');
const cookieParser = require('cookie-parser')();
const helmet = require('helmet');

const auth = require('./auth');
const config = require('./config');
const roles = require('./constants/roles');

const userService = require('./services/user-service');

const app = express();

function setQdSpecificCookies(res, session, role, game) {
    res.cookie('session', session, { httpOnly: true });
    res.cookie('role', role, { httpOnly: true });
    res.cookie('game', game, { httpOnly: true });
}

app.enable('trust proxy');

app.use(helmet({
    dnsPrefetchControl: false,
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser);
app.use(require('express-session')({
    secret: config.get('session-secret'),
    saveUninitialized: true,
    resave: true,
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((user, done) => {
    // get user from cache or from db
    done(null, user);
});

auth.strategies.forEach(strategy => passport.use(strategy));

app.use(passport.initialize());
app.use(passport.session());

app.use('/auth', auth.router);

app.get('/:game/:session', (req, res) => {
    let role = roles.PLAYER;
    let indexFilename = 'game';

    if ('gm' in req.query) {
        role = roles.GAME_MASTER;
        indexFilename = 'game-master';
    }

    setQdSpecificCookies(res, req.params.session, role, req.params.game);

    if (req.isAuthenticated()) {
        return res
            .status(305)
            .set('Content-Type', 'text/html')
            .location(`${req.params.game}/${indexFilename}.html`)
            .end();
    }

    res
        .cookie('returnUrl', req.originalUrl, { httpOnly: true })
        .status(401)
        .location(`/${req.params.game}/login.html`)
        .end();
});

app.use((req, res, next) => {
    const err = new Error('Not Found');
    err.status = 404;
    next(err);
});

app.use(function(err, req, res, next) { //eslint-disable-line
    res.status(err.status || 500);
    res.json({
        code: err.status || 500,
        message: err.message,
        error: err,
    });
});

module.exports = app;
module.exports.cookieParser = cookieParser;
module.exports.profileLoader = userService.get;
module.exports.profileCreator = userService.create;
