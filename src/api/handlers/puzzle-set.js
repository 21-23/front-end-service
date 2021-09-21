const puzzleSetService = require('../../services/puzzle-set-service');

exports.createPuzzleSet = async function createPuzzleSet(options) {
    if (!Array.isArray(options.order)) {
        const error = new Error('order must be an array of valid puzzle IDs');
        error.status = 400;
        throw error;
    }

    const puzzleSet = await puzzleSetService.createPuzzleSet(options.name, options.order);

    for (const puzzleId of options.order) {
        // eslint-disable-next-line no-await-in-loop
        await puzzleSetService.addPuzzleToSet(puzzleSet.id, puzzleId);
    }

    return puzzleSet;
};
