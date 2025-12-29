
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    console.log('Inspecting Koperasi table...');
    const { data: koperasis, error } = await supabase.from('koperasi').select('*');
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Koperasi count:', koperasis.length);
        console.log('Data:', koperasis);
    }
}

inspect();
