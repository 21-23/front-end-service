const url = require('url');

const fetch = require('node-fetch');
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

    // return User
    //     .find()
    //     .where('uid')
    //     .in(requiredUids)
    //     .exec()
    const getUserUrl = new url.URL('http://172.31.11.85/users');
    getUserUrl.searchParams.set('id', `in.(${requiredUids.join(',')})`);
    console.log('[US] [fillFromDb] getUserUrl', getUserUrl.toString());

    return fetch(getUserUrl.toString()).then((response) => {
        return response.json();
    })
        .then((dbProfiles) => {
            dbProfiles.forEach((dbProfile) => {
                const dbUid = dbProfile.id;
                const index = uidToIndexHash.get(dbUid);

                if (index < 0 || !dbProfile) {
                    return;
                }

                profiles[index] = {
                    provider: dbProfile.auth_provider,
                    providerId: dbProfile.auth_provider_id,
                    displayName: dbProfile.display_name,
                    uid: dbProfile.id,
                };
                cache.set(dbUid, profiles[index]);
            });
        })
        .catch((err) => {
            console.log('[US] [fillFromDb] failed', JSON.stringify(err));
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
        const createUserUrl = new url.URL('http://172.31.11.85/users');
        return fetch(createUserUrl.toString(), {
            method: 'post',
            body: JSON.stringify({ auth_provider: opts.provider, auth_provider_id: opts.providerId, display_name: opts.displayName }),
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        }).then((response) => {
            return response.json();
        }).then((dbUser) => {
            const user = {
                provider: dbUser.auth_provider,
                providerId: dbUser.auth_provider_id,
                displayName: dbUser.display_name,
                uid: dbUser.id,
            };
            return user;
        }).catch((error) => {
            console.log('[US] [create] failed', JSON.stringify(error));
            return null;
        });
        // const user = new User(opts);

        // return user.save();
    },

    findOrCreate(criteria, user) {
        const getUserUrl = new url.URL('http://172.31.11.85/users');
        getUserUrl.searchParams.set('auth_provider', `eq.${criteria.provider}`);
        getUserUrl.searchParams.set('auth_provider_id', `eq.${criteria.providerId}`);

        console.log('[US] [findOrCreate] getUserUrl', getUserUrl.toString());

        return fetch(getUserUrl.toString()).then((response) => {
            return response.json();
        }).then((users) => {
            if (users && users.length === 1) {
                return users[0];
            }

            const createUserUrl = new url.URL('http://172.31.11.85/users');
            return fetch(createUserUrl.toString(), {
                method: 'post',
                body: JSON.stringify({ auth_provider: user.provider, auth_provider_id: user.providerId, display_name: user.displayName }),
                headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
            }).then((response) => {
                return response.json();
            });
        }).then((dbUser) => {
            const user = {
                provider: dbUser.auth_provider,
                providerId: dbUser.auth_provider_id,
                displayName: dbUser.display_name,
                uid: dbUser.id,
            };
            cache.set(user.uid, user);
            return user;
        })
            .catch((error) => {
                console.log('[US] [findOrCreate] failed', JSON.stringify(error));
                return null;
            });

        // return User.findOrCreate(criteria, user).then((user) => {
        //     logger.verbose('save uncached user');
        //     cache.set(user.uid, user);

        //     return user;
        // }).catch((err) => {
        //     logger.error('Can not find or create profile', err);

        //     return null;
        // });
    },
};
