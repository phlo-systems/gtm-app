import { createClient } from './supabase-server'

export async function getCurrentUser() {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { user: null, profile: null, tenantId: null, supabase }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return {
    user,
    profile,
    tenantId: profile?.tenant_id,
    supabase,
  }
}
