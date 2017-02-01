const mongoose = require('mongoose');
const { randomBytes } = require('crypto');

const { Schema } = mongoose;

const User = new Schema({
    nickName: {
        type: String,
        default: '',
    },
    displayName: {
        type: String,
        default: '',
    },
    isMaster: {
        type: Boolean,
        default: false,
    },
    provider: {
        type: String,
        enum: ['github'],
    },
    providerId: {
        type: String,
        default: '',
    },
    uid: {
        type: String,
        default: randomBytes(8).toString('hex'),
    }
});

module.exports = mongoose.model('user', User);
