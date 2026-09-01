const dotenv = require('dotenv');
dotenv.config({ path: './.env' });
const db = require('./src/config/db');

async function checkEnums() {
  const res = await db.query(`
    SELECT t.typname, pg_catalog.format_type(t.oid, NULL) as output
    FROM pg_type t
    JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
    WHERE t.typcategory = 'E'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  `);
  console.log('Enum types:', res.rows.map(r => `${r.typname} -> ${r.output}`).join(', '));

  // Check specific enums
  const check = await db.query("SELECT * FROM pg_type WHERE typname IN ('trans_type', 'item_status')");
  console.log('Found expected enums:', check.rows.map(r => r.typname));

  process.exit(0);
}

checkEnums().catch(err => {
  console.error('ERR:', err);
  process.exit(1);
});
