require('dotenv').config();
const request = require('request');
const db = require("./db");
const fs = require("fs");

const JSON_DIR = process.env.WEATHER_JSON;
const API_KEY = process.env.DARKSKY;
const LAT = process.env.LATITUDE;
const LNG = process.env.LONGITUDE;

var cache = [];
var todaysCache = {};
var todayPrediction = [];
var tomorrowPrediction = [];
var lastUpdated = null;
var nextUpdate = null;

module.exports.getForLatLng = function () {
    return {
        yesterday: cache,
        today: {
            history: Object.values(todaysCache),
            prediction: todayPrediction
        },
        todaySimple: Object.values(todaysCache).concat(todayPrediction.slice(1)),
        tomorrow: tomorrowPrediction,
        lastUpdated: lastUpdated,
        nextUpdateAt: nextUpdate
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
            const year = now.getUTCFullYear();
            const day = dayOfYear(now);
            const hour = now.getUTCHours();
            const weatherData = JSON.parse(body);
            fs.writeFile(`${JSON_DIR}/${makeFileName(now)}`, body, (err) => {
                if (err) {
                    console.error(`Failed to write ${makeFileName(now)}`);
                    console.error(err);
                }
             });
            const data = {
                hour: hour,
                temp: Math.round(weatherData.currently.temperature),
                icon: weatherData.currently.icon,
                rainIntensity: weatherData.currently.precipIntensity,
                windSpeed: Math.round(weatherData.currently.windSpeed)
            };
            db.insertRecord(year, day, hour, data);
            todayPrediction = formatPredication(weatherData.hourly, false);
            tomorrowPrediction = formatPredication(weatherData.hourly, true);
            lastUpdated = now;
            todaysCache[hour] = (data);
            if (hour >= 23) {
                cache = Object.values(todaysCache);
                todaysCache = [];
            }
            nextUpdate = new Date();
        nextUpdate.setUTCMinutes(nextUpdate.getUTCMinutes() + 60);
        nextUpdate.setUTCMinutes(1);
        }
    });
}

function makeFileName(date) {
    return `${date.getUTCFullYear()}_${date.getUTCMonth()}_${date.getUTCDate()}_${date.getUTCHours()}.json`
}

function formatPredication(hourly, tomorrow) {
    const now = new Date();
    if (tomorrow) {
        now.setUTCDate(now.getUTCDate() + 1);
    }
    const year = now.getUTCFullYear();
    const day = dayOfYear(now);
    return hourly.data
        .filter((data) => {
            const date = new Date(data.time * 1000);
            return date.getUTCFullYear() == year && dayOfYear(date) == day;
        })
        .map((data) => {
            const date = new Date(data.time * 1000);
            return {
                hour: date.getUTCHours(),
                temp: Math.round(data.temperature),
                icon: data.icon,
                rainIntensity: data.precipIntensity,
                windSpeed: Math.round(data.windSpeed)
            };
        });
}

function dayOfYear(target) {
    const start = new Date(target.getUTCFullYear(), 0, 0);
    const diff = (target - start) + ((start.getTimezoneOffset() - target.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
}

function loadCache() {
    var yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    var year = yesterday.getUTCFullYear();
    var day = dayOfYear(yesterday);
    db.getDay(year, day, (err, yesterdayData) => {
        if (err) {
            console.log("Failed to read yesterday");
            console.error(err);
        } else {
            cache = yesterdayData.map((datum) => {
                datum.windSpeed = Math.round(datum.windSpeed);
                return datum;
            });
        }
    });

    var now = new Date();
    var year = now.getUTCFullYear();
    var day = dayOfYear(now);
    db.getDay(year, day, (err, todayData) => {
        if (err) {
            console.log("Failed to read today");
            console.error(err);
        } else {
            todaysCache = {};
            todayData.forEach((datum) => {
                datum.windSpeed = Math.round(datum.windSpeed);
                todaysCache[datum.hour] = datum;
            });
        }
    });
}

function msToNextHour() {
    const now = new Date();
    var target = new Date();
    target.setUTCSeconds(0);
    target.setUTCMinutes(1);
    target.setUTCHours(target.getUTCHours() + 1);
    return target.getTime() - now.getTime();
}

const refreshIn = msToNextHour();
nextUpdate = new Date();
nextUpdate.setTime(nextUpdate.getTime() + refreshIn);
loadCache();
updateData();
setTimeout(() => {
    updateData();
    setInterval(updateData, 60 * 60 * 1000);  //one hour
}, refreshIn);

console.log("Updating in " + Math.ceil(refreshIn/1000/60) + " mins")
