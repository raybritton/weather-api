require('dotenv').config();

const util = require('util');
const sprintf = require('sprintf-js').sprintf;
const express = require('express');
const hbs = require('express-hbs');
const app = express();
const darksky = require("./controllers/darksky");
const basicAuth = require('express-basic-auth')

global.SERVER_HOST = process.env.HOSTNAME || 'localhost';
global.SERVER_PORT = process.env.PORT || '3001';

app.engine('hbs', hbs.express4({
    partialsDir: __dirname + '/views/partials',
    defaultLayout: __dirname + '/views/layout.hbs'
}));
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');
app.use(express.static('public'));
require("./hbs-ext").setup(hbs);

app.get("/alive", (req, res) => {
    res.sendStatus(500);
});

app.use("/weather", basicAuth({
    users: { 'weather': 'password' },
    challenge: true,
    realm: "weather"
}),
    (req, res) => {
        const data = darksky.getForLatLng();
        const todayPast = data.today.history;
        const todayFuture = data.today.prediction.slice(1);
        res.render('weather', {
            title: "Weather",
            today: JSON.stringify(todayPast.concat(todayFuture).map((hour) => hour.temp)),
            yesterday: JSON.stringify(data.yesterday.map((hour) => hour.temp))
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