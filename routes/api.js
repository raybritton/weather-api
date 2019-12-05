require('dotenv').config();
const express = require("express");
const fs = require('fs');
const router = express.Router();
const darksky = require("../controllers/darksky");

var config = {};

const validateApikey = function (req, res, next) {
  if (config.apikeys.includes(req.query["key"])) {
    next();
  } else {
    res.sendStatus(401);
  }
};

router.get("/reload", (req, res) => {
  if (req.query.key == process.env.RELOAD_KEY) {
    loadConfig();
    res.sendStatus(200);
  }
});

router.get('/v2/weather', validateApikey, (req, res) => {
  const data = darksky.getForLatLng();

  const updateAt = new Date(data.nextUpdateAt);
  updateAt.setMinutes(updateAt.getMinutes() + 1);

  const seconds = (new Date().getTime() - updateAt.getTime()) / 1000

  res
    .header("Cache-Control", "public, max-age=" + seconds)
    .header("Expires", updateAt.toISOString())
    .header("Last-Modified", new Date(data.lastUpdated).toGMTString())
    .send(data);
});

router.get('/v1/weather', validateApikey, (req, res) => {
  const data = darksky.getForLatLng();
  res.send(data);
});

function loadConfig() {
  config = JSON.parse(fs.readFileSync(process.env.CONFIG).toString());
}

loadConfig();

module.exports = router;