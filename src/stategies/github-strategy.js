const GitHubStrategy = require('passport-github').Strategy;

const config = require('../config');

module.exports = new GitHubStrategy({
    clientID: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    callbackURL: config.GITHUB_CALLBACK_URL,
},
  (accessToken, refreshToken, profile, cb) => {
      return cb(null, profile);
  }
);
