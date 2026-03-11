/**
 * POST /api/contracts/generate
 * =============================
 * Generates a professional commodity trade contract PDF.
 * Uses AI to draft the contract terms based on deal data,
 * then returns HTML that can be printed/saved as PDF.
 *
 * Body: { dealId } or { dealData: { ...full deal object } }
 */
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request) {
  try {
    const body = await request.json();
    const { dealId, dealData } = body;

    let deal = dealData;

    if (dealId && !deal) {
      const supabase = createServerSupabaseClient();
      const { data, error } = await supabase.from('deals').select('*').eq('id', dealId).single();
      if (error || !data) return Response.json({ error: 'Deal not found' }, { status: 404 });
      deal = data;
    }

    if (!deal) return Response.json({ error: 'No deal data provided' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const ext = deal.extended || {};
    const fixation = ext.fixation || {};
    const pricing = ext.pricingData || {};

    const prompt = `You are a legal expert specializing in international physical commodity trade contracts. Generate a professional contract based on the following deal details:

DEAL DETAILS:
- Deal Number: ${deal.deal_number || 'TBD'}
- Date: ${new Date().toISOString().split('T')[0]}

SELLER: ${deal.supplier_name || ext.supplier_name || 'TBD'}
BUYER: ${deal.customer_name || ext.customer_name || 'TBD'}
${ext.consignee ? `CONSIGNEE: ${ext.consignee}` : ''}
${ext.notify_party ? `NOTIFY PARTY: ${ext.notify_party}` : ''}

COMMODITY: ${deal.product?.name || ext.commodity || 'As specified'}
${ext.full_specifications ? `SPECIFICATIONS: ${ext.full_specifications}` : ''}
${deal.hs_code ? `HS CODE: ${deal.hs_code}` : ''}

QUANTITY: ${ext.tonnage || deal.quantity || 'TBD'} Metric Tons (+/- 5% at seller's option)
${ext.packaging ? `PACKAGING: ${ext.packaging}` : ''}
${ext.brand_marking ? `BRAND/MARKING: ${ext.brand_marking}` : ''}

PRICE: ${fixation.fixedPrice || deal.unit_price || 'TBD'} ${deal.cost_currency || 'USD'} per Metric Ton
${pricing.mode === 'basis' ? `PRICING BASIS: ${pricing.buyBasis} ${pricing.contractCode} futures + basis` : ''}
${pricing.contractMonth ? `FUTURES CONTRACT: ${pricing.contractMonth}` : ''}

BUY INCOTERM: ${deal.buy_incoterm || 'FOB'}
SELL INCOTERM: ${deal.sell_incoterm || 'CIF'}
${deal.buy_location ? `ORIGIN: ${deal.buy_location}` : ''}
${deal.sell_location ? `DESTINATION: ${deal.sell_location}` : ''}

SHIPMENT:
${ext.pol ? `- Port of Loading: ${ext.pol}` : ''}
${ext.pod ? `- Port of Discharge: ${ext.pod}` : ''}
${ext.shipping_start ? `- Shipping Period: ${ext.shipping_start} to ${ext.shipping_end || 'TBD'}` : ''}
${ext.container_type ? `- Container Type: ${ext.container_type}` : ''}
${ext.transhipment_allowed ? '- Transhipment: Allowed' : '- Transhipment: Not Allowed'}
${ext.partial_shipment_allowed ? '- Partial Shipment: Allowed' : '- Partial Shipment: Not Allowed'}

PAYMENT:
${ext.down_payment_pct ? `- Down Payment: ${ext.down_payment_pct}%` : ''}
${ext.payment_terms || deal.customer_payment_terms ? `- Terms: ${ext.payment_terms || deal.customer_payment_terms}` : ''}
${ext.detention_days ? `- Detention: ${ext.detention_days} days free` : ''}
${ext.demurrage_days ? `- Demurrage: ${ext.demurrage_days} days free` : ''}

${ext.gafta_late_discount ? `GAFTA: Late discount applies at ${ext.gafta_discount_pct || 0.25}%` : ''}
${ext.import_permit_needed ? 'IMPORT PERMIT: Required' : ''}

Generate a COMPLETE professional contract in HTML format. The contract should include:
1. Contract header with both party names and contract number
2. Commodity and specifications
3. Quantity with tolerance
4. Price and pricing mechanism (flat or basis + futures)
5. Delivery terms (Incoterms)
6. Shipment details and shipping period
7. Payment terms
8. Quality and inspection clauses
9. Force majeure
10. Governing law and arbitration (GAFTA rules if applicable)
11. Signature blocks for both parties

Style the HTML professionally with inline CSS. Use a clean, formal layout suitable for printing on A4 paper. Use serif fonts for the body text. Include proper margins, headers, and section numbering.

Respond ONLY with the HTML content (no markdown backticks, no explanation). Start with <html> and end with </html>.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
    });

    if (!response.ok) return Response.json({ error: `AI error: ${response.status}` }, { status: 502 });

    const aiResponse = await response.json();
    const rawText = aiResponse.content?.[0]?.text || '';

    // Extract HTML from the response
    let html = rawText;
    const htmlMatch = rawText.match(/<html[\s\S]*<\/html>/i);
    if (htmlMatch) html = htmlMatch[0];

    return Response.json({
      html,
      dealNumber: deal.deal_number,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[contracts/generate]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
