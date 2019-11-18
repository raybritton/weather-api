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

router.get('/weather/:lat/:lng', validateApikey, (req, res) => {
  const lat = req.params.lat;
  const lng = req.params.lng;

  const data = darksky.getForLatLng(lat, lng);
  if (typeof data == "string") {
    res.status(200).send({
      message: data
    });
  } else {
    res.send(data);
  }
});

function loadConfig() {
  config = JSON.parse(fs.readFileSync(process.env.CONFIG).toString());
}

loadConfig();

module.exports = router;