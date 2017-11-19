const mongoose = require('mongoose');
const { randomBytes } = require('crypto');

const logger = require('../loggers')();

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
        default: () => randomBytes(8).toString('hex'),
    },
});

User.statics.findOrCreate = function (criteria, user) {
    return this.findOne(criteria)
        .exec()
        .then((result) => {
            if (result === null) {
                logger.verbose('save new user');
                return new this(user).save();
            }

            return result;
        });
};

module.exports = mongoose.model('user', User);
