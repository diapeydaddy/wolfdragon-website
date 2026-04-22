require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Initialize DB tables
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL,
        track_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS game_scores (
        id SERIAL PRIMARY KEY,
        player_name VARCHAR(100),
        score INTEGER NOT NULL,
        level_reached INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);
    console.log('✅ Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
}

// --- API Routes ---

// GET all tracks
app.get('/api/tracks', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM tracks ORDER BY track_order ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a track (admin use)
app.post('/api/tracks', async (req, res) => {
  const { title, filename, track_order } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO tracks (title, filename, track_order) VALUES ($1, $2, $3) RETURNING *',
      [title, filename, track_order || 0]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET leaderboard
app.get('/api/scores', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM game_scores ORDER BY score DESC LIMIT 10'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a score
app.post('/api/scores', async (req, res) => {
  const { player_name, score, level_reached } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO game_scores (player_name, score, level_reached) VALUES ($1, $2, $3) RETURNING *',
      [player_name || 'Anonymous', score, level_reached]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve index for all other routes (SPA fallback)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🐺🐉 Wolfdragon server running on port ${PORT}`);
  });
});
