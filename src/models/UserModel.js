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

User.statics.findOrCreate = function (profile) {
    const user = new this(profile);

    return new Promise((resolve, reject) => {
        this.findOne(profile, (err, result) => {
            if (err) {
                console.log('save err');
                reject(err);
                return;
            }

            if (!result) {
                console.log('save new user');
                return user.save();
            }
            resolve(result);
        });
    });
};

module.exports = mongoose.model('user', User);
