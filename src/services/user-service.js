const User = require('../models/UserModel');

module.exports = {
    get(uid) {
        return User.findOne({ uid }).exec();
    },

    create(opts) {
        const user = new User(opts);
        return user.save();
    }
};
