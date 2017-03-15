const GitHubStrategy = require('passport-github').Strategy;
const formatUser = require('../formatters/github-user-formatter');
const config = require('../../config.secret');
const { findOrCreate } = require('../services/user-service');

module.exports = new GitHubStrategy({
    clientID: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    callbackURL: config.GITHUB_CALLBACK_URL,
},
  (accessToken, refreshToken, profile, cb) => {
      const formattedUser = formatUser(profile);
      findOrCreate(formattedUser)
            .then((user) => {
                cb(null, user);
            });
  }
);
