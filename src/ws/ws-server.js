const { Server } = require('uws');
const emitter = require('./emitter');
const cookieParser = require('cookie-parser');


module.exports = function ({ port }) {
    const wss = new Server({ port });

    wss.on('connection', (socket) => {
        console.log('[WS-Server]: Connection', socket.upgradeReq.headers.cookie);
        const cookies = cookieParser.JSONCookie(socket.upgradeReq.headers.cookie);
        console.log('COOKIES', cookies);
        const uid = '9eedf38350fe4402';

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
