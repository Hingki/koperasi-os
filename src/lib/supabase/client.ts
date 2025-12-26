// src/lib/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  // Sanitize environment variables to remove accidental quotes or whitespace
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/['"`\s]/g, '');
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.replace(/['"`\s]/g, '');

  if (!supabaseUrl || !supabaseKey) {
    // In development, we might want to throw to alert the developer
    // In production, this will likely cause a crash if not handled, but at least the error is clear
    console.error("Supabase Environment Variables are missing in Client Component.");
    throw new Error("Missing Supabase configuration");
  }

  return createBrowserClient(
    supabaseUrl,
    supabaseKey
  )
}