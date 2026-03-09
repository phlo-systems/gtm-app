import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

// GET /api/team - List team members and pending invitations
export async function GET() {
  const { supabase, tenantId, can } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: members, error: membersErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, created_at')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  if (membersErr) return NextResponse.json({ error: membersErr.message }, { status: 500 })

  let invitations = []
  if (can('manage_team')) {
    const { data: invites } = await supabase
      .from('invitations')
      .select('id, email, role, status, created_at, expires_at')
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
    invitations = invites || []
  }

  const { data: tenant } = await supabase
    .from('tenants')
    .select('id, name, slug')
    .eq('id', tenantId)
    .single()

  return NextResponse.json({ members: members || [], invitations, tenant })
}

// POST /api/team - Invite a new team member
export async function POST(request) {
  const { supabase, tenantId, profile, can } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can('manage_team')) return NextResponse.json({ error: 'Only admins can invite team members' }, { status: 403 })

  const body = await request.json()
  const { email, role } = body
  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })

  const validRoles = ['trader', 'forwarder', 'finance', 'approver', 'operations', 'viewer']
  const assignRole = validRoles.includes(role) ? role : 'trader'

  // Check if already a member
  const { data: existingMember } = await supabase
    .from('profiles')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', email.toLowerCase())
    .single()

  if (existingMember) return NextResponse.json({ error: 'This user is already a team member' }, { status: 409 })

  // Check if already invited
  const { data: existingInvite } = await supabase
    .from('invitations')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('email', email.toLowerCase())
    .eq('status', 'pending')
    .single()

  if (existingInvite) return NextResponse.json({ error: 'An invitation is already pending for this email' }, { status: 409 })

  const { data: invitation, error } = await supabase
    .from('invitations')
    .insert({
      tenant_id: tenantId,
      email: email.toLowerCase(),
      role: assignRole,
      invited_by: profile.id,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(invitation, { status: 201 })
}

// PUT /api/team - Update a member's role
export async function PUT(request) {
  const { supabase, tenantId, profile, can } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can('manage_team')) return NextResponse.json({ error: 'Only admins can change roles' }, { status: 403 })

  const body = await request.json()
  const { member_id, role } = body
  if (!member_id || !role) return NextResponse.json({ error: 'member_id and role required' }, { status: 400 })
  if (member_id === profile.id) return NextResponse.json({ error: 'You cannot change your own role' }, { status: 400 })

  const validRoles = ['admin', 'trader', 'forwarder', 'finance', 'approver', 'operations', 'viewer']
  if (!validRoles.includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 })

  const { data, error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', member_id)
    .eq('tenant_id', tenantId)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/team - Remove a member or cancel an invitation
export async function DELETE(request) {
  const { supabase, tenantId, profile, can } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!can('manage_team')) return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const memberId = searchParams.get('member_id')
  const invitationId = searchParams.get('invitation_id')

  if (invitationId) {
    const { error } = await supabase
      .from('invitations')
      .delete()
      .eq('id', invitationId)
      .eq('tenant_id', tenantId)
      .eq('status', 'pending')
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
  }

  if (memberId) {
    if (memberId === profile.id) return NextResponse.json({ error: 'You cannot remove yourself' }, { status: 400 })
    const { error } = await supabase
      .from('profiles')
      .delete()
      .eq('id', memberId)
      .eq('tenant_id', tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ deleted: true })
  }

  return NextResponse.json({ error: 'Provide member_id or invitation_id' }, { status: 400 })
}
