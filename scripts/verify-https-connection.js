
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkProducts() {
    console.log("Connecting to Supabase via HTTPS...");
    const { data, error } = await supabase
        .from('ppob_products')
        .select('id, name, price')
        .limit(3);

    if (error) {
        console.error("Error fetching products:", error.message);
    } else {
        console.log("Success! Found products in database:");
        console.table(data);
        console.log("This confirms the app can read the new table via HTTPS.");
    }
}

checkProducts();
