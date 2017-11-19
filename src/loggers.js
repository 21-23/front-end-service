const winston = require('winston');
require('winston-mongodb');

const config = require('./config');

const LOGGERS = [
    { id: 'ROOT', transports: {} },
];

const LOG_LEVEL = config.get('LOG:LEVEL');
let LOG_CONSOLE = config.get('LOG:CONSOLE');
LOG_CONSOLE = LOG_CONSOLE === true || LOG_CONSOLE === 'true';
const LOG_DB_URI = config.get('LOG:DBURI');
const LOG_FILE = config.get('LOG:FILE');
const defaultLogFile = LOG_FILE === true || LOG_FILE === 'true';
const fileLogEnabled = LOG_FILE && LOG_FILE !== false && LOG_FILE !== 'false';

if (LOG_CONSOLE) {
    LOGGERS[0].transports['console'] = {
        level: LOG_LEVEL,
        colorize: true,
        timestamp: true,
        stderrLevels: ['error'],
    };
}

if (LOG_DB_URI) {
    LOGGERS[0].transports['MongoDB'] = {
        level: LOG_LEVEL,
        db: LOG_DB_URI,
        collection: 'front-service-log',
        name: 'front-service',
        tryReconnect: true,
        decolorize: true,
    };
}

if (fileLogEnabled) {
    LOGGERS[0].transports['file'] = {
        level: LOG_LEVEL,
        dirname: 'logs',
        filename: defaultLogFile ? 'front-service.log' : LOG_FILE,
        json: true,
        maxsize: 500000,
        maxFiles: 10,
        tailable: true,
        timestamp: true,
    };
}

LOGGERS.forEach(({ id, transports }) => {
    winston.loggers.add(id, transports);
});

module.exports = function getLogger(id = 'ROOT') {
    return winston.loggers.get(id);
};
