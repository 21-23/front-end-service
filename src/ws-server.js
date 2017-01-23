const { Server } = require('uws');


module.exports = function initializeWSServer({ httpServer }) {
    const wss = new Server({
        server: httpServer,
    });

    return wss;
};
