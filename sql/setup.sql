CREATE TABLE IF NOT EXISTS weather(id INTEGER PRIMARY KEY AUTOINCREMENT, key TEXT, year INTEGER, day INTEGER, hour INTEGER, temp INTEGER, rain BOOLEAN, icon TEXT);
CREATE UNIQUE INDEX IF NOT EXISTS once_per_timeslot ON weather (year, day, hour);