const GitHubStrategy = require('passport-github').Strategy;

const config = require('../../config.secret.json');

module.exports = new GitHubStrategy({
    clientID: config.GITHUB_CLIENT_ID,
    clientSecret: config.GITHUB_CLIENT_SECRET,
    callbackURL: 'http://127.0.0.1:3000/auth/github/cb'
},
  (accessToken, refreshToken, profile, cb) => {
      return cb(null, profile);
  }
);
