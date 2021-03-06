const defaultOptions = { httpOnly: true };

module.exports = function createMiddleware(options) {

    const cookiesOptions = Object.assign({}, defaultOptions, options);

    return function setUidCookie(req, res, next) {
        // the request is already auth-ed as authenticate middleware is right before the current one
        res.cookie('secret', req.user.uid, cookiesOptions);

        if (req.user.provider === 'qdauto') {
            res.cookie('qdautoid', req.user.providerId, cookiesOptions);
            res.cookie('qdautoname', req.user.displayName, cookiesOptions);
        }

        next();
    };
};
