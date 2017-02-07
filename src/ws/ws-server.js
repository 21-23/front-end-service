const { Server } = require('uws');
const emitter = require('./emitter');
const { isMaster, get } = require('../services/user-service');

module.exports = function ({ port }) {
    const wss = new Server({ port });

    wss.on('connection', (socket) => {
        console.log('[WS-Server]: Connection', socket.upgradeReq.headers.cookie);
        const uid = '9eedf38350fe4402';

        get(uid)
            .then((user) => {
                if (isMaster(user)) {
                    // define all eventnames
                    emitter.on('MASTER_MESSAGE', (message) => {
                        socket && socket.send(message); //eslint-disable-line
                    });
                }

                return user;
            })
            .then(user => socket.send(user));

        socket.send(JSON.stringify());
        socket.on('message', (message) => {
            console.log('incoming message', message);
            emitter.emit('CLIENT_MESSAGE', message, uid);

            emitter.on(uid, () => {
                socket.send(4);
            });
        });

        socket.on('close', () => {
            // unsubscribe
            emitter.removeAllListeners(uid);
        });
    });

    return wss;
};
