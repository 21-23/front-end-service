module.exports = function middlewareFactory(knownProviders) {

    return function checkOAuthProviderMiddleware(req, res, next) {
        if (!knownProviders.includes(req.params.provider)) {
            const error = new Error(`Unknown OAuth provider: ${req.params.provider}`);
            return next(error);
        }

        return next();
    };

};
