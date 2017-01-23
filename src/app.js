const express = require('express');
const path = require('path');
const passport = require('passport');
const gitHubStrategy = require('./stategies/github-strategy');

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
    done(null, user);
});

passport.use(gitHubStrategy);

app.use(passport.initialize());
app.use(passport.session());

app.get('/auth/github', passport.authenticate('github'));

app.get('/auth/github/cb',
  passport.authenticate('github',
  { failureRedirect: '/login.html', successRedirect: '/game.html' }
));

app.get('/game.html', (req, res, next) => {
    console.log(req.cookie);
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login.html');
});

app.use(express.static(path.resolve('_qd-ui/dist/')));

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
