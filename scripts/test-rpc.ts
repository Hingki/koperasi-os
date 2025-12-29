
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testRpc() {
    console.log('Testing exec_sql RPC...');
    const { data, error } = await supabase.rpc('exec_sql', { sql: 'SELECT 1' });
    
    if (error) {
        console.error('RPC exec_sql failed:', error);
        // Try 'exec'
        const { data: data2, error: error2 } = await supabase.rpc('exec', { query: 'SELECT 1' });
        if (error2) {
             console.error('RPC exec failed:', error2);
        } else {
            console.log('RPC exec success');
        }
    } else {
        console.log('RPC exec_sql success');
    }
}

testRpc();
