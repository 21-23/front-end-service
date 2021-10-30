const puzzleHandlers = require('./puzzle');

const puzzleSetService = require('../../services/puzzle-set-service');

function mapDbFullPuzzleSetToFullPuzzleSet(fullPuzzleSet) {
    const puzzles = new Map(fullPuzzleSet.puzzle_set_puzzles_puzzle_set_fkey.map(({ puzzle }) => [puzzle.id, puzzle]));

    return {
        id: fullPuzzleSet.id,
        name: fullPuzzleSet.name,
        order: fullPuzzleSet.puzzle_order.map((puzzleId) => {
            return puzzleHandlers.mapDbFullPuzzleToFullPuzzle(puzzles.get(puzzleId));
        }),
    };
}

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

exports.getFullPuzzleSet = async function getFullPuzzleSet({ setId }) {
    const fullPuzzleSet = await puzzleSetService.getFullPuzzleSet(setId);

    if (!fullPuzzleSet) {
        const error = new Error(`Can not find the puzzle set: ${setId}`);
        error.status = 404;
        throw error;
    }

    return mapDbFullPuzzleSetToFullPuzzleSet(fullPuzzleSet);
};

exports.listOwnPuzzleSets = async function listOwnPuzzleSets() {
    const fullPuzzleSets = await puzzleSetService.listPuzzleSets();

    return fullPuzzleSets.map(mapDbFullPuzzleSetToFullPuzzleSet);
};
