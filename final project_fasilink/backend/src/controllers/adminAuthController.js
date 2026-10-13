const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

const ADMIN_ROLE_NAMES = ['SUPER_ADMIN', 'ADMIN', 'MODERATOR'];

const adminLogin = async (req, res) => {
  try {
    const { email, password, remember } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const result = await db.query('SELECT * FROM Users WHERE LOWER(email) = $1', [normalizedEmail]);
    const user = result.rows[0];
    const normalizedRole = String(user?.role || '').trim().toUpperCase();
    const adminRoleUpper = String(user?.admin_role || '').trim().toUpperCase();
    const isAdminUser = ADMIN_ROLE_NAMES.includes(normalizedRole) || ADMIN_ROLE_NAMES.includes(adminRoleUpper);

    if (!user || !isAdminUser) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (typeof user.password !== 'string' || !user.password) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(String(password), user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (String(user.status || 'active').toLowerCase() !== 'active') {
      return res.status(403).json({ error: `Account is ${user.status || 'inactive'}. Contact support.` });
    }

    const secret = process.env.JWT_SECRET || 'fasillink_super_secret_key';
    const token = jwt.sign(
      { id: user.id, role: 'admin', adminRole: String(user.admin_role || 'ADMIN').toUpperCase() },
      secret,
      { expiresIn: remember ? '7d' : '1d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
        adminRole: String(user.admin_role || 'ADMIN').toUpperCase(),
      },
    });
  } catch (error) {
    console.error('Admin Login Error:', error);
    res.status(500).json({ error: 'Unable to complete admin login.' });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedEmail) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    const result = await db.query('SELECT id FROM Users WHERE LOWER(email) = $1 AND UPPER(role::TEXT) = $2', [normalizedEmail, 'ADMIN']);
    if (!result.rows.length) {
      return res.json({ message: 'If the email exists, a reset link has been sent.' });
    }

    // In a real product, produce a temporary reset token and send an email.
    res.json({ message: 'If the email exists, a reset link has been sent.' });
  } catch (error) {
    console.error('Forgot Password Error:', error);
    res.status(500).json({ error: 'Unable to process password reset.' });
  }
};

module.exports = { adminLogin, forgotPassword };
