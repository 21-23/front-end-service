const express = require('express');
const path = require('path');
const passport = require('passport');
const cookieParser = require('cookie-parser')();

const auth = require('./auth');
const config = require('../config');

const userService = require('./services/user-service');

const app = express();

app.use(cookieParser);
app.use(require('express-session')({
    secret: config.get('session-secret'),
    saveUninitialized: true,
    resave: true,
}));
app.use(require('body-parser').urlencoded({ extended: true }));

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

app.get('/game.html', (req, res, next) => {
    if (!req.query.sessionId) {
        return res.redirect('/');
    }
    res.cookie('sessionId', req.query.sessionId, { httpOnly: true });

    if (req.isAuthenticated()) {
        return next();
    }

    res.cookie('returnUrl', req.originalUrl, { httpOnly: true });
    res.redirect('/login.html');
});

app.get('/game-master.html', (req, res, next) => {
    if (!req.query.sessionId) {
        return res.redirect('/');
    }
    res.cookie('sessionId', req.query.sessionId, { httpOnly: true });

    if (req.isAuthenticated()) {
        return next();
    }

    res.cookie('returnUrl', req.originalUrl, { httpOnly: true });
    res.redirect('/login.html');
});

const staticPath = path.resolve(__dirname, '../static/');
app.use(express.static(staticPath));
app.get('/', (req, res) => {
    res.redirect('/index.html');
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
