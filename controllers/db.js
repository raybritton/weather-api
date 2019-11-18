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

module.exports.insertRecord = function(key, year, day, hour, temp, icon, raining) {
  DB.run("REPLACE INTO weather (key, year, day, hour, temp, icon, rain) VALUES (?,?,?,?,?,?,?)", [key, year, day, hour, temp, icon, raining], (err) => {
    if (err) {
      console.log(`Error writing (${key}, ${year}, ${day}, ${hour}, ${temp}, ${icon}, ${raining}): ${err}`);
    }
  });
}

module.exports.getKeys = function(callback) {
  DB.all("SELECT DISTINCT key FROM weather", (err, rows) => {
    if (err) {
      callback(err);
    } else {
      callback(null, rows.map((row) => row.key));
    }
  });
}

module.exports.getDay = function(key, year, day, callback) {
  DB.all("SELECT * FROM weather WHERE key = ? AND year = ? AND day = ?", [key, year, day], (err, rows) => {
    if (err) {
      callback(err);
    } else {
      callback(null, rows.map((row) => {
        return {
          hour: row.hour,
          temp: row.temp,
          icon: row.icon,
          rain: row.rain == 1
        };
      }));
    }
  });
}