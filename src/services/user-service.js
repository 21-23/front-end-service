const LRUCache = require('lru-cache');
const logger = require('../loggers')();

const config = require('../config');
const User = require('../models/UserModel');

const cache = new LRUCache(config.get('userCacheOptions'));

function fillFromCache(uids, profiles) {
    profiles.forEach((profile, index) => {
        if (profile) {
            return;
        }

        const uid = uids[index];
        const cachedProfile = cache.get(uid);

        if (!cachedProfile) {
            return;
        }

        profiles[index] = cachedProfile;
    });
}

function fillFromDb(uids, profiles) {
    const requiredUids = [];
    const uidToIndexHash = new Map();

    profiles.forEach((profile, index) => {
        if (profile) {
            return;
        }

        const uid = uids[index];

        requiredUids.push(uid);
        uidToIndexHash.set(uid, index);
    });

    if (!requiredUids.length) {
        return Promise.resolve();
    }

    return User
        .find()
        .where('uid')
        .in(requiredUids)
        .exec()
        .then((dbProfiles) => {
            dbProfiles.forEach((dbProfile) => {
                const dbUid = dbProfile.uid;
                const index = uidToIndexHash.get(dbUid);

                if (index < 0 || !dbProfile) {
                    return;
                }

                profiles[index] = dbProfile;
                cache.set(dbUid, dbProfile);
            });
        })
        .catch((err) => {
            logger.error('Can not find multiple profiles in DB', err);
        });
}

module.exports = {
    get(uids) {
        const profiles = Array(uids.length).fill(null);

        fillFromCache(uids, profiles);

        return fillFromDb(uids, profiles)
            .then(() => profiles);
    },

    create(opts) {
        const user = new User(opts);

        return user.save();
    },

    findOrCreate(criteria, user) {
        return User.findOrCreate(criteria, user).then((user) => {
            logger.verbose('save uncached user');
            cache.set(user.uid, user);

            return user;
        }).catch((err) => {
            logger.error('Can not find or create profile', err);

            return null;
        });
    },
};
