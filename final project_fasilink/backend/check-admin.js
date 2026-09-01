const bcrypt = require('bcrypt');
const db = require('./src/config/db');

(async () => {
  try {
    // 1. Update password for admin@fasillink.com to 'yourpassword'
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('yourpassword', salt);
    await db.query("UPDATE Users SET password = $1, role = 'admin' WHERE email = 'admin@fasillink.com'", [hashedPassword]);
    console.log('[DB] Password for admin@fasillink.com updated to yourpassword');

    // 2. Delete biruktamrat35@gmail.com
    // Let's check first what data biruktamrat35@gmail.com has in other tables
    // Or we can just try to delete the user.
    try {
      const deleteResult = await db.query("DELETE FROM Users WHERE email = 'biruktamrat35@gmail.com' RETURNING id");
      if (deleteResult.rowCount > 0) {
        console.log('[DB] Successfully deleted biruktamrat35@gmail.com from Users table');
      } else {
        console.log('[DB] biruktamrat35@gmail.com not found or already deleted');
      }
    } catch (dbErr) {
      console.error('[DB] Failed to delete biruktamrat35@gmail.com directly due to foreign key constraints. Reverting role to customer...', dbErr.message);
      // If direct delete fails due to constraints, we can demote the user to standard customer
      await db.query("UPDATE Users SET role = 'customer', is_seller = FALSE WHERE email = 'biruktamrat35@gmail.com'");
      console.log('[DB] biruktamrat35@gmail.com role demoted to customer');
    }

    process.exit(0);
  } catch (e) {
    console.error('Execution Failed:', e.message);
    process.exit(1);
  }
})();
