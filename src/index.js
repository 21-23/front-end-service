const http = require('http');

const mongoose = require('mongoose');

const logger = require('./loggers')();
const app = require('./app');
const config = require('./config');
const initWSServer = require('./ws/ws-server');

// mongoose.Promise = global.Promise;
// mongoose.connect(config.get('DB:URI'));

const port = config.get('PORT:HTTP');
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => {
    logger.info('Server is ready on', port);

    initWSServer({
        port: config.get('PORT:WS'),
        cookieParser: app.cookieParser,
        profileLoader: app.profileLoader,
        profileCreator: app.profileCreator,
    });
});
