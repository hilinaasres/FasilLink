const db = require('../config/db');

const normalizeTransactionType = (type) => {
    if (!type) return 'Sale';
    const t = String(type).toLowerCase();
    if (t === 'rent') return 'Rent';
    return 'Sale'; // sell / sale -> Sale
};

const normalizeListingType = (type) => {
    if (!type) return 'New Item';
    const t = String(type).toLowerCase();
    if (t === 'renewal' || t === 'renew') return 'Renewal';
    return 'New Item';
};

const normalizeCategory = (category) => {
    if (!category) return '';
    const c = String(category).toLowerCase();
    if (c === 'homes' || c === 'home' || c === 'properties' || c === 'property') return 'Homes';
    if (c === 'vehicles' || c === 'vehicle' || c === 'cars' || c === 'car') return 'Vehicles';
    if (c === 'events' || c === 'event' || c === 'event rentals' || c === 'event materials') return 'Event Materials';
    // Capitalize first letter of category if not matches
    return category.charAt(0).toUpperCase() + category.slice(1);
};

// Find matching rule
const findMatchingRule = async (listingType, transactionType, category, price) => {
    const normListingType = normalizeListingType(listingType);
    const normTransType = normalizeTransactionType(transactionType);
    const normCat = normalizeCategory(category);
    const numPrice = Number(price) || 0;

    // First try strict match with category normalization
    let result = await db.query(
        `SELECT * FROM charging_rules 
         WHERE is_active = true 
           AND LOWER(listing_type) = LOWER($1)
           AND LOWER(transaction_type) = LOWER($2)
           AND (LOWER(category) = LOWER($3) OR LOWER(category) = LOWER($4))
           AND $5 >= min_price AND $5 <= max_price
         ORDER BY min_price DESC
         LIMIT 1`,
        [normListingType, normTransType, normCat, category, numPrice]
    );

    // Fallback: If no strict category match, try to find a global/general rule if exists, 
    // or just return null if nothing matches.
    if (result.rows.length === 0) {
        // Find general rule for this listing & transaction type with category 'All' or empty
        result = await db.query(
            `SELECT * FROM charging_rules 
             WHERE is_active = true 
               AND LOWER(listing_type) = LOWER($1)
               AND LOWER(transaction_type) = LOWER($2)
               AND (LOWER(category) = 'all' OR LOWER(category) = 'any' OR category = '*')
               AND $3 >= min_price AND $3 <= max_price
             ORDER BY min_price DESC
             LIMIT 1`,
            [normListingType, normTransType, numPrice]
        );
    }

    return result.rows[0] || null;
};

// 1. Get all rules
const getRules = async (req, res) => {
    try {
        const result = await db.query('SELECT * FROM charging_rules ORDER BY id DESC');
        res.json({ success: true, rules: result.rows });
    } catch (error) {
        console.error('Get Rules Error:', error);
        res.status(500).json({ error: 'Failed to load charging rules' });
    }
};

// 2. Create rule
const createRule = async (req, res) => {
    try {
        const { listing_type, transaction_type, category, min_price, max_price, fee_percentage } = req.body;

        if (!listing_type || !transaction_type || !category || min_price === undefined || max_price === undefined || fee_percentage === undefined) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const normListing = normalizeListingType(listing_type);
        const normTrans = normalizeTransactionType(transaction_type);
        const normCat = normalizeCategory(category);

        const result = await db.query(
            `INSERT INTO charging_rules (listing_type, transaction_type, category, min_price, max_price, fee_percentage)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [normListing, normTrans, normCat, Number(min_price), Number(max_price), Number(fee_percentage)]
        );

        res.status(201).json({ success: true, rule: result.rows[0] });
    } catch (error) {
        console.error('Create Rule Error:', error);
        res.status(500).json({ error: 'Failed to create charging rule' });
    }
};

// 3. Edit rule
const updateRule = async (req, res) => {
    try {
        const { id } = req.params;
        const { listing_type, transaction_type, category, min_price, max_price, fee_percentage } = req.body;

        const ruleCheck = await db.query('SELECT * FROM charging_rules WHERE id = $1', [id]);
        if (ruleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        const normListing = listing_type ? normalizeListingType(listing_type) : ruleCheck.rows[0].listing_type;
        const normTrans = transaction_type ? normalizeTransactionType(transaction_type) : ruleCheck.rows[0].transaction_type;
        const normCat = category ? normalizeCategory(category) : ruleCheck.rows[0].category;
        const minP = min_price !== undefined ? Number(min_price) : ruleCheck.rows[0].min_price;
        const maxP = max_price !== undefined ? Number(max_price) : ruleCheck.rows[0].max_price;
        const feeP = fee_percentage !== undefined ? Number(fee_percentage) : ruleCheck.rows[0].fee_percentage;

        const result = await db.query(
            `UPDATE charging_rules 
             SET listing_type = $1, transaction_type = $2, category = $3, min_price = $4, max_price = $5, fee_percentage = $6, updated_at = CURRENT_TIMESTAMP
             WHERE id = $7
             RETURNING *`,
            [normListing, normTrans, normCat, minP, maxP, feeP, id]
        );

        res.json({ success: true, rule: result.rows[0] });
    } catch (error) {
        console.error('Update Rule Error:', error);
        res.status(500).json({ error: 'Failed to update charging rule' });
    }
};

// 4. Toggle rule active state
const toggleRule = async (req, res) => {
    try {
        const { id } = req.params;
        const ruleCheck = await db.query('SELECT is_active FROM charging_rules WHERE id = $1', [id]);
        if (ruleCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }

        const nextActive = !ruleCheck.rows[0].is_active;
        const result = await db.query(
            'UPDATE charging_rules SET is_active = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
            [nextActive, id]
        );

        res.json({ success: true, rule: result.rows[0] });
    } catch (error) {
        console.error('Toggle Rule Error:', error);
        res.status(500).json({ error: 'Failed to toggle rule state' });
    }
};

// 5. Delete rule
const deleteRule = async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query('DELETE FROM charging_rules WHERE id = $1 RETURNING id', [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Rule not found' });
        }
        res.json({ success: true, message: 'Rule deleted successfully' });
    } catch (error) {
        console.error('Delete Rule Error:', error);
        res.status(500).json({ error: 'Failed to delete charging rule' });
    }
};

// 6. Get payments (Payment Monitoring)
const getPayments = async (req, res) => {
    try {
        const result = await db.query(
            `SELECT ip.id, ip.item_price, ip.fee_amount, ip.payment_status, ip.payment_method, ip.created_at,
                    u.name AS owner_name, u.email AS owner_email,
                    i.title AS item_title, i.status AS item_activation_status,
                    cr.fee_percentage, cr.category, cr.transaction_type, cr.listing_type
             FROM item_payments ip
             LEFT JOIN Users u ON u.id = ip.owner_id
             LEFT JOIN Items i ON i.id = ip.item_id
             LEFT JOIN charging_rules cr ON cr.id = ip.rule_id
             ORDER BY ip.created_at DESC
             LIMIT 100`
        );
        res.json({ success: true, payments: result.rows });
    } catch (error) {
        console.error('Get Charging Payments Error:', error);
        res.status(500).json({ error: 'Failed to fetch payments data' });
    }
};

// 7. Public fee calculation
const calculateFee = async (req, res) => {
    try {
        const { listing_type, transaction_type, category, price, premium } = req.body;
        
        if (!category || price === undefined) {
            return res.status(400).json({ error: 'Category and price are required' });
        }

        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({ error: 'Price must be a non-negative number' });
        }

        const rule = await findMatchingRule(listing_type, transaction_type, category, numPrice);

        if (!rule) {
            return res.json({
                success: true,
                fee_percentage: 0,
                fee_amount: 0,
                rule_id: null,
                message: 'No charging rule matches this item. Listed for free.'
            });
        }

        const percentage = Number(rule.fee_percentage);
        const premiumEnabled = Boolean(premium);
        const adjustedPercentage = premiumEnabled ? percentage + 1 : percentage;
        const feeAmount = Math.round((numPrice * adjustedPercentage) / 100 * 100) / 100; // precision

        res.json({
            success: true,
            fee_percentage: adjustedPercentage,
            fee_amount: feeAmount,
            rule_id: rule.id,
            rule_details: {
                category: rule.category,
                transaction_type: rule.transaction_type,
                listing_type: rule.listing_type
            },
            premium: premiumEnabled,
            premium_surcharge_percent: premiumEnabled ? 1 : 0,
        });
    } catch (error) {
        console.error('Calculate Fee Error:', error);
        res.status(500).json({ error: 'Failed to calculate listing fee' });
    }
};

module.exports = {
    getRules,
    createRule,
    updateRule,
    toggleRule,
    deleteRule,
    getPayments,
    calculateFee,
    findMatchingRule
};
