const { Pool } = require('pg');

let pool;

const createPool = () => {
  const opts = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { user: process.env.DB_USER, host: process.env.DB_HOST, database: process.env.DB_NAME, password: process.env.DB_PASSWORD, port: process.env.DB_PORT };

  const p = new Pool(opts);

  p.on('error', (err) => {
    console.error('Unexpected error on idle client:', err && err.message ? err.message : err);
    // Try to recreate the pool after a brief delay to recover from transient DB disconnects
    setTimeout(() => {
      try {
        console.warn('Attempting to recreate DB pool after error');
        // end old pool (best-effort)
        p.end().catch(() => {});
      } catch (e) {}
      try {
        pool = createPool();
      } catch (e) {
        console.error('Failed to recreate DB pool:', e);
      }
    }, 3000);
  });

  return p;
};

pool = createPool();

// Simple query wrapper that retries once on specific transient errors
const query = async (text, params) => {
  try {
    return await pool.query(text, params);
  } catch (err) {
    const msg = String(err && err.message ? err.message : err).toLowerCase();
    if (msg.includes('connection terminated') || msg.includes('econnreset') || msg.includes('socket hang up') || msg.includes('connection reset')) {
      console.warn('DB query failed with transient error, attempting single retry:', msg);
      try {
        // try recreate pool and retry
        try { await pool.end(); } catch (e) {}
        pool = createPool();
        return await pool.query(text, params);
      } catch (retryErr) {
        // fallthrough to original error
        console.error('Retry failed:', retryErr && retryErr.message ? retryErr.message : retryErr);
      }
    }
    throw err;
  }
};

module.exports = {
  query,
  // expose pool for advanced use if required
  _pool: () => pool,
};
