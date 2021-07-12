const { URL } = require('url');

const fetch = require('node-fetch');
const LRUCache = require('lru-cache');
const logger = require('../loggers')();

const config = require('../config');

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

function getUsersQueryUrl() {
    const url = new URL(`${config.get('DB:API:ORIGIN')}/users`);

    url.searchParams.set('select', 'provider:auth_provider,providerId:auth_provider_id,displayName:display_name,uid:id');

    return url;
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

    const getUsersUrl = getUsersQueryUrl();
    getUsersUrl.searchParams.set('id', `in.(${requiredUids.join(',')})`);

    return fetch(getUsersUrl.toString()).then((response) => {
        return response.json();
    })
        .then((users) => {
            users.forEach((user) => {
                if (!user) {
                    return;
                }

                const index = uidToIndexHash.get(user.uid);

                if (index < 0) {
                    return;
                }

                profiles[index] = user;
                cache.set(user.uid, user);
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

    findOrCreate(criteria, user) {
        const getUserUrl = getUsersQueryUrl();
        getUserUrl.searchParams.set('auth_provider', `eq.${criteria.provider}`);
        getUserUrl.searchParams.set('auth_provider_id', `eq.${criteria.providerId}`);

        return fetch(getUserUrl.toString()).then((response) => {
            return response.json();
        }).then((users) => {
            if (users && users.length > 0) {
                return users[0];
            }

            const createUserUrl = getUsersQueryUrl();
            return fetch(createUserUrl.toString(), {
                method: 'post',
                body: JSON.stringify({ auth_provider: user.provider, auth_provider_id: user.providerId, display_name: user.displayName }),
                headers: { 'Content-Type': 'application/json', Prefer: 'return=representation', Accept: 'application/vnd.pgrst.object+json' },
            }).then((response) => {
                return response.json();
            });
        }).then((user) => {
            cache.set(user.uid, user);
            return user;
        }).catch((err) => {
            logger.error('Failed to findOrCreate', err);
            return null;
        });
    },
};
