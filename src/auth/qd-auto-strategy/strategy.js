const { URL } = require('url');
const util = require('util');

const passport = require('passport');
const { v4: uuidv4 } = require('uuid');

const { generateName } = require('./names');

function Strategy(options, verify) {
    passport.Strategy.call(this);

    this.name = 'qdauto';
    this._callbackURL = options.callbackURL;
    this._verify = verify;
}

util.inherits(Strategy, passport.Strategy);

Strategy.prototype.authenticate = function (req, options) {
    if (!req.query || req.query.qdAutoDone !== 'done') {
        const callbackURL = new URL(options.callbackURL || this._callbackURL);

        callbackURL.searchParams.append('qdAutoDone', 'done');
        return this.redirect(callbackURL.href);
    }

    const user = {
        id: (req.cookies && req.cookies.qdautoid) || uuidv4(),
        displayName: (req.cookies && req.cookies.qdautoname) || generateName(),
    };

    this._verify(null, null, user, (err, user, info) => {
        if (err) {
            return this.error(err);
        }
        if (!user) {
            return this.fail(info);
        }

        info = info || {};

        this.success(user, info);
    });
};

module.exports = Strategy;
