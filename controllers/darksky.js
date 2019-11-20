require('dotenv').config();
const request = require('request');
const db = require("./db");
const fs = require("fs");

const JSON_DIR = process.env.WEATHER_JSON;
const API_KEY = process.env.DARKSKY;
const LAT = process.env.LATITUDE;
const LNG = process.env.LONGITUDE;

var cache = [];
var todaysCache = [];
var today = {};

module.exports.getForLatLng = function () {
    return {
        yesterday: cache,
        todayHistory: todaysCache,
        todayPrediction: today
    };
}

function updateData() {
    update(`${LAT},${LNG}`);
}

function update(key) {
    request(`https://api.darksky.net/forecast/${API_KEY}/${key}?exclude=flags,alerts,daily,minutely&units=si`, (err, resp, body) => {
        if (err) {
            console.error("Failed to update");
            console.error(err);
        } else {
            const now = new Date();
            const year = now.getFullYear();
            const day = dayOfYear(now);
            const hour = now.getHours();
            const weatherData = JSON.parse(body);
            fs.writeFile(`${JSON_DIR}/${makeFileName(now)}`, body, () => { });
            const data = {
                hour: hour,
                temp: Math.round(weatherData.currently.temperature),
                icon: weatherData.currently.icon,
                rain: weatherData.currently.precipIntensity,
                windSpeed: weatherData.currently.windSpeed
            };
            db.insertRecord(year, day, hour, data);
            today.data = formatPredication(weatherData.hourly);
            today.lastUpdated = now;
            todaysCache.push(data);
            if (hour >= 23) {
                cache = todaysCache;
                todaysCache = [];
            }
        }
    });
}

function makeFileName(date) {
    return `${date.getFullYear()}_${date.getMonth()}_${date.getDate()}_${date.getHours()}.json`
}

function formatPredication(hourly) {
    const now = new Date();
    const year = now.getFullYear();
    const day = dayOfYear(now);
    return hourly.data
        .filter((data) => {
            const date = new Date(data.time * 1000);
            return date.getFullYear() == year && dayOfYear(date) == day;
        })
        .map((data) => {
            const date = new Date(data.time * 1000);
            return {
                hour: date.getHours(),
                temp: Math.round(data.temperature),
                icon: data.icon,
                rainIntensity: data.precipIntensity,
                windSpeed: data.windSpeed
            };
        });
}

function dayOfYear(target) {
    const start = new Date(target.getFullYear(), 0, 0);
    const diff = (target - start) + ((start.getTimezoneOffset() - target.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function loadCache() {
    const now = new Date();
    now.setDate(now.getDate() - 1);
    const year = now.getFullYear();
    const day = dayOfYear(now);
    db.getDay(year, day, (err, yesterday) => {
        if (err) {
            console.log("Failed to read yesterday");
            console.error(err);
        } else {
            cache = yesterday;
        }
    });
}

function msToNextHour() {
    const now = new Date();
    var target = new Date();
    target.setMinutes(1);
    target.setHours(target.getHours() + 1);
    return target.getTime() - now.getTime();
}

loadCache();
setTimeout(() => {
    updateData();
    setInterval(updateData, 60 * 60 * 1000);  //one hour
}, msToNextHour());
