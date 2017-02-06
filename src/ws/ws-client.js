const createPhoenix = require('phoenix');
const { createMessage, parseMessage, arnaux } = require('message-factory');
const Socket = require('uws');
const emitter = require('./emitter');
const config = require('../../config');

const phoenix = createPhoenix(Socket, {
    uri: config.get('ARNAUX_URL'),
});

phoenix
    .on('connected', () => {
        console.log('Connected to ARNAUX');
        const checkinMessage = arnaux.checkin('front-service');
        phoenix.send(checkinMessage);
    })
    .on('disconnected', () => {
        console.error('Connection to ARNAUX dropped');
    })
    .on('message', (message) => {
        const parsedMessage = parseMessage(message.data);
        console.log(parsedMessage);
    });

emitter.on('CLIENT_MESSAGE', (input, uid) => {
    const message = createMessage('arnaux', { type: 'solution', input, uid });
    phoenix.send(message);
});
