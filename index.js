const http = require('http');
const app = require('./src/app');
const config = require('./config');
const initWSServer = require('./src/ws/ws-server');
const mongoose = require('mongoose');

mongoose.Promise = global.Promise;
mongoose.connect(config.get('MONGO_URI'));

const port = config.get('PORT');
app.set('port', port);

const server = http.createServer(app);

server.listen(port, () => {
    console.log('Server is ready on', port);

    initWSServer({ port: config.get('WS_PORT') });
});
