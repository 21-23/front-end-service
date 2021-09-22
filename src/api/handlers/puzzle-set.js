const puzzleSetService = require('../../services/puzzle-set-service');

exports.createPuzzleSet = async function createPuzzleSet(options) {
    if (!Array.isArray(options.order)) {
        const error = new Error('order must be an array of valid puzzle IDs');
        error.status = 400;
        throw error;
    }

    const puzzleSet = await puzzleSetService.createPuzzleSet(options.name, options.order);
    await puzzleSetService.addPuzzlesToSet(puzzleSet.id, options.order);

    return puzzleSet;
};
