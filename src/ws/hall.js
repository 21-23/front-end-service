const roles = require('../constants/roles');

function ensureSession(sessions, sessionId) {
    let session = sessions.get(sessionId);

    if (session) {
        return session;
    }

    session = {
        masters: new Map(),
        players: new Map(),
    };
    sessions.set(sessionId, session);

    return session;
}

function add(connections, sessions, ws, participantId, sessionId, role) {
    const session = ensureSession(sessions, sessionId);

    if (role === roles.GAME_MASTER) {
        session.masters.set(participantId, ws);
    } else {
        session.players.set(participantId, ws);
    }

    connections.set(ws, [participantId, sessionId, role]);

    return true;
}

function getParticipants(connections, sessions, role, sessionId) {
    const session = sessions.get(sessionId);
    const participants = [];

    if (!session) {
        return participants;
    }

    const map = role === roles.GAME_MASTER ? session.masters : session.players;

    map.forEach((ws, participantId) => {
        participants.push([ws, participantId, sessionId, role]);
    });

    return participants;
}

function getAll(connections, sessions, sessionId) {
    const session = sessions.get(sessionId);
    const participants = [];

    if (!session) {
        return participants;
    }

    session.masters.forEach((ws, participantId) => {
        participants.push([ws, participantId, sessionId, roles.GAME_MASTER]);
    });
    session.players.forEach((ws, participantId) => {
        participants.push([ws, participantId, sessionId, roles.PLAYER]);
    });

    return participants;
}

function find(connections, sessions, ws, participantId, sessionId, role) {
    if (connections.size === 0 && sessions.size === 0) {
        return null;
    }

    if (ws) {
        const info = connections.get(ws);

        if (info) {
            return [ws, ...info];
        }
    }

    if (participantId && sessionId) {
        const session = sessions.get(sessionId);

        if (session) {
            if (role) {
                const map = role === roles.GAME_MASTER ? session.masters : session.players;
                const ws = map.get(participantId);

                if (ws) {
                    return [ws, participantId, sessionId, role];
                }
            } else {
                let ws = session.masters.get(participantId);
                let assumedRole = roles.GAME_MASTER;

                if (!ws) {
                    ws = session.players.get(participantId);
                    assumedRole = roles.PLAYER;
                }

                if (ws) {
                    return [ws, participantId, sessionId, assumedRole];
                }
            }
        }
    }

    return null;
}

function remove(connections, sessions, ws, participantId, sessionId, role) {
    const participant = find(connections, sessions, ws, participantId, sessionId, role);

    if (!participant) {
        return false;
    }

    const session = sessions.get(participant[2]);
    if (session) {
        const map = participant[3] === roles.GAME_MASTER ? session.masters : session.players;
        map.delete(participant[1]);
    }
    connections.delete(participant[0]);

    return true;
}

module.exports = function () {
    const connections = new Map();
    const sessions = new Map();

    return {
        add: add.bind(null, connections, sessions),
        remove: remove.bind(null, connections, sessions),
        getMasters: getParticipants.bind(null, connections, sessions, roles.GAME_MASTER),
        getPlayers: getParticipants.bind(null, connections, sessions, roles.PLAYER),
        getAll: getAll.bind(null, connections, sessions),
        get: find.bind(null, connections, sessions),
    };
};
