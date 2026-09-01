const db = require('./src/config/db');

const email = process.argv[2];
if (!email) {
  console.error('Usage: node make-admin.js <email>');
  process.exit(1);
}

(async () => {
  try {
    const res = await db.query(
      "UPDATE Users SET role = 'admin' WHERE email = $1 RETURNING id, email, role",
      [email]
    );

    if (res.rows.length === 0) {
      console.error('No user found with email:', email);
      process.exit(1);
    }

    console.log('Updated:', res.rows[0]);
    process.exit(0);
  } catch (e) {
    console.error('FAILED:', e.message);
    process.exit(1);
  }
})();
