const http = require('http');
const app = require('./src/app');
const config = require('./config');
const initWSServer = require('./src/ws/ws-server');

const port = 3000 || process.env.PORT;
app.set('port', port);

const server = http.createServer(app);

initWSServer({ port: config.get('ws-port') });

server.listen(port);
