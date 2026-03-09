import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: deal, error } = await supabase
    .from('deals')
    .select(`
      *,
      customer:counterparties!deals_customer_id_fkey(id, name, country, payment_terms),
      supplier:counterparties!deals_supplier_id_fkey(id, name, country, payment_terms),
      product:products(id, name, hs_code, units_per_case, cases_per_container),
      cost_matrices(
        id, version, status, total_cost, gross_margin_pct, locked_at,
        cost_lines(*)
      ),
      approvals(id, action, comment, created_at, user_id)
    `)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(deal)
}

export async function PUT(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Only allow updates to draft deals
  const { data: existing } = await supabase
    .from('deals')
    .select('status')
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .single()

  if (!existing) return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
  if (existing.status !== 'draft') {
    return NextResponse.json({ error: 'Only draft deals can be edited' }, { status: 403 })
  }

  // Remove fields that shouldn't be updated directly
  const { id, tenant_id, deal_number, created_at, created_by, ...updateData } = body

  const { data: deal, error } = await supabase
    .from('deals')
    .update(updateData)
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .select(`
      *,
      customer:counterparties!deals_customer_id_fkey(id, name),
      supplier:counterparties!deals_supplier_id_fkey(id, name)
    `)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(deal)
}

export async function DELETE(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase
    .from('deals')
    .delete()
    .eq('id', params.id)
    .eq('tenant_id', tenantId)
    .eq('status', 'draft') // Only delete drafts

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deleted: true })
}
