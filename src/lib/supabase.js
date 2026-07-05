const env = import.meta.env || {};

export const supabaseUrl = env.VITE_SUPABASE_URL || "";
export const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || "";

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("[Min Ordbok] Missing Supabase config. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
}

if (!globalThis.supabase?.createClient) {
  throw new Error("[Min Ordbok] Supabase client library is not loaded.");
}

export const supabase = globalThis.supabase.createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
