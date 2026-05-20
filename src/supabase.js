let supabaseInstance = null

export function getSupabase() {
  if (supabaseInstance) return supabaseInstance

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

  if (window.supabase && supabaseUrl && supabaseAnonKey) {
    supabaseInstance = window.supabase.createClient(supabaseUrl, supabaseAnonKey)
  }

  return supabaseInstance
}
