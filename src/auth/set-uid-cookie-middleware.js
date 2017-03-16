const defaultOptions = { httpOnly: true };

module.exports = function createMiddleware(options) {

    const cookiesOptions = Object.assign({}, defaultOptions, options);

    return function setUidCookie(req, res, next) {
        const { cookies: { secret } } = req;
        if (!secret) {
            // we should somehow encrypt uid
            // configure cookiename
            res.cookie('secret', req.user.uid, cookiesOptions);
        }
        next();
    };
};
