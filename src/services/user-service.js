const LRUCache = require('lru-native');
const { log } = require('steno');

const User = require('../models/UserModel');

const cache = new LRUCache({
    maxElements: 1000,
    maxAge: 120 * 60 * 1000, // 2 hours
    size: 100
});

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

            return user;
        });
    },

    create(opts) {
        const user = new User(opts);

        return user.save();
    },

    findOrCreate(opts) {
        return User.findOrCreate(opts).then((user) => {
            log('save uncached user');
            cache.set(user.uid, user);

            return user;
        });
    }
};
