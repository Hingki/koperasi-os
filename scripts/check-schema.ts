
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkColumn() {
  console.log('Checking support_tickets schema...');
  
  // Try to select admin_response
  const { data, error } = await supabase
    .from('support_tickets')
    .select('admin_response')
    .limit(1);

  if (error) {
    console.error('Error selecting admin_response:', error);
    // Likely "Could not find the 'admin_response' column..."
  } else {
    console.log('Column admin_response exists!');
  }
}

checkColumn();
