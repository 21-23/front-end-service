const express = require('express');
const path = require('path');
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

const staticPath = path.resolve(__dirname, '../static/');
// the line below serves index.html, login.html, resources for game.html
app.use(express.static(staticPath));

// the line below serves game-master.html
app.get('/:game/:session/gm', (req, res) => {
    setQdSpecificCookies(res, req.params.session, roles.GAME_MASTER, req.params.game);

    if (req.isAuthenticated()) {
        return res.sendFile(`${req.params.game}/game-master.html`, { root: staticPath });
    }

    res.cookie('returnUrl', req.originalUrl, { httpOnly: true });
    res.redirect(`/${req.params.game}/login.html`);
});

// the line below serves resources for game-master.html
app.get('/:game/:session/*', (req, res) => {
    return res.sendFile(`${req.params.game}/${req.params[0]}`, { root: staticPath });
});

// the line below serves game.html
app.get('/:game/:session', (req, res) => {
    setQdSpecificCookies(res, req.params.session, roles.PLAYER, req.params.game);

    if (req.isAuthenticated()) {
        return res.sendFile(`${req.params.game}/game.html`, { root: staticPath });
    }

    res.cookie('returnUrl', req.originalUrl, { httpOnly: true });
    res.redirect(`/${req.params.game}/login.html`);
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
