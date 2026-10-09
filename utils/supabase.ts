import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function createSupabaseClient(): SupabaseClient | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return null;

  try {
    return createClient(supabaseUrl, supabaseAnonKey);
  } catch {
    return null;
  }
}

export const supabase = createSupabaseClient();
export const isSupabaseConfigured = supabase !== null;
