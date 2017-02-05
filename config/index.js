const nconf = require('nconf');

// api keys
// mongodb connection config
// port

const config = nconf.argv().env();

config.defaults({
    MONGO_URI: 'mongodb://127.0.0.1/fe-db',
    OAUTH_CB: 'http://127.0.0.1:3000/cb',
    PORT: 3000,
    WS_PORT: 8888,
    ARNAUX_URL: 'ws://',
    'session-secret': 'keyboard cat',
});

module.exports = config;
