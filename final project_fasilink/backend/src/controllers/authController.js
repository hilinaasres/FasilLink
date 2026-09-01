const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const fs = require('fs');
const path = require('path');
const {
  canSendEmail,
  sendEmail,
  buildVerificationLink,
  buildResetLink,
} = require('../services/emailService');

const normalizeRole = (role, { allowAdmin = false } = {}) => {
    const value = String(role || 'customer').trim().toLowerCase();
    if (allowAdmin && ['admin', 'super_admin', 'moderator'].includes(value)) return 'admin';
    // Sellers are still regular users with isSeller = true.
    if (value === 'owner' || value === 'item_owner' || value === 'customer' || value === 'user') return 'user';
    return 'user';
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[+]?[-.\s()\d]{7,25}$/;
const PASSWORD_REGEX = /^(?=.{8,128}$)(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).+$/;

const isValidEmail = (value) => EMAIL_REGEX.test(String(value || '').trim());
const isValidPhone = (value) => PHONE_REGEX.test(String(value || '').trim());
const isStrongPassword = (value) => PASSWORD_REGEX.test(String(value || ''));

const normalizeUserRole = (role, isSeller) => {
    const value = String(role || '').trim().toLowerCase();
    if (isSeller || value === 'owner' || value === 'seller' || value === 'item_owner') return 'owner';
    return 'customer';
};

const formatEmailSubject = (subject) => `FasilLink - ${subject}`;

const sendVerificationEmail = async (user) => {
    if (!user?.email || !user?.email_verification_token) return false;
    const verificationLink = buildVerificationLink(user.email_verification_token);
    return sendEmail({
        to: user.email,
        subject: formatEmailSubject('Verify your email address'),
        text: `Hi ${user.name || 'FasilLink user'},\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink}\n\nIf you did not sign up, you can safely ignore this email.`,
        html: `<p>Hi ${user.name || 'FasilLink user'},</p>
               <p>Please verify your email address by clicking the link below:</p>
               <p><a href="${verificationLink}">${verificationLink}</a></p>
               <p>If you did not sign up, you can safely ignore this email.</p>`,
    });
};

const sendPasswordResetEmail = async (user, token) => {
    if (!user?.email || !token) return false;
    const resetLink = buildResetLink(token);
    return sendEmail({
        to: user.email,
        subject: formatEmailSubject('Reset your password'),
        text: `Hi ${user.name || 'FasilLink user'},\n\nWe received a request to reset your password. Use the link below to set a new password:\n\n${resetLink}\n\nIf you did not request a password reset, please ignore this email.`,
        html: `<p>Hi ${user.name || 'FasilLink user'},</p>
               <p>We received a request to reset your password. Use the link below to set a new password:</p>
               <p><a href="${resetLink}">${resetLink}</a></p>
               <p>If you did not request a password reset, please ignore this email.</p>`,
    });
};

const register = async (req, res) => {
    console.log('Register endpoint hit with body:', req.body);
    try {
        const { name, email, password, phone, country, city, isSeller, role } = req.body;
        const normalizedName = String(name || '').trim();
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const normalizedPhone = String(phone || '').trim();
        const normalizedCountry = String(country || 'Ethiopia').trim() || 'Ethiopia';
        const normalizedCity = String(city || 'Gondar').trim() || 'Gondar';
        const sellerRole = normalizeUserRole(role, Boolean(isSeller));
        const isSellerValue = Boolean(isSeller) || sellerRole === 'owner';
        const userRole = isSellerValue ? 'owner' : 'customer';

        if (!normalizedName || !normalizedEmail || !password || !normalizedPhone) {
            console.log('Validation failed');
            return res.status(400).json({ error: 'Name, email, phone, and password are required.' });
        }

        if (!isValidEmail(normalizedEmail)) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }

        if (!isValidPhone(normalizedPhone)) {
            return res.status(400).json({ error: 'Please enter a valid phone number.' });
        }

        if (!isStrongPassword(password)) {
            return res.status(400).json({
                error: 'Password must be 8+ characters and include upper-case, lower-case, numeric, and special characters.',
            });
        }

        const existingUser = await db.query('SELECT * FROM Users WHERE email = $1', [normalizedEmail]);
        if (existingUser.rows.length > 0) {
            const current = existingUser.rows[0];
            const currentStatus = String(current.status || 'pending').toLowerCase();
            if (currentStatus === 'pending') {
                return res.status(400).json({
                    error: 'An account already exists with this email and is awaiting verification. Please check your inbox or resend verification.',
                });
            }
            return res.status(400).json({ error: 'Email already in use.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);
        const adminRole = null;
        const businessName = isSellerValue ? `${normalizedName} Listings` : null;
        const address = [normalizedCity, normalizedCountry].filter(Boolean).join(', ');
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const verificationSentAt = new Date().toISOString();

        const result = await db.query(
            `INSERT INTO Users (name, email, password, role, is_seller, phone, country, city, admin_role, business_name, address, status, email_verified, email_verification_token, email_verification_sent_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', FALSE, $12, $13)
             RETURNING id, name, email, role, is_seller, phone, country, city, business_name, address, bio, profile_image, admin_role, status`,
            [normalizedName, normalizedEmail, hashedPassword, userRole, isSellerValue, normalizedPhone, normalizedCountry, normalizedCity, adminRole, businessName, address, verificationToken, verificationSentAt]
        );

        const newUser = result.rows[0];
        console.log('Registered new user:', normalizedEmail);

        const emailSent = await sendVerificationEmail({
            ...newUser,
            email: normalizedEmail,
            email_verification_token: verificationToken,
            name: normalizedName,
        });

        if (!emailSent && !canSendEmail) {
            console.warn('[Mail] SMTP not configured. Verification email was not delivered automatically.');
        }

        res.status(201).json({
            message: 'Registration successful. A verification email has been sent to your inbox.',
            user: formatUserResponse(newUser),
        });
    } catch (error) {
        console.error('Register Error:', error);
        res.status(500).json({ error: 'Server error during registration.' });
    }
};

const getIsSellerFromDb = (user) => {
    if (user?.is_seller) return true;
    if (!user) return false;
    return ['owner', 'item_owner'].includes(String(user.role).toLowerCase());
};

const formatUserResponse = (user) => {
    const roleValue = normalizeRole(user.role, { allowAdmin: true });
    return {
        id: user.id,
        name: user.name,
        email: user.email,
        role: roleValue,
        isSeller: getIsSellerFromDb(user),
        phone: user.phone || null,
        country: user.country || 'Ethiopia',
        city: user.city || 'Gondar',
        businessName: user.business_name || null,
        address: user.address || null,
        bio: user.bio || null,
        profileImage: user.profile_image || null,
        adminRole: user.admin_role || null,
        status: user.status || 'active',
        emailVerified: Boolean(user.email_verified),
    };
};

const login = async (req, res) => {
    console.log('Login endpoint hit with email:', req.body.email);
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            console.log('Validation failed');
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = String(email || '').trim().toLowerCase();

        const result = await db.query('SELECT * FROM Users WHERE email = $1', [normalizedEmail]);
        const user = result.rows[0];

        if (!user) {
            console.log('User not found');
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const userStatus = String(user.status || 'active').toLowerCase();
        if (userStatus !== 'active') {
            if (userStatus === 'pending') {
                return res.status(403).json({ error: 'Account is pending email verification. Please verify your email or resend the verification link.' });
            }
            return res.status(403).json({ error: `Account is ${user.status || 'inactive'}. Contact support.` });
        }

        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            console.log('Password invalid');
            return res.status(401).json({ error: 'Invalid email or password.' });
        }

        const isSeller = getIsSellerFromDb(user);
        const roleValue = normalizeRole(user.role, { allowAdmin: true });
        const secret = process.env.JWT_SECRET || 'fasillink_super_secret_key';
        const token = jwt.sign(
            {
                id: user.id,
                role: roleValue,
                isSeller,
                adminRole: user.admin_role || null,
            },
            secret,
            { expiresIn: '1d' }
        );

        console.log('Login successful');
        res.json({
            message: 'Login successful',
            token,
            user: formatUserResponse(user),
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({ error: 'Server error during login.' });
    }
};

const verifyEmailRedirect = (req, res) => {
    const appUrl = process.env.FRONTEND_BASE_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const token = String(req.params.token || '');
    return res.redirect(`${appUrl.replace(/\/$/, '')}/verify-email/${encodeURIComponent(token)}`);
};

const verifyEmail = async (req, res) => {
    try {
        const token = String(req.body?.token || '').trim();
        if (!token) {
            return res.status(400).json({ error: 'Verification token is required.' });
        }

        const result = await db.query('SELECT id, status FROM Users WHERE email_verification_token = $1', [token]);
        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ error: 'Verification link is invalid or has expired.' });
        }

        const status = String(user.status || 'pending').toLowerCase();
        if (status === 'active') {
            return res.json({ message: 'Email is already verified.' });
        }
        if (status !== 'pending') {
            return res.status(400).json({ error: `Cannot verify account with status: ${status}. Contact support.` });
        }

        await db.query(
            `UPDATE Users
             SET status = 'active', email_verified = TRUE, email_verification_token = NULL, email_verification_sent_at = NULL
             WHERE id = $1`,
            [user.id]
        );

        res.json({ message: 'Email verified successfully. You may now log in.' });
    } catch (error) {
        console.error('Verify Email Error:', error);
        res.status(500).json({ error: 'Failed to verify email address.' });
    }
};

const resendVerification = async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email || !isValidEmail(email)) {
            return res.status(400).json({ error: 'Please provide a valid email address.' });
        }

        const result = await db.query('SELECT id, name, status FROM Users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.json({ message: 'If that account exists, a verification email has been resent.' });
        }

        const status = String(user.status || 'pending').toLowerCase();
        if (status === 'active') {
            return res.status(400).json({ error: 'This account is already verified.' });
        }
        if (status === 'suspended') {
            return res.status(400).json({ error: 'This account is suspended. Contact support.' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const sentAt = new Date().toISOString();

        await db.query(
            `UPDATE Users SET email_verification_token = $1, email_verification_sent_at = $2 WHERE id = $3`,
            [token, sentAt, user.id]
        );

        const emailSent = await sendVerificationEmail({ email, name: user.name, email_verification_token: token });
        if (!emailSent && !canSendEmail) {
            console.warn('[Mail] SMTP not configured. Verification email was not delivered automatically.');
        }

        res.json({ message: 'Verification email resent. Please check your inbox.' });
    } catch (error) {
        console.error('Resend Verification Error:', error);
        res.status(500).json({ error: 'Failed to resend verification email.' });
    }
};

const passwordResetRedirect = (req, res) => {
    const appUrl = process.env.FRONTEND_BASE_URL || process.env.APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000';
    const token = String(req.params.token || '');
    return res.redirect(`${appUrl.replace(/\/$/, '')}/reset-password/${encodeURIComponent(token)}`);
};

const requestPasswordReset = async (req, res) => {
    try {
        const email = String(req.body?.email || '').trim().toLowerCase();
        if (!email || !isValidEmail(email)) {
            return res.json({ message: 'If that account exists, a password reset email has been sent.' });
        }

        const result = await db.query('SELECT id, name, status FROM Users WHERE email = $1', [email]);
        const user = result.rows[0];
        if (!user) {
            return res.json({ message: 'If that account exists, a password reset email has been sent.' });
        }

        const status = String(user.status || 'pending').toLowerCase();
        if (status === 'suspended') {
            return res.json({ message: 'If that account exists, a password reset email has been sent.' });
        }

        const token = crypto.randomBytes(32).toString('hex');

        await db.query(
            `UPDATE Users
             SET password_reset_token = $1,
                 password_reset_sent_at = NOW(),
                 password_reset_expires_at = NOW() + INTERVAL '1 hour'
             WHERE id = $2`,
            [token, user.id]
        );

        const emailSent = await sendPasswordResetEmail({ email, name: user.name }, token);
        if (!emailSent && !canSendEmail) {
            console.warn('[Mail] SMTP not configured. Password reset email was not delivered automatically.');
        }

        return res.json({ message: 'If that account exists, a password reset email has been sent.' });
    } catch (error) {
        console.error('Password Reset Request Error:', error);
        res.status(500).json({ error: 'Unable to process password reset request.' });
    }
};

const resetPassword = async (req, res) => {
    try {
        const token = String(req.body?.token || '').trim();
        const password = String(req.body?.password || '');

        if (!token || !password) {
            return res.status(400).json({ error: 'Reset token and new password are required.' });
        }
        if (!isStrongPassword(password)) {
            return res.status(400).json({
                error: 'Password must be 8+ characters and include upper-case, lower-case, numeric, and special characters.',
            });
        }

        const result = await db.query(
            `SELECT id, status FROM Users WHERE password_reset_token = $1 AND password_reset_expires_at >= NOW()`,
            [token]
        );
        const user = result.rows[0];
        if (!user) {
            return res.status(400).json({ error: 'Reset token is invalid or has expired.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const nextStatus = String(user.status || '').toLowerCase() === 'pending' ? 'active' : user.status;
        const setEmailVerified = String(user.status || '').toLowerCase() === 'pending';

        await db.query(
            `UPDATE Users
             SET password = $1,
                 password_reset_token = NULL,
                 password_reset_sent_at = NULL,
                 password_reset_expires_at = NULL,
                 status = $2,
                 email_verified = COALESCE($3, email_verified)
             WHERE id = $4`,
            [hashedPassword, nextStatus, setEmailVerified ? true : null, user.id]
        );

        res.json({ message: 'Password has been reset successfully. You may now log in.' });
    } catch (error) {
        console.error('Reset Password Error:', error);
        res.status(500).json({ error: 'Failed to reset password.' });
    }
};

const becomeSeller = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        if (!Number.isFinite(userId)) {
            return res.status(400).json({ error: 'Invalid user id' });
        }

        const result = await db.query(
            'UPDATE Users SET is_seller = TRUE, role = $2 WHERE id = $1 RETURNING id, name, email, role, is_seller, phone, country, city, profile_image, admin_role',
            [userId, 'owner']
        );

        const updatedUser = result.rows[0];
        if (!updatedUser) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Issue a fresh token so the client and subsequent requests see isSeller=true
        const secret = process.env.JWT_SECRET || 'fasillink_super_secret_key';
        const roleValue = normalizeRole(updatedUser.role, { allowAdmin: true });
        const token = jwt.sign(
            {
                id: updatedUser.id,
                role: roleValue,
                isSeller: true,
                adminRole: updatedUser.admin_role || null,
            },
            secret,
            { expiresIn: '1d' }
        );

        res.json({
            message: 'Account upgraded to seller successfully',
            token,
            user: formatUserResponse({ ...updatedUser, is_seller: true }),
        });
    } catch (error) {
        console.error('Become Seller Error:', error);
        res.status(500).json({ error: 'Failed to upgrade user to seller' });
    }
};

const getMe = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        if (!Number.isFinite(userId)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await db.query(
            `SELECT id, name, email, phone, role, is_seller, country, city, business_name, address, bio,
                    profile_image, admin_role, status, email_verified
             FROM Users WHERE id = $1`,
            [userId]
        );
        const user = result.rows[0];
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user: formatUserResponse(user) });
    } catch (error) {
        console.error('Get Me Error:', error);
        res.status(500).json({ error: 'Failed to load profile' });
    }
};

const updateProfile = async (req, res) => {
    try {
        const userId = Number(req.user?.id);
        if (!Number.isFinite(userId)) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        console.log('UpdateProfile called by userId:', userId, 'body:', JSON.stringify(req.body).slice(0, 1000));

        const {
            name,
            email,
            phone,
            country,
            city,
            business_name,
            businessName,
            address,
            bio,
        } = req.body;

        const currentRes = await db.query('SELECT * FROM Users WHERE id = $1', [userId]);
        const current = currentRes.rows[0];
        if (!current) {
            return res.status(404).json({ error: 'User not found' });
        }

        const nextName = name !== undefined ? String(name).trim() : current.name;
        const nextEmail = email !== undefined ? String(email).trim().toLowerCase() : current.email;
        const nextPhone = phone !== undefined ? String(phone).trim() : current.phone;
        const nextCountry = country !== undefined ? String(country).trim() : current.country;
        const nextCity = city !== undefined ? String(city).trim() : current.city;
        const nextBusinessName =
            business_name !== undefined || businessName !== undefined
                ? String(business_name || businessName || '').trim()
                : current.business_name;
        const nextAddress = address !== undefined ? String(address).trim() : current.address;
        const nextBio = bio !== undefined ? String(bio).trim() : current.bio;

        if (!nextName || !nextEmail || !nextPhone) {
            return res.status(400).json({ error: 'Name, email, and phone are required.' });
        }

        if (nextEmail !== current.email) {
            const existing = await db.query('SELECT id FROM Users WHERE email = $1 AND id != $2', [
                nextEmail,
                userId,
            ]);
            if (existing.rows.length > 0) {
                return res.status(400).json({ error: 'Email already in use.' });
            }
        }

        // Handle optional profile image (data URL or external URL)
        const inputProfileImage = (req.body.profileImage || req.body.profile_image || null);
        let profileImageUrl = null;
        try {
            if (inputProfileImage && typeof inputProfileImage === 'string') {
                const trimmed = inputProfileImage.trim();
                if (trimmed.startsWith('data:')) {
                    // data:image/png;base64,....
                    const matches = trimmed.match(/^data:(image\/[a-zA-Z0-9+.]+);base64,(.+)$/);
                    if (matches && matches.length === 3) {
                        const mime = matches[1];
                        const base64 = matches[2];
                        const ext = mime.split('/')[1] || 'png';
                        const buffer = Buffer.from(base64, 'base64');
                        const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
                        if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
                        const fileName = `profile_${userId}_${Date.now()}.${ext}`;
                        const filePath = path.join(uploadsDir, fileName);
                        fs.writeFileSync(filePath, buffer);
                        profileImageUrl = `/uploads/${fileName}`;
                    }
                } else if (trimmed.startsWith('/') || trimmed.startsWith('http')) {
                    profileImageUrl = trimmed;
                }
            }
        } catch (e) {
            console.warn('Failed to process profile image upload:', e?.message || e);
            // continue without failing the whole request; profileImageUrl remains null
        }

        const result = await db.query(
            `UPDATE Users
             SET name = $2, email = $3, phone = $4, country = $5, city = $6,
                 business_name = $7, address = $8, bio = $9, profile_image = COALESCE($10, profile_image)
             WHERE id = $1
             RETURNING id, name, email, phone, role, is_seller, country, city, business_name, address, bio,
                       profile_image, admin_role, status`,
            [
                userId,
                nextName,
                nextEmail,
                nextPhone,
                nextCountry,
                nextCity,
                nextBusinessName || null,
                nextAddress || null,
                nextBio || null,
                profileImageUrl,
            ]
        );

        res.json({
            message: 'Profile updated successfully',
            user: formatUserResponse(result.rows[0]),
        });
    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ error: 'Failed to update profile', detail: String(error?.message || error) });
    }
};

module.exports = {
    register,
    login,
    verifyEmailRedirect,
    verifyEmail,
    resendVerification,
    passwordResetRedirect,
    requestPasswordReset,
    resetPassword,
    becomeSeller,
    getMe,
    updateProfile,
};
