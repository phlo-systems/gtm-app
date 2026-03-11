/**
 * GET  /api/commissions        — List all commissions across deals
 * POST /api/commissions        — Add a commission to a deal
 * PUT  /api/commissions        — Update commission status (invoiced/paid)
 */
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: deals, error } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });

    const commissions = [];
    (deals || []).forEach(deal => {
      const ext = deal.extended || {};
      const comms = ext.commissions || [];
      comms.forEach(c => {
        commissions.push({ ...c, deal_id: deal.id, deal_number: deal.deal_number });
      });
    });

    return Response.json({ commissions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { deal_id, ...commData } = body;

    if (!deal_id) return Response.json({ error: 'Missing deal_id' }, { status: 400 });

    const { data: deal, error: fetchErr } = await supabase.from('deals').select('*').eq('id', deal_id).single();
    if (fetchErr || !deal) return Response.json({ error: 'Deal not found' }, { status: 404 });

    const ext = deal.extended || {};
    const commissions = ext.commissions || [];
    const newComm = {
      id: `comm_${Date.now()}`,
      ...commData,
      created_at: new Date().toISOString(),
    };
    commissions.push(newComm);

    const { error: updErr } = await supabase.from('deals').update({
      extended: { ...ext, commissions },
    }).eq('id', deal_id);

    if (updErr) return Response.json({ error: updErr.message }, { status: 500 });
    return Response.json({ success: true, commission: newComm });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) return Response.json({ error: 'Missing id or status' }, { status: 400 });

    // Find the deal containing this commission
    const { data: deals, error } = await supabase.from('deals').select('*');
    if (error) return Response.json({ error: error.message }, { status: 500 });

    for (const deal of (deals || [])) {
      const ext = deal.extended || {};
      const comms = ext.commissions || [];
      const idx = comms.findIndex(c => c.id === id);
      if (idx >= 0) {
        comms[idx].status = status;
        comms[idx].updated_at = new Date().toISOString();
        if (status === 'invoiced') comms[idx].invoiced_at = new Date().toISOString();
        if (status === 'paid') comms[idx].paid_at = new Date().toISOString();

        const { error: updErr } = await supabase.from('deals').update({
          extended: { ...ext, commissions: comms },
        }).eq('id', deal.id);

        if (updErr) return Response.json({ error: updErr.message }, { status: 500 });
        return Response.json({ success: true, commission: comms[idx] });
      }
    }

    return Response.json({ error: 'Commission not found' }, { status: 404 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
