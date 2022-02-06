const express = require('express');
const userHandlers = require('./handlers/user');
const puzzleHandlers = require('./handlers/puzzle');
const puzzleSetHandlers = require('./handlers/puzzle-set');
const puzzleSessionHandlers = require('./handlers/puzzle-session');

const apiV1Router = express.Router();

apiV1Router.get('/health', (req, res) => {
    return res.status(200).json({ status: 'ok' });
});

apiV1Router.get('/getUser', async (req, res) => {
    const user = await userHandlers.getUser(req.user.uid);

    if (!user) {
        return res.status(404).json({ message: `Can not find user with uuid: ${req.user.uid}` });
    }

    return res.json({ user });
});

apiV1Router.post('/createPuzzle', async (req, res) => {
    const required = ['name', 'solution', 'type', 'input', 'expected'];
    const missing = required.filter((prop) => {
        return !req.body[prop];
    });
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Request body params are missing', required, missing });
    }

    try {
        const puzzle = await puzzleHandlers.createPuzzle({ author: req.user.uid, ...req.body });
        return res.json({ puzzle });
    } catch (error) {
        return res.status(error.status || 500).json({ message: 'Failed to create puzzle', error: error.message });
    }
});

apiV1Router.post('/createHiddenTest', async (req, res) => {
    const required = ['puzzleId', 'input', 'expected'];
    const missing = required.filter((prop) => {
        return !req.body[prop];
    });
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Request body params are missing', required, missing });
    }

    try {
        const hiddenTest = await puzzleHandlers.createHiddenTest({ author: req.user.uid, ...req.body });
        return res.json({ hiddenTest });
    } catch (error) {
        return res.status(error.status || 500).json({ message: 'Failed to create hidden test', error: error.message });
    }
});

apiV1Router.get('/getFullPuzzle', async (req, res) => {
    const required = ['puzzleId'];
    const missing = required.filter((prop) => {
        return !req.query[prop];
    });
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Query params are missing', required, missing });
    }

    try {
        const puzzle = await puzzleHandlers.getFullPuzzle({ author: req.user.uid, puzzleId: req.query.puzzleId });
        return res.json({ puzzle });
    } catch (error) {
        return res.status(error.status || 500).json({ message: 'Failed to get puzzle', error: error.message });
    }
});

apiV1Router.post('/createPuzzleSet', async (req, res) => {
    const required = ['name', 'order'];

    const missing = required.filter((prop) => {
        return !req.body[prop];
    });
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Request body params are missing', required, missing });
    }

    try {
        const puzzleSet = await puzzleSetHandlers.createPuzzleSet(req.body);
        return res.json({ puzzleSet });
    } catch (error) {
        return res.status(error.status || 500).json({ message: 'Failed to create puzzle set', error: error.message });
    }
});

apiV1Router.get('/listOwnPuzzles', async (req, res) => {
    const required = ['game'];
    const missing = required.filter((prop) => {
        return !req.query[prop];
    });
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Query params are missing', required, missing });
    }

    try {
        const puzzles = await puzzleHandlers.listOwnPuzzles({ author: req.user.uid, type: req.query.game });
        return res.json({ puzzles });
    } catch (error) {
        return res.status(error.status || 500).json({ message: 'Failed to list puzzles', error: error.message });
    }
});

apiV1Router.get('/getFullPuzzleSet', async (req, res) => {
    const required = ['setId'];
    const missing = required.filter((prop) => {
        return !req.query[prop];
    });
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Query params are missing', required, missing });
    }

    try {
        const puzzleSet = await puzzleSetHandlers.getFullPuzzleSet({ author: req.user.uid, setId: req.query.setId });
        return res.json({ puzzleSet });
    } catch (error) {
        return res.status(error.status || 500).json({ message: 'Failed to get puzzle set', error: error.message });
    }
});

apiV1Router.get('/listOwnSets', async (req, res) => {
    const required = [];
    const missing = required.filter((prop) => {
        return !req.query[prop];
    });
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Query params are missing', required, missing });
    }

    try {
        const puzzleSets = await puzzleSetHandlers.listOwnPuzzleSets({ author: req.user.uid });
        return res.json({ puzzleSets });
    } catch (error) {
        return res.status(error.status || 500).json({ message: 'Failed to list puzzle sets', error: error.message });
    }
});

apiV1Router.post('/createPuzzleSession', async (req, res) => {
    const required = ['name', 'puzzleSetId', 'alias', 'date'];

    const missing = required.filter((prop) => {
        return !req.body[prop];
    });
    if (missing.length > 0) {
        return res.status(400).json({ message: 'Request body params are missing', required, missing });
    }

    try {
        const puzzleSession = await puzzleSessionHandlers.createPuzzleSession(req.body);
        return res.json({ puzzleSession });
    } catch (error) {
        return res.status(error.status || 500).json({ message: 'Failed to create puzzle set', error: error.message });
    }
});

exports.router = apiV1Router;
