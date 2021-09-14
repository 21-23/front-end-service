const nconf = require('nconf');

const config = nconf.argv().env({ separator: '_' });

config.defaults({
    DB: {
        API: {
            ORIGIN: 'http://172.31.11.85:3000',
        },
    },
    PORT: {
        HTTP: 3000,
        WS: 3001,
    },
    ARNAUX: {
        URL: 'ws://localhost:8888/',
        IDENTITY: 'front-service',
    },
    AUTH: {
        CONFIG: 'config.secret.json',
    },
    GUNSLINGERS: true,
    'session-secret': 'keyboard cat',
    userCacheOptions: {
        max: 1000,
        maxAge: 120 * 60 * 1000, // 2 hours
    },
    LOG: {
        LEVEL: 'verbose', // error: 0, warn: 1, info: 2, verbose: 3, debug: 4, silly: 5
        CONSOLE: true,
        DBURI: '',
        FILE: true,
    },
    LOCAL: false,
});

module.exports = config;
