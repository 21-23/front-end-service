const WebSocketClient = require('uws');

const createPhoenix = require('phoenix');
const { createMessage, parseMessage, arnaux } = require('message-factory');

const config = require('../../config');

const Server = WebSocketClient.Server;
const phoenix = createPhoenix(WebSocketClient, { uri: config.get('ARNAUX_URL'), timeout: 500 });

const createRoom = require('./room');

const lobby = createRoom();

function verifyAuth(ws) {
    // TODO: verify(ws.upgradeReq)
    // ensure both params: participantId and sessionId
    return Promise.resolve(['part-icip-antI-d', 'session-id']);
}

// -------------- Connection management --------------

function clearConnection(ws) {
    // TODO: clear onerror?
    ws.removeAllListeners();
}

function rejectConnection(ws) {
    clearConnection(ws);
    // prvent client phoenix from reconnect
    ws.close(4500);
}

function removeFromLobby(ws, participantId, sessionId) {
    lobby.remove(ws, participantId, sessionId);
    rejectConnection(ws);
}

function addToLobby(ws, participantId, sessionId) {
    const participant = lobby.get(ws, participantId, sessionId);

    if (participant) {
        // if there is already such participant in lobby
        // remove the existing and add a new one
        removeFromLobby(...participant);
    }

    lobby.add(ws, participantId, sessionId);
    ws.once('close', () => {
        // do not pass participantId and sessionId
        // a new connection with this info may already be added
        // need to search by ws only
        removeFromLobby(ws);
    });
}

function processNewConnection(ws) {
    return verifyAuth(ws)
        .then(([participantId, sessionId]) => {
            return addToLobby(ws, participantId, sessionId);
        })
        .catch((error) => {
            console.error('[front-service]', '[ws-server]', 'New connection rejected', error);

            rejectConnection(ws);
        });
}

function createWsServer({ port }) {
    const wss = new Server({ port }, () => {
        console.log('[front-service]', '[ws-server]', 'Server is ready on', port);

        wss.on('connection', processNewConnection);
    });
}

phoenix
    .on('connected', () => {
        console.log('[front-service]', '[ws-server]', 'phoenix is alive');
        phoenix.send(arnaux.checkin(config.get('ARNAUX_IDENTITY')));
    })
    .on('disconnected', () => {
        console.error('[front-service]', '[ws-server]', 'phoenix disconnected');
    })
    .on('message', (incomingMessage) => {
        const { message } = parseMessage(incomingMessage.data);

        // processServerMessage(message);
    });

module.exports = createWsServer;
