/* ============================================================
   ANIME HAVEN — Express Backend Server
   ============================================================ */

const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Middleware ----
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (HTML, CSS, JS, images)
app.use(express.static(path.join(__dirname)));

// ---- Data Helpers ----
const DATA_DIR = path.join(__dirname, 'data');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filename) {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

function writeJSON(filename, data) {
  ensureDataDir();
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf-8');
}

// ---- In-memory session store ----
// Maps token -> { userId, email, createdAt }
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

// ============================================================
// AUTH ROUTES
// ============================================================

// POST /api/auth/signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const users = readJSON('users.json');

    // Check if user already exists
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password and save
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      favourites: [],
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON('users.json', users);

    // Create session
    const token = uuidv4();
    sessions.set(token, { userId: newUser.id, email: newUser.email, createdAt: Date.now() });

    res.status(201).json({
      message: 'Account created successfully!',
      token,
      user: { id: newUser.id, email: newUser.email }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/signin
app.post('/api/auth/signin', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = readJSON('users.json');
    const user = users.find(u => u.email === email.toLowerCase().trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // Create session
    const token = uuidv4();
    sessions.set(token, { userId: user.id, email: user.email, createdAt: Date.now() });

    res.json({
      message: 'Welcome back!',
      token,
      user: { id: user.id, email: user.email }
    });
  } catch (err) {
    console.error('Signin error:', err);
    res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// POST /api/auth/signout
app.post('/api/auth/signout', authenticate, (req, res) => {
  sessions.delete(req.token);
  res.json({ message: 'Signed out successfully.' });
});

// GET /api/auth/me — Check current session
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({ user: { userId: req.user.userId, email: req.user.email } });
});

// ============================================================
// FAVOURITES ROUTES
// ============================================================

// GET /api/favourites
app.get('/api/favourites', authenticate, (req, res) => {
  const users = readJSON('users.json');
  const user = users.find(u => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ favourites: user.favourites || [] });
});

// POST /api/favourites — Add a favourite
app.post('/api/favourites', authenticate, (req, res) => {
  const { animeId, title } = req.body;
  if (!animeId) return res.status(400).json({ error: 'animeId is required.' });

  const users = readJSON('users.json');
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found.' });

  if (!users[userIndex].favourites) users[userIndex].favourites = [];

  // Check if already added
  if (users[userIndex].favourites.find(f => f.animeId === animeId)) {
    return res.json({ message: 'Already in favourites!', favourites: users[userIndex].favourites });
  }

  users[userIndex].favourites.push({ animeId, title: title || animeId, addedAt: new Date().toISOString() });
  writeJSON('users.json', users);

  res.json({ message: `${title || animeId} added to favourites!`, favourites: users[userIndex].favourites });
});

// DELETE /api/favourites/:animeId — Remove a favourite
app.delete('/api/favourites/:animeId', authenticate, (req, res) => {
  const { animeId } = req.params;
  const users = readJSON('users.json');
  const userIndex = users.findIndex(u => u.id === req.user.userId);
  if (userIndex === -1) return res.status(404).json({ error: 'User not found.' });

  users[userIndex].favourites = (users[userIndex].favourites || []).filter(f => f.animeId !== animeId);
  writeJSON('users.json', users);

  res.json({ message: 'Removed from favourites.', favourites: users[userIndex].favourites });
});

// ============================================================
// CONTACT ROUTE
// ============================================================

// POST /api/contact
app.post('/api/contact', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Name, email, and message are required.' });
  }

  const messages = readJSON('messages.json');
  messages.push({
    id: uuidv4(),
    name,
    email,
    message,
    createdAt: new Date().toISOString()
  });
  writeJSON('messages.json', messages);

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
app.listen(PORT, () => {
  ensureDataDir();
  console.log(`
  ╔══════════════════════════════════════════╗
  ║   🌸 Anime Haven Server is running!     ║
  ║   → http://localhost:${PORT}               ║
  ╚══════════════════════════════════════════╝
  `);
});
