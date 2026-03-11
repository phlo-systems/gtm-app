/**
 * POST /api/deals/lifecycle
 * ==========================
 * Manages deal lifecycle stages and actions.
 * 
 * Body: { dealId, action, data }
 * 
 * Actions:
 *   fix_price         — Record price fixation (buy or sell side)
 *   rollover          — Record futures contract roll
 *   generate_contract — Generate trade contract PDF
 *   record_shipment   — Record shipment details (BL, containers)
 *   record_delivery   — Record delivery + actual weights
 *   generate_invoice  — Generate commercial invoice
 *   record_payment    — Record payment (down payment or balance)
 *   close_deal        — Final P&L and close
 */
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const supabase = createServerSupabaseClient();
    const body = await request.json();
    const { dealId, action, data = {} } = body;

    if (!dealId || !action) return Response.json({ error: 'Missing dealId or action' }, { status: 400 });

    const { data: deal, error: fetchErr } = await supabase.from('deals').select('*').eq('id', dealId).single();
    if (fetchErr || !deal) return Response.json({ error: 'Deal not found' }, { status: 404 });

    const ext = deal.extended || {};
    const lifecycle = ext.lifecycle || { stage: 'draft', history: [], payments: [], invoices: [] };
    const now = new Date().toISOString();

    switch (action) {

      case 'fix_price': {
        const { side = 'buy', price, futuresPrice, basis, quantity } = data;
        const fixations = lifecycle.fixations || [];
        fixations.push({
          id: `fix_${Date.now()}`,
          side,
          fixedPrice: parseFloat(price),
          futuresAtFixation: parseFloat(futuresPrice) || null,
          basisAtFixation: parseFloat(basis) || null,
          quantity: parseFloat(quantity) || null,
          date: now,
        });
        
        // Calculate total fixed quantity
        const totalFixedBuy = fixations.filter(f => f.side === 'buy').reduce((s, f) => s + (f.quantity || 0), 0);
        const totalFixedSell = fixations.filter(f => f.side === 'sell').reduce((s, f) => s + (f.quantity || 0), 0);
        const dealQty = parseFloat(deal.quantity) || parseFloat(ext.tonnage) || 0;
        
        lifecycle.fixations = fixations;
        lifecycle.fixationSummary = {
          buyFixed: totalFixedBuy, buyRemaining: dealQty - totalFixedBuy,
          sellFixed: totalFixedSell, sellRemaining: dealQty - totalFixedSell,
          fullyFixed: totalFixedBuy >= dealQty && totalFixedSell >= dealQty,
        };
        if (lifecycle.stage === 'approved') lifecycle.stage = 'fixing';
        lifecycle.history.push({ action: 'fix_price', side, price, date: now });

        await updateDeal(supabase, dealId, ext, lifecycle);
        return Response.json({ success: true, fixations, summary: lifecycle.fixationSummary });
      }

      case 'rollover': {
        const { fromMonth, toMonth, spread, newFuturesPrice } = data;
        const rollovers = lifecycle.rollovers || [];
        rollovers.push({
          id: `roll_${Date.now()}`,
          from: fromMonth, to: toMonth,
          spread: parseFloat(spread) || 0,
          newFuturesPrice: parseFloat(newFuturesPrice) || null,
          date: now,
        });
        lifecycle.rollovers = rollovers;
        lifecycle.history.push({ action: 'rollover', from: fromMonth, to: toMonth, spread, date: now });

        await updateDeal(supabase, dealId, ext, lifecycle);
        return Response.json({ success: true, rollovers });
      }

      case 'generate_contract': {
        const { contractType = 'sale', html } = data;
        const contracts = lifecycle.contracts || [];
        contracts.push({
          id: `con_${Date.now()}`,
          type: contractType,
          generatedAt: now,
          version: contracts.length + 1,
          status: 'draft', // draft → sent → signed → executed
        });
        lifecycle.contracts = contracts;
        if (lifecycle.stage === 'draft' || lifecycle.stage === 'approved' || lifecycle.stage === 'fixing') {
          lifecycle.stage = 'contracted';
        }
        lifecycle.history.push({ action: 'generate_contract', type: contractType, date: now });

        await updateDeal(supabase, dealId, ext, lifecycle);
        return Response.json({ success: true, contracts });
      }

      case 'record_shipment': {
        const { blNumber, containers = [], vesselName, voyageNumber, etd, eta } = data;
        const shipment = lifecycle.shipment || {};
        shipment.blNumber = blNumber || shipment.blNumber;
        shipment.containers = [...(shipment.containers || []), ...containers];
        shipment.vesselName = vesselName || shipment.vesselName;
        shipment.voyageNumber = voyageNumber || shipment.voyageNumber;
        shipment.etd = etd || shipment.etd;
        shipment.eta = eta || shipment.eta;
        shipment.status = 'shipped';
        shipment.shippedDate = now;
        
        lifecycle.shipment = shipment;
        lifecycle.stage = 'shipped';
        lifecycle.history.push({ action: 'record_shipment', blNumber, date: now });

        await updateDeal(supabase, dealId, ext, lifecycle);
        return Response.json({ success: true, shipment });
      }

      case 'record_delivery': {
        const { deliveryDate, actualQuantity, actualWeight, qualityResults, demurrageCharges, detentionCharges } = data;
        const delivery = lifecycle.delivery || {};
        delivery.deliveryDate = deliveryDate || now;
        delivery.actualQuantity = parseFloat(actualQuantity) || null;
        delivery.actualWeight = parseFloat(actualWeight) || null;
        delivery.qualityResults = qualityResults || {};
        delivery.demurrageCharges = parseFloat(demurrageCharges) || 0;
        delivery.detentionCharges = parseFloat(detentionCharges) || 0;
        
        // Calculate quantity variance
        const contractQty = parseFloat(deal.quantity) || parseFloat(ext.tonnage) || 0;
        if (delivery.actualQuantity) {
          delivery.quantityVariance = delivery.actualQuantity - contractQty;
          delivery.quantityVariancePct = contractQty > 0 ? ((delivery.actualQuantity - contractQty) / contractQty * 100) : 0;
        }

        lifecycle.delivery = delivery;
        lifecycle.stage = 'delivered';
        lifecycle.history.push({ action: 'record_delivery', actualQuantity, date: now });

        await updateDeal(supabase, dealId, ext, lifecycle);
        return Response.json({ success: true, delivery });
      }

      case 'generate_invoice': {
        const { invoiceType = 'commercial', adjustments = [] } = data;
        const contractQty = parseFloat(deal.quantity) || parseFloat(ext.tonnage) || 0;
        const actualQty = lifecycle.delivery?.actualQuantity || contractQty;
        const unitPrice = parseFloat(deal.unit_price) || 0;
        
        // Calculate line items
        const lineItems = [
          { description: `${ext.commodity || deal.product?.name || 'Commodity'} - ${actualQty} MT @ $${unitPrice}/MT`, amount: actualQty * unitPrice },
        ];
        
        // Add adjustments (GAFTA discount, quality, detention, etc.)
        let totalAdjustments = 0;
        adjustments.forEach(adj => {
          lineItems.push({ description: adj.description, amount: adj.amount });
          totalAdjustments += adj.amount;
        });
        
        // Add detention/demurrage if recorded
        if (lifecycle.delivery?.demurrageCharges > 0) {
          lineItems.push({ description: 'Demurrage charges', amount: -lifecycle.delivery.demurrageCharges });
          totalAdjustments -= lifecycle.delivery.demurrageCharges;
        }
        if (lifecycle.delivery?.detentionCharges > 0) {
          lineItems.push({ description: 'Detention charges', amount: -lifecycle.delivery.detentionCharges });
          totalAdjustments -= lifecycle.delivery.detentionCharges;
        }

        const subtotal = actualQty * unitPrice;
        const total = subtotal + totalAdjustments;
        
        // Track payments already received
        const totalPaid = (lifecycle.payments || []).reduce((s, p) => s + (p.amount || 0), 0);
        const balanceDue = total - totalPaid;

        const invoice = {
          id: `inv_${Date.now()}`,
          number: `INV-${deal.deal_number || 'DRAFT'}-${(lifecycle.invoices || []).length + 1}`,
          type: invoiceType,
          date: now,
          dueDate: null,
          lineItems,
          subtotal: Math.round(subtotal * 100) / 100,
          adjustments: Math.round(totalAdjustments * 100) / 100,
          total: Math.round(total * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          balanceDue: Math.round(balanceDue * 100) / 100,
          currency: deal.cost_currency || 'USD',
          status: 'draft', // draft → sent → paid → closed
        };

        const invoices = lifecycle.invoices || [];
        invoices.push(invoice);
        lifecycle.invoices = invoices;
        lifecycle.stage = 'invoiced';
        lifecycle.history.push({ action: 'generate_invoice', invoiceNumber: invoice.number, total: invoice.total, date: now });

        await updateDeal(supabase, dealId, ext, lifecycle);
        return Response.json({ success: true, invoice });
      }

      case 'record_payment': {
        const { amount, method = 'TT', reference, type = 'balance', invoiceId } = data;
        const payment = {
          id: `pay_${Date.now()}`,
          amount: parseFloat(amount),
          method,
          reference,
          type, // 'down_payment' or 'balance'
          invoiceId,
          date: now,
        };

        const payments = lifecycle.payments || [];
        payments.push(payment);
        lifecycle.payments = payments;
        
        // Calculate payment summary
        const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
        const contractValue = (parseFloat(deal.unit_price) || 0) * (parseFloat(deal.quantity) || parseFloat(ext.tonnage) || 0);
        lifecycle.paymentSummary = {
          totalPaid: Math.round(totalPaid * 100) / 100,
          contractValue: Math.round(contractValue * 100) / 100,
          balance: Math.round((contractValue - totalPaid) * 100) / 100,
          fullyPaid: totalPaid >= contractValue * 0.99, // 1% tolerance
        };

        // Update invoice status if linked
        if (invoiceId && lifecycle.invoices) {
          const inv = lifecycle.invoices.find(i => i.id === invoiceId);
          if (inv) {
            inv.totalPaid = (inv.totalPaid || 0) + parseFloat(amount);
            inv.balanceDue = inv.total - inv.totalPaid;
            if (inv.balanceDue <= 0) inv.status = 'paid';
          }
        }

        lifecycle.history.push({ action: 'record_payment', amount, type, method, date: now });

        await updateDeal(supabase, dealId, ext, lifecycle);
        return Response.json({ success: true, payment, summary: lifecycle.paymentSummary });
      }

      case 'close_deal': {
        const contractQty = parseFloat(deal.quantity) || parseFloat(ext.tonnage) || 0;
        const actualQty = lifecycle.delivery?.actualQuantity || contractQty;
        const buyPrice = parseFloat(deal.unit_price) || 0;
        const sellPrice = parseFloat(deal.sell_price) || parseFloat(ext.sell_price) || buyPrice;
        
        const revenue = actualQty * sellPrice;
        const cost = actualQty * buyPrice;
        const grossProfit = revenue - cost;
        
        // Add all extras
        const commissions = (ext.commissions || []).reduce((s, c) => s + (c.amount || 0), 0);
        const demurrage = lifecycle.delivery?.demurrageCharges || 0;
        const detention = lifecycle.delivery?.detentionCharges || 0;
        const totalPaid = (lifecycle.payments || []).reduce((s, p) => s + (p.amount || 0), 0);

        lifecycle.closingPnl = {
          revenue: Math.round(revenue * 100) / 100,
          cost: Math.round(cost * 100) / 100,
          grossProfit: Math.round(grossProfit * 100) / 100,
          grossMarginPct: revenue > 0 ? Math.round((grossProfit / revenue) * 10000) / 100 : 0,
          commissions: Math.round(commissions * 100) / 100,
          demurrage: Math.round(demurrage * 100) / 100,
          detention: Math.round(detention * 100) / 100,
          netProfit: Math.round((grossProfit - commissions - demurrage - detention) * 100) / 100,
          totalReceived: Math.round(totalPaid * 100) / 100,
          contractQuantity: contractQty,
          actualQuantity: actualQty,
          quantityVariance: Math.round((actualQty - contractQty) * 100) / 100,
        };

        lifecycle.stage = 'closed';
        lifecycle.closedAt = now;
        lifecycle.history.push({ action: 'close_deal', netProfit: lifecycle.closingPnl.netProfit, date: now });

        await updateDeal(supabase, dealId, ext, lifecycle, 'closed');
        return Response.json({ success: true, closingPnl: lifecycle.closingPnl });
      }

      default:
        return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error) {
    console.error('[deals/lifecycle]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

async function updateDeal(supabase, dealId, ext, lifecycle, status) {
  const update = { extended: { ...ext, lifecycle } };
  if (status) update.status = status;
  const { error } = await supabase.from('deals').update(update).eq('id', dealId);
  if (error) throw error;
}
