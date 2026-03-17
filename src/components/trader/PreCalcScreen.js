/**
 * TRADER: PRE-CALC SCREEN
 *
 * Three-step deal workflow for physical commodity traders:
 *   Step 1 – Deal Sheet: trade structure, supplier/origin, customer/destination,
 *             logistics & packing, risk & regulatory
 *   Step 2 – Cost Matrix: auto-generated from Incoterm Gap Engine
 *   Step 3 – Feasibility: margin analysis and go/no-go decision
 *
 * New fields (solutioning doc v1):
 *   - Trade category (g2g / g2l / l2l) drives dynamic field visibility
 *   - Supplier: payment terms, buying currency, price validity, units/case,
 *               unit weight, pack type, consolidation
 *   - Customer: selling currency
 *   - Logistics & Packing: country of origin, pallets, cases, dimensions,
 *                           calculated cases/container and weight of goods
 *   - Risk & Regulatory: duty type, duty %, anti-dumping %, VAT %
 *   All new fields stored in form.extended to avoid DB schema changes.
 *
 * Props:
 *   deal     – existing deal object (null for new deal)
 *   onBack   – callback to return to deals list
 *   onSaved  – callback(savedDeal) after successful save
 */
'use client'
import { useState, useEffect } from 'react';
import { S, statusColor } from '@/components/shared/styles';
import { calculateIncotermGap, INCOTERMS_2020 } from '@/lib/incoterms';
import VoyageSearch from './VoyageSearch';
import FuturesPricingWidget from '@/components/trader/FuturesPricingWidget';
import DealExtendedFields from '@/components/trader/DealExtendedFields';
import DealLifecyclePanel from '@/components/trader/DealLifecyclePanel';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'ZAR', 'AED', 'SGD', 'CNY'];

export default function PreCalcScreen({ deal, onBack, onSaved }) {
  const isNew = !deal;
  const isDraft = isNew || deal?.status === 'draft';

  const [saving, setSaving] = useState(false);
  const [costMatrix, setCostMatrix] = useState(null);
  const [step, setStep] = useState(1);
  const [appliedVoyage, setAppliedVoyage] = useState(null);
  const [customsResult, setCustomsResult] = useState(null);
  const [customsLoading, setCustomsLoading] = useState(false);

  const [form, setForm] = useState({
    // ── existing core fields ──────────────────────────────────────────
    trade_type: deal?.trade_type || 'cross_border_direct',
    transport_mode: deal?.transport_mode || 'ocean',
    customer_name: deal?.customer?.name || '',
    supplier_name: deal?.supplier?.name || '',
    buy_incoterm: deal?.buy_incoterm || 'FOB',
    buy_location: deal?.buy_location || '',
    sell_incoterm: deal?.sell_incoterm || 'CIF',
    sell_location: deal?.sell_location || '',
    unit_price: deal?.unit_price || '',
    hs_code: deal?.hs_code || '',
    cost_currency: deal?.cost_currency || 'USD',
    customer_payment_terms: deal?.customer_payment_terms || 'Net 60',
    // ── extended: all new deal sheet fields ──────────────────────────
    extended: {
      // Trade Structure
      trade_category: 'g2g',          // g2g | g2l | l2l
      opportunity_id: '',
      product_description: '',
      product_category: '',
      npd_costs_applicable: false,
      second_sell_incoterm: 'DDP',    // only visible for g2l
      // Supplier-driven
      supplier_payment_terms: 'Net 30',
      buying_currency: 'USD',
      price_validity_date: '',
      units_per_case: '',
      unit_weight: '',
      pack_type: 'palletised',        // palletised | hand_stacked
      consolidation: 'full_container', // full_container | mixed_container
      // Customer-driven
      selling_currency: 'USD',
      // Logistics & Packing
      country_of_origin: '',
      pallets_per_container: '',
      cases_per_pallet: '',
      end_customer_pallet_req: '',
      unit_width: '',
      unit_length: '',
      unit_height: '',
      weight_per_unit: '',
      product_shelf_life: '',
      // Risk & Regulatory
      import_duty_type: '',
      import_duty_pct: '',
      anti_dumping_pct: '',
      vat_pct: '',
      // merge any pre-existing extended data
      ...(deal?.extended || {}),
    },
  });

  // ── Extended field helpers ────────────────────────────────────────────
  const ext = (key) => form.extended?.[key] ?? '';
  const setExt = (key, val) =>
    setForm(p => ({ ...p, extended: { ...(p.extended || {}), [key]: val } }));
  const eI = (key) => (e) => setExt(key, e.target.value);   // input onChange
  const eS = (key) => (e) => setExt(key, e.target.value);   // select onChange

  // ── Dynamic visibility (driven by trade_category) ────────────────────
  const tc = ext('trade_category');
  const showSecondLeg = tc === 'g2l';
  const showDutyFields = tc !== 'l2l';

  // ── Calculated / derived fields ──────────────────────────────────────
  const casesPerContainer =
    (parseInt(ext('pallets_per_container')) || 0) *
    (parseInt(ext('cases_per_pallet')) || 0);
  const weightOfGoods =
    casesPerContainer *
    (parseInt(ext('units_per_case')) || 0) *
    (parseFloat(ext('weight_per_unit')) || 0);

  // ── Incoterm gap ─────────────────────────────────────────────────────
  const gap = calculateIncotermGap(form.buy_incoterm, form.sell_incoterm);

  // ── Simple field helpers ──────────────────────────────────────────────
  const f = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const inputStyle = (editable) => ({
    ...S.input,
    background: editable ? '#FFF' : '#F0EDE6',
  });
  const calcStyle = {
    ...S.input,
    background: '#E8F4EF',
    fontFamily: 'monospace',
    color: '#1B4332',
    fontWeight: 700,
  };

  // ── Load existing cost matrix ─────────────────────────────────────────
  useEffect(() => {
    if (deal?.id) {
      fetch('/api/deals/' + deal.id + '/cost-matrix')
        .then(r => r.json())
        .then(data => { if (data && data.length > 0) setCostMatrix(data[0]); })
        .catch(() => {});
    }
  }, [deal?.id]);

  // ── Save deal ─────────────────────────────────────────────────────────
  const saveDeal = async () => {
    setSaving(true);
    try {
      const url = deal?.id ? '/api/deals/' + deal.id : '/api/deals';
      const res = await fetch(url, {
        method: deal?.id ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const saved = await res.json();
      if (res.ok) onSaved(saved);
      else alert(saved.error || 'Failed to save');
    } catch (err) { alert('Error: ' + err.message); }
    setSaving(false);
  };

  // ── Generate cost matrix ──────────────────────────────────────────────
  const genMatrix = async () => {
    if (!deal?.id) { alert('Save the deal first.'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/deals/' + deal.id + '/cost-matrix', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setCostMatrix({ ...data.matrix, cost_lines: data.cost_lines });
        setStep(2);
      } else alert(data.error || 'Failed');
    } catch (err) { alert('Error: ' + err.message); }
    setSaving(false);
  };

  // ── Approval actions ──────────────────────────────────────────────────
  const doAction = async (action) => {
    if (!deal?.id) return;
    setSaving(true);
    try {
      const res = await fetch('/api/deals/' + deal.id + '/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (res.ok)
        onSaved({
          ...deal,
          status:
            action === 'submit' ? 'submitted' :
            action === 'approve' ? 'approved' : 'rejected',
        });
      else { const d = await res.json(); alert(d.error); }
    } catch (err) { alert('Error: ' + err.message); }
    setSaving(false);
  };

  // ── Voyage apply ──────────────────────────────────────────────────────
  const handleVoyageApply = ({ costs, voyage }) => {
    if (!costMatrix) return;
    const nonBLines = (costMatrix.cost_lines || []).filter(l => l.block !== 'B');
    const newBLines = costs.map((c, i) => ({
      ...c, sort_order: 100 + i, responsibility: 'trader',
      is_active: true, currency: form.cost_currency,
    }));
    const allLines = [...nonBLines, ...newBLines];
    const newTotal = allLines.reduce((s, l) => s + (l.amount || 0), 0);
    setCostMatrix({
      ...costMatrix, cost_lines: allLines, total_cost: newTotal,
      gross_margin_pct: costMatrix.selling_price > 0
        ? ((costMatrix.selling_price - newTotal) / costMatrix.selling_price) * 100 : 0,
    });
    setAppliedVoyage(voyage);
  };

  // ── Customs estimate ──────────────────────────────────────────────────
  const fetchCustomsEstimate = async (importCountry) => {
    if (!importCountry) return;
    setCustomsLoading(true);
    try {
      const cargoValue = (parseFloat(form.unit_price) || 0) * (deal?.quantity || 1);
      const res = await fetch('/api/customs-estimate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: deal?.product?.name || '',
          hs_code: form.hs_code,
          origin_country: '',
          import_country: importCountry,
          cargo_value: cargoValue || 10000,
          sell_incoterm: form.sell_incoterm,
        }),
      });
      setCustomsResult(await res.json());
    } catch (err) { console.error(err); }
    setCustomsLoading(false);
  };

  const handleCustomsApply = () => {
    if (!costMatrix || !customsResult?.cost_lines) return;
    const nonDLines = (costMatrix.cost_lines || []).filter(l => l.source !== 'customs');
    const newDLines = customsResult.cost_lines.map((c, i) => ({
      ...c, sort_order: 300 + i, responsibility: 'trader',
      is_active: true, currency: form.cost_currency,
    }));
    const allLines = [...nonDLines, ...newDLines];
    const newTotal = allLines.reduce((s, l) => s + (l.amount || 0), 0);
    setCostMatrix({ ...costMatrix, cost_lines: allLines, total_cost: newTotal });
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888' }}>←</button>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{isNew ? 'New Deal' : deal.deal_number}</h2>
            <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
              {form.customer_name || 'Customer'} — {form.buy_incoterm} → {form.sell_incoterm}
              {showSecondLeg && ` → ${ext('second_sell_incoterm')}`}
              {deal?.status && <span style={{ marginLeft: 8, ...S.badge(statusColor[deal.status] || '#888') }}>{deal.status}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {isDraft && (
            <button style={S.btn(false)} onClick={saveDeal} disabled={saving}>
              {saving ? 'Saving…' : 'Save Draft'}
            </button>
          )}
          {isDraft && deal?.id && (
            <button style={S.btn(false)} onClick={genMatrix} disabled={saving}>Gen Cost Matrix</button>
          )}
          {isDraft && deal?.id && costMatrix && (
            <button style={S.btn(true)} onClick={() => doAction('submit')} disabled={saving}>Submit for Approval</button>
          )}
          {deal?.status === 'submitted' && (
            <button style={{ ...S.btn(true), background: '#1B7A43' }} onClick={() => doAction('approve')} disabled={saving}>Approve</button>
          )}
          {deal?.status === 'submitted' && (
            <button style={{ ...S.btn(false), color: '#C62828' }} onClick={() => doAction('reject')} disabled={saving}>Reject</button>
          )}
        </div>
      </div>

      {/* ── Step Tabs ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20 }}>
        {[{ n: 1, l: 'Deal Sheet' }, { n: 2, l: 'Cost Matrix' }, { n: 3, l: 'Feasibility' }].map(s => (
          <div
            key={s.n}
            onClick={() => setStep(s.n)}
            style={{
              padding: '10px 20px', cursor: 'pointer', fontSize: 13,
              fontWeight: step === s.n ? 700 : 400,
              background: step === s.n ? '#1B4332' : '#E8E4DC',
              color: step === s.n ? '#FFF' : '#666',
              borderRadius: s.n === 1 ? '6px 0 0 6px' : s.n === 3 ? '0 6px 6px 0' : 0,
            }}
          >{s.l}</div>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════
          STEP 1 — DEAL SHEET
          ════════════════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div>

          {/* ── Row 1: Trade Structure | Supplier/Origin | Customer/Destination ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Trade Structure */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Trade Structure</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                <div>
                  <label style={S.label}>Opportunity ID</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('opportunity_id')} onChange={eI('opportunity_id')}
                    placeholder="Auto-generated or enter" />
                </div>

                <div>
                  <label style={S.label}>Trade Category</label>
                  <select style={S.select} disabled={!isDraft}
                    value={ext('trade_category')} onChange={eS('trade_category')}>
                    <option value="g2g">Global → Global</option>
                    <option value="g2l">Global → Local</option>
                    <option value="l2l">Local → Local</option>
                  </select>
                </div>

                <div>
                  <label style={S.label}>Product Description</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('product_description')} onChange={eI('product_description')}
                    placeholder="e.g. Yellow Soybean #1" />
                </div>

                <div>
                  <label style={S.label}>Product Category</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('product_category')} onChange={eI('product_category')}
                    placeholder="e.g. Oilseeds, Grains" />
                </div>

                <div>
                  <label style={S.label}>Mode of Transport</label>
                  <select style={S.select} disabled={!isDraft}
                    value={form.transport_mode} onChange={f('transport_mode')}>
                    <option value="ocean">Ocean</option>
                    <option value="road">Road</option>
                    <option value="air">Air</option>
                    <option value="rail">Rail</option>
                  </select>
                </div>

                <div>
                  <label style={S.label}>Buying Incoterm</label>
                  <select style={S.select} disabled={!isDraft}
                    value={form.buy_incoterm} onChange={f('buy_incoterm')}>
                    {INCOTERMS_2020.map(t => (
                      <option key={t.code} value={t.code}>{t.code} – {t.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={S.label}>Selling Incoterm</label>
                  <select style={S.select} disabled={!isDraft}
                    value={form.sell_incoterm} onChange={f('sell_incoterm')}>
                    {INCOTERMS_2020.map(t => (
                      <option key={t.code} value={t.code}>{t.code} – {t.name}</option>
                    ))}
                  </select>
                </div>

                {/* Conditional: 2nd leg only for Global → Local */}
                {showSecondLeg && (
                  <div style={{ border: '1px dashed #D4A017', borderRadius: 6, padding: 10, background: '#FFFBF0' }}>
                    <label style={{ ...S.label, color: '#B8860B' }}>2nd Selling Leg Incoterm</label>
                    <select style={S.select} disabled={!isDraft}
                      value={ext('second_sell_incoterm')} onChange={eS('second_sell_incoterm')}>
                      {INCOTERMS_2020.map(t => (
                        <option key={t.code} value={t.code}>{t.code} – {t.name}</option>
                      ))}
                    </select>
                    <div style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
                      Intermediary leg (Global → Local trade)
                    </div>
                  </div>
                )}

                {/* NPD toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 2 }}>
                  <input
                    type="checkbox"
                    id="npd_flag"
                    checked={!!ext('npd_costs_applicable')}
                    onChange={e => setExt('npd_costs_applicable', e.target.checked)}
                    disabled={!isDraft}
                    style={{ accentColor: '#1B4332', width: 14, height: 14 }}
                  />
                  <label htmlFor="npd_flag" style={{ fontSize: 12, cursor: 'pointer', color: '#444' }}>
                    NPD Costs Applicable
                  </label>
                </div>

              </div>
            </div>

            {/* Supplier / Origin */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Supplier / Origin</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                <div>
                  <label style={S.label}>Supplier Name</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={form.supplier_name} onChange={f('supplier_name')}
                    placeholder="Supplier name" />
                </div>

                <div>
                  <label style={S.label}>Supplier Payment Terms</label>
                  <select style={S.select} disabled={!isDraft}
                    value={ext('supplier_payment_terms')} onChange={eS('supplier_payment_terms')}>
                    <option>Net 30</option>
                    <option>Net 60</option>
                    <option>Net 90</option>
                    <option>LC at Sight</option>
                    <option>Prepayment</option>
                    <option>CAD</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={S.label}>Cost Price / Case</label>
                    <input style={inputStyle(isDraft)} readOnly={!isDraft}
                      value={form.unit_price} onChange={f('unit_price')}
                      type="number" step="0.01" placeholder="0.00" />
                  </div>
                  <div>
                    <label style={S.label}>Buying Currency</label>
                    <select style={S.select} disabled={!isDraft}
                      value={ext('buying_currency')} onChange={eS('buying_currency')}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label style={S.label}>Price Validity Date</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('price_validity_date')} onChange={eI('price_validity_date')}
                    type="date" />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  <div>
                    <label style={S.label}>Units per Case</label>
                    <input style={inputStyle(isDraft)} readOnly={!isDraft}
                      value={ext('units_per_case')} onChange={eI('units_per_case')}
                      type="number" placeholder="e.g. 12" />
                  </div>
                  <div>
                    <label style={S.label}>Unit Weight (kg)</label>
                    <input style={inputStyle(isDraft)} readOnly={!isDraft}
                      value={ext('unit_weight')} onChange={eI('unit_weight')}
                      type="number" step="0.001" placeholder="e.g. 0.5" />
                  </div>
                </div>

                <div>
                  <label style={S.label}>Pack Type</label>
                  <select style={S.select} disabled={!isDraft}
                    value={ext('pack_type')} onChange={eS('pack_type')}>
                    <option value="palletised">Palletised</option>
                    <option value="hand_stacked">Hand Stacked</option>
                  </select>
                </div>

                <div>
                  <label style={S.label}>Consolidation</label>
                  <select style={S.select} disabled={!isDraft}
                    value={ext('consolidation')} onChange={eS('consolidation')}>
                    <option value="full_container">Full Container</option>
                    <option value="mixed_container">Mixed Container</option>
                  </select>
                </div>

                <div>
                  <label style={S.label}>Buy Location</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={form.buy_location} onChange={f('buy_location')}
                    placeholder="e.g. Mumbai" />
                </div>

              </div>
            </div>

            {/* Customer / Destination */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Customer / Destination</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                <div>
                  <label style={S.label}>Customer Name</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={form.customer_name} onChange={f('customer_name')}
                    placeholder="Customer name" />
                </div>

                <div>
                  <label style={S.label}>Customer Payment Terms</label>
                  <select style={S.select} disabled={!isDraft}
                    value={form.customer_payment_terms} onChange={f('customer_payment_terms')}>
                    <option>Net 30</option>
                    <option>Net 60</option>
                    <option>Net 90</option>
                    <option>LC at Sight</option>
                    <option>CAD</option>
                  </select>
                </div>

                <div>
                  <label style={S.label}>Sell Location (POD)</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={form.sell_location} onChange={f('sell_location')}
                    placeholder="e.g. Durban" />
                </div>

                <div>
                  <label style={S.label}>Selling Currency</label>
                  <select style={S.select} disabled={!isDraft}
                    value={ext('selling_currency')} onChange={eS('selling_currency')}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

                <div>
                  <label style={S.label}>COS Base Currency</label>
                  <select style={S.select} disabled={!isDraft}
                    value={form.cost_currency} onChange={f('cost_currency')}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>

              </div>
            </div>
          </div>

          {/* ── Row 2: Logistics & Packing | Risk & Regulatory ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 16 }}>

            {/* Logistics & Packing */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Logistics & Packing</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>

                <div>
                  <label style={S.label}>Country of Origin</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('country_of_origin')} onChange={eI('country_of_origin')}
                    placeholder="e.g. Brazil" />
                </div>

                <div>
                  <label style={S.label}>Pallets per Container</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('pallets_per_container')} onChange={eI('pallets_per_container')}
                    type="number" placeholder="e.g. 20" />
                </div>

                <div>
                  <label style={S.label}>Cases per Pallet</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('cases_per_pallet')} onChange={eI('cases_per_pallet')}
                    type="number" placeholder="e.g. 126" />
                </div>

                <div>
                  <label style={S.label}>Cases per Container ⟳</label>
                  <input style={calcStyle} readOnly
                    value={casesPerContainer > 0 ? casesPerContainer.toLocaleString() : ''}
                    placeholder="Pallets × Cases/pallet" />
                </div>

                <div>
                  <label style={S.label}>End Customer Pallet Req.</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('end_customer_pallet_req')} onChange={eI('end_customer_pallet_req')}
                    placeholder="e.g. Euro pallet" />
                </div>

                <div>
                  <label style={S.label}>Product Shelf Life</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('product_shelf_life')} onChange={eI('product_shelf_life')}
                    placeholder="e.g. 18 months" />
                </div>

                <div>
                  <label style={S.label}>Unit Width (cm)</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('unit_width')} onChange={eI('unit_width')}
                    type="number" step="0.1" placeholder="W" />
                </div>

                <div>
                  <label style={S.label}>Unit Length (cm)</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('unit_length')} onChange={eI('unit_length')}
                    type="number" step="0.1" placeholder="L" />
                </div>

                <div>
                  <label style={S.label}>Unit Height (cm)</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('unit_height')} onChange={eI('unit_height')}
                    type="number" step="0.1" placeholder="H" />
                </div>

                <div style={{ gridColumn: 'span 3' }}>
                  <label style={S.label}>Weight of Goods in Container (kg) ⟳</label>
                  <input style={calcStyle} readOnly
                    value={weightOfGoods > 0 ? weightOfGoods.toLocaleString(undefined, { maximumFractionDigits: 1 }) : ''}
                    placeholder="Cases/container × Units/case × Unit weight" />
                </div>

              </div>
            </div>

            {/* Risk & Regulatory */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Risk & Regulatory</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                <div>
                  <label style={S.label}>Import HS Code</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={form.hs_code} onChange={f('hs_code')}
                    placeholder="0000.00.00" />
                </div>

                <div>
                  <label style={S.label}>Import Duty Type</label>
                  <select style={S.select} disabled={!isDraft}
                    value={ext('import_duty_type')} onChange={eS('import_duty_type')}>
                    <option value="">Select…</option>
                    <option value="ad_valorem">Ad Valorem (%)</option>
                    <option value="specific">Specific (per unit)</option>
                    <option value="compound">Compound</option>
                    <option value="free">Free</option>
                  </select>
                </div>

                {/* Conditional: not shown for Local → Local */}
                {showDutyFields && (
                  <div>
                    <label style={S.label}>Import Duty %</label>
                    <input style={inputStyle(isDraft)} readOnly={!isDraft}
                      value={ext('import_duty_pct')} onChange={eI('import_duty_pct')}
                      type="number" step="0.01" placeholder="e.g. 5.00" />
                  </div>
                )}

                {showDutyFields && (
                  <div>
                    <label style={S.label}>Anti-Dumping %</label>
                    <input style={inputStyle(isDraft)} readOnly={!isDraft}
                      value={ext('anti_dumping_pct')} onChange={eI('anti_dumping_pct')}
                      type="number" step="0.01" placeholder="e.g. 0.00" />
                  </div>
                )}

                <div>
                  <label style={S.label}>VAT %</label>
                  <input style={inputStyle(isDraft)} readOnly={!isDraft}
                    value={ext('vat_pct')} onChange={eI('vat_pct')}
                    type="number" step="0.01" placeholder="e.g. 15.00" />
                </div>

                {tc === 'l2l' && (
                  <div style={{ fontSize: 11, color: '#888', background: '#F5F7F0', borderRadius: 6, padding: 8 }}>
                    Import duty and anti-dumping fields hidden for Local → Local trades.
                  </div>
                )}

              </div>
            </div>
          </div>

          {/* Incoterm gap alert */}
          {gap.valid && gap.hasGap && form.supplier_name && (
            <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 8, padding: 16, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontSize: 20 }}>⚠</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>Incoterm Gap: {gap.gapCosts.length} cost blocks</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{gap.summary}</div>
              </div>
            </div>
          )}

          {isNew && !form.customer_name && (
            <div style={{ background: '#F0F7FF', border: '1px solid #B8D4F0', borderRadius: 8, padding: 16, marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 13 }}>ℹ Fill in the deal details, then click Save Draft</div>
              <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                After saving, you can generate the cost matrix which uses the Incoterm Gap Engine to calculate all costs.
              </div>
            </div>
          )}

          {/* Futures Pricing Widget */}
          <div style={{ background: '#F5F7F0', borderRadius: 12, padding: 20, border: '1px solid #D4DBC8', marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1B4332', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Pricing</div>
            <FuturesPricingWidget
              buyPrice={form.unit_price || ''}
              sellPrice={form.sell_price || ''}
              onBuyPriceChange={v => setForm(p => ({ ...p, unit_price: v }))}
              onSellPriceChange={v => setForm(p => ({ ...p, sell_price: v }))}
              disabled={!isDraft}
              S={S}
            />
          </div>

          {/* Extended Deal Fields (Parties, Shipping detail, Compliance, Documents, Tracking) */}
          <DealExtendedFields
            ext={form.extended || {}}
            onChange={(key, val) => setForm(p => ({ ...p, extended: { ...(p.extended || {}), [key]: val } }))}
            disabled={!isDraft}
          />

        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STEP 2 — COST MATRIX  (unchanged)
          ════════════════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div>
          {costMatrix && isDraft && (
            <VoyageSearch
              origin={form.buy_location}
              destination={form.sell_location}
              onApply={handleVoyageApply}
              currency={form.cost_currency}
            />
          )}
          {appliedVoyage && (
            <div style={{ ...S.card, background: '#F0FFF4', border: '1px solid #C6E6D0', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1B7A43' }}>✓ Voyage Applied to Cost Matrix</div>
                  <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                    {appliedVoyage.carrier} • {appliedVoyage.vessel} ({appliedVoyage.voyage_number})
                    {' • '} ETD: {appliedVoyage.etd} {' • '} ETA: {appliedVoyage.eta} ({appliedVoyage.transit_days} days)
                    {' • '} {appliedVoyage.container_type}: ${appliedVoyage.total?.toLocaleString()}
                  </div>
                </div>
                <button style={{ ...S.btn(false), fontSize: 11, padding: '4px 12px' }} onClick={() => setAppliedVoyage(null)}>Clear</button>
              </div>
            </div>
          )}
          {costMatrix && isDraft && (
            <div style={{ ...S.card, border: '1px solid #D4A017', marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#D4A017' }}>🏛 Customs Duty Estimate</div>
                  <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Fetch import duties, VAT, and fees for the destination country</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'end' }}>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Import Country</label>
                  <select style={S.select} onChange={e => fetchCustomsEstimate(e.target.value)} disabled={customsLoading}>
                    <option value="">Select country...</option>
                    <option value="GB">United Kingdom</option><option value="US">United States</option>
                    <option value="EU">European Union</option><option value="IN">India</option>
                    <option value="ZA">South Africa</option><option value="AE">UAE</option>
                    <option value="CN">China</option><option value="SG">Singapore</option>
                    <option value="AU">Australia</option><option value="NG">Nigeria</option>
                    <option value="KE">Kenya</option><option value="BR">Brazil</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>HS Code</label>
                  <input style={{ ...S.input, background: '#F0EDE6', fontFamily: 'monospace' }} readOnly value={form.hs_code || 'Not set'} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={S.label}>Cargo Value (est.)</label>
                  <input style={{ ...S.input, background: '#F0EDE6', fontFamily: 'monospace' }} readOnly
                    value={'$' + ((parseFloat(form.unit_price) || 0) * (deal?.quantity || 1)).toLocaleString()} />
                </div>
              </div>
              {customsResult?.duties && (
                <div style={{ marginTop: 12, padding: 12, background: '#FAFAF8', borderRadius: 6, border: '1px solid #E8E4DC' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
                    <div style={{ fontSize: 11 }}><span style={{ color: '#888' }}>Duty:</span> <strong>${customsResult.duties.customs_duty.amount.toLocaleString()}</strong> ({customsResult.duties.customs_duty.rate}%)</div>
                    <div style={{ fontSize: 11 }}><span style={{ color: '#888' }}>{customsResult.duties.vat.name}:</span> <strong>${customsResult.duties.vat.amount.toLocaleString()}</strong> ({customsResult.duties.vat.rate}%)</div>
                    <div style={{ fontSize: 11 }}><span style={{ color: '#888' }}>Brokerage:</span> <strong>${customsResult.duties.brokerage.amount.toLocaleString()}</strong></div>
                    <div style={{ fontSize: 11 }}><span style={{ color: '#888' }}>Total:</span> <strong style={{ color: '#C62828' }}>${customsResult.duties.total_duties_taxes.toLocaleString()}</strong> ({customsResult.duties.effective_rate.toFixed(1)}%)</div>
                  </div>
                  {customsResult.duties.restrictions?.length > 0 && (
                    <div style={{ fontSize: 11, color: '#D4A017', marginBottom: 8 }}>⚠ {customsResult.duties.restrictions[0]}</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: 11, color: '#888' }}>{customsResult.incoterm_note}</div>
                    <button style={S.btn(true)} onClick={handleCustomsApply}>Apply to Block D</button>
                  </div>
                </div>
              )}
            </div>
          )}
          <div style={S.card}>
            {!costMatrix ? (
              <div style={{ textAlign: 'center', padding: 40 }}>
                <div style={{ fontSize: 14, color: '#888', marginBottom: 16 }}>No cost matrix yet.</div>
                {isDraft && deal?.id && <button style={S.btn(true)} onClick={genMatrix} disabled={saving}>Generate Cost Matrix</button>}
                {!deal?.id && <div style={{ fontSize: 12, color: '#AAA' }}>Save the deal first.</div>}
              </div>
            ) : (
              <COSTable costMatrix={costMatrix} S={S} />
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════
          STEP 3 — FEASIBILITY  (unchanged)
          ════════════════════════════════════════════════════════════════ */}
      {step === 3 && (
        <FeasibilityView costMatrix={costMatrix} S={S} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COSTable — Step 2 full cost matrix display
// ─────────────────────────────────────────────────────────────────────────────
function COSTable({ costMatrix, S }) {
  const lines = (costMatrix.cost_lines || []).sort((a, b) => a.sort_order - b.sort_order);
  const sum = costMatrix.summary || {};

  const blockColor = (block) =>
    block === 'A' ? '#1B7A43' :
    block === 'B' ? '#B8860B' :
    block?.startsWith('C') ? '#6B2D5B' : '#888';

  const blockBg = (block) =>
    block === 'A' ? '#F0FFF4' :
    block === 'B' ? '#FFFBF0' :
    block?.startsWith('C') ? '#FAF0F8' : 'transparent';

  const fmtAmt = (n) =>
    (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Group separators
  const prevBlock = (i) => i > 0 ? lines[i - 1].block : null;
  const isNewSection = (i) => {
    if (i === 0) return false;
    const cur = lines[i].block;
    const prev = lines[i - 1].block;
    return cur !== prev && (cur === 'B' || cur === 'C1' || cur === 'C7');
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>COS — Cost Matrix</div>
        <div style={{ display: 'flex', gap: 24 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Selling Price / Container</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#1B4332' }}>
              ${fmtAmt(costMatrix.selling_price || costMatrix.total_cost)}
            </div>
          </div>
          {sum.perCaseSellingPrice > 0 && (
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>Per Case</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#1B4332' }}>
                ${fmtAmt(sum.perCaseSellingPrice)}
              </div>
            </div>
          )}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#F5F7F0' }}>
            <th style={{ ...S.th, width: 36, textAlign: 'center' }}>Blk</th>
            <th style={S.th}>Cost Line</th>
            <th style={{ ...S.th, width: 90 }}>Basis</th>
            <th style={{ ...S.th, textAlign: 'right', width: 130 }}>/ Container</th>
            <th style={{ ...S.th, textAlign: 'right', width: 100 }}>/ Case</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((c, i) => {
            const isMgmtFee = c.block === 'C7' || c.block === 'C8';
            const isSubtotal = false;
            return (
              <>
                {/* Section header rows */}
                {c.block === 'B' && prevBlock(i) === 'A' && (
                  <tr key={`sep-b-${i}`}>
                    <td colSpan={5} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, color: '#B8860B', textTransform: 'uppercase', letterSpacing: 0.8, background: '#FFFBF0', borderTop: '2px solid #FFD54F' }}>
                      Block B — Incoterm Gap Costs ({costMatrix.buy_incoterm || '?'} → {costMatrix.sell_incoterm || '?'})
                    </td>
                  </tr>
                )}
                {c.block === 'C1' && !lines[i - 1]?.block?.startsWith('C') && (
                  <tr key={`sep-c-${i}`}>
                    <td colSpan={5} style={{ padding: '6px 8px', fontSize: 10, fontWeight: 700, color: '#6B2D5B', textTransform: 'uppercase', letterSpacing: 0.8, background: '#FAF0F8', borderTop: '2px solid #D4A0C8' }}>
                      Block C — Management Fees (always applied)
                    </td>
                  </tr>
                )}
                {c.block === 'C7' && lines[i - 1]?.block !== 'C7' && (
                  <SubtotalRow key={`sub-before-${i}`} label="Subtotal before management" amount={sum.subtotalBeforeMgmt} perCase={sum.casesPerContainer > 0 ? (sum.subtotalBeforeMgmt / sum.casesPerContainer) : 0} fmtAmt={fmtAmt} />
                )}

                <tr key={i} style={{ background: blockBg(c.block) }}>
                  <td style={{ ...S.td, textAlign: 'center', fontWeight: 700, color: blockColor(c.block), fontSize: 11 }}>{c.block}</td>
                  <td style={{ ...S.td, fontWeight: c.block === 'A' ? 700 : 400 }}>
                    {c.line_item}
                    {c.note && <span style={{ fontSize: 10, color: '#AAA', marginLeft: 6 }}>{c.note}</span>}
                    {c.editable && <span style={{ fontSize: 10, color: '#B8860B', marginLeft: 6 }}>● edit in voyage search</span>}
                  </td>
                  <td style={{ ...S.td, fontSize: 11, color: '#888' }}>{c.source || ''}</td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: isMgmtFee ? 700 : 400, color: isMgmtFee ? '#6B2D5B' : '#333' }}>
                    ${fmtAmt(c.amount)}
                  </td>
                  <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', color: '#888' }}>
                    {c.per_case != null ? `$${fmtAmt(c.per_case)}` : '—'}
                  </td>
                </tr>
              </>
            );
          })}

          {/* Trading Margin row */}
          {sum.tradingMargin != null && (
            <SubtotalRow label="Total Trading Margin" amount={sum.tradingMargin} perCase={sum.casesPerContainer > 0 ? (sum.tradingMargin / sum.casesPerContainer) : 0} fmtAmt={fmtAmt} highlight />
          )}

          {/* Selling price row */}
          {(costMatrix.selling_price || sum.sellingPrice) && (
            <tr style={{ background: '#E8F4EF', borderTop: '2px solid #1B4332' }}>
              <td colSpan={3} style={{ ...S.td, fontWeight: 800, fontSize: 14, color: '#1B4332' }}>OCapital Selling Price</td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 800, fontSize: 16, color: '#1B4332' }}>
                ${fmtAmt(costMatrix.selling_price || sum.sellingPrice)}
              </td>
              <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#1B4332' }}>
                {sum.perCaseSellingPrice ? `$${fmtAmt(sum.perCaseSellingPrice)}` : '—'}
              </td>
            </tr>
          )}

          {/* Trader margin splits */}
          {sum.buyingTraderMargin != null && (
            <>
              <tr style={{ background: '#F5F7F0' }}>
                <td colSpan={3} style={{ ...S.td, fontSize: 11, color: '#666', paddingLeft: 16 }}>↳ Buying Trader Margin</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#666' }}>${fmtAmt(sum.buyingTraderMargin)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#666' }}>
                  {sum.casesPerContainer > 0 ? `$${fmtAmt(sum.buyingTraderMargin / sum.casesPerContainer)}` : '—'}
                </td>
              </tr>
              <tr style={{ background: '#F5F7F0' }}>
                <td colSpan={3} style={{ ...S.td, fontSize: 11, color: '#666', paddingLeft: 16 }}>↳ Selling Trader Margin</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#666' }}>${fmtAmt(sum.sellingTraderMargin)}</td>
                <td style={{ ...S.td, textAlign: 'right', fontFamily: 'monospace', fontSize: 11, color: '#666' }}>
                  {sum.casesPerContainer > 0 ? `$${fmtAmt(sum.sellingTraderMargin / sum.casesPerContainer)}` : '—'}
                </td>
              </tr>
            </>
          )}
        </tbody>
      </table>

      {sum.casesPerContainer > 0 && (
        <div style={{ marginTop: 8, fontSize: 11, color: '#AAA', textAlign: 'right' }}>
          {sum.casesPerContainer.toLocaleString()} cases / container
        </div>
      )}
    </>
  );
}

function SubtotalRow({ label, amount, perCase, fmtAmt, highlight }) {
  return (
    <tr style={{ background: highlight ? '#FFF8E1' : '#F0EDE6', borderTop: '1px solid #D4C8B8' }}>
      <td colSpan={3} style={{ padding: '6px 8px', fontWeight: 700, fontSize: 12, color: highlight ? '#B8860B' : '#444' }}>{label}</td>
      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: highlight ? '#B8860B' : '#333' }}>${fmtAmt(amount)}</td>
      <td style={{ padding: '6px 8px', textAlign: 'right', fontFamily: 'monospace', color: '#888' }}>{perCase > 0 ? `$${fmtAmt(perCase)}` : '—'}</td>
    </tr>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FeasibilityView — Step 3
// ─────────────────────────────────────────────────────────────────────────────
function FeasibilityView({ costMatrix, S }) {
  if (!costMatrix) {
    return (
      <div style={S.card}>
        <div style={{ textAlign: 'center', padding: 32, color: '#888' }}>Generate a cost matrix first.</div>
      </div>
    );
  }

  const sum = costMatrix.summary || {};
  const margin = costMatrix.gross_margin_pct || 0;
  const passed = margin >= 5;
  const fmtAmt = (n) => (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const rows = [
    { label: 'Block A — Supplier Cost', v: sum.subtotalA, sub: true },
    { label: 'Block B — Incoterm Gap', v: sum.subtotalB, sub: true },
    { label: 'Block C — Management Fees', v: (sum.subtotalBeforeMgmt || 0) - (sum.subtotalA || 0) - (sum.subtotalB || 0), sub: true },
    { label: 'Total Trading Margin', v: sum.tradingMargin, sub: true, accent: '#B8860B' },
    { label: 'OCapital Selling Price', v: costMatrix.selling_price || sum.sellingPrice, bold: true },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
      {/* Cost breakdown */}
      <div style={S.card}>
        <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12 }}>Cost Breakdown</div>
        {rows.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: r.bold ? '2px solid #1B4332' : '1px solid #F0EDE6' }}>
            <span style={{ fontSize: 13, fontWeight: r.bold ? 700 : 400, color: r.accent || 'inherit' }}>{r.label}</span>
            <span style={{ fontFamily: 'monospace', fontWeight: r.bold ? 800 : 600, color: r.accent || (r.bold ? '#1B4332' : 'inherit') }}>${fmtAmt(r.v)}</span>
          </div>
        ))}
        {sum.casesPerContainer > 0 && (
          <div style={{ fontSize: 11, color: '#AAA', marginTop: 8, textAlign: 'right' }}>
            Per case: ${fmtAmt(sum.perCaseSellingPrice)}
          </div>
        )}
      </div>

      {/* Go / No-go */}
      <div>
        <div style={{ padding: 20, background: passed ? '#F0FFF4' : '#FFF5F5', borderRadius: 10, border: `1px solid ${passed ? '#C6E6D0' : '#E6C6C6'}`, marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>Trading Margin</div>
          <div style={{ fontSize: 32, fontWeight: 800, color: passed ? '#1B7A43' : '#C62828' }}>
            {(sum.tradingMarginPct || 0).toFixed(1)}%
          </div>
          <div style={{ fontSize: 12, color: passed ? '#1B7A43' : '#C62828', marginTop: 4, fontWeight: 600 }}>
            {passed ? '✓ Feasibility check passed' : '✗ Below minimum threshold (5%)'}
          </div>
        </div>

        {/* Trader splits */}
        {sum.buyingTraderMargin != null && (
          <div style={S.card}>
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10, color: '#6B2D5B' }}>Trader Margin Allocation</div>
            {[
              { label: 'Buying Trader', v: sum.buyingTraderMargin, pct: sum.tradingMargin > 0 ? ((sum.buyingTraderMargin / sum.tradingMargin) * 100).toFixed(0) : 0 },
              { label: 'Selling Trader', v: sum.sellingTraderMargin, pct: sum.tradingMargin > 0 ? ((sum.sellingTraderMargin / sum.tradingMargin) * 100).toFixed(0) : 0 },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #F0EDE6' }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{r.label}</div>
                  <div style={{ fontSize: 10, color: '#888' }}>{r.pct}% of trading margin</div>
                </div>
                <div style={{ fontFamily: 'monospace', fontWeight: 700 }}>${fmtAmt(r.v)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
