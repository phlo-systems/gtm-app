import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(request, { params }) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('actuals')
    .select('*')
    .eq('deal_id', params.id)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] || null)
}

export async function POST(request, { params }) {
  const { supabase, tenantId, user } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('actuals')
    .insert({
      deal_id: params.id,
      actual_cost_lines: body.actual_cost_lines,
      actual_total_cost: body.actual_total_cost,
      actual_sales_revenue: body.actual_sales_revenue,
      actual_payment_delay_days: body.actual_payment_delay_days || 0,
      budget_total_cost: body.budget_total_cost,
      variance_total: body.variance_total,
      variance_pct: body.variance_pct,
      uploaded_by: user?.email,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
