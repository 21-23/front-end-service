const path = require('path');

const GitHubStrategy = require('passport-github').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GoogleStrategy = require('passport-google-oauth2').Strategy;
const QdAutoStrategy = require('./qd-auto-strategy').Strategy;
const logger = require('../loggers')();

const appConfig = require('../config');

const config = require(path.join('../../', appConfig.get('AUTH:CONFIG')));
const { findOrCreate } = require('../services/user-service');

const strategies = [
    new GitHubStrategy({
        clientID: config.GITHUB_CLIENT_ID,
        clientSecret: config.GITHUB_CLIENT_SECRET,
        callbackURL: config.GITHUB_CALLBACK_URL,
    }, verifyUser.bind(null, 'github')),

    new TwitterStrategy({
        consumerKey: config.TWITTER_CLIENT_ID,
        consumerSecret: config.TWIITER_CLIENT_SECRET,
        callbackURL: config.TWITTER_CALLBACK_URL,
    }, verifyUser.bind(null, 'twitter')),

    new FacebookStrategy({
        clientID: config.FACEBOOK_CLIENT_ID,
        clientSecret: config.FACEBOOK_CLIENT_SECRET,
        callbackURL: config.FACEBOOK_CALLBACK_URL,
    }, verifyUser.bind(null, 'facebook')),

    new GoogleStrategy({
        clientID: config.GOOGLE_CLIENT_ID,
        clientSecret: config.GOOGLE_CLIENT_SECRET,
        callbackURL: config.GOOGLE_CALLBACK_URL,
    }, verifyUser.bind(null, 'google')),

    new QdAutoStrategy({
        callbackURL: config.QD_AUTO_CALLBACK_URL,
    }, verifyUser.bind(null, 'qd-auto')),
];

strategies.options = {
    google: {
        scope: ['https://www.googleapis.com/auth/plus.login'],
    },
};

strategies.providers = strategies.map(strategy => strategy.name);

function formatUser(profile, provider) {
    return {
        providerId: profile.id,
        displayName: profile.displayName || profile.username,
        provider,
    };
}

function verifyUser(provider, accessToken, refreshToken, oauthProfile, done) {
    const formattedUser = formatUser(oauthProfile, provider);
    const criteria = Object.assign({ provider },
        oauthProfile[Symbol.for('qd-criteria')] || formattedUser);

    findOrCreate(criteria, formattedUser)
        .then((user) => {
            if (!user) {
                return done(new Error('Can not find or create user'));
            }

            logger.verbose('Verified user', user);
            done(null, user);
        });
}

module.exports = strategies;
