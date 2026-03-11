/**
 * GET  /api/finance/lc    — List all financing facilities across deals
 * POST /api/finance/lc    — Create a new facility (LC, loan, etc.)
 * PUT  /api/finance/lc    — Update facility status through LC lifecycle
 */
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: deals, error } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const facilities = [];
    (deals || []).forEach(deal => {
      const ext = deal.extended || {};
      const facs = ext.finance_facilities || [];
      facs.forEach(f => {
        facilities.push({ ...f, deal_id: deal.id, deal_number: deal.deal_number });
      });
    });

    return Response.json({ facilities });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { deal_id, ...facData } = body;

    if (!deal_id) return Response.json({ error: 'Missing deal_id' }, { status: 400 });

    const { data: deal, error: fetchErr } = await supabase.from('deals').select('*').eq('id', deal_id).single();
    if (fetchErr || !deal) return Response.json({ error: 'Deal not found' }, { status: 404 });

    const ext = deal.extended || {};
    const facilities = ext.finance_facilities || [];
    const newFac = {
      id: `fac_${Date.now()}`,
      ...facData,
      created_at: new Date().toISOString(),
      status_history: [{ status: facData.status || 'draft', date: new Date().toISOString() }],
    };
    facilities.push(newFac);

    const { error: updErr } = await supabase.from('deals').update({
      extended: { ...ext, finance_facilities: facilities },
    }).eq('id', deal_id);

    if (updErr) return Response.json({ error: updErr.message }, { status: 500 });
    return Response.json({ success: true, facility: newFac });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { id, status, ...updates } = body;

    if (!id) return Response.json({ error: 'Missing facility id' }, { status: 400 });

    const { data: deals, error } = await supabase.from('deals').select('*');
    if (error) return Response.json({ error: error.message }, { status: 500 });

    for (const deal of (deals || [])) {
      const ext = deal.extended || {};
      const facs = ext.finance_facilities || [];
      const idx = facs.findIndex(f => f.id === id);
      if (idx >= 0) {
        if (status) {
          facs[idx].status = status;
          facs[idx].status_history = [...(facs[idx].status_history || []), { status, date: new Date().toISOString() }];
        }
        Object.assign(facs[idx], updates);
        facs[idx].updated_at = new Date().toISOString();

        const { error: updErr } = await supabase.from('deals').update({
          extended: { ...ext, finance_facilities: facs },
        }).eq('id', deal.id);

        if (updErr) return Response.json({ error: updErr.message }, { status: 500 });
        return Response.json({ success: true, facility: facs[idx] });
      }
    }

    return Response.json({ error: 'Facility not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
