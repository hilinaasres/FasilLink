const bcrypt = require('bcrypt');
const db = require('./src/config/db');

(async () => {
  try {
    const hashed = await bcrypt.hash('yourpassword', 10);
    const result = await db.query('UPDATE Users SET password = $1 WHERE email = $2', [hashed, 'admin@fasillink.com']);
    console.log('Password updated for admin@fasillink.com');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();