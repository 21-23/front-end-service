const express = require('express');
const path = require('path');
const passport = require('passport');
const gitHubStrategy = require('./stategies/github-strategy');
const setUidCookieMiddleware = require('./utils/setCookieMiddleware')();
const mongoose = require('mongoose');

mongoose.connect('mongodb://127.0.0.1/fe-db');
mongoose.Promise = global.Promise;

const app = express();

app.use(require('cookie-parser')());
app.use(require('express-session')({
    secret: 'keyboard cat',
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

passport.use(gitHubStrategy);

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/github', passport.authenticate('github'));

app.get('/cb',
  passport.authenticate('github',
  { failureRedirect: '/login.html' }),
  setUidCookieMiddleware,
  (req, res) => {
      res.redirect('/game.html');
  }
);

app.get('/game.html', (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login.html');
});

const staticPath = path.resolve(__dirname, '../static/');
app.use(express.static(staticPath));
app.get('/', (req, res) => {
    res.redirect('/login.html');
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
        error: err
    });
});

module.exports = app;
