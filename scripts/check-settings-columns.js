
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSettingsColumns() {
    console.log("Checking ppob_settings columns...");
    // Try to select the new columns
    const { data, error } = await supabase
        .from('ppob_settings')
        .select('deposit_account_code, revenue_account_code')
        .limit(1);

    if (error) {
        console.error("Error/Missing Columns:", error.message);
        console.log("You probably need to run the migration for accounting config.");
    } else {
        console.log("Success! Columns exist.");
    }
}

checkSettingsColumns();
