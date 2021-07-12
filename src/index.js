const http = require('http');

const logger = require('./loggers')();
const app = require('./app');
const config = require('./config');
const initWSServer = require('./ws/ws-server');

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
