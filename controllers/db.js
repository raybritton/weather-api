require('dotenv').config();
const sqlite = require('sqlite3').verbose();
const fs = require('fs');

const DB_FILE = process.env.DB_FILE;

const DB = new sqlite.Database(DB_FILE, (err) => {
  if (err) {
      console.log('Could not connect to database', err)
  }

  DB.get('PRAGMA user_version', function(err, row) {
      var version = row.user_version;
      console.log("DB ver: " + version);
      if (version == 0) {
          const sql = fs.readFileSync('./sql/setup.sql').toString();
          DB.exec(sql);
      } else {

      }

      DB.exec("PRAGMA user_version = 1");
  });
});

module.exports.insertRecord = function(year, day, hour, data) {
  DB.run("REPLACE INTO weather (year, day, hour, temp, icon, rain, windSpeed) VALUES (?,?,?,?,?,?,?)", [year, day, hour, data.temp, data.icon, data.rain, data.windSpeed], (err) => {
    if (err) {
      console.log(`Error writing (${year}, ${day}, ${hour}, ${data.temp}, ${data.icon}, ${data.rain}, ${data.windSpeed}): ${err}`);
    }
  });
};

module.exports.getDay = function(year, day, callback) {
  DB.all("SELECT * FROM weather WHERE year = ? AND day = ?", [year, day], (err, rows) => {
    if (err) {
      callback(err);
    } else {
      callback(null, rows.map((row) => {
        return {
          hour: row.hour,
          temp: row.temp,
          icon: row.icon,
          rain: row.rain == 1,
          windSpeed: row.windSpeed
        };
      }));
    }
  });
};