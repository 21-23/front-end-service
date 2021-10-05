const puzzleService = require('../../services/puzzle-service');

// TODO: update with transactions when resolved https://github.com/PostgREST/postgrest/issues/286

function secondsToInterval(seconds) {
    return `${seconds} seconds`;
}

function intervalToSeconds(interval) {
    const [hh, mm, ss] = interval.split(':').map((str) => +str);

    return ss + mm * 60 + hh * 3600;
}

function ensurePuzzleDefaults(options) {
    return {
        type: options.type,
        author: options.author,
        name: options.name,
        solution: options.solution,
        description: options.description || '',
        input: options.input,
        expected: options.expected,
        timeLimit: Number.isFinite(options.timeLimit) ? secondsToInterval(options.timeLimit) : secondsToInterval(180),
        bannedCharacters: options.bannedCharacters || [],
        sandboxTimeLimit: Number.isFinite(options.sandboxTimeLimit) ? secondsToInterval(options.sandboxTimeLimit) : secondsToInterval(1),
        solutionLengthLimit: Number.isFinite(options.solutionLengthLimit) && options.solutionLengthLimit > 0 ? options.solutionLengthLimit : undefined,
    };
}

function mapDbFullPuzzleToFullPuzzle(fullPuzzle) {
    const defaultTest = fullPuzzle.puzzle_default_tests[0];
    const puzzleConstraints = fullPuzzle.puzzle_constraints[0];
    const tests = fullPuzzle.puzzle_tests_puzzle_fkey.reduce((tests, test) => {
        if (test.id === defaultTest.test) {
            tests.default = { id: test.id, input: test.input, expected: test.expected };
        } else {
            tests.hidden.push({ id: test.id, input: test.input, expected: test.expected });
        }
        return tests;
    }, { default: null, hidden: [] });

    return {
        id: fullPuzzle.id,
        type: fullPuzzle.type,
        name: fullPuzzle.name,
        description: fullPuzzle.description,
        solution: fullPuzzle.solution,
        author: {
            id: fullPuzzle.author.id,
            name: fullPuzzle.author.display_name,
        },
        tests,
        constraints: {
            timeLimit: intervalToSeconds(puzzleConstraints.time_limit),
            bannedCharacters: puzzleConstraints.banned_characters,
            sandboxTimeLimit: intervalToSeconds(puzzleConstraints.sandbox_time_limit),
            solutionLengthLimit: puzzleConstraints.solution_length_limit,
        },
    };
}

exports.createPuzzle = async function createPuzzle(options) {
    const puzzleTypes = await puzzleService.getPuzzleTypes();
    const puzzleType = puzzleTypes.find((puzzleType) => puzzleType.name === options.type);

    if (!puzzleType) {
        const supported = puzzleTypes.map((puzzleType) => puzzleType.name);
        const error = new Error(`Unknown puzzle type: ${options.type}. Supported: ${supported}`);
        error.status = 400;
        throw error;
    }

    const puzzleOptions = ensurePuzzleDefaults(options);

    const puzzle = await puzzleService.createPuzzle(puzzleOptions.type, puzzleOptions.author, puzzleOptions.name, puzzleOptions.solution, puzzleOptions.description);
    const puzzleTest = await puzzleService.createPuzzleTest(puzzle.id, puzzleOptions.input, puzzleOptions.expected);
    await puzzleService.setPuzzleDefaultTest(puzzle.id, puzzleTest.id);
    await puzzleService.setPuzzleConstraints(puzzle.id, puzzleOptions.timeLimit, puzzleOptions.bannedCharacters, puzzleOptions.sandboxTimeLimit, puzzleOptions.solutionLengthLimit);

    return puzzle;
};

exports.createHiddenTest = async function createHiddenTest(options) {
    const puzzle = await puzzleService.getPuzzle(options.puzzleId);

    if (!puzzle) {
        const error = new Error(`Can not find the puzzle: ${options.puzzleId}`);
        error.status = 404;
        throw error;
    }

    if (puzzle.author !== options.author) {
        const error = new Error('Puzzle was created by a different user');
        error.status = 401;
        throw error;
    }

    const puzzleTest = await puzzleService.createPuzzleTest(options.puzzleId, options.input, options.expected);

    return puzzleTest;
};

exports.getFullPuzzle = async function getFullPuzzle({ puzzleId }) {
    const fullPuzzle = await puzzleService.getFullPuzzle(puzzleId);

    if (!fullPuzzle) {
        const error = new Error(`Can not find the puzzle: ${puzzleId}`);
        error.status = 404;
        throw error;
    }

    return mapDbFullPuzzleToFullPuzzle(fullPuzzle);
};

exports.listOwnPuzzles = async function listOwnPuzzles({ author, type }) {
    const puzzles = await puzzleService.listPuzzles(author, null, type);

    return puzzles.map(mapDbFullPuzzleToFullPuzzle);
};
