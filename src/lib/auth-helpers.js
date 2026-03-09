import { createClient } from './supabase-server'

// Role-based permissions: what each role can do
const PERMISSIONS = {
  admin:      { read: true, write: true, delete: true, approve: true, manage_team: true },
  trader:     { read: true, write: true, delete: false, approve: false, manage_team: false },
  forwarder:  { read: true, write: true, delete: false, approve: false, manage_team: false },
  finance:    { read: true, write: true, delete: false, approve: true, manage_team: false },
  approver:   { read: true, write: false, delete: false, approve: true, manage_team: false },
  operations: { read: true, write: true, delete: false, approve: false, manage_team: false },
  viewer:     { read: true, write: false, delete: false, approve: false, manage_team: false },
}

export async function getCurrentUser() {
  const supabase = createClient()
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { user: null, profile: null, tenantId: null, supabase, role: null, can: () => false }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'viewer'
  const perms = PERMISSIONS[role] || PERMISSIONS.viewer

  return {
    user,
    profile,
    tenantId: profile?.tenant_id,
    supabase,
    role,
    can: (action) => perms[action] === true,
  }
}
