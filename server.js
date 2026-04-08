/* ============================================================
   ANIME HAVEN — Express Backend Server
   ============================================================ */

const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const { OAuth2Client } = require('google-auth-library');
const { getDB, initDB } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// Google Auth Client
// Replace 'YOUR_GOOGLE_CLIENT_ID' with your actual Google OAuth Client ID
// Get it from: https://console.cloud.google.com/apis/credentials
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID'; // Replace this later
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// ---- In-memory session store ----
// Maps token -> { userId, email, role, createdAt }
const sessions = new Map();

function authenticate(req, res, next) {
  const token = req.headers['authorization']?.replace('Bearer ', '');
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Not authenticated. Please sign in.' });
  }
  req.user = sessions.get(token);
  req.token = token;
  next();
}

function authenticateContributor(req, res, next) {
  authenticate(req, res, () => {
    if (req.user.role !== 'contributor') {
      return res.status(403).json({ error: 'Access denied. Contributors only.' });
    }
    next();
  });
}

// ============================================================
// AUTH ROUTES
// ============================================================

app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Valid email and password (min 6 chars) are required.' });
    }
    
    const db = await getDB();
    const existing = await db.get('SELECT * FROM users WHERE email = ?', email.toLowerCase().trim());
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    await db.run('INSERT INTO users (id, email, password) VALUES (?, ?, ?)', [userId, email.toLowerCase().trim(), hashedPassword]);

    const token = uuidv4();
    sessions.set(token, { userId, email: email.toLowerCase().trim(), role: 'normal', createdAt: Date.now() });

    res.status(201).json({ message: 'Account created!', token, user: { id: userId, email, role: 'normal' } });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;
    const db = await getDB();
    const user = await db.get('SELECT * FROM users WHERE email = ?', email?.toLowerCase().trim());

    if (!user || !(await bcrypt.compare(password, user.password || ''))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = uuidv4();
    sessions.set(token, { userId: user.id, email: user.email, role: user.role, createdAt: Date.now() });

    res.json({ message: 'Welcome back!', token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/google', async (req, res) => {
  try {
    const { credential } = req.body;
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: GOOGLE_CLIENT_ID });
      payload = ticket.getPayload();
    } catch {
      // NOTE: In development without a real client ID, we mock or fail. For production it must be valid.
      console.warn("Google verify failed, check CLIENT_ID");
      return res.status(401).json({ error: 'Invalid Google credential.' });
    }

    const { email, sub: google_id } = payload;
    const db = await getDB();
    let user = await db.get('SELECT * FROM users WHERE email = ?', email);

    if (!user) {
      const userId = uuidv4();
      await db.run('INSERT INTO users (id, email, google_id) VALUES (?, ?, ?)', [userId, email, google_id]);
      user = { id: userId, email, role: 'normal' };
    } else if (!user.google_id) {
      await db.run('UPDATE users SET google_id = ? WHERE email = ?', [google_id, email]);
    }

    const token = uuidv4();
    sessions.set(token, { userId: user.id, email: user.email, role: user.role, createdAt: Date.now() });

    res.json({ message: 'Signed in with Google!', token, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Google Auth Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/signout', authenticate, (req, res) => {
  sessions.delete(req.token);
  res.json({ message: 'Signed out successfully.' });
});

app.get('/api/auth/me', authenticate, async (req, res) => {
  res.json({ user: req.user });
});

// ============================================================
// CONTRIBUTOR ROUTES
// ============================================================
const allowedTables = ['shonen', 'shojo', 'seinen', 'josei', 'kodomomuke'];

app.post('/api/animes/:category', authenticateContributor, async (req, res) => {
  try {
    const { category } = req.params;
    if (!allowedTables.includes(category)) return res.status(400).json({ error: 'Invalid anime category.' });

    const { title, author, video_url, photo_url, tags } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required.' });

    const id = uuidv4();
    const db = await getDB();
    await db.run(`INSERT INTO ${category} (id, title, author, video_url, photo_url, tags) VALUES (?, ?, ?, ?, ?, ?)`, 
      [id, title, author, video_url, photo_url, tags]);

    res.status(201).json({ message: 'Anime added successfully!', id });
  } catch (err) {
    console.error('Add anime error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// SEARCH & FETCH ROUTES
// ============================================================

app.get('/api/search', async (req, res) => {
  try {
    const { query, tag } = req.query;
    const db = await getDB();
    
    // Build union query across all tables
    let unionTables = allowedTables.map(t => 
      `SELECT id, title, author, video_url, photo_url, tags, created_at, '${t}' as category FROM ${t}`
    ).join(' UNION ALL ');

    let sql = `SELECT * FROM (${unionTables}) WHERE 1=1`;
    const params = [];

    if (query) {
      sql += ` AND title LIKE ?`;
      params.push(`%${query}%`);
    }
    if (tag) {
      sql += ` AND tags LIKE ?`;
      params.push(`%${tag}%`);
    }

    const results = await db.all(sql, params);
    res.json({ results });
  } catch (err) {
    console.error("Search Error", err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/animes/:category', async (req, res) => {
  try {
    const { category } = req.params;
    if (!allowedTables.includes(category)) return res.status(400).json({ error: 'Invalid anime category.' });
    
    const db = await getDB();
    const results = await db.all(`SELECT * FROM ${category} ORDER BY created_at DESC`);
    res.json({ animes: results });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// FAVOURITES & LAST WATCHED ROUTES
// ============================================================

app.get('/api/favourites', authenticate, async (req, res) => {
  try {
    const db = await getDB();
    const favs = await db.all('SELECT * FROM favourites WHERE user_id = ? ORDER BY added_at DESC', req.user.userId);
    res.json({ favourites: favs });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/favourites', authenticate, async (req, res) => {
  try {
    const { anime_id, category, title } = req.body;
    if (!anime_id || !category) return res.status(400).json({ error: 'anime_id and category are required.' });

    const db = await getDB();
    await db.run('INSERT OR IGNORE INTO favourites (user_id, anime_id, category, title) VALUES (?, ?, ?, ?)', 
      [req.user.userId, anime_id, category, title]);
      
    res.json({ message: 'Added to favourites!' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/favourites/:category/:anime_id', authenticate, async (req, res) => {
  try {
    const { anime_id, category } = req.params;
    const db = await getDB();
    await db.run('DELETE FROM favourites WHERE user_id = ? AND anime_id = ? AND category = ?', [req.user.userId, anime_id, category]);
    res.json({ message: 'Removed from favourites.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/last_watched', authenticate, async (req, res) => {
  try {
    const { anime_id, category, title } = req.body;
    const db = await getDB();
    // Replace if exists (timestamp updates)
    await db.run('INSERT OR REPLACE INTO last_watched (user_id, anime_id, category, title, timestamp) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)', 
      [req.user.userId, anime_id, category, title]);
    res.json({ message: 'Last watched updated.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/last_watched', authenticate, async (req, res) => {
  try {
    const db = await getDB();
    const watched = await db.all('SELECT * FROM last_watched WHERE user_id = ? ORDER BY timestamp DESC LIMIT 20', req.user.userId);
    res.json({ last_watched: watched });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// CONTRIBUTOR REQUEST ROUTES
// ============================================================

app.post('/api/contributor-request', authenticate, async (req, res) => {
  try {
    // Check if user already has a pending or approved request
    const db = await getDB();
    const existing = await db.get('SELECT * FROM contributor_requests WHERE user_id = ? AND status IN (?, ?)', 
      [req.user.userId, 'pending', 'approved']);
    
    if (existing) {
      if (existing.status === 'approved') {
        return res.status(400).json({ error: 'You are already a contributor!' });
      }
      return res.status(400).json({ error: 'You already have a pending request.' });
    }

    const requestId = uuidv4();
    await db.run('INSERT INTO contributor_requests (id, user_id, email) VALUES (?, ?, ?)', 
      [requestId, req.user.userId, req.user.email]);

    res.json({ message: 'Contributor request submitted successfully!' });
  } catch (err) {
    console.error('Contributor request error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============================================================
// CONTACT ROUTE
// ============================================================

app.post('/api/contact', async (req, res) => {
  const { name, email, message } = req.body;
  res.json({ message: 'Thank you! Your message has been received.' });
});

// ============================================================
// FALLBACK — Serve index.html for unknown routes
// ============================================================
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// ============================================================
// START SERVER
// ============================================================
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════╗
    ║   🌸 Anime Haven Server is running!     ║
    ║   → http://localhost:${PORT}               ║
    ╚══════════════════════════════════════════╝
    `);
  });
}).catch(err => {
  console.error("Failed to initialize database", err);
});
