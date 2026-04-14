const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const app = express();
const bodyParser = require('body-parser');
const JWT_SECRET = 'your-very-secret-key-123'; // In production, use env variable

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Setup SQLite database
const dbPath = path.resolve(__dirname, 'notes.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
        // User Table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )`);
        
        // Note Table - Migration Strategy
        db.run(`CREATE TABLE IF NOT EXISTS notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            tags TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )`);

        // Check columns to avoid crashes from old DB schema
        db.serialize(() => {
            db.all("PRAGMA table_info(notes)", (err, rows) => {
                if (err) return;
                const columnNames = rows.map(r => r.name);
                if (!columnNames.includes('user_id')) {
                    db.run("ALTER TABLE notes ADD COLUMN user_id INTEGER DEFAULT 0");
                    console.log("Added user_id column to notes table");
                }
                if (!columnNames.includes('tags')) {
                    db.run("ALTER TABLE notes ADD COLUMN tags TEXT DEFAULT ''");
                    console.log("Added tags column to notes table");
                }
            });
        });

        // Version History Table
        db.run(`CREATE TABLE IF NOT EXISTS history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            note_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(note_id) REFERENCES notes(id)
        )`);
    }
});

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) return res.status(401).json({ error: 'Access denied. Token missing.' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token.' });
        req.user = user;
        next();
    });
};

// --- Auth Routes ---
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'All fields required' });

        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (username, password) VALUES (?, ?)', [username, hashedPassword], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username already exists' });
                return res.status(500).json({ error: err.message });
            }
            res.status(201).json({ message: 'User created' });
        });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/login', async (req, res) => {
    const { username, password } = req.body;
    db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, user: { id: user.id, username: user.username } });
    });
});

// --- API Routes (Protected) ---
app.get('/api/notes', authenticateToken, (req, res) => {
    db.all('SELECT * FROM notes WHERE user_id = ? ORDER BY updated_at DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.post('/api/notes', authenticateToken, (req, res) => {
    const { title, content, tags } = req.body;
    db.run('INSERT INTO notes (user_id, title, content, tags) VALUES (?, ?, ?, ?)', [req.user.id, title, content || '', tags || ''], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        db.get('SELECT * FROM notes WHERE id = ?', [this.lastID], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json(row);
        });
    });
});

app.put('/api/notes/:id', authenticateToken, (req, res) => {
    const { title, content, tags } = req.body;
    // Check ownership
    db.get('SELECT * FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(403).json({ error: 'Forbidden' });

        const sql = 'UPDATE notes SET title = ?, content = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
        db.run(sql, [title, content || '', tags || '', req.params.id], function(err) {
            if (err) return res.status(500).json({ error: err.message });
            
            // Version History: Save snapshot
            db.run('INSERT INTO history (note_id, content) VALUES (?, ?)', [req.params.id, content], (err) => {
                if (err) console.error('History save error', err);
            });

            db.get('SELECT * FROM notes WHERE id = ?', [req.params.id], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                res.json(row);
            });
        });
    });
});

app.delete('/api/notes/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM notes WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(204).send();
    });
});

// Version History Route
app.get('/api/notes/:id/history', authenticateToken, (req, res) => {
    db.all('SELECT * FROM history WHERE note_id = ? ORDER BY timestamp DESC LIMIT 20', [req.params.id], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
