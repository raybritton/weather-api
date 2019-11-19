require('dotenv').config();
const request = require('request');
const db = require("./db");

const API_KEY = process.env.DARKSKY;
const MAX_LOCATIONS = parseInt(process.env.MAX_LOCATIONS);

var toMonitor = [];
var cache = {};

module.exports.getForLatLng = function (lat, lng, v2) {
    var key 
    if (v2) {
        key = makeKeyV2(lat, lng);
    } else {
        key = makeKey(lat, lng);
    }

    if (cache[key] == undefined || cache[key].yesterday.length < 24) {
        if (toMonitor.length + cache.length > MAX_LOCATIONS) {
            return "Too many locations monitored";
        }
        toMonitor.push(key);
        return "Gathering data";
    }

    return cache[key];
}

function makeKey(lat, lng) {
    return `${trimTo100Km(lat)},${trimTo100Km(lng)}`; 
}

function makeKeyV2(lat, lng) {
    return `${trimTo10Km(lat)},${trimTo10Km(lng)}`; 
}

function trimTo100Km(str) {
    const idx = str.indexOf('.');
    if (idx > 0) {
        return str.substr(0, idx);
    } else {
        return str;
    }
}

function trimTo10Km(str) {
    const idx = str.indexOf('.');
    if (idx > 0) {
        return str.substr(0, idx + 2); 
    } else {
        return str;
    }
}

function updateData() {
    toMonitor.forEach((key) => update(key));
    toMonitor = [];
    Object.keys(cache).forEach((key) => update(key));
}

function update(key) {
    request(`https://api.darksky.net/forecast/${API_KEY}/${key}?exclude=flags,alerts,daily,minutely&units=si`, (err, resp, body) => {
        if (err) {
            console.error("Failed to update " + key);
            console.error(err);
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const day = dayOfYear(now);
            const hour = now.getHours();
            const weatherData = JSON.parse(body);
            db.insertRecord(key, year, day, hour, Math.round(weatherData.currently.temperature), weatherData.currently.icon, weatherData.currently.precipIntensity > 0)
            if (cache[key] == undefined) {
                cache[key] = {
                    yesterday: {},
                    prediction: formatPredication(weatherData.hourly)
                };
            } else {
                cache[key].prediction = formatPredication(weatherData.hourly);
            }
        }
    });
}

function formatPredication(hourly) {
    const now = new Date();
    now.setDate(now.getDate() + 1);
    const year = now.getFullYear();
    const day = dayOfYear(now);
    return hourly.data
        .filter((data) => {
            const date = new Date(data.time);
            return date.getFullYear() == year && dayOfYear(date) == day;
        })
        .map((data) => {
            const date = new Date(data.time);
            return {
                hour: date.getHours(),
                temp: Math.round(data.temperature),
                icon: data.icon,
                rain: data.precipIntensity > 0 && precipProbability > 0
            };
        });
}

function dayOfYear(target) {
    const start = new Date(target.getFullYear(), 0, 0);
    const diff = (target - start) + ((start.getTimezoneOffset() - target.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function msToNextHour() {
    const now = new Date();
    var target = new Date();
    target.setMinutes(1);
    target.setHours(target.getHours() + 1);
    return target.getTime() - now.getTime();
}

db.getKeys((err, keys) => {
    if (err) {
        console.log("Failed to read keys");
        console.error(err);
    } else {
        const now = new Date();
        now.setDate(now.getDate() - 1);
        const year = now.getFullYear();
        const day = dayOfYear(now);
        keys.forEach((key) => {
            db.getDay(key, year, day, (err, yesterday) => {
                if (err) {
                    console.log("Failed to read yesterday for " + key);
                    console.error(err);
                } else {
                    cache[key] = {
                        yesterday: yesterday,
                        prediction: []
                    };
                }
            });
        });
    }
})

setTimeout(() => {
    updateData();
    setInterval(updateData, 60 * 60 * 1000);  //one hour
}, 10000);// msToNextHour());