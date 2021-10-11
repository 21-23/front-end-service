const fetch = require('node-fetch');

const logger = require('../loggers')();
const config = require('../config');

const puzzleService = require('./puzzle-service');

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
    createPuzzleSet(name, order) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzle_sets`);

        return fetch(url.toString(), {
            method: 'post',
            body: JSON.stringify({ name, puzzle_order: order }),
            headers: DEFAULT_HEADERS,
        }).then(handleResponse).catch((error) => {
            logger.error('Failed to createPuzzleSet', error);

            const clientError = new Error('Failed to create puzzle set');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },

    addPuzzlesToSet(puzzleSetId, puzzleIds) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzle_set_puzzles`);

        return fetch(url.toString(), {
            method: 'post',
            body: JSON.stringify(puzzleIds.map((puzzleId) => ({ puzzle_set: puzzleSetId, puzzle: puzzleId }))),
            headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
        }).then(handleResponse).catch((error) => {
            logger.error('Failed to addPuzzlesToSet', error);

            const clientError = new Error('Failed to add puzzle to puzzle set');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },

    getFullPuzzleSet(setId) {
        return module.exports.listPuzzleSets(setId).then((puzzleSets) => {
            if (Array.isArray(puzzleSets) && puzzleSets.length > 0) {
                return puzzleSets[0];
            }

            return null;
        });
    },

    listPuzzleSets(setId) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzle_sets`);
        if (setId) {
            url.searchParams.set('id', `eq.${setId}`);
        }
        url.searchParams.set('select', `*,puzzle_set_puzzles_puzzle_set_fkey(puzzle(${puzzleService.FULL_PUZZLE_SELECTOR}))`);

        return fetch(url.toString()).then(handleResponse).catch((error) => {
            logger.error('Failed to listPuzzleSets', error);

            const clientError = new Error('Failed to list sets');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },
};
