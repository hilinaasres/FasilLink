const axios = require('axios');
const db = require('../config/db');

const CHAPA_URL = 'https://api.chapa.co/v1/transaction/initialize';
const CHAPA_VERIFY_URL = 'https://api.chapa.co/v1/transaction/verify';
const CHAPA_SECRET_KEY = process.env.CHAPA_SECRET_KEY || 'CHASECK_TEST-wT02kblCgX94H3s8M5gY0yZ5zWdSbG5';

const DEFAULT_TEST_EMAIL = process.env.CHAPA_TEST_EMAIL || 'test.user@gmail.com';

const getBaseUrls = () => {
    const port = process.env.PORT || 5000;
    return {
        backend: (process.env.BACKEND_BASE_URL || `http://localhost:${port}`).replace(/\/$/, ''),
        frontend: (process.env.FRONTEND_BASE_URL || 'http://localhost:3002').replace(/\/$/, ''),
    };
};

const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());

const normalizePhone = (phone) => {
    const digits = String(phone || '').replace(/\D/g, '');
    if (/^09\d{8}$/.test(digits) || /^07\d{8}$/.test(digits)) return digits;
    if (digits.startsWith('251') && digits.length >= 12) {
        const local = `0${digits.slice(3)}`;
        if (/^09\d{8}$/.test(local) || /^07\d{8}$/.test(local)) return local;
    }
    return null;
};

const resolvePayerDetails = async (req) => {
    const body = req.body || {};
    let email = String(body.email || '').trim().toLowerCase();
    let first_name = String(body.first_name || '').trim();
    let last_name = String(body.last_name || '').trim();
    let phone_number = normalizePhone(body.phone_number || body.phone);

    const userId = Number(req.user?.id);
    if (Number.isFinite(userId)) {
        const userRes = await db.query('SELECT name, email, phone FROM Users WHERE id = $1', [userId]);
        const user = userRes.rows[0];
        if (user) {
            if (!email && user.email) email = String(user.email).trim().toLowerCase();
            if (!first_name && user.name) {
                const parts = String(user.name).trim().split(/\s+/);
                first_name = parts[0] || 'FasilLink';
                last_name = last_name || parts.slice(1).join(' ') || 'Customer';
            }
            if (!phone_number && user.phone) phone_number = normalizePhone(user.phone);
        }
    }

    if (!isValidEmail(email)) {
        email = DEFAULT_TEST_EMAIL;
    }
    email = String(email).trim().toLowerCase();
    if (!isValidEmail(email)) {
        email = DEFAULT_TEST_EMAIL;
    }
    if (!first_name) first_name = 'FasilLink';
    if (!last_name) last_name = 'Customer';

    return { email, first_name, last_name, phone_number };
};

const formatChapaError = (error) => {
    const data = error?.response?.data;
    if (!data) return error?.message || 'Chapa request failed';
    if (typeof data.message === 'string') return data.message;
    if (typeof data.message === 'object' && data.message !== null) {
        return Object.entries(data.message)
            .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`)
            .join('; ');
    }
    return data.error || 'Chapa payment initialization failed';
};

const CHAPA_TITLE_MAX = 16;
const CHAPA_DESCRIPTION_MAX = 50;

const normalizeCustomization = (customization) => {
    const raw = customization || {};
    const title = String(raw.title || 'FasilLink').trim() || 'FasilLink';
    const description = String(raw.description || 'Marketplace payment').trim() || 'Marketplace payment';
    return {
        title: title.slice(0, CHAPA_TITLE_MAX),
        description: description.slice(0, CHAPA_DESCRIPTION_MAX),
    };
};

const extractCheckoutUrl = (chapaResponse) => {
    const data = chapaResponse?.data || chapaResponse;
    return (
        data?.data?.checkout_url ||
        data?.checkout_url ||
        null
    );
};

const initializeChapaCheckout = async ({
    amount,
    currency = 'ETB',
    email,
    first_name,
    last_name,
    phone_number,
    tx_ref,
    callback_url,
    return_url,
    customization,
}) => {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        throw new Error('Payment amount must be greater than zero.');
    }
    if (!tx_ref) {
        throw new Error('Transaction reference is required.');
    }

    const payload = {
        amount: String(numericAmount),
        currency,
        email,
        first_name,
        last_name,
        tx_ref,
        callback_url,
        return_url,
        customization: normalizeCustomization(customization),
    };

    if (phone_number) {
        payload.phone_number = phone_number;
    }

    let response;
    try {
        response = await axios.post(CHAPA_URL, payload, {
            headers: {
                Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
                'Content-Type': 'application/json',
            },
        });
    } catch (error) {
        const chapaMessage = formatChapaError(error);
        console.error('Chapa initialize failed:', chapaMessage, error.response?.data);
        throw new Error(chapaMessage);
    }

    const checkoutUrl = extractCheckoutUrl(response.data);
    if (!checkoutUrl) {
        const msg = response.data?.message;
        throw new Error(
            typeof msg === 'string' ? msg : 'Chapa did not return a checkout URL. Check your test secret key.'
        );
    }

    return {
        checkout_url: checkoutUrl,
        tx_ref,
        chapa: response.data,
    };
};

const verifyChapaTransaction = async (tx_ref) => {
    const response = await axios.get(`${CHAPA_VERIFY_URL}/${tx_ref}`, {
        headers: {
            Authorization: `Bearer ${CHAPA_SECRET_KEY}`,
        },
    });
    return response.data;
};

const isChapaPaymentSuccessful = (verification, query = {}) => {
    const queryStatus = String(query.status || query.payment_status || '').toLowerCase();
    if (['success', 'successful', 'completed'].includes(queryStatus)) {
        return true;
    }

    const topStatus = String(verification?.status || '').toLowerCase();
    if (['success', 'successful', 'completed'].includes(topStatus)) {
        return true;
    }

    const dataStatus = String(verification?.data?.status || '').toLowerCase();
    return ['success', 'successful', 'completed'].includes(dataStatus);
};

const isTestMode = () => String(CHAPA_SECRET_KEY).startsWith('CHASECK_TEST');

module.exports = {
    CHAPA_SECRET_KEY,
    getBaseUrls,
    resolvePayerDetails,
    formatChapaError,
    extractCheckoutUrl,
    initializeChapaCheckout,
    verifyChapaTransaction,
    isChapaPaymentSuccessful,
    isTestMode,
    isValidEmail,
};
