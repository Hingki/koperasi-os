const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const dotenv = require('dotenv');

// Load .env first
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
// Load .env.local (overrides .env)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing env vars. Check .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function confirmUserEmail(email) {
  console.log(`🔍 Finding user with email: ${email}...`);

  // 1. Get user by email
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers();
  
  if (userError) {
    console.error("❌ Error listing users:", userError);
    return;
  }

  const user = users.find(u => u.email === email);

  if (!user) {
    console.error(`❌ User ${email} not found.`);
    return;
  }

  console.log(`👤 Found user: ${user.email} (ID: ${user.id})`);
  console.log(`Current status: Email Confirmed at: ${user.email_confirmed_at}`);

  if (user.email_confirmed_at) {
    console.log("✅ User is already confirmed.");
    return;
  }

  // 2. Update user to confirm email
  console.log("⚡ Confirming email...");
  
  const { data, error: updateError } = await supabase.auth.admin.updateUserById(
    user.id,
    { email_confirm: true }
  );

  if (updateError) {
    console.error("❌ Failed to confirm email:", updateError);
    return;
  }

  console.log("🎉 SUCCESS! Email has been manually confirmed.");
  console.log("New confirmed_at:", data.user.email_confirmed_at);
}

const email = process.argv[2];

if (!email) {
    console.log("No email provided. Listing all unconfirmed users...");
    listUnconfirmedUsers();
} else {
    confirmUserEmail(email);
}

async function listUnconfirmedUsers() {
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error("Error listing users:", error);
        return;
    }
    
    const unconfirmed = users.filter(u => !u.email_confirmed_at);
    
    if (unconfirmed.length === 0) {
        console.log("No unconfirmed users found.");
    } else {
        console.log(`Found ${unconfirmed.length} unconfirmed users:`);
        unconfirmed.forEach(u => {
            console.log(`- ${u.email} (ID: ${u.id})`);
        });
        console.log("\nTo confirm a user run: node scripts/confirm-email.js <email>");
    }
}
