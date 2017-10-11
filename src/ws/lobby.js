function generateConnectionId(participantId, sessionAlias, game, role) {
    return `${game}::${sessionAlias}::${participantId}::${role}`;
}

function disconnect(participant) {
    participant.ws = null;
}

module.exports = function () {
    const connections = new Map(); // key - ws connection, value - connectionId

    return {
        generateConnectionId,
        get: (connectionId) => {
            return connections.get(connectionId);
        },
        remove: (connectionId) => {
            return connections.delete(connectionId);
        },
        add: (connectionId, participant) => {
            return connections.set(connectionId, participant);
        },
        disconnect: (connectionId) => {
            const participant = connections.get(connectionId);

            return disconnect(participant);
        },
    };
};
