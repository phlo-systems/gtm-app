import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function POST(request, { params }) {
  const { supabase, tenantId, profile, can } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { action, comment } = await request.json()
  
  const validActions = ['submit', 'approve', 'reject', 'return']
  if (!validActions.includes(action)) {
    return NextResponse.json({ error: `Invalid action. Must be one of: ${validActions.join(', ')}` }, { status: 400 })
  }

  // Permission check: submit needs write, approve/reject need approve permission
  if (action === 'submit' && !can('write')) {
    return NextResponse.json({ error: 'No permission to submit deals' }, { status: 403 })
  }
  if (['approve', 'reject', 'return'].includes(action) && !can('approve')) {
    return NextResponse.json({ error: 'No permission to approve/reject deals' }, { status: 403 })
  }

  // Get current deal
  const { data: deal, error: dealError } = await supabase
    .from('deals')
    .select('status')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (dealError || !deal) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })

  // Validate state transitions
  const transitions = {
    submit: { from: ['draft'], to: 'submitted' },
    approve: { from: ['submitted'], to: 'approved' },
    reject: { from: ['submitted'], to: 'rejected' },
    return: { from: ['submitted', 'rejected'], to: 'draft' },
  }

  const transition = transitions[action]
  if (!transition.from.includes(deal.status)) {
    return NextResponse.json({ 
      error: `Cannot ${action} a deal with status "${deal.status}". Allowed from: ${transition.from.join(', ')}` 
    }, { status: 400 })
  }

  // Update deal status
  const updateData = { status: transition.to }
  if (action === 'approve') {
    updateData.approved_by = profile.id
    updateData.approved_at = new Date().toISOString()
  }

  const { error: updateError } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', params.id)

  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

  // Record approval action
  await supabase
    .from('approvals')
    .insert({
      deal_id: params.id,
      action,
      user_id: profile.id,
      comment: comment || null,
    })

  // If approving, lock the cost matrix
  if (action === 'approve') {
    await supabase
      .from('cost_matrices')
      .update({ 
        status: 'approved', 
        locked_at: new Date().toISOString(),
        approved_by: profile.id 
      })
      .eq('deal_id', params.id)
      .eq('status', 'draft')
  }

  return NextResponse.json({ 
    success: true, 
    deal_id: params.id, 
    action, 
    new_status: transition.to 
  })
}
