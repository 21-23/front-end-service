const fetch = require('node-fetch');

const logger = require('../loggers')();
const config = require('../config');

const puzzleSetService = require('./puzzle-set-service');

const DEFAULT_HEADERS = { 'Content-Type': 'application/json', Prefer: 'return=representation', Accept: 'application/vnd.pgrst.object+json' };

function handleResponse(response) {
    if (response.ok) {
        return response.json();
    }

    return response.json().then((body) => {
        return Promise.reject({ body, status: response.status, statusText: response.statusText });
    });
}

module.exports = {
    async createPuzzleSession(setId, name, alias, date) {
        const set = await puzzleSetService.getFullPuzzleSet(setId);

        if (!set) {
            const error = new Error('Cannot find puzzle set');
            error.status = 404;
            return Promise.reject(error);
        }

        const url = new URL(`${config.get('DB:API:ORIGIN')}/sessions`);

        return fetch(url.toString(), {
            method: 'post',
            body: JSON.stringify({
                puzzle_set: setId, name, url_alias: alias, date,
            }),
            headers: DEFAULT_HEADERS,
        }).then(handleResponse).catch((error) => {
            logger.error('Failed to createPuzzleSet', error);

            const clientError = new Error('Failed to create puzzle set');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },
};
