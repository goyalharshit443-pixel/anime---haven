const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');
const fs = require('fs');

const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

let dbInstance = null;

async function getDB() {
  if (dbInstance) return dbInstance;
  dbInstance = await open({
    filename: path.join(DATA_DIR, 'database.sqlite'),
    driver: sqlite3.Database
  });
  return dbInstance;
}

async function initDB() {
  const db = await getDB();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT,
      google_id TEXT,
      role TEXT DEFAULT 'normal',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shonen (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      video_url TEXT,
      photo_url TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS shojo (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      video_url TEXT,
      photo_url TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS seinen (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      video_url TEXT,
      photo_url TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS josei (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      video_url TEXT,
      photo_url TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS kodomomuke (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT,
      video_url TEXT,
      photo_url TEXT,
      tags TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS favourites (
      user_id TEXT NOT NULL,
      anime_id TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT,
      added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, anime_id, category),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contributor_requests (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      reviewed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  console.log('Database initialized successfully.');
}

module.exports = { getDB, initDB };
