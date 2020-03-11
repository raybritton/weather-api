require('dotenv').config();

const util = require('util');
const sprintf = require('sprintf-js').sprintf;
const express = require('express');
const hbs = require('express-hbs');
const app = express();
const darksky = require("./controllers/darksky");
const basicAuth = require('express-basic-auth');
const rateLimit = require("express-rate-limit");

global.SERVER_HOST = process.env.HOSTNAME || 'localhost';
global.SERVER_PORT = process.env.PORT || '3001';
global.LOG = process.env.LOG_DIR;

if (LOG) {
    const opts = {
        errorEventName:'error',
            logDirectory: LOG, // NOTE: folder must exist and be writable...
            fileNamePattern:'status-api-<DATE>.log',
            dateFormat:'YYYY.MM.DD'
    };
    GLOBAL.LOGGER = require('simple-node-logger').createRollingFileLogger( opts );
}

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    onLimitReached: function(req, res, options) {
        if (LOG) {
            LOGGER.warn("Rate limited " + req.ip);
        }
    }
});

app.use(limiter);

app.engine('hbs', hbs.express4({
    partialsDir: __dirname + '/views/partials',
    defaultLayout: __dirname + '/views/layout.hbs'
}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
app.use(express.static('public'));
require("./hbs-ext").setup(hbs);

app.get("/alive", (req, res) => {
    res.sendStatus(200);
});

app.use("/weather", basicAuth({
    users: { 'weather': 'password' },
    challenge: true,
    realm: "weather"
}),
    (req, res) => {
        const data = darksky.getForLatLng();
        res.render('weather', {
            title: "Weather",
            today: JSON.stringify(data.todaySimple.map((hour) => hour.temp)),
            yesterday: JSON.stringify(data.yesterday.map((hour) => hour.temp)),
            tomorrow: JSON.stringify(data.tomorrow.map((hour) => hour.temp)),
            todayRain: JSON.stringify(data.todaySimple.map((hour) => hour.rainIntensity > 0.1)),
            yesterdayRain: JSON.stringify(data.yesterday.map((hour) => hour.rainIntensity > 0.1)),
            tomorrowRain: JSON.stringify(data.tomorrow.map((hour) => hour.rainIntensity > 0.1))
        });
    });

app.use("/", require("./routes/api"));

app.use(function (err, req, res, next) {
    if (res.headersSent) {
        return next(err)
    }
    res.status(err.status || 500).send({ 'error': util.inspect(err) });
});

app.listen(SERVER_PORT, SERVER_HOST);

console.log(sprintf('Weather API started at %s listening on %s:%s', new Date().toISOString(), SERVER_HOST, SERVER_PORT));