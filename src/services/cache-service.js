const cache = {};

module.exports = {
    get(key) {
        return cache[key];
    },

    set(key, value) {
        cache[key] = value;
    },

    remove(key) {
        cache[key] = null;
    }
};
