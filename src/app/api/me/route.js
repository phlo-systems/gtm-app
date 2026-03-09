import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET() {
  const { profile, tenantId, role, can, supabase } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get tenant name
  const { data: tenant } = await supabase
    .from('tenants')
    .select('name')
    .eq('id', tenantId)
    .single()

  return NextResponse.json({
    id: profile.id,
    email: profile.email,
    full_name: profile.full_name,
    role,
    tenant_name: tenant?.name || '',
    permissions: {
      read: can('read'),
      write: can('write'),
      delete: can('delete'),
      approve: can('approve'),
      manage_team: can('manage_team'),
    },
  })
}
