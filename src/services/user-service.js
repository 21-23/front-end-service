const User = require('../models/UserModel');
const cache = require('./cache-service.js');

module.exports = {
    get(uid) {
        const cachedUser = cache.get(uid);

        if (cachedUser) {
            return Promise.resolve(cachedUser);
        }

        return User.findOne({ uid }).exec().then((user) => {
            if (user) {
                cache.set(user.uid, user);
            }
        });
    },

    create(opts) {
        const user = new User(opts);
        return user.save();
    },

    findOrCreate(opts) {
        return User.findOrCreate(opts).then((user) => {
            console.log('save uncached user');
            if (!cache.get(user.uid)) {
                cache.set(user.uid, user);
            }
            return user;
        });
    }
};
