const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const db = require('./src/config/db');

async function checkSchema() {
  // Check items table
  const itemsCols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'items' 
    ORDER BY ordinal_position
  `);
  console.log('items columns:', itemsCols.rows.map(c => `${c.column_name}(${c.data_type})`).join(', '));

  // Check categories table
  const catCols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'categories' 
    ORDER BY ordinal_position
  `);
  console.log('categories columns:', catCols.rows.map(c => `${c.column_name}(${c.data_type})`).join(', '));

  // Check media table
  const mediaCols = await db.query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'media' 
    ORDER BY ordinal_position
  `);
  console.log('media columns:', mediaCols.rows.map(c => `${c.column_name}(${c.data_type})`).join(', '));

  // Check for ItemSearchIndex
  const hasIdx = await db.query("SELECT to_regclass('public.itemsearchindex') as exists");
  console.log('ItemSearchIndex exists:', hasIdx.rows[0].exists);

  // Test simple search query (without ItemSearchIndex)
  console.log('\nTesting simple search query...');
  try {
    const result = await db.query(`
      SELECT 
        i.id,
        i.title,
        i.transaction_type,
        i.price,
        i.location,
        c.name AS category,
        m.media_url AS image_url
      FROM items i
      LEFT JOIN categories c ON c.id = i.category_id
      LEFT JOIN LATERAL (
        SELECT media_url FROM media WHERE item_id = i.id ORDER BY id ASC LIMIT 1
      ) m ON true
      WHERE i.status = 'active'
        AND (i.title ILIKE $1 OR i.description ILIKE $1 OR i.location ILIKE $1)
      LIMIT 5
    `, ['%house%']);
    console.log('Simple search results:', result.rows.length);
  } catch (err) {
    console.error('Simple search error:', err.message);
  }

  process.exit(0);
}

checkSchema().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
