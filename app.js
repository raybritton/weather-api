require('dotenv').config();

const util = require('util');
const sprintf = require('sprintf-js').sprintf;
const express = require('express');
const app = express();

global.SERVER_HOST = process.env.HOSTNAME || 'localhost';
global.SERVER_PORT = process.env.PORT || '3001';

app.get("/alive", (req, res) => {
    res.sendStatus(500);
});

app.use("/", require("./routes/api"));

app.use(function(err, req, res, next) {
    if (res.headersSent) {
        return next(err)
    }
	res.status(err.status || 500).send({'error': util.inspect(err)});
});

app.listen(SERVER_PORT, SERVER_HOST);

console.log(sprintf('Weather API started at %s listening on %s:%s', new Date().toISOString(), SERVER_HOST, SERVER_PORT));