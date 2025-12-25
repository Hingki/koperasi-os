console.log("Checking koperasi table...");
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkKoperasi() {
  const { data, error } = await supabase.from('koperasi').select('id, nama').limit(1);
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Koperasi Data:", data);
  }
}

checkKoperasi();
