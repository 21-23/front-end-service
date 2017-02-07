const WebSocketClient = require('uws');

const createPhoenix = require('phoenix');
const { createMessage, parseMessage, arnaux } = require('message-factory');

const config = require('../../config');
const { isMaster, get } = require('../services/user-service');

const Server = WebSocketClient.Server;
const phoenix = createPhoenix(WebSocketClient, { uri: config.get('ARNAUX_URL'), timeout: 500 });

const sessions = new Map();

function verifyConnection() {
    return Promise.resolve();
}

function handleClientClose(code, message) {
    // TODO: clean up user and their socket
    this.removeAllListeners();
}

function handleClientMessage(incomingMessage) {
    const { message } = parseMessage(incomingMessage);

    console.log('[front-service]', 'Client message', message);
}

function handleNewConnection(ws) {
    console.log('[WS-Server]: Connection', ws.upgradeReq.headers.cookie);
    const uid = '9eedf38350fe4402';

    verifyConnection()
        .then(() => {
            ws.on('message', handleClientMessage);
            ws.once('close', handleClientClose);
        })
        .catch(() => {
            console.warn('[front-service]', 'Unauthorized socket connection');
            ws.close(); // TODO: error code?
        });

    // get(uid)
    //     .then((user) => {
    //         if (isMaster(user)) {

    //         }

    //         return user;
    //     });
}

function processServerMessage(message) {
    console.log('[front-service]', 'Message from server:', message);
}

function createWsServer({ port }) {
    const wss = new Server({ port });

    console.log('[front-service]', 'Ws Server is ready on', port);

    wss.on('connection', handleNewConnection);
}

phoenix
    .on('connected', () => {
        console.log('[front-service]', 'phoenix is alive');
        phoenix.send(arnaux.checkin(config.get('ARNAUX_IDENTITY')));
    })
    .on('disconnected', () => {
        console.error('[front-service]', 'phoenix disconnected');
    })
    .on('message', (incomingMessage) => {
        const { message } = parseMessage(incomingMessage.data);

        processServerMessage(message);
    });

module.exports = createWsServer;
