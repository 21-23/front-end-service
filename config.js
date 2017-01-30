module.exports = {
    'ws-port': 8888,
    'arnaux-url': 'ws://',

    get(value) {
        return this[value];
    },
    set(k, v) {
        this[k] = v;
    }
};
