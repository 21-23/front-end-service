const LRUCache = require('lru-native');
const { log } = require('steno');

const config = require('../../config');
const User = require('../models/UserModel');

const cache = new LRUCache(config.get('userCacheOptions'));

function getByUid(uid) {
    const cachedUser = cache.get(uid);

    if (cachedUser) {
        return Promise.resolve(cachedUser);
    }

    // TODO: add step-by-step data retrieval:
    //   1. all possible info from cache
    //   2. rest from DB in one query

    return User.findOne({ uid }).exec().then((user) => {
        if (user) {
            cache.set(user.uid, user);
        }

        return user;
    }); // TODO: add catch?
}

module.exports = {
    get(uids) {
        return Promise.all(uids.map(getByUid));
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
    },
};
