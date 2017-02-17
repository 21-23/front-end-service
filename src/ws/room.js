function find(connections, sessions, ws, participantId, sessionId) {
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
            const connection = session.get(participantId);

            if (connection) {
                return [connection, participantId, sessionId];
            }
        }
    }

    return null;
}

function ensureSession(sessions, sessionId) {
    let session = sessions.get(sessionId);

    if (session) {
        return session;
    }

    session = new Map();
    sessions.set(sessionId, session);

    return session;
}

function add(connections, sessions, ws, participantId, sessionId) {
    const existing = find(connections, sessions, ws, participantId, sessionId);

    if (existing) {
        return false;
    }

    const session = ensureSession(sessions, sessionId);
    session.set(participantId, ws);
    connections.set(ws, [participantId, sessionId]);

    return true;
}

function remove(connections, sessions, ws, participantId, sessionId) {
    const info = find(connections, sessions, ws, participantId, sessionId);

    if (!info) {
        return false;
    }

    const session = sessions.get(info[2]);
    if (session) {
        session.delete(info[1]);
    }
    connections.delete(info[0]);

    return true;
}

module.exports = function () {
    const connections = new Map();
    const sessions = new Map();

    return {
        add: add.bind(null, connections, sessions),
        remove: remove.bind(null, connections, sessions),
        get: find.bind(null, connections, sessions),
    };
};
