const http = require('http');
const app = require('./src/app');
const config = require('./config');
const initWSServer = require('./src/ws/ws-server');
const mongoose = require('mongoose');

const port = config.get('PORT');
app.set('port', port);

const server = http.createServer(app);
initWSServer({ port: config.get('WS_PORT') });

server.listen(port, () => {
    console.log('Server is ready on', port);

    mongoose.promise = global.Promise;
    mongoose.connect(config.get('MONGO_URI'));
});
