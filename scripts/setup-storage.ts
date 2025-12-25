
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function main() {
  console.log('Setting up Storage Bucket: payment-proofs...');

  const { data, error } = await supabase.storage.createBucket('payment-proofs', {
    public: false,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
  });

  if (error) {
    if (error.message.includes('already exists')) {
      console.log('Bucket "payment-proofs" already exists.');
      
      // Update public status if needed (optional)
      const { error: updateError } = await supabase.storage.updateBucket('payment-proofs', {
        public: false,
        fileSizeLimit: 5242880,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
      });
      if (updateError) console.error('Error updating bucket:', updateError);
      else console.log('Bucket updated.');

    } else {
      console.error('Error creating bucket:', error);
    }
  } else {
    console.log('Bucket "payment-proofs" created successfully.');
  }
  
  // Note: Policies are not easily created via JS Client (requires SQL).
  // However, Service Role bypasses policies, so for the script it's fine.
  // Real users need policies. I should still rely on the SQL migration for policies.
  // But for now, let's assume the migration file I created is enough for documentation/future application.
  // Or I can try to use the RPC hack if available, but let's stick to the bucket creation which is the blocker for file upload.
}

main();
