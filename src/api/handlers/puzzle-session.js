const puzzleSessionService = require('../../services/puzzle-session-service');

exports.createPuzzleSession = async function createPuzzleSession(options) {
    return puzzleSessionService.createPuzzleSession(options.puzzleSetId, options.name, options.alias, options.date);
    // TODO: map db session to session
};
