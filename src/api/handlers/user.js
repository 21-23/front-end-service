const userService = require('../../services/user-service');

exports.getUser = async function getUser(uuid) {
    const [user] = await userService.get([uuid]);

    return user;
};
