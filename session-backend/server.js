const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  user: process.env.DB_USER || 'grok2user',
  password: process.env.DB_PASSWORD || 'grok2password',
  database: process.env.DB_NAME || 'grok2sessions',
});

async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        session_id INTEGER REFERENCES sessions(id) ON DELETE CASCADE,
        role VARCHAR(50) NOT NULL,
        content TEXT,
        thinking TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log('Database initialized successfully');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
  }
}

// Ensure DB is initialized before accepting requests
initDB().catch(console.error);

// GET /sessions?type=...
app.get('/sessions', async (req, res) => {
  try {
    const { type } = req.query;
    let query = 'SELECT * FROM sessions';
    let params = [];
    if (type) {
      query += ' WHERE type = $1';
      params.push(type);
    }
    query += ' ORDER BY updated_at DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /sessions
app.post('/sessions', async (req, res) => {
  try {
    const { type, title } = req.body;
    if (!type || !title) {
      return res.status(400).json({ error: 'type and title are required' });
    }
    const result = await pool.query(
      'INSERT INTO sessions (type, title) VALUES ($1, $2) RETURNING *',
      [type, title]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /sessions/:id
app.delete('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /sessions/:id
app.put('/sessions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }
    const result = await pool.query(
      'UPDATE sessions SET title = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [title, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /sessions/:id/messages
app.get('/sessions/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'SELECT * FROM messages WHERE session_id = $1 ORDER BY created_at ASC',
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /sessions/:id/messages
app.post('/sessions/:id/messages', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, content, thinking, image_url } = req.body;
    if (!role) {
      return res.status(400).json({ error: 'role is required' });
    }
    
    // Update session updated_at
    await pool.query('UPDATE sessions SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    
    const result = await pool.query(
      'INSERT INTO messages (session_id, role, content, thinking, image_url) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, role, content, thinking, image_url]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /sessions/:sessionId/messages/:messageId
app.delete('/sessions/:sessionId/messages/:messageId', async (req, res) => {
  try {
    const { sessionId, messageId } = req.params;
    await pool.query('DELETE FROM messages WHERE id = $1 AND session_id = $2', [messageId, sessionId]);
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Session backend running on port ${port}`);
});
