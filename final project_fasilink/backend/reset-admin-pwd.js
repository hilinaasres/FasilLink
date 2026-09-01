const bcrypt = require('bcrypt');
const db = require('./src/config/db');

(async () => {
  try {
    const hashed = await bcrypt.hash('123456', 10);
    const result = await db.query("UPDATE Users SET password = $1 WHERE email = 'biruktamrat35@gmail.com'", [hashed]);
    console.log('Password updated for biruktamrat35@gmail.com');
    process.exit(0);
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
