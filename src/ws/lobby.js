function find(connections, gameSessions, ws, participantId, sessionAlias, game) {
    if (connections.size === 0 && gameSessions.size === 0) {
        return null;
    }

    if (ws) {
        const info = connections.get(ws);

        if (info) {
            return [ws, ...info];
        }
    }

    if (participantId && sessionAlias && game) {
        const gameSession = gameSessions.get(game);
        if (gameSession) {
            const session = gameSession.get(sessionAlias);
            if (session) {
                const connection = session.get(participantId);
                if (connection) {
                    return [connection, participantId, sessionAlias, game];
                }
            }
        }
    }

    return null;
}

function ensureSession(gameSessions, sessionAlias, game) {
    let gameSession = gameSessions.get(game);

    if (!gameSession) {
        gameSessions.set(game, gameSession = new Map());
    }

    let session = gameSession.get(sessionAlias);

    if (!session) {
        gameSession.set(sessionAlias, session = new Map());
    }

    return session;
}

function add(connections, gameSessions, ws, participantId, sessionAlias, game) {
    const session = ensureSession(gameSessions, sessionAlias, game);

    session.set(participantId, ws);
    connections.set(ws, [participantId, sessionAlias, game]);

    return true;
}

function remove(connections, gameSessions, ws, participantId, sessionAlias, game) {
    const info = find(connections, gameSessions, ws, participantId, sessionAlias, game);

    if (!info) {
        return false;
    }

    const gameSession = gameSessions.get(info[3]);
    if (gameSession) {
        const session = gameSession.get(info[2]);
        if (session) {
            session.delete(info[1]);
        }
    }

    connections.delete(info[0]);

    return true;
}

module.exports = function () {
    const connections = new Map();
    const gameSessions = new Map(); // key - game, value - Map<sessionsAlias, Map<participantId, ws>>

    return {
        add: add.bind(null, connections, gameSessions),
        remove: remove.bind(null, connections, gameSessions),
        get: find.bind(null, connections, gameSessions),
    };
};
