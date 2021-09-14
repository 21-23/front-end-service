const express = require('express');

const v1 = require('./v1');

const apiRouter = express.Router();

apiRouter.use('/v1', v1.router);
apiRouter.get('/health', (req, res) => {
    return res.status(200).json({ status: 'ok' });
});

exports.router = apiRouter;
