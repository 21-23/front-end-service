const url = require('url');

const WebSocketClient = require('uws');

const createPhoenix = require('phoenix');
const { parseMessage, arnaux, protocol: { frontService, stateService, initService, ui, identity } } = require('message-factory');
const logger = require('../loggers')();

const config = require('../config');
const roles = require('../constants/roles');

const Server = WebSocketClient.Server;
const phoenix = createPhoenix(WebSocketClient, { uri: config.get('ARNAUX:URL'), timeout: 500 });

const createLobby = require('./lobby');
const createHall = require('./hall');

const MESSAGE_NAME = frontService.MESSAGE_NAME;
const DEFAULT_PROFILE = {
    displayName: 'Unknown',
};
let ENABLE_GUNSLINGER = config.get('GUNSLINGERS');
// One day, all nconf values would be parsed. Perhaps...
// https://github.com/plexinc/nconf/commit/edb166fa144b9a89a813e30a029d2da93c5468cc
ENABLE_GUNSLINGER = ENABLE_GUNSLINGER === true || ENABLE_GUNSLINGER === 'true';

const lobby = createLobby();
const hall = createHall();

let parseCookie = null;
let loadProfiles = null;
let createProfile = null;

function verifyGunslingerAuth(req) {
    const parsedUrl = url.parse(req.url, true);

    if (parsedUrl.pathname !== '/gunslinger' || !parsedUrl.query) {
        return null;
    }

    const uid = parsedUrl.query['id'];
    const sessionAlias = parsedUrl.query['session'];
    const game = parsedUrl.query['game'];

    if (!uid || !sessionAlias || !game) {
        return null;
    }

    return [uid, sessionAlias, roles.PLAYER, game]; // all gunslingers are PLAYERs
}

function verifyAuth(ws) {
    const req = ws.upgradeReq;

    return new Promise((resolve, reject) => {
        parseCookie(req, null, () => {
            const uid = req.cookies['secret'];
            const sessionAlias = req.cookies['session'];
            const role = req.cookies['role'];
            const game = req.cookies['game'];

            if (uid && sessionAlias && game) {
                resolve([uid, sessionAlias, role, game]);
            } else {
                if (ENABLE_GUNSLINGER) {
                    const gunslinger = verifyGunslingerAuth(req);

                    if (gunslinger) {
                        return resolve(gunslinger);
                    }
                }

                reject(`Invalid uid or session or game: ${uid}, ${sessionAlias}, ${game}`);
            }
        });
    });
}

// -------------- Connection management --------------

function clearConnection(ws) {
    // TODO: clear onerror?
    ws.removeAllListeners();
}

function rejectConnection(ws) {
    // prevent client phoenix from reconnect
    // assume that ws has appropriate 'close' handler
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
    hall.getAll(sessionId).forEach(([ws]) => {
        ws.send(message);
    });
}

function sendToParticipant(ws, message) {
    ws.send(message);
}

// -------------- Client messages --------------

function handleClientMessage(ws, message) {
    const participant = hall.get(ws);

    if (!participant) {
        return logger.warn('[ws-server]', 'Message from unknown client', message);
    }

    if (!message.name) {
        return logger.warn('[ws-server]', 'Clinet message without name', message);
    }

    const [, participantId, sessionId] = participant;

    // TODO: validate params in every message; we can not trust client messages
    switch (message.name) {
        case MESSAGE_NAME.puzzleIndexSet:
            return phoenix.send(stateService.puzzleIndexSet(sessionId, participantId, message.index));
        case MESSAGE_NAME.roundStart:
            return phoenix.send(stateService.roundStart(sessionId, participantId));
        case MESSAGE_NAME.roundStop:
            return phoenix.send(stateService.roundStop(sessionId, participantId));
        case MESSAGE_NAME.solution:
            return phoenix.send(stateService.participantInput(sessionId, participantId, message.input, Date.now()));
        default:
            return logger.warn('[ws-server]', 'Unknown message from client', message.name);
    }
}

// -------------- Sessions state management --------------

function parseClientMessage(incomingMessage) {
    try {
        const { message } = parseMessage(incomingMessage);

        return message;
    } catch (err) {
        logger.error('[ws-server]', 'Invalid message from client; Skip it;', incomingMessage);
    }

    return null;
}

function addToLobby(ws, participantId, sessionAlias, game, role) {
    const connectionId = lobby.generateConnectionId(participantId, sessionAlias, game, role);
    let participant = lobby.get(connectionId);

    if (participant) {
        // if there is already such participant in lobby - remove them
        if (participant.ws) {
            // participant.ws may be null in case page is refreshed
            // while participant is in lobby;
            clearConnection(participant.ws);
            rejectConnection(participant.ws);
        }
        lobby.remove(connectionId);
    }

    participant = { ws, participantId, sessionAlias, game, role };

    lobby.add(connectionId, participant);
    ws.once('close', () => {
        clearConnection(ws);
        lobby.disconnect(connectionId);
    });

    return connectionId;
}

function addToHall(sessionId, { ws, participantId, role }) {
    const participant = hall.get(null, participantId, sessionId, role);

    if (participant) {
        // if there is already such participant in the hall
        // reject old connection, remove from hall, add a new one
        const oldWs = participant[0];

        clearConnection(oldWs);
        rejectConnection(oldWs);
        hall.remove(oldWs);
    }

    hall.add(ws, participantId, sessionId, role);
    ws.once('close', () => {
        // do not pass participantId and sessionId
        // a new connection with this info may already be added
        // need to search by ws only
        clearConnection(ws);
        hall.remove(ws);
        phoenix.send(stateService.sessionLeave(sessionId, participantId));
    });
    ws.on('message', function onClientMessage(incomingMessage) {
        const message = parseClientMessage(incomingMessage);

        if (!message) {
            return rejectConnection(this);
        }

        handleClientMessage(this, message);
    });
}

function profilesToMap(profiles, participantIds) {
    return profiles.reduce((result, profile, index) => {
        return result.set(participantIds[index], profile);
    }, new Map());
}

function fillScoreWithProfiles(score, profiles, participantIds) {
    const profilesMap = profilesToMap(profiles, participantIds);

    score.forEach((participantScore) => {
        participantScore.displayName = profilesMap.get(participantScore.participantId).displayName;
    });

    return score;
}

function getProfiles(participantIds) {
    if (!Array.isArray(participantIds) || !participantIds.length) {
        return Promise.resolve([]);
    }

    return loadProfiles(participantIds).then((profiles) => {
        if (!profiles || !Array.isArray(profiles)) {
            throw new Error('loadProfiles returned nothing');
        }

        return profiles.map((profile, index) => {
            // in most cases "profile" will exist => main flow is not affected;
            // mix in displayName for gunslingers;
            return profile || Object.assign({}, DEFAULT_PROFILE, { displayName: participantIds[index] });
        });
    }).catch((error) => {
        logger.warn('[ws-server]', 'Error in profile loading', error);

        return Array(participantIds.length).fill(DEFAULT_PROFILE);
    });
}

// -------------- Messages handlers --------------

function rejectParticipant(participantId, sessionId) {
    const participant = hall.get(null, participantId, sessionId);

    if (participant) {
        rejectConnection(participant[0]);
        return logger.warn('Reject participant from hall; participantId:', participantId, '; sessionId:', sessionId);
    }

    return logger.warn('Can not reject unknown participant; participantId:', participantId, '; sessionId:', sessionId);
}

function participantLeft(participantId, sessionId) {
    sendToGameMasters(sessionId, ui.participantLeft(participantId));
}

function participantIdentified(connectionId, sessionId) {
    const participant = lobby.get(connectionId);

    if (!participant) {
        return logger.warn('[ws-server]', 'Unknown participant identification', connectionId, sessionId);
    }

    if (!participant.ws) {
        logger.warn('[ws-server]', 'Disconnected participant identification', connectionId, sessionId);
        return phoenix.send(stateService.sessionLeave(sessionId, participant.participantId));
    }

    lobby.remove(connectionId);
    clearConnection(participant.ws);

    if (!sessionId) {
        logger.warn('[ws-server]', 'Participant identification failed:', connectionId, sessionId);
        return rejectConnection(participant.ws);
    }

    addToHall(sessionId, participant);

    if (participant.role === roles.GAME_MASTER) {
        // it is not required to send participantJoined if a new GM is connected
        return logger.info('[ws-server]', 'New GM joined', sessionId, participant);
    }

    getProfiles([participant.participantId]).then(([profile]) => {
        if (!profile) {
            logger.warn('[ws-server]', 'Can not get profile for participant', participant, '; sessionId', sessionId);
        }

        sendToGameMasters(sessionId, ui.participantJoined(participant.participantId, profile && profile.displayName));
    });
}

function puzzle({ sessionId, input, expected, puzzleOptions }) {
    sendToSession(sessionId, ui.puzzle(input, expected, puzzleOptions));
}

function puzzleChanged({ sessionId, puzzleIndex, puzzleName, puzzleOptions }) {
    sendToSession(sessionId, ui.puzzleChanged(puzzleIndex, puzzleName, puzzleOptions));
}

function roundCountdownChanged(sessionId, roundCountdown) {
    sendToSession(sessionId, ui.roundCountdownChanged(roundCountdown));
}

function roundPhaseChanged(sessionId, roundPhase) {
    sendToSession(sessionId, ui.roundPhaseChanged(roundPhase));
}

function sendGameMasterSessionState(message) {
    const { participantId, sessionId } = message;
    const participant = hall.get(null, participantId, sessionId, roles.GAME_MASTER);

    if (!participant) {
        return logger.warn('[ws-server]', 'Unknown GM session state', message);
    }

    const participantIds = message.players.map(player => player.participantId);

    return Promise.all([
        getProfiles([participantId]),
        getProfiles(participantIds),
    ]).then(([[profile], scoreProfiles]) => {
        const players = fillScoreWithProfiles(message.players, scoreProfiles, participantIds);

        sendToParticipant(
            participant[0],
            ui.gameMasterSessionState(
                profile.displayName,
                message.puzzleIndex,
                message.puzzleCount,
                message.puzzle,
                message.roundPhase,
                message.roundCountdown,
                message.startCountdown,
                players,
                message.sandboxStatus
            )
        );
    }).catch((err) => {
        logger.warn('[ws-server]', 'Can not get profiles for GM session state', err);
    });
}

function sendScore(players, sessionId) {
    const participantIds = players.map(player => player.participantId);

    return getProfiles(participantIds).then((scoreProfiles) => {
        const personalizedPlayers = fillScoreWithProfiles(players, scoreProfiles, participantIds);

        sendToGameMasters(sessionId, ui.score(personalizedPlayers));
    }).catch((err) => {
        logger.warn('[ws-server]', 'Can not get profiles for GM score', err);
    });
}

function sendPlayerSessionState(message) {
    const { participantId, sessionId } = message;
    const participant = hall.get(null, participantId, sessionId, roles.PLAYER);

    if (!participant) {
        return logger.warn('[ws-server]', 'Unknown PLAYER session state', message);
    }

    return getProfiles([participantId])
        .then(([profile]) => {
            sendToParticipant(
                participant[0],
                ui.playerSessionState(
                    profile.displayName,
                    message.puzzleIndex,
                    message.puzzleCount,
                    message.puzzle,
                    message.roundPhase,
                    message.roundCountdown,
                    message.startCountdown,
                    message.playerInput,
                    message.solution
                )
            );
        }).catch((err) => {
            logger.warn('[ws-server]', 'Can not get profiles for GM session state', err);
        });
}

function solutionEvaluated(message) {
    const { participantId, sessionId } = message;
    const participant = hall.get(null, participantId, sessionId);

    if (!participant) {
        return logger.warn('[ws-server]', 'Unknown participant solution evaluation', message);
    }

    sendToParticipant(participant[0], ui.solutionEvaluated(message.result, message.error, message.correct, message.time));
    sendToGameMasters(sessionId, ui.participantSolution(participantId, message.correct, message.time, message.length));
}

function startCountdownChanged(sessionId, startCountdown) {
    return sendToSession(sessionId, ui.startCountdownChanged(startCountdown));
}

function sendSandboxStatus(sessionId, status) {
    return sendToGameMasters(sessionId, ui.sandboxStatus(status));
}

function processNewConnection(ws) {
    return verifyAuth(ws)
        .then(([participantId, sessionAlias, role, game]) => {
            const connectionId = addToLobby(ws, participantId, sessionAlias, game, role);

            phoenix.send(stateService.sessionJoin(connectionId, game, sessionAlias, participantId, role));
        })
        .catch((err) => {
            logger.error('[ws-server]', 'New connection rejected', err);

            rejectConnection(ws);
        });
}

function createNewParticipant(userData) {
    // validation?
    return createProfile(userData)
        .then((user) => {
            logger.info('[ws-server]', 'Create new user');

            if (!user) {
                // Send errors?
                return;
            }

            const { uid } = user;
            phoenix.send(initService.participantCreated(uid));
        });
}

function processServerMessage(message) {
    // TODO: move participant validation here
    switch (message.name) {
        case MESSAGE_NAME.gameMasterSessionState:
            return sendGameMasterSessionState(message);
        case MESSAGE_NAME.score:
            return sendScore(message.players, message.sessionId);
        case MESSAGE_NAME.sessionJoinResult:
            return participantIdentified(message.connectionId, message.sessionId);
        case MESSAGE_NAME.playerSessionState:
            return sendPlayerSessionState(message);
        case MESSAGE_NAME.participantKick:
            return rejectParticipant(message.participantId, message.sessionId);
        case MESSAGE_NAME.participantLeft:
            return participantLeft(message.participantId, message.sessionId);
        case MESSAGE_NAME.puzzle:
            return puzzle(message);
        case MESSAGE_NAME.puzzleChanged:
            return puzzleChanged(message);
        case MESSAGE_NAME.roundCountdownChanged:
            return roundCountdownChanged(message.sessionId, message.roundCountdown);
        case MESSAGE_NAME.roundPhaseChanged:
            return roundPhaseChanged(message.sessionId, message.roundPhase);
        case MESSAGE_NAME.solutionEvaluated:
            return solutionEvaluated(message);
        case MESSAGE_NAME.createParticipant:
            return createNewParticipant(message.participant);
        case MESSAGE_NAME.startCountdownChanged:
            return startCountdownChanged(message.sessionId, message.startCountdown);
        case MESSAGE_NAME.sandboxStatus:
            return sendSandboxStatus(message.sessionId, message.status);
        default:
            return logger.warn('[ws-server]', 'Unknown message from server', message.name);
    }
}

function createWsServer({ port, cookieParser, profileLoader, profileCreator }) {
    const wss = new Server({ port }, () => {
        logger.info('[ws-server]', 'Server is ready on', port);

        wss.on('connection', processNewConnection);
    });

    parseCookie = cookieParser;
    loadProfiles = profileLoader;
    createProfile = profileCreator;
}

phoenix
    .on('connected', () => {
        logger.info('[ws-server]', 'phoenix is alive');
        phoenix.send(arnaux.checkin(identity.FRONT_SERVICE));
    })
    .on('disconnected', () => {
        logger.error('[ws-server]', 'phoenix disconnected');
    })
    .on('message', (incomingMessage) => {
        const { message } = parseMessage(incomingMessage.data);

        processServerMessage(message);
    });

module.exports = createWsServer;
