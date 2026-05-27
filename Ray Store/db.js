const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'raystore',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Helper for database settings
async function getSettings() {
    const [rows] = await pool.query('SELECT `key`, `value` FROM settings');
    const settings = {};
    rows.forEach(r => {
        settings[r.key] = r.value;
    });
    return settings;
}

module.exports = {
    pool,
    getSettings
};
