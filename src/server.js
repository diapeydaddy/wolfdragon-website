require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 3000;

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Multer — memory storage only
const upload = multer({ storage: multer.memoryStorage() });

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../public')));

// ── Initialize DB tables ──────────────────────────────────────────────────────
async function initDB() {
  try {
    // Core tables
    await pool.query(`
      CREATE TABLE IF NOT EXISTS tracks (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        filename VARCHAR(255) NOT NULL DEFAULT '',
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

      CREATE TABLE IF NOT EXISTS albums (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL DEFAULT 'New Album',
        year INTEGER,
        cover_data TEXT,
        is_featured BOOLEAN DEFAULT FALSE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audio_files (
        id SERIAL PRIMARY KEY,
        original_name TEXT NOT NULL,
        mime_type TEXT NOT NULL DEFAULT 'audio/mpeg',
        data BYTEA NOT NULL,
        size INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Add album_id to tracks if missing
    try {
      await pool.query(`ALTER TABLE tracks ADD COLUMN album_id INTEGER REFERENCES albums(id) ON DELETE SET NULL`);
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('album_id column:', e.message);
    }

    // Add audio_file_id to tracks if missing
    try {
      await pool.query(`ALTER TABLE tracks ADD COLUMN audio_file_id INTEGER REFERENCES audio_files(id) ON DELETE SET NULL`);
    } catch (e) {
      if (!e.message.includes('already exists')) console.log('audio_file_id column:', e.message);
    }

    // Subscribers table for key persistence
    await pool.query(`
      CREATE TABLE IF NOT EXISTS subscribers (
        id         SERIAL PRIMARY KEY,
        email      VARCHAR(255) NOT NULL UNIQUE,
        keys       JSONB        NOT NULL DEFAULT '{}',
        created_at TIMESTAMP    DEFAULT NOW()
      );
    `);

    console.log('✅ Database initialized');
  } catch (err) {
    console.error('DB init error:', err.message);
  }
}

// ── API Routes ────────────────────────────────────────────────────────────────

// GET all tracks (legacy)
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
  const { title, filename, track_order, album_id, audio_file_id } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO tracks (title, filename, track_order, album_id, audio_file_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [title, filename || '', track_order || 0, album_id || null, audio_file_id || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update a track
app.put('/api/tracks/:id', async (req, res) => {
  const { title, track_order, album_id } = req.body;
  try {
    const result = await pool.query(
      `UPDATE tracks SET title = COALESCE($1, title),
                         track_order = COALESCE($2, track_order),
                         album_id = $3
       WHERE id = $4 RETURNING *`,
      [title, track_order, album_id !== undefined ? album_id : null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Track not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a track
app.delete('/api/tracks/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM tracks WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all albums with nested tracks
app.get('/api/albums', async (req, res) => {
  try {
    const albumsResult = await pool.query(
      `SELECT * FROM albums ORDER BY is_featured DESC, sort_order ASC, id ASC`
    );
    const tracksResult = await pool.query(
      `SELECT * FROM tracks ORDER BY track_order ASC`
    );
    const albums = albumsResult.rows.map(album => ({
      ...album,
      tracks: tracksResult.rows.filter(t => t.album_id === album.id),
    }));
    res.json(albums);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create album
app.post('/api/albums', async (req, res) => {
  const { title, year, cover_data, is_featured } = req.body;
  try {
    if (is_featured) {
      await pool.query('UPDATE albums SET is_featured = FALSE');
    }
    const result = await pool.query(
      `INSERT INTO albums (title, year, cover_data, is_featured)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [title || 'New Album', year || null, cover_data || null, !!is_featured]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update album
app.put('/api/albums/:id', async (req, res) => {
  const { title, year, cover_data, is_featured, sort_order } = req.body;
  try {
    if (is_featured) {
      await pool.query('UPDATE albums SET is_featured = FALSE');
    }
    const result = await pool.query(
      `UPDATE albums SET
        title      = COALESCE($1, title),
        year       = COALESCE($2, year),
        cover_data = COALESCE($3, cover_data),
        is_featured = COALESCE($4, is_featured),
        sort_order = COALESCE($5, sort_order)
       WHERE id = $6 RETURNING *`,
      [title, year, cover_data, is_featured, sort_order, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Album not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT feature an album
app.put('/api/albums/:id/feature', async (req, res) => {
  try {
    await pool.query('UPDATE albums SET is_featured = FALSE');
    const result = await pool.query(
      'UPDATE albums SET is_featured = TRUE WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Album not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE album
app.delete('/api/albums/:id', async (req, res) => {
  try {
    await pool.query('UPDATE tracks SET album_id = NULL WHERE album_id = $1', [req.params.id]);
    await pool.query('DELETE FROM albums WHERE id = $1', [req.params.id]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload audio → store in DB as BYTEA
app.post('/api/upload/audio', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = await pool.query(
      `INSERT INTO audio_files (original_name, mime_type, data, size)
       VALUES ($1, $2, $3, $4) RETURNING id, original_name, size`,
      [req.file.originalname, req.file.mimetype, req.file.buffer, req.file.size]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST upload image → return base64 data URL (not stored in DB)
app.post('/api/upload/image', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  res.json({ dataUrl });
});

// GET stream audio with HTTP Range support
app.get('/api/audio/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT original_name, mime_type, data, size FROM audio_files WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Audio not found' });

    const { original_name, mime_type, data, size } = result.rows[0];
    const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
    const totalSize = size || buffer.length;

    const rangeHeader = req.headers.range;
    if (rangeHeader) {
      const parts = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;
      const chunkSize = end - start + 1;

      res.writeHead(206, {
        'Content-Range': `bytes ${start}-${end}/${totalSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunkSize,
        'Content-Type': mime_type,
        'Content-Disposition': `inline; filename="${original_name}"`,
      });
      res.end(buffer.slice(start, end + 1));
    } else {
      res.writeHead(200, {
        'Content-Length': totalSize,
        'Content-Type': mime_type,
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${original_name}"`,
      });
      res.end(buffer);
    }
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

// ── Subscribe: create/update subscriber, grant subscribeKey ───────────────────
app.post('/api/subscribe', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });

  const normalised = email.trim().toLowerCase();
  try {
    // Upsert — existing subscribers keep their keys, new ones get subscribeKey
    const result = await pool.query(
      `INSERT INTO subscribers (email, keys)
       VALUES ($1, '{"subscribeKey":true}'::jsonb)
       ON CONFLICT (email) DO UPDATE
         SET keys = subscribers.keys || '{"subscribeKey":true}'::jsonb
       RETURNING keys`,
      [normalised]
    );
    res.json({ ok: true, keys: result.rows[0].keys });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Auth by email: return stored keys so player can restore progress ──────────
app.post('/api/auth/email', async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'Invalid email' });

  const normalised = email.trim().toLowerCase();
  try {
    const result = await pool.query(
      'SELECT keys FROM subscribers WHERE email = $1',
      [normalised]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json({ ok: true, keys: result.rows[0].keys });
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
