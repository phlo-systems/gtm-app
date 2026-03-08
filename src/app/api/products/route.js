import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth-helpers'

export async function GET(request) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request) {
  const { supabase, tenantId } = await getCurrentUser()
  if (!tenantId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('products')
    .insert({
      tenant_id: tenantId,
      name: body.name,
      hs_code: body.hs_code,
      units_per_case: body.units_per_case || 1,
      cases_per_container: body.cases_per_container || 1,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
