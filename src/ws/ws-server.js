const WebSocketClient = require('uws');

const createPhoenix = require('phoenix');
const { createMessage, parseMessage, arnaux } = require('message-factory');

const config = require('../../config');
const { isMaster, get } = require('../services/user-service');

const Server = WebSocketClient.Server;
const phoenix = createPhoenix(WebSocketClient, { uri: config.get('ARNAUX_URL'), timeout: 500 });

const sessions = new Map([['rsconf-2017', { players: new Map(), gameMaster: new Map() }]]);
const connections = new Map();

function verifyConnection() {
    return Promise.resolve();
}

function registerConnection(ws, sessionId, participantId, isMaster) {
    const session = sessions.get(sessionId);

    if (!session) {
        return console.warn('[front-service]', 'Session is not opened yet');
    }

    connections.set(ws, [sessionId, participantId]);
    if (isMaster) {
        session.gameMaster.set(participantId, ws);
    } else {
        session.players.set(participantId, ws);
    }
}

function handleClientClose(ws, code, message) {
    ws.removeAllListeners();

    const [sessionId, participantId] = connections.get(ws); // TODO: is destructuring safe?
    const session = sessions.get(sessionId);
    session.players.delete(participantId); // TODO: more smart remove?
    session.gameMaster.delete(participantId);
    connections.delete(ws);
}

function sendSolution(connection, input) {
    const [sessionId, participantId] = connections.get(connection);
    const serverMessage = createMessage('state-service', { // TODO: create "constructor"
        name: 'participant.input',
        input,
        sessionId,
        participantId,
        timestamp: Date.now()
    });

    phoenix.send(serverMessage);
}

function handleClientMessage(incomingMessage) {
    const { message } = parseMessage(incomingMessage);

    console.log('[front-service]', 'Client message', message);

    switch (message.name) {
        case 'solution':
            return sendSolution(this, message.input);
        default:
            return console.log('[front-service]', 'Unknown client message');
    }
}

function handleNewConnection(ws) {
    console.log('[WS-Server]: Connection', ws.upgradeReq.headers.cookie);
    const uid = '9eedf38350fe4402';

    verifyConnection() // TODO: parse cookies
        .then(() => {
            registerConnection(ws, 'rsconf-2017', uid, false);
            ws.on('message', handleClientMessage);
            ws.once('close', handleClientClose.bind(null, ws));
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
