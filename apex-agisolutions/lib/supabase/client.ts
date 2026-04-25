import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin client for server-side trusted operations
// Bypasses Row Level Security (RLS) entirely
export const supabaseServer = createClient(supabaseUrl, supabaseServiceKey)