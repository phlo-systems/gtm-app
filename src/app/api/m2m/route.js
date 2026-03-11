/**
 * GET /api/m2m
 * =============
 * Mark-to-Market calculation for all open positions.
 * Fetches deals with pricing data, gets current market prices via AI, 
 * calculates unrealised P&L per contract and consolidated.
 *
 * POST /api/m2m  
 * Recalculate M2M for specific deals or trigger price refresh.
 * Body: { dealIds?: [], refreshPrices?: boolean }
 */
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Fetch all active deals (draft, submitted, approved) with extended data
    const { data: deals, error } = await supabase
      .from('deals')
      .select('*')
      .in('status', ['draft', 'submitted', 'approved'])
      .order('created_at', { ascending: false });

    if (error) return Response.json({ error: error.message }, { status: 500 });
    if (!deals || deals.length === 0) return Response.json({ positions: [], summary: { totalUnrealisedPnl: 0, dealCount: 0 } });

    // Calculate M2M for each deal
    const positions = deals.map(deal => {
      const ext = deal.extended || {};
      const pricing = ext.pricingData || {};
      const fixation = ext.fixation || {};
      const rollover = ext.rollover || {};

      // Determine contract price (fixed price or current deal price)
      const contractPrice = fixation.fixedPrice || parseFloat(deal.unit_price) || 0;
      const tonnage = parseFloat(deal.quantity) || parseFloat(ext.tonnage) || 0;
      
      // Current market price (from last fetch)
      const marketPrice = ext.currentMarketPrice || contractPrice;
      
      // M2M = (Market Price - Contract Price) × Quantity
      // For a buyer: positive if market went up (asset worth more)
      // For a seller: positive if market went down
      const isBuyer = true; // Default perspective: we bought at contract price
      const unrealisedPnl = (marketPrice - contractPrice) * tonnage;
      const unrealisedPnlPct = contractPrice > 0 ? ((marketPrice - contractPrice) / contractPrice) * 100 : 0;

      // Rollover adjustment
      const rolloverAdjustment = rollover.totalAdjustment || 0;

      return {
        dealId: deal.id,
        dealNumber: deal.deal_number,
        status: deal.status,
        customer: deal.customer?.name || ext.customer_name || deal.customer_name || '',
        supplier: deal.supplier?.name || ext.supplier_name || deal.supplier_name || '',
        product: deal.product?.name || ext.commodity || '',
        
        // Pricing
        contractPrice,
        marketPrice,
        currency: deal.cost_currency || 'USD',
        tonnage,
        
        // Futures info
        futuresContract: pricing.contractCode || '',
        futuresMonth: pricing.contractMonth || '',
        basis: pricing.buyBasis || 0,
        
        // Fixation
        isFixed: !!fixation.fixedPrice,
        fixedPrice: fixation.fixedPrice || null,
        fixedDate: fixation.fixedDate || null,
        fixedFutures: fixation.futuresAtFixation || null,
        
        // Rollover
        hasRollover: !!rollover.rolledFrom,
        rolloverFrom: rollover.rolledFrom || null,
        rolloverTo: rollover.rolledTo || null,
        rolloverSpread: rollover.spread || 0,
        rolloverAdjustment,
        
        // M2M
        unrealisedPnl: Math.round(unrealisedPnl * 100) / 100,
        unrealisedPnlPct: Math.round(unrealisedPnlPct * 100) / 100,
        
        // Incoterms
        buyIncoterm: deal.buy_incoterm,
        sellIncoterm: deal.sell_incoterm,
        
        // Dates
        createdAt: deal.created_at,
        shippingStart: ext.shipping_start || null,
        shippingEnd: ext.shipping_end || null,
      };
    });

    // Consolidated summary
    const totalUnrealisedPnl = positions.reduce((s, p) => s + p.unrealisedPnl, 0);
    const totalExposure = positions.reduce((s, p) => s + (p.contractPrice * p.tonnage), 0);
    const fixedCount = positions.filter(p => p.isFixed).length;
    const unfixedCount = positions.filter(p => !p.isFixed).length;
    const rolledCount = positions.filter(p => p.hasRollover).length;

    return Response.json({
      positions,
      summary: {
        dealCount: positions.length,
        totalUnrealisedPnl: Math.round(totalUnrealisedPnl * 100) / 100,
        totalExposure: Math.round(totalExposure * 100) / 100,
        fixedCount,
        unfixedCount,
        rolledCount,
        avgPnlPct: positions.length > 0
          ? Math.round(positions.reduce((s, p) => s + p.unrealisedPnlPct, 0) / positions.length * 100) / 100
          : 0,
        currency: 'USD',
        lastCalculated: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[m2m] GET error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { dealId, action, data } = body;

    if (!dealId || !action) {
      return Response.json({ error: 'Missing dealId or action' }, { status: 400 });
    }

    // Fetch the deal
    const { data: deal, error: fetchErr } = await supabase.from('deals').select('*').eq('id', dealId).single();
    if (fetchErr || !deal) return Response.json({ error: 'Deal not found' }, { status: 404 });

    const ext = deal.extended || {};

    switch (action) {
      case 'fix_price': {
        // Record price fixation
        const { fixedPrice, futuresAtFixation, basis } = data || {};
        if (!fixedPrice) return Response.json({ error: 'Missing fixedPrice' }, { status: 400 });

        const fixation = {
          fixedPrice: parseFloat(fixedPrice),
          fixedDate: new Date().toISOString(),
          futuresAtFixation: futuresAtFixation ? parseFloat(futuresAtFixation) : null,
          basisAtFixation: basis ? parseFloat(basis) : null,
        };

        const { error: updErr } = await supabase.from('deals').update({
          extended: { ...ext, fixation },
          unit_price: fixedPrice.toString(),
        }).eq('id', dealId);

        if (updErr) return Response.json({ error: updErr.message }, { status: 500 });
        return Response.json({ success: true, fixation });
      }

      case 'rollover': {
        // Record contract rollover
        const { fromMonth, toMonth, spread, newFutures } = data || {};
        if (!fromMonth || !toMonth) return Response.json({ error: 'Missing rollover months' }, { status: 400 });

        const rollover = {
          rolledFrom: fromMonth,
          rolledTo: toMonth,
          spread: parseFloat(spread) || 0,
          rollDate: new Date().toISOString(),
          newFuturesPrice: newFutures ? parseFloat(newFutures) : null,
          totalAdjustment: (ext.rollover?.totalAdjustment || 0) + (parseFloat(spread) || 0),
          history: [...(ext.rollover?.history || []), {
            from: fromMonth, to: toMonth, spread: parseFloat(spread) || 0,
            date: new Date().toISOString(),
          }],
        };

        const { error: updErr } = await supabase.from('deals').update({
          extended: { ...ext, rollover },
        }).eq('id', dealId);

        if (updErr) return Response.json({ error: updErr.message }, { status: 500 });
        return Response.json({ success: true, rollover });
      }

      case 'update_market_price': {
        // Store current market price for M2M
        const { marketPrice } = data || {};
        if (!marketPrice) return Response.json({ error: 'Missing marketPrice' }, { status: 400 });

        const { error: updErr } = await supabase.from('deals').update({
          extended: {
            ...ext,
            currentMarketPrice: parseFloat(marketPrice),
            lastPriceUpdate: new Date().toISOString(),
          },
        }).eq('id', dealId);

        if (updErr) return Response.json({ error: updErr.message }, { status: 500 });
        return Response.json({ success: true, marketPrice: parseFloat(marketPrice) });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[m2m] POST error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
