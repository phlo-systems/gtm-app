/**
 * GET    /api/opportunities         — List all opportunities
 * POST   /api/opportunities         — Create opportunity with initial scenario
 * PUT    /api/opportunities         — Update opportunity or add scenario
 * DELETE /api/opportunities?id=X    — Archive opportunity
 */
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // open, approved, converted, archived

    let query = supabase.from('deals').select('*')
      .eq('trade_type', 'opportunity')
      .order('created_at', { ascending: false });

    if (status) query = query.eq('status', status);

    const { data, error } = await query;
    if (error) return Response.json({ error: error.message }, { status: 500 });

    // Parse scenarios from extended field
    const opportunities = (data || []).map(d => ({
      ...d,
      scenarios: d.extended?.scenarios || [],
      selectedScenario: d.extended?.selectedScenario || null,
      opportunityNotes: d.extended?.opportunityNotes || '',
    }));

    return Response.json({ opportunities });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { data: { user } } = await supabase.auth.getUser();

    const {
      product, counterparty, route_origin, route_destination,
      estimatedVolume, estimatedValue, notes,
      scenario // First scenario
    } = body;

    const scenarios = scenario ? [{
      id: `scn_${Date.now()}`,
      name: scenario.name || 'Scenario A',
      ...scenario,
      createdAt: new Date().toISOString(),
    }] : [];

    const { data, error } = await supabase.from('deals').insert({
      trade_type: 'opportunity',
      status: 'draft',
      supplier_name: counterparty?.supplier || '',
      customer_name: counterparty?.customer || '',
      buy_location: route_origin || '',
      sell_location: route_destination || '',
      unit_price: scenario?.buyPrice || '',
      quantity: estimatedVolume || '',
      extended: {
        product,
        estimatedValue,
        scenarios,
        selectedScenario: null,
        opportunityNotes: notes || '',
        stage: 'structuring', // structuring → evaluating → recommended → approved → converted
      },
    }).select().single();

    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ success: true, opportunity: data });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { id, action, data: actionData } = body;

    if (!id) return Response.json({ error: 'Missing opportunity id' }, { status: 400 });

    const { data: opp, error: fetchErr } = await supabase.from('deals').select('*').eq('id', id).single();
    if (fetchErr || !opp) return Response.json({ error: 'Not found' }, { status: 404 });

    const ext = opp.extended || {};

    switch (action) {
      case 'add_scenario': {
        const scenarios = ext.scenarios || [];
        const newScenario = {
          id: `scn_${Date.now()}`,
          name: actionData.name || `Scenario ${String.fromCharCode(65 + scenarios.length)}`,
          ...actionData,
          createdAt: new Date().toISOString(),
        };
        scenarios.push(newScenario);
        ext.scenarios = scenarios;
        break;
      }

      case 'update_scenario': {
        const { scenarioId, ...updates } = actionData;
        ext.scenarios = (ext.scenarios || []).map(s =>
          s.id === scenarioId ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
        );
        break;
      }

      case 'select_scenario': {
        ext.selectedScenario = actionData.scenarioId;
        ext.stage = 'recommended';
        break;
      }

      case 'approve': {
        ext.stage = 'approved';
        ext.approvedAt = new Date().toISOString();
        ext.approvedBy = actionData.approverName || 'Unknown';
        break;
      }

      case 'convert_to_deal': {
        // Create a real deal from the selected scenario
        const scenario = (ext.scenarios || []).find(s => s.id === ext.selectedScenario);
        if (!scenario) return Response.json({ error: 'No scenario selected' }, { status: 400 });

        // Create the deal
        const { data: newDeal, error: createErr } = await supabase.from('deals').insert({
          trade_type: scenario.tradeType || 'cross_border_direct',
          transport_mode: scenario.transportMode || 'ocean',
          status: 'draft',
          supplier_name: scenario.supplierName || opp.supplier_name,
          customer_name: scenario.customerName || opp.customer_name,
          buy_incoterm: scenario.buyIncoterm || 'FOB',
          sell_incoterm: scenario.sellIncoterm || 'CIF',
          buy_location: scenario.buyLocation || opp.buy_location,
          sell_location: scenario.sellLocation || opp.sell_location,
          unit_price: scenario.buyPrice || opp.unit_price,
          sell_price: scenario.sellPrice,
          quantity: scenario.tonnage || opp.quantity,
          hs_code: scenario.hsCode,
          cost_currency: scenario.currency || 'USD',
          extended: {
            ...scenario.extendedFields,
            convertedFromOpportunity: id,
            convertedFromScenario: scenario.id,
            tonnage: scenario.tonnage || opp.quantity,
            sell_price: scenario.sellPrice,
            pricingData: scenario.pricingData || {},
          },
        }).select().single();

        if (createErr) return Response.json({ error: createErr.message }, { status: 500 });

        // Mark opportunity as converted
        ext.stage = 'converted';
        ext.convertedToDealId = newDeal.id;
        ext.convertedAt = new Date().toISOString();

        const { error: updErr } = await supabase.from('deals').update({
          status: 'approved',
          extended: ext,
        }).eq('id', id);

        return Response.json({ success: true, deal: newDeal, opportunityStage: 'converted' });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const { error: updErr } = await supabase.from('deals').update({ extended: ext }).eq('id', id);
    if (updErr) return Response.json({ error: updErr.message }, { status: 500 });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
