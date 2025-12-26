// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Sanitize environment variables to remove accidental quotes or whitespace
  const envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const envKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const supabaseUrl = envUrl ? envUrl.replace(/['"`\s]/g, '') : '';
  const supabaseKey = envKey ? envKey.replace(/['"`\s]/g, '') : '';

  if (!supabaseUrl || !supabaseKey) {
    console.error("Supabase Environment Variables are missing in Client Component. Using placeholder.");
    // Return a placeholder client to prevent build crashes, but runtime will fail if config is missing
    return createBrowserClient(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  )
}