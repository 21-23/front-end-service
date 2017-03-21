const http = require('http');

const mongoose = require('mongoose');
const { initSteno, log } = require('steno');

const app = require('./src/app');
const config = require('./config');
const initWSServer = require('./src/ws/ws-server');

initSteno('front-service', 'all');

mongoose.Promise = global.Promise;
mongoose.connect(config.get('MONGO_URI'));

const port = config.get('PORT');
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => {
    log('Server is ready on', port);

    initWSServer({
        port: config.get('WS_PORT'),
        cookieParser: app.cookieParser,
    });
});
