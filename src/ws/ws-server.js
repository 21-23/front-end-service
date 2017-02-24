// TODO: use action creators for messages

const WebSocketClient = require('uws');

const createPhoenix = require('phoenix');
const { createMessage, parseMessage, arnaux } = require('message-factory');

const config = require('../../config');

const Server = WebSocketClient.Server;
const phoenix = createPhoenix(WebSocketClient, { uri: config.get('ARNAUX_URL'), timeout: 500 });

const createLobby = require('./lobby');
const createHall = require('./hall');

const lobby = createLobby();
const hall = createHall();

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

// -------------- Send messages helpers --------------

function sendToGameMasters(sessionId, message) {
    hall.getMasters(sessionId).forEach(([ws]) => {
        ws.send(message);
    });
}

function sendToPlayers(sessionId, message) {
    hall.getPlayers(sessionId).forEach(([ws]) => {
        ws.send(message);
    });
}

function sendToSession(sessionId, message) {
    sendToGameMasters(sessionId, message);
    sendToPlayers(sessionId, message);
}

// -------------- Sessions state management --------------

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
        // do not notify session state as nothing is changed except the connection (ws)
    }

    lobby.add(ws, participantId, sessionId);
    ws.once('close', () => {
        // do not pass participantId and sessionId
        // a new connection with this info may already be added
        // need to search by ws only
        removeFromLobby(ws);
        phoenix.send(createMessage('state-service', { name: 'session.leave', participantId, sessionId }));
    });
}

function removeFromHall(ws, participantId, sessionId, role) {
    hall.remove(ws, participantId, sessionId, role);
    rejectConnection(ws);
}

function addToHall(ws, participantId, sessionId, role) {
    const participant = hall.get(ws, participantId, sessionId, role);

    if (participant) {
        // if there is already such participant in the hall
        // remove the existing and add a new one
        removeFromHall(...participant);
        // do not notify session state as nothing is changed except the connection (ws)
    }

    hall.add(ws, participantId, sessionId, role);
    ws.once('close', () => {
        // do not pass participantId and sessionId
        // a new connection with this info may already be added
        // need to search by ws only
        removeFromHall(ws);
        phoenix.send(createMessage('state-service', { name: 'session.leave', participantId, sessionId }));
    });
}

// -------------- Messages handlers --------------

function participantIdentified(participantId, sessionId, role) {
    const participant = lobby.get(null, participantId, sessionId);

    if (!participant) {
        return console.warn('[front-service]', '[ws-server]', 'Unknown participant identification', participantId);
    }

    lobby.remove(...participant);
    clearConnection(participant[0]);
    addToHall(...participant, role);

    const newUserAnnouncementMessage = createMessage('_qd-ui', { name: 'participant.joined', participantId, /* displayName */ });
    sendToGameMasters(sessionId, newUserAnnouncementMessage);
}

function processNewConnection(ws) {
    return verifyAuth(ws)
        .then(([participantId, sessionId]) => {
            addToLobby(ws, participantId, sessionId);
            phoenix.send(createMessage('state-service', { name: 'session.join', participantId, sessionId }));
        })
        .catch((error) => {
            console.error('[front-service]', '[ws-server]', 'New connection rejected', error);

            rejectConnection(ws);
        });
}

function processServerMessage(message) {
    switch (message.name) {
        case 'participant.joined':
            return participantIdentified(message.participantId, message.sessionId, message.role);
        default:
            return console.warn('[front-service]', '[ws-server]', 'Unknown message from server');
    }
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

        processServerMessage(message);
    });

module.exports = createWsServer;
