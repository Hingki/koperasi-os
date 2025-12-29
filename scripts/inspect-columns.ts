import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const table = process.argv[2];
    if (!table) {
        console.error('Please provide a table name');
        process.exit(1);
    }
    
    // Hacky way to get columns via an empty insert error or just select
    const { error } = await supabase.from(table).select('*').limit(0);
    if (error) {
        console.error('Error selecting:', error);
    } else {
        console.log('Table exists. Fetching sample...');
        const { data } = await supabase.from(table).select('*').limit(1);
        if (data && data.length > 0) {
            console.log('Columns:', Object.keys(data[0]));
        } else {
            console.log('Table empty, cannot infer columns easily without admin API or inspection function.');
        }
    }
}

main();
