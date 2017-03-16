const nconf = require('nconf');

// api keys
// mongodb connection config
// port

const config = nconf.argv().env();

config.defaults({
    MONGO_URI: 'mongodb://127.0.0.1/fe-db',
    PORT: 3000,
    WS_PORT: 3001,
    ARNAUX_URL: 'ws://localhost:8888/',
    ARNAUX_IDENTITY: 'front-service',
    'session-secret': 'keyboard cat',
});

module.exports = config;
