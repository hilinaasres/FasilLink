const db = require('../config/db');
const {
    getBaseUrls,
    resolvePayerDetails,
    formatChapaError,
    initializeChapaCheckout,
    verifyChapaTransaction,
    isChapaPaymentSuccessful,
    isTestMode,
} = require('../services/chapaService');

const parsePaymentMetadata = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch {
        return {};
    }
};

const DEFAULT_CHARGING_SETTINGS = {
  chargesEnabled: true,
  postingFee: 50,
  renewalFee: 8,
  premiumListingFee: 25,
  featuredFee: 18,
  rentalFeePerDay: 12,
  taxPercent: 12,
};

const normalizeCategory = (category) => {
  if (!category) return null;
  const c = String(category).toLowerCase();
  if (c === 'homes' || c === 'home' || c === 'properties' || c === 'property') return 'Homes';
  if (c === 'vehicles' || c === 'vehicle' || c === 'cars' || c === 'car') return 'Vehicles';
  if (c === 'events' || c === 'event' || c === 'event rentals' || c === 'event materials') return 'Event Materials';
  return category;
};

const getAdminChargingSettings = async () => {
  try {
    const result = await db.query('SELECT value FROM Settings WHERE key = $1', ['admin_settings']);
    const settings = result.rows[0]?.value || {};
    return { ...DEFAULT_CHARGING_SETTINGS, ...(settings.charging || {}) };
  } catch (error) {
    console.error('Load charging settings error:', error);
    return { ...DEFAULT_CHARGING_SETTINGS };
  }
};

const calculateListingFee = (item, charging) => {
  let total = Number(charging.postingFee || 0);
  const breakdown = {
    baseFee: Number(charging.postingFee || 0),
    premiumFee: 0,
    featuredFee: 0,
    rentalFee: 0,
    tax: 0,
    total: 0,
  };

  if (item?.transaction_type === 'rent') {
    breakdown.rentalFee = Number(charging.rentalFeePerDay || 0);
    total += breakdown.rentalFee;
  }

  if (item?.premium) {
    breakdown.premiumFee = Number(charging.premiumListingFee || 0);
    total += breakdown.premiumFee;
  }

  if (item?.featured) {
    breakdown.featuredFee = Number(charging.featuredFee || 0);
    total += breakdown.featuredFee;
  }

  breakdown.tax = Math.round((total * Number(charging.taxPercent || 0)) / 100);
  total += breakdown.tax;
  breakdown.total = Number(total);
  return breakdown;
};

// ── Sanitize Chapa description (only letters, numbers, hyphens, underscores, spaces, dots) ──
const sanitizeChapaDescription = (str) => {
  return String(str || '')
    .replace(/[^a-zA-Z0-9\-_\s.]/g, '')
    .trim()
    .slice(0, 100);
};

// ── Unique tx_ref helper ──────────────────────────────────────────────────────
const makeTxRef = (prefix) =>
    `${prefix}_${Math.random().toString(36).slice(2, 12)}_${Math.random().toString(36).slice(2, 12)}`;
// ─────────────────────────────────────────────────────────────────────────────

const sendChapaCheckout = async (req, res, options) => {
    const payer = await resolvePayerDetails(req);
    if (!payer.email) {
        return res.status(400).json({ error: 'Invalid payer email' });
    }

    const { backend, frontend } = getBaseUrls();
    const {
        amount,
        tx_ref,
        callback_path,
        return_path,
        customization,
        item_id = null,
        payment_kind = 'listing',
    } = options;

    const checkout = await initializeChapaCheckout({
        amount,
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name,
        phone_number: payer.phone_number,
        tx_ref,
        callback_url: `${backend}${callback_path}`,
        return_url: `${frontend}${return_path}`,
        customization,
    });

    res.status(200).json({
        status: 'success',
        message: 'Chapa checkout ready',
        checkout_url: checkout.checkout_url,
        checkoutUrl: checkout.checkout_url,
        tx_ref,
        trx_ref: tx_ref,
        item_id,
        payment_kind,
        return_path,
        test_mode: isTestMode(),
        payer: {
            email: payer.email,
            first_name: payer.first_name,
            last_name: payer.last_name,
        },
        data: {
            ...(checkout.chapa?.data || {}),
            checkout_url: checkout.checkout_url,
            tx_ref,
        },
        checkout: checkout.chapa,
    });
};

const initializePayment = async (req, res) => {
    try {
        const item_id = req.body.item_id || req.body.itemId;
        const { item, payment_type } = req.body;
        const owner_id = req.user?.id;
        if (!owner_id) {
            return res.status(401).json({ error: 'You must be logged in to pay.' });
        }

        let itemId = item_id ? Number(item_id) : null;
        const itemData = item && typeof item === 'object' ? item : null;
        const isRenewal = String(payment_type || '').toLowerCase() === 'renewal';

        if (isRenewal) {
            if (!itemId) {
                return res.status(400).json({ error: 'item_id is required for renewal payment.' });
            }

            const itemRes = await db.query(
                `SELECT i.title, i.price, i.status, i.transaction_type, i.owner_id, c.name AS category
                 FROM Items i
                 LEFT JOIN Categories c ON c.id = i.category_id
                 WHERE i.id = $1`,
                [itemId]
            );
            if (itemRes.rows.length === 0) {
                return res.status(404).json({ error: 'Item not found' });
            }
            const row = itemRes.rows[0];
            if (Number(row.owner_id) !== Number(owner_id) && req.user?.role !== 'admin') {
                return res.status(403).json({ error: 'You do not own this listing.' });
            }
            const st = String(row.status || '').toLowerCase();
            if (st !== 'sold' && st !== 'rented') {
                return res.status(400).json({
                    error: 'Renewal payment applies to listings marked Sold or Rented.',
                });
            }

            const price = Number(row.price);
            const { findMatchingRule } = require('./chargingController');
            const rule = await findMatchingRule('Renewal', row.transaction_type, row.category, price);
            let feeAmount = Number(req.body.amount) || 0;
            let ruleId = null;
            if (rule) {
                const pct = Number(rule.fee_percentage) || 0;
                feeAmount = feeAmount || Math.round((price * pct) / 100 * 100) / 100;
                ruleId = rule.id;
            }
            if (feeAmount <= 0) {
                return res.status(400).json({ error: 'No renewal fee is due for this listing.' });
            }

            const tx_ref = makeTxRef('renewal_fee');
            const existingPayment = await db.query(
                'SELECT id FROM item_payments WHERE item_id = $1 ORDER BY id DESC LIMIT 1',
                [itemId]
            );
            if (existingPayment.rows.length > 0) {
                await db.query(
                    `UPDATE item_payments
                     SET fee_amount = $3, payment_status = 'Pending', payment_method = 'Chapa', rule_id = COALESCE($4, rule_id)
                     WHERE item_id = $1 AND owner_id = $2`,
                    [itemId, owner_id, feeAmount, ruleId]
                );
            } else {
                await db.query(
                    `INSERT INTO item_payments (item_id, owner_id, rule_id, item_price, fee_amount, payment_status, payment_method)
                     VALUES ($1, $2, $3, $4, $5, 'Pending', 'Chapa')`,
                    [itemId, owner_id, ruleId, price, feeAmount]
                );
            }

            await db.query(
                `INSERT INTO Payments (owner_id, item_id, amount, payment_status, transaction_id, metadata)
                 VALUES ($1, $2, $3, 'pending', $4, $5)`,
                [owner_id, itemId, feeAmount, tx_ref, { payment_type: 'renewal' }]
            );

            const returnBase = String(req.body.return_base || '/seller').replace(/\/$/, '');

            return await sendChapaCheckout(req, res, {
                amount: feeAmount,
                tx_ref,
                callback_path: `/api/payment/verify/${tx_ref}`,
                return_path: `${returnBase}/renew/${itemId}?paymentSuccess=true&trx_ref=${encodeURIComponent(tx_ref)}`,
                customization: {
                    title: 'FasilLink Renew',
                    // ✅ FIXED: removed colon, sanitized title to strip invalid chars
                    description: sanitizeChapaDescription(`Renewal ${row.title}`),
                },
                item_id: itemId,
                payment_kind: 'renewal',
            });
        }

        if (!itemId && !itemData) {
            return res.status(400).json({ error: 'Item details are required to initialize payment.' });
        }

        const chargingSettings = await getAdminChargingSettings();

        if (itemData) {
            const title = String(itemData.title || '').trim();
            const description = String(itemData.description || '').trim();
            const category = normalizeCategory(itemData.category) || 'Homes';
            const transaction_type = String(itemData.transaction_type || 'sell').toLowerCase();
            const price = Number(itemData.price || 0);
            const location = String(itemData.location || '').trim() || 'Gondar';
            const featured = Boolean(itemData.featured);
            const premium = Boolean(itemData.premium);
            const image_urls = Array.isArray(itemData.image_urls) ? itemData.image_urls.filter((u) => !!u) : [];

            if (!title || !transaction_type || !price || !location || image_urls.length === 0) {
                return res.status(400).json({ error: 'Missing required item fields or image URLs.' });
            }

            if (!['rent', 'sell'].includes(transaction_type)) {
                return res.status(400).json({ error: 'transaction_type must be rent or sell' });
            }

            const catRes = await db.query('SELECT id FROM Categories WHERE name = $1', [category]);
            let categoryId = catRes.rows[0]?.id;
            if (!categoryId) {
                const insertCat = await db.query('INSERT INTO Categories (name, active) VALUES ($1, true) RETURNING id', [category]);
                categoryId = insertCat.rows[0].id;
            }

            const feeBreakdown = calculateListingFee({ transaction_type, featured, premium }, chargingSettings);
            const insertItem = await db.query(
                `INSERT INTO Items (owner_id, title, description, category_id, transaction_type, price, location, status, featured, premium, listing_fee)
                 VALUES ($1, $2, $3, $4, $5::trans_type, $6, $7, 'pending_payment', $8, $9, $10)
                 RETURNING id`,
                [owner_id, title, description, categoryId, transaction_type, price, location, featured, premium, feeBreakdown.total]
            );
            itemId = insertItem.rows[0].id;

            for (const url of image_urls.slice(0, 5)) {
                await db.query('INSERT INTO Media (item_id, media_url, type) VALUES ($1, $2, $3)', [itemId, String(url), 'image']);
            }

            const tx_ref = makeTxRef('posting_fee');
            await db.query(
                'INSERT INTO Payments (owner_id, item_id, amount, payment_status, transaction_id, metadata) VALUES ($1, $2, $3, $4, $5, $6)',
                [owner_id, itemId, feeBreakdown.total, 'pending', tx_ref, { item: { title, category, transaction_type, price, featured, premium } }]
            );

            const returnBase = String(req.body.return_base || '/owner').replace(/\/$/, '');

            return await sendChapaCheckout(req, res, {
                amount: feeBreakdown.total,
                tx_ref,
                callback_path: `/api/payment/verify/${tx_ref}`,
                return_path: `${returnBase}/add?paymentSuccess=true&trx_ref=${encodeURIComponent(tx_ref)}`,
                customization: {
                    title: 'FasilLink List',
                    // ✅ FIXED: removed colon, sanitized title to strip invalid chars
                    description: sanitizeChapaDescription(`Listing fee ${title}`),
                },
                item_id: itemId,
                payment_kind: 'posting',
            });
        }

        const tx_ref = itemId ? makeTxRef('listing_fee') : makeTxRef('posting_fee');

        let amount = req.body.amount ? Number(req.body.amount) : 0;
        if (itemId && !amount) {
            const itemFeeRes = await db.query('SELECT listing_fee FROM Items WHERE id = $1', [itemId]);
            if (itemFeeRes.rows.length > 0) {
                amount = Number(itemFeeRes.rows[0].listing_fee) || 0;
            }
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({ error: 'A valid payment amount is required.' });
        }

        await db.query(
            'INSERT INTO Payments (owner_id, item_id, amount, payment_status, transaction_id) VALUES ($1, $2, $3, $4, $5)',
            [owner_id, itemId || null, amount, 'pending', tx_ref]
        );

        const returnBase = String(req.body.return_base || '/owner').replace(/\/$/, '');

        await sendChapaCheckout(req, res, {
            amount,
            tx_ref,
            callback_path: `/api/payment/verify/${tx_ref}`,
            return_path: itemId
                ? `${returnBase}/renew/${itemId}?paymentSuccess=true&trx_ref=${encodeURIComponent(tx_ref)}`
                : `${returnBase}/add?paymentSuccess=true&trx_ref=${encodeURIComponent(tx_ref)}`,
            customization: {
                title: 'FasilLink Fee',
                // ✅ Already safe, no special chars
                description: 'Listing payment',
            },
            item_id: itemId,
            payment_kind: itemId ? 'listing' : 'posting',
        });
    } catch (error) {
        const status = Number(error.chapaStatus || error.response?.status);
        const message = error.message || formatChapaError(error);
        console.error('Initialize Chapa payment error:', {
            status: status || 'unknown',
            message,
        });

        if (error.code === 'CHAPA_CONFIGURATION_ERROR') {
            return res.status(500).json({
                error: 'Payment provider is not configured. Set CHAPA_SECRET_KEY on the backend.',
                test_mode: isTestMode(),
            });
        }

        return res.status(500).json({
            error: `Unable to initialize Chapa payment: ${message}`,
            test_mode: isTestMode(),
        });
    }
};

const activateItemAfterPayment = async (itemId, tx_ref, metadata = {}) => {
    if (!itemId) return { status: null, activated: false };

    const itemRes = await db.query('SELECT status FROM Items WHERE id = $1', [itemId]);
    if (!itemRes.rows[0]) return { status: null, activated: false };

    const status = String(itemRes.rows[0].status || '').toLowerCase();
    const isRenewal =
        String(tx_ref || '').startsWith('renewal_fee_') ||
        metadata?.payment_type === 'renewal';

    let nextStatus = status;
    let activated = false;

    if (isRenewal || status === 'sold' || status === 'rented' || status === 'suspended' || status === 'expired') {
        await db.query(
            `UPDATE Items SET status = 'active'::item_status WHERE id = $1`,
            [itemId]
        );
        nextStatus = 'active';
        activated = true;
    } else if (status === 'pending_payment') {
        await db.query(
            `UPDATE Items SET status = 'pending_approval'::item_status WHERE id = $1`,
            [itemId]
        );
        nextStatus = 'pending_approval';
    }

    await db.query(
        `UPDATE item_payments SET payment_status = 'Paid', payment_method = 'Chapa' WHERE item_id = $1`,
        [itemId]
    );

    return { status: nextStatus, activated };
};

const completeVerifiedPayment = async (tx_ref, query = {}) => {
    const paymentRow = await db.query(
        'SELECT item_id, metadata, payment_status FROM Payments WHERE transaction_id = $1',
        [tx_ref]
    );
    if (!paymentRow.rows[0]) {
        return { ok: false, statusCode: 404, error: 'Payment reference not found.' };
    }

    if (paymentRow.rows[0].payment_status === 'completed') {
        const itemRes = await db.query('SELECT status FROM Items WHERE id = $1', [paymentRow.rows[0].item_id]);
        const metadata = parsePaymentMetadata(paymentRow.rows[0].metadata);
        const isRenewal =
            String(tx_ref).startsWith('renewal_fee_') || metadata?.payment_type === 'renewal';
        return {
            ok: true,
            alreadyCompleted: true,
            itemId: paymentRow.rows[0].item_id,
            item_status: String(itemRes.rows[0]?.status || ''),
            isRenewal,
        };
    }

    let verification = null;
    let isSuccess = false;

    try {
        verification = await verifyChapaTransaction(tx_ref);
        isSuccess = isChapaPaymentSuccessful(verification, query);
    } catch (verifyError) {
        console.error('Chapa verify API error:', verifyError.response?.data || verifyError.message);
        if (isTestMode()) {
            isSuccess = isChapaPaymentSuccessful(null, query);
        }
    }

    if (!isSuccess) {
        return {
            ok: false,
            statusCode: 400,
            error: 'Payment not successful yet. Wait a moment and try again.',
            verification,
        };
    }

    await db.query('UPDATE Payments SET payment_status = $1 WHERE transaction_id = $2', ['completed', tx_ref]);

    const itemId = paymentRow.rows[0].item_id;
    const metadata = parsePaymentMetadata(paymentRow.rows[0].metadata);
    const activation = await activateItemAfterPayment(itemId, tx_ref, metadata);
    const isRenewal =
        String(tx_ref).startsWith('renewal_fee_') || metadata?.payment_type === 'renewal';

    return {
        ok: true,
        itemId,
        item_status: activation.status,
        activated: activation.activated,
        isRenewal,
        data: verification?.data || null,
    };
};

const verifyPayment = async (req, res) => {
    try {
        const tx_ref = req.params.tx_ref || req.query.trx_ref || req.query.tx_ref;
        if (!tx_ref) {
            return res.status(400).json({ error: 'Transaction reference is required.' });
        }

        const result = await completeVerifiedPayment(tx_ref, req.query);
        if (!result.ok) {
            return res.status(result.statusCode || 400).json({
                error: result.error,
                verification: result.verification,
            });
        }

        const message = result.isRenewal
            ? 'Renewal payment verified. Your listing is active again.'
            : result.activated
              ? 'Payment verified. Your listing is now active.'
              : 'Payment verified. Your listing is pending admin approval before it goes live.';

        res.status(200).json({
            message,
            itemId: result.itemId,
            item_status: result.item_status,
            payment_type: result.isRenewal ? 'renewal' : 'listing',
            alreadyCompleted: result.alreadyCompleted || false,
            data: result.data,
        });
    } catch (error) {
        console.error('Verify payment error:', error.message);
        res.status(500).json({ error: formatChapaError(error) || 'Verification failed' });
    }
};

const confirmRenewalPayment = async (req, res) => {
    try {
        const tx_ref = req.body.tx_ref || req.body.trx_ref;
        const item_id = req.body.item_id || req.body.itemId;
        const ownerId = req.user?.id;

        if (!tx_ref) {
            return res.status(400).json({ error: 'tx_ref is required.' });
        }

        const result = await completeVerifiedPayment(tx_ref, req.body);
        if (!result.ok) {
            return res.status(result.statusCode || 400).json({ error: result.error });
        }

        if (item_id && Number(item_id) !== Number(result.itemId)) {
            return res.status(400).json({ error: 'Payment does not match this listing.' });
        }

        if (result.itemId) {
            const ownerCheck = await db.query('SELECT owner_id FROM Items WHERE id = $1', [result.itemId]);
            if (
                ownerCheck.rows[0] &&
                ownerCheck.rows[0].owner_id !== ownerId &&
                req.user?.role !== 'admin'
            ) {
                return res.status(403).json({ error: 'Unauthorized' });
            }
        }

        res.json({
            success: true,
            message: 'Renewal payment verified. Your listing is active again.',
            itemId: result.itemId,
            item_status: result.item_status,
        });
    } catch (error) {
        console.error('Confirm renewal payment error:', error.message);
        res.status(500).json({ error: formatChapaError(error) || 'Failed to confirm payment' });
    }
};

const postingFeeStatus = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const result = await db.query(
            `SELECT id, amount, transaction_id, created_at
            FROM Payments
            WHERE owner_id = $1
              AND payment_status = 'completed'
              AND (
                transaction_id LIKE 'posting_fee_%'
                OR transaction_id LIKE 'mock_posting_fee_%'
              )
            ORDER BY created_at DESC
            LIMIT 1`,
            [ownerId]
        );

        const row = result.rows[0];
        res.json({ paid: Boolean(row), payment: row || null });
    } catch (error) {
        console.error('Posting Fee Status Error:', error);
        res.status(500).json({ error: 'Failed to check posting fee status' });
    }
};

const getMyPaymentSummary = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const [totalRes, recentRes] = await Promise.all([
            db.query(
                `SELECT COALESCE(SUM(amount), 0)::numeric AS total
                 FROM Payments
                 WHERE owner_id = $1 AND payment_status = 'completed'`,
                [ownerId]
            ),
            db.query(
                `SELECT p.id, p.amount, p.transaction_id, p.payment_status, p.created_at,
                        i.title AS item_title
                 FROM Payments p
                 LEFT JOIN Items i ON i.id = p.item_id
                 WHERE p.owner_id = $1
                 ORDER BY p.created_at DESC
                 LIMIT 10`,
                [ownerId]
            ),
        ]);

        res.json({
            totalRevenue: Number(totalRes.rows[0]?.total || 0),
            payments: recentRes.rows,
        });
    } catch (error) {
        console.error('Get My Payment Summary Error:', error);
        res.status(500).json({ error: 'Failed to load payment summary' });
    }
};

const mockCompletePostingFee = async (req, res) => {
    try {
        const ownerId = req.user?.id;
        if (!ownerId) return res.status(401).json({ error: 'Unauthorized' });

        const tx_ref = makeTxRef('mock_posting_fee');
        const amount = Number(req.body?.amount || 50);

        await db.query(
            'INSERT INTO Payments (owner_id, item_id, amount, payment_status, transaction_id) VALUES ($1, $2, $3, $4, $5)',
            [ownerId, null, amount, 'completed', tx_ref]
        );

        res.json({ paid: true, transaction_id: tx_ref });
    } catch (error) {
        console.error('Mock Posting Fee Error:', error);
        res.status(500).json({ error: 'Failed to complete posting fee' });
    }
};

const payListing = async (req, res) => {
    try {
        const { item_id, method } = req.body;
        const ownerId = req.user?.id;

        if (!item_id) {
            return res.status(400).json({ error: 'item_id is required' });
        }

        const itemCheck = await db.query(
            'SELECT owner_id, status FROM Items WHERE id = $1',
            [item_id]
        );
        if (itemCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }
        if (Number(itemCheck.rows[0].owner_id) !== Number(ownerId) && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'You do not own this listing.' });
        }

        const itemStatus = String(itemCheck.rows[0].status || '').toLowerCase();
        const paymentMethod = method || 'Mock Checkout';

        await db.query(
            `UPDATE item_payments SET payment_status = 'Paid', payment_method = $1 WHERE item_id = $2`,
            [paymentMethod, item_id]
        );

        await db.query(
            `UPDATE Payments SET payment_status = 'completed' WHERE item_id = $1`,
            [item_id]
        );

        const renewStatuses = ['sold', 'rented', 'suspended', 'expired'];
        if (renewStatuses.includes(itemStatus)) {
            await db.query(`UPDATE Items SET status = 'active'::item_status WHERE id = $1`, [item_id]);
            return res.json({ success: true, message: 'Listing renewed and is now active.', item_status: 'active' });
        }

        if (itemStatus === 'pending_approval' || itemStatus === 'pending_payment') {
            if (itemStatus === 'pending_payment') {
                await db.query(`UPDATE Items SET status = 'pending_approval'::item_status WHERE id = $1`, [item_id]);
            }
            return res.json({
                success: true,
                message: 'Listing fee recorded. Your item is pending admin approval.',
                item_status: 'pending_approval',
            });
        }

        return res.status(400).json({ error: 'This item cannot be activated in its current state.' });
    } catch (error) {
        console.error('Pay Listing Error:', error);
        res.status(500).json({ error: 'Failed to process mock payment' });
    }
};

const initializeRenewal = async (req, res) => {
    try {
        const { item_id, start_chapa_checkout } = req.body;
        const ownerId = req.user?.id;

        if (!item_id) {
            return res.status(400).json({ error: 'item_id is required' });
        }

        if (start_chapa_checkout) {
            req.body.payment_type = 'renewal';
            req.body.itemId = item_id;
            return initializePayment(req, res);
        }

        const itemRes = await db.query(
            `SELECT i.title, i.price, i.status, i.transaction_type, i.owner_id, c.name AS category
             FROM Items i
             LEFT JOIN Categories c ON c.id = i.category_id
             WHERE i.id = $1`,
            [item_id]
        );

        if (itemRes.rows.length === 0) {
            return res.status(404).json({ error: 'Item not found' });
        }

        const item = itemRes.rows[0];
        if (Number(item.owner_id) !== Number(ownerId) && req.user?.role !== 'admin') {
            return res.status(403).json({ error: 'You do not own this listing.' });
        }

        const st = String(item.status || '').toLowerCase();
        if (st !== 'sold' && st !== 'rented') {
            return res.status(400).json({
                error: 'Renewal payment applies to listings marked Sold or Rented.',
            });
        }

        const price = Number(item.price);
        const { findMatchingRule } = require('./chargingController');
        const rule = await findMatchingRule('Renewal', item.transaction_type, item.category, price);

        let feeAmount = 0;
        let ruleId = null;
        if (rule) {
            const pct = Number(rule.fee_percentage) || 0;
            feeAmount = Math.round((price * pct) / 100 * 100) / 100;
            ruleId = rule.id;
        }

        const tx_ref = makeTxRef('renewal_fee');

        const existingPayment = await db.query(
            'SELECT id FROM item_payments WHERE item_id = $1 ORDER BY id DESC LIMIT 1',
            [item_id]
        );
        if (existingPayment.rows.length > 0) {
            await db.query(
                `UPDATE item_payments
                 SET fee_amount = $3, payment_status = 'Pending', payment_method = 'Chapa', rule_id = COALESCE($4, rule_id)
                 WHERE item_id = $1 AND owner_id = $2`,
                [item_id, ownerId, feeAmount, ruleId]
            );
        } else {
            await db.query(
                `INSERT INTO item_payments (item_id, owner_id, rule_id, item_price, fee_amount, payment_status, payment_method)
                 VALUES ($1, $2, $3, $4, $5, 'Pending', 'Chapa')`,
                [item_id, ownerId, ruleId, price, feeAmount]
            );
        }

        await db.query(
            `INSERT INTO Payments (owner_id, item_id, amount, payment_status, transaction_id, metadata)
             VALUES ($1, $2, $3, 'pending', $4, $5)`,
            [ownerId, item_id, feeAmount, tx_ref, JSON.stringify({ payment_type: 'renewal' })]
        );

        res.json({
            success: true,
            requires_payment: feeAmount > 0,
            fee_amount: feeAmount,
            tx_ref,
            item_id,
            test_mode: isTestMode(),
        });
    } catch (error) {
        console.error('Initialize Renewal Error:', error);
        res.status(500).json({ error: 'Failed to initialize renewal payment' });
    }
};

const chapaConfig = async (req, res) => {
    res.json({
        test_mode: isTestMode(),
        message: isTestMode()
            ? 'Chapa test mode is active.'
            : 'Chapa live mode is active.',
    });
};

module.exports = {
    initializePayment,
    verifyPayment,
    confirmRenewalPayment,
    postingFeeStatus,
    getMyPaymentSummary,
    mockCompletePostingFee,
    payListing,
    initializeRenewal,
    chapaConfig,
};