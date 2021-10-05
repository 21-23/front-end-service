const { URL } = require('url');

const fetch = require('node-fetch');

const logger = require('../loggers')();
const config = require('../config');

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
    getPuzzleTypes() {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzle_types`);

        return fetch(url.toString()).then((response) => response.json());
    },

    getPuzzle(puzzleId) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzles`);
        url.searchParams.set('id', `eq.${puzzleId}`);

        return fetch(url.toString()).then(handleResponse).catch((error) => {
            logger.error('Failed to getPuzzle', error);

            const clientError = new Error('Failed to get puzzle');
            clientError.status = 500;
            return Promise.reject(clientError);
        }).then((puzzles) => {
            if (Array.isArray(puzzles) && puzzles.length > 0) {
                return puzzles[0];
            }

            return null;
        });
    },

    getFullPuzzle(puzzleId) {
        return module.exports.listPuzzles(null, puzzleId).then((puzzles) => {
            if (Array.isArray(puzzles) && puzzles.length > 0) {
                return puzzles[0];
            }

            return null;
        });
    },

    createPuzzle(type, author, name, solution, description) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzles`);

        return fetch(url.toString(), {
            method: 'post',
            body: JSON.stringify({
                type, author, name, solution, description,
            }),
            headers: DEFAULT_HEADERS,
        }).then(handleResponse).catch((error) => {
            logger.error('Failed to createPuzzle', error);

            const clientError = new Error('Failed to create puzzle');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },

    createPuzzleTest(puzzle, input, expected) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzle_tests`);

        return fetch(url.toString(), {
            method: 'post',
            body: JSON.stringify({ puzzle, input, expected }),
            headers: DEFAULT_HEADERS,
        }).then(handleResponse).catch((error) => {
            logger.error('Failed to createPuzzleTest', error);

            const clientError = new Error('Failed to create puzzle test');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },

    setPuzzleDefaultTest(puzzle, test) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzle_default_tests`);

        return fetch(url.toString(), {
            method: 'post',
            body: JSON.stringify({ puzzle, test }),
            headers: DEFAULT_HEADERS,
        }).then(handleResponse).catch((error) => {
            logger.error('Failed to setPuzzleDefaultTest', error);

            const clientError = new Error('Failed to set puzzle default test');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },

    setPuzzleConstraints(puzzle, timeLimit, bannedCharacters, sandboxTimeLimit, solutionLengthLimit) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzle_constraints`);

        return fetch(url.toString(), {
            method: 'post',
            body: JSON.stringify({
                puzzle,
                time_limit: timeLimit,
                banned_characters: bannedCharacters,
                sandbox_time_limit: sandboxTimeLimit,
                solution_length_limit: solutionLengthLimit,
            }),
            headers: DEFAULT_HEADERS,
        }).then(handleResponse).catch((error) => {
            logger.error('Failed to setPuzzleConstraints', error);

            const clientError = new Error('Failed to set puzzle constraints');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },

    listPuzzles(authorId, puzzleId, type) {
        const url = new URL(`${config.get('DB:API:ORIGIN')}/puzzles`);
        if (authorId) {
            url.searchParams.set('author', `eq.${authorId}`);
        }
        if (puzzleId) {
            url.searchParams.set('id', `eq.${puzzleId}`);
        }
        if (type) {
            url.searchParams.set('type', `eq.${type}`);
        }
        url.searchParams.set('select', '*,author(*),puzzle_tests_puzzle_fkey(*),puzzle_default_tests(*),puzzle_constraints(*)');

        return fetch(url.toString()).then(handleResponse).catch((error) => {
            logger.error('Failed to listPuzzles', error);

            const clientError = new Error('Failed to list puzzles');
            clientError.status = 500;
            return Promise.reject(clientError);
        });
    },
};
