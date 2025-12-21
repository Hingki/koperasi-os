const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function promoteLatestUserToAdmin() {
  console.log("🔍 Finding latest user...");

  // 1. Get latest user
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1,
    sortBy: { field: 'created_at', direction: 'desc' }
  });

  if (userError || !users || users.length === 0) {
    console.error("❌ No users found.", userError);
    return;
  }

  const user = users[0];
  console.log(`👤 Found user: ${user.email} (ID: ${user.id})`);

  // 2. Get Koperasi ID
  const { data: koperasi } = await supabase.from('koperasi').select('id').limit(1).single();
  const koperasiId = koperasi?.id || '5dbd0f3f-e591-4714-8522-2809eb9f3d33';

  // 3. Upsert Admin Role
  console.log("⚡ Promoting to ADMIN...");
  
  const { error: roleError } = await supabase
    .from('user_role')
    .upsert({
      user_id: user.id,
      koperasi_id: koperasiId,
      role: 'admin',
      is_active: true,
      permissions: ['*'] // Give all permissions
    }, { onConflict: 'user_id,koperasi_id' });

  if (roleError) {
    console.error("❌ Failed to set role:", roleError);
    return;
  }

  // 4. Activate Member Status
  console.log("✅ Activating member status...");
  const { error: memberError } = await supabase
    .from('member')
    .update({ status: 'active' })
    .eq('user_id', user.id);

  if (memberError) {
    console.error("⚠️ Failed to activate member (might not exist yet):", memberError);
  } else {
    console.log("✅ Member activated.");
  }

  console.log("🎉 SUCCESS! User is now an ADMIN.");
}

promoteLatestUserToAdmin();
