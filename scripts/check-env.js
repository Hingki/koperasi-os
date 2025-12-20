console.log("Checking ENV vars...");
console.log("URL:", process.env.NEXT_PUBLIC_SUPABASE_URL ? "Present" : "Missing");
console.log("Key:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "Present" : "Missing");
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log("Key Length:", process.env.SUPABASE_SERVICE_ROLE_KEY.length);
}
