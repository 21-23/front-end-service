const mongoose = require('mongoose');
const { randomBytes } = require('crypto');

const { log } = require('steno');

const { Schema } = mongoose;

const User = new Schema({
    displayName: {
        type: String,
        default: '',
    },
    provider: {
        type: String,
    },
    providerId: {
        type: String,
        default: '',
    },
    uid: {
        type: String,
        default: randomBytes(8).toString('hex'),
    },
});

User.statics.findOrCreate = function (profile) {
    return this.findOne(profile)
        .exec()
        .then((result) => {
            if (result === null) {
                log('save new user');
                return new this(profile).save();
            }

            return result;
        });
};

module.exports = mongoose.model('user', User);
