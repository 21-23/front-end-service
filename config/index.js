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
    AUTH_CONFIG: 'config.secret.json',
    ENABLE_GUNSLINGER: true,
    'session-secret': 'keyboard cat',
    userCacheOptions: {
        max: 1000,
        maxAge: 120 * 60 * 1000, // 2 hours
    },
});

module.exports = config;
