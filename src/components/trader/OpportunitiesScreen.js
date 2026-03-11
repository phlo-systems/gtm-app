'use client';
import { useState, useEffect } from 'react';

/**
 * OpportunitiesScreen
 * ====================
 * Pre-deal structuring tool:
 * - List open opportunities
 * - Create new opportunity with product/route/counterparty
 * - Add multiple scenarios per opportunity (different incoterms, pricing, costs)
 * - Side-by-side scenario comparison
 * - Select best scenario → approve → convert to deal
 */

const INCOTERMS = ['EXW','FCA','FAS','FOB','CFR','CIF','CPT','CIP','DAP','DPU','DDP'];

export default function OpportunitiesScreen({ S, workflowConfig }) {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOpp, setSelectedOpp] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  const [scenarioForm, setScenarioForm] = useState({});
  const [showAddScenario, setShowAddScenario] = useState(false);

  useEffect(() => { fetchOpportunities(); }, []);

  const fetchOpportunities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/opportunities');
      const data = await res.json();
      setOpportunities(data.opportunities || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const createOpportunity = async () => {
    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product: form.product,
          counterparty: { supplier: form.supplier, customer: form.customer },
          route_origin: form.origin,
          route_destination: form.destination,
          estimatedVolume: form.volume,
          notes: form.notes,
          scenario: form.product ? {
            name: 'Scenario A',
            buyIncoterm: form.buyIncoterm || 'FOB',
            sellIncoterm: form.sellIncoterm || 'CIF',
            buyPrice: parseFloat(form.buyPrice) || 0,
            sellPrice: parseFloat(form.sellPrice) || 0,
            tonnage: parseFloat(form.volume) || 0,
            currency: form.currency || 'USD',
            supplierName: form.supplier,
            customerName: form.customer,
            buyLocation: form.origin,
            sellLocation: form.destination,
            estimatedFreight: parseFloat(form.freight) || 0,
            estimatedDuty: parseFloat(form.duty) || 0,
            estimatedInsurance: parseFloat(form.insurance) || 0,
          } : null,
        }),
      });
      if (res.ok) {
        setShowCreate(false);
        setForm({});
        fetchOpportunities();
      }
    } catch (e) { console.error(e); }
  };

  const addScenario = async () => {
    if (!selectedOpp) return;
    try {
      const res = await fetch('/api/opportunities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOpp.id,
          action: 'add_scenario',
          data: {
            name: scenarioForm.name || `Scenario ${String.fromCharCode(65 + (selectedOpp.scenarios?.length || 0))}`,
            buyIncoterm: scenarioForm.buyIncoterm || 'FOB',
            sellIncoterm: scenarioForm.sellIncoterm || 'CIF',
            buyPrice: parseFloat(scenarioForm.buyPrice) || 0,
            sellPrice: parseFloat(scenarioForm.sellPrice) || 0,
            tonnage: parseFloat(scenarioForm.tonnage) || parseFloat(selectedOpp.quantity) || 0,
            currency: scenarioForm.currency || 'USD',
            estimatedFreight: parseFloat(scenarioForm.freight) || 0,
            estimatedDuty: parseFloat(scenarioForm.duty) || 0,
            estimatedInsurance: parseFloat(scenarioForm.insurance) || 0,
            estimatedFinanceCost: parseFloat(scenarioForm.financeCost) || 0,
            notes: scenarioForm.notes || '',
          },
        }),
      });
      if (res.ok) {
        setShowAddScenario(false);
        setScenarioForm({});
        fetchOpportunities();
      }
    } catch (e) { console.error(e); }
  };

  const selectScenario = async (scenarioId) => {
    try {
      await fetch('/api/opportunities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedOpp.id, action: 'select_scenario', data: { scenarioId } }),
      });
      fetchOpportunities();
    } catch (e) { console.error(e); }
  };

  const convertToDeal = async () => {
    try {
      const res = await fetch('/api/opportunities', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: selectedOpp.id, action: 'convert_to_deal', data: {} }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Deal created: ${data.deal.deal_number || data.deal.id.substring(0, 8)}`);
        setSelectedOpp(null);
        fetchOpportunities();
      }
    } catch (e) { console.error(e); }
  };

  // Recalculate scenario profitability
  const calcScenario = (sc) => {
    const qty = sc.tonnage || 0;
    const revenue = qty * (sc.sellPrice || 0);
    const cost = qty * (sc.buyPrice || 0);
    const freight = sc.estimatedFreight || 0;
    const duty = sc.estimatedDuty || 0;
    const insurance = sc.estimatedInsurance || 0;
    const finance = sc.estimatedFinanceCost || 0;
    const totalCost = cost + freight + duty + insurance + finance;
    const grossProfit = revenue - totalCost;
    const margin = revenue > 0 ? (grossProfit / revenue * 100) : 0;
    return { revenue, cost, freight, duty, insurance, finance, totalCost, grossProfit, margin: Math.round(margin * 100) / 100 };
  };

  const s = {
    container: { padding: 0 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    title: { fontSize: 24, fontWeight: 700, color: '#1B4332', margin: 0 },
    btn: (primary, color) => ({
      padding: '8px 16px', borderRadius: 6, border: primary ? 'none' : '1px solid #DDD',
      background: primary ? (color || '#1B4332') : '#FFF', color: primary ? '#FFF' : '#666',
      fontSize: 12, fontWeight: 600, cursor: 'pointer',
    }),
    card: { background: '#FAF8F5', borderRadius: 12, padding: 20, border: '1px solid #E8E4DE', marginBottom: 16 },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1B4332', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    th: { padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E8E4DE' },
    td: { padding: '10px', borderBottom: '1px solid #F0EDE6' },
    badge: (bg, fg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: bg, color: fg }),
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 },
    scenarioCard: (selected) => ({
      background: selected ? '#F0FFF4' : '#FFF', borderRadius: 10, padding: 16,
      border: `2px solid ${selected ? '#1B7A43' : '#E8E4DE'}`, cursor: 'pointer', transition: 'all 0.2s',
    }),
    metric: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: '1px solid #F5F3F0' },
    metricLabel: { color: '#888' },
    metricValue: { fontWeight: 600, fontFamily: 'monospace' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: '#FFF', borderRadius: 12, padding: 24, width: 560, maxHeight: '80vh', overflow: 'auto' },
    input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box', marginBottom: 12 },
    select: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box', marginBottom: 12 },
    formLabel: { fontSize: 10, color: '#888', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    backBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#888', marginRight: 12 },
    profitBadge: (profit) => ({
      fontSize: 18, fontWeight: 800,
      color: profit >= 0 ? '#1B7A43' : '#C62828',
    }),
  };

  const fmt = (n) => '$' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const stageBadge = (stage) => {
    const colors = {
      structuring: ['#E8E4DE', '#666'], evaluating: ['#FFF3CD', '#856404'],
      recommended: ['#CCE5FF', '#004085'], approved: ['#D4EDDA', '#155724'],
      converted: ['#C3E6CB', '#0B5B2A'], archived: ['#F8D7DA', '#721C24'],
    };
    const [bg, fg] = colors[stage] || ['#E8E4DE', '#666'];
    return <span style={s.badge(bg, fg)}>{stage}</span>;
  };

  // ── Detail View (selected opportunity) ──
  if (selectedOpp) {
    const opp = opportunities.find(o => o.id === selectedOpp.id) || selectedOpp;
    const scenarios = opp.scenarios || opp.extended?.scenarios || [];
    const selectedScId = opp.extended?.selectedScenario;
    const stage = opp.extended?.stage || 'structuring';

    return (
      <div style={s.container}>
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button style={s.backBtn} onClick={() => setSelectedOpp(null)}>{'\u2190'}</button>
            <div>
              <h2 style={{ ...s.title, fontSize: 20 }}>{opp.extended?.product || 'Opportunity'}</h2>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                {opp.supplier_name || '?'} → {opp.customer_name || '?'} | {opp.buy_location} → {opp.sell_location}
                <span style={{ marginLeft: 8 }}>{stageBadge(stage)}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={s.btn(false)} onClick={() => setShowAddScenario(true)}>+ Add Scenario</button>
            {selectedScId && stage !== 'converted' && (
              <button style={s.btn(true, '#1B7A43')} onClick={convertToDeal}>Convert to Deal →</button>
            )}
          </div>
        </div>

        {/* Scenario Comparison */}
        <div style={s.sectionTitle}>Scenarios ({scenarios.length})</div>
        <div style={s.grid}>
          {scenarios.map((sc) => {
            const calc = calcScenario(sc);
            const isSelected = sc.id === selectedScId;
            return (
              <div key={sc.id} style={s.scenarioCard(isSelected)} onClick={() => selectScenario(sc.id)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: '#1B4332' }}>{sc.name}</div>
                  {isSelected && <span style={s.badge('#D4EDDA', '#155724')}>Selected</span>}
                </div>

                <div style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>
                  {sc.buyIncoterm || 'FOB'} → {sc.sellIncoterm || 'CIF'} | {sc.tonnage || '?'} MT | {sc.currency || 'USD'}
                </div>

                <div style={s.metric}><span style={s.metricLabel}>Buy Price</span><span style={s.metricValue}>{fmt(sc.buyPrice)}/MT</span></div>
                <div style={s.metric}><span style={s.metricLabel}>Sell Price</span><span style={s.metricValue}>{fmt(sc.sellPrice)}/MT</span></div>
                <div style={s.metric}><span style={s.metricLabel}>Freight</span><span style={s.metricValue}>{fmt(calc.freight)}</span></div>
                <div style={s.metric}><span style={s.metricLabel}>Duty</span><span style={s.metricValue}>{fmt(calc.duty)}</span></div>
                <div style={s.metric}><span style={s.metricLabel}>Insurance</span><span style={s.metricValue}>{fmt(calc.insurance)}</span></div>
                <div style={{ ...s.metric, borderTop: '2px solid #1B4332', marginTop: 6, paddingTop: 6 }}>
                  <span style={{ fontWeight: 700 }}>Total Cost</span>
                  <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmt(calc.totalCost)}</span>
                </div>
                <div style={s.metric}><span style={{ fontWeight: 700 }}>Revenue</span><span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{fmt(calc.revenue)}</span></div>

                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <div style={s.profitBadge(calc.grossProfit)}>
                    {fmt(calc.grossProfit)} ({calc.margin}%)
                  </div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>Gross Profit</div>
                </div>
              </div>
            );
          })}

          {scenarios.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: '#AAA', gridColumn: '1 / -1' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💡</div>
              <div>No scenarios yet. Click "+ Add Scenario" to model different deal structures.</div>
            </div>
          )}
        </div>

        {/* Add Scenario Modal */}
        {showAddScenario && (
          <div style={s.modal} onClick={() => setShowAddScenario(false)}>
            <div style={s.modalContent} onClick={e => e.stopPropagation()}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>Add Scenario</h3>
              <div><label style={s.formLabel}>Scenario Name</label>
                <input style={s.input} value={scenarioForm.name || ''} onChange={e => setScenarioForm({ ...scenarioForm, name: e.target.value })} placeholder={`Scenario ${String.fromCharCode(65 + scenarios.length)}`} /></div>
              <div style={s.formRow}>
                <div><label style={s.formLabel}>Buy Incoterm</label>
                  <select style={s.select} value={scenarioForm.buyIncoterm || 'FOB'} onChange={e => setScenarioForm({ ...scenarioForm, buyIncoterm: e.target.value })}>
                    {INCOTERMS.map(i => <option key={i}>{i}</option>)}</select></div>
                <div><label style={s.formLabel}>Sell Incoterm</label>
                  <select style={s.select} value={scenarioForm.sellIncoterm || 'CIF'} onChange={e => setScenarioForm({ ...scenarioForm, sellIncoterm: e.target.value })}>
                    {INCOTERMS.map(i => <option key={i}>{i}</option>)}</select></div>
              </div>
              <div style={s.formRow}>
                <div><label style={s.formLabel}>Buy Price (USD/MT)</label>
                  <input style={s.input} type="number" step="0.01" value={scenarioForm.buyPrice || ''} onChange={e => setScenarioForm({ ...scenarioForm, buyPrice: e.target.value })} /></div>
                <div><label style={s.formLabel}>Sell Price (USD/MT)</label>
                  <input style={s.input} type="number" step="0.01" value={scenarioForm.sellPrice || ''} onChange={e => setScenarioForm({ ...scenarioForm, sellPrice: e.target.value })} /></div>
              </div>
              <div style={s.formRow}>
                <div><label style={s.formLabel}>Tonnage (MT)</label>
                  <input style={s.input} type="number" value={scenarioForm.tonnage || ''} onChange={e => setScenarioForm({ ...scenarioForm, tonnage: e.target.value })} placeholder={opp.quantity || '500'} /></div>
                <div><label style={s.formLabel}>Currency</label>
                  <select style={s.select} value={scenarioForm.currency || 'USD'} onChange={e => setScenarioForm({ ...scenarioForm, currency: e.target.value })}>
                    <option>USD</option><option>EUR</option><option>GBP</option><option>ZAR</option><option>SGD</option></select></div>
              </div>
              <div style={{ ...s.sectionTitle, marginTop: 8 }}>Cost Assumptions</div>
              <div style={s.formRow}>
                <div><label style={s.formLabel}>Est. Freight (total)</label>
                  <input style={s.input} type="number" step="0.01" value={scenarioForm.freight || ''} onChange={e => setScenarioForm({ ...scenarioForm, freight: e.target.value })} /></div>
                <div><label style={s.formLabel}>Est. Import Duty (total)</label>
                  <input style={s.input} type="number" step="0.01" value={scenarioForm.duty || ''} onChange={e => setScenarioForm({ ...scenarioForm, duty: e.target.value })} /></div>
              </div>
              <div style={s.formRow}>
                <div><label style={s.formLabel}>Est. Insurance (total)</label>
                  <input style={s.input} type="number" step="0.01" value={scenarioForm.insurance || ''} onChange={e => setScenarioForm({ ...scenarioForm, insurance: e.target.value })} /></div>
                <div><label style={s.formLabel}>Est. Finance Cost (total)</label>
                  <input style={s.input} type="number" step="0.01" value={scenarioForm.financeCost || ''} onChange={e => setScenarioForm({ ...scenarioForm, financeCost: e.target.value })} /></div>
              </div>
              <div><label style={s.formLabel}>Notes</label>
                <input style={s.input} value={scenarioForm.notes || ''} onChange={e => setScenarioForm({ ...scenarioForm, notes: e.target.value })} /></div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                <button style={s.btn(false)} onClick={() => setShowAddScenario(false)}>Cancel</button>
                <button style={s.btn(true)} onClick={addScenario}>Add Scenario</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ── List View ──
  return (
    <div style={s.container}>
      <div style={s.header}>
        <h2 style={s.title}>{workflowConfig?.preDeal?.label || 'Opportunities'}</h2>
        <button style={s.btn(true)} onClick={() => setShowCreate(true)}>+ New Opportunity</button>
      </div>

      <div style={s.card}>
        {opportunities.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#AAA' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💡</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>No opportunities yet</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>Create an opportunity to start structuring a potential trade</div>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Product</th>
                <th style={s.th}>Supplier → Customer</th>
                <th style={s.th}>Route</th>
                <th style={s.th}>Volume</th>
                <th style={s.th}>Scenarios</th>
                <th style={s.th}>Stage</th>
                <th style={s.th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((opp, i) => (
                <tr key={i} style={{ cursor: 'pointer' }} onClick={() => setSelectedOpp(opp)}>
                  <td style={{ ...s.td, fontWeight: 600, color: '#1B4332' }}>{opp.extended?.product || '—'}</td>
                  <td style={s.td}>{opp.supplier_name || '?'} → {opp.customer_name || '?'}</td>
                  <td style={s.td}>{opp.buy_location} → {opp.sell_location}</td>
                  <td style={s.td}>{opp.quantity ? `${opp.quantity} MT` : '—'}</td>
                  <td style={s.td}>{(opp.scenarios || opp.extended?.scenarios || []).length}</td>
                  <td style={s.td}>{stageBadge(opp.extended?.stage || 'structuring')}</td>
                  <td style={s.td}><button style={s.btn(false)} onClick={e => { e.stopPropagation(); setSelectedOpp(opp); }}>Open</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create Opportunity Modal */}
      {showCreate && (
        <div style={s.modal} onClick={() => setShowCreate(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>New Opportunity</h3>
            <div><label style={s.formLabel}>Product / Commodity</label>
              <input style={s.input} value={form.product || ''} onChange={e => setForm({ ...form, product: e.target.value })} placeholder="e.g. Yellow Soybean #1" /></div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Supplier</label>
                <input style={s.input} value={form.supplier || ''} onChange={e => setForm({ ...form, supplier: e.target.value })} placeholder="Seller name" /></div>
              <div><label style={s.formLabel}>Customer</label>
                <input style={s.input} value={form.customer || ''} onChange={e => setForm({ ...form, customer: e.target.value })} placeholder="Buyer name" /></div>
            </div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Origin</label>
                <input style={s.input} value={form.origin || ''} onChange={e => setForm({ ...form, origin: e.target.value })} placeholder="e.g. Oakland, CA, USA" /></div>
              <div><label style={s.formLabel}>Destination</label>
                <input style={s.input} value={form.destination || ''} onChange={e => setForm({ ...form, destination: e.target.value })} placeholder="e.g. Jakarta, Indonesia" /></div>
            </div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Est. Volume (MT)</label>
                <input style={s.input} type="number" value={form.volume || ''} onChange={e => setForm({ ...form, volume: e.target.value })} placeholder="500" /></div>
              <div><label style={s.formLabel}>Currency</label>
                <select style={s.select} value={form.currency || 'USD'} onChange={e => setForm({ ...form, currency: e.target.value })}>
                  <option>USD</option><option>EUR</option><option>GBP</option><option>ZAR</option><option>SGD</option></select></div>
            </div>
            <div style={{ ...s.sectionTitle, marginTop: 8 }}>Initial Scenario (optional)</div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Buy Incoterm</label>
                <select style={s.select} value={form.buyIncoterm || 'FOB'} onChange={e => setForm({ ...form, buyIncoterm: e.target.value })}>
                  {INCOTERMS.map(i => <option key={i}>{i}</option>)}</select></div>
              <div><label style={s.formLabel}>Sell Incoterm</label>
                <select style={s.select} value={form.sellIncoterm || 'CIF'} onChange={e => setForm({ ...form, sellIncoterm: e.target.value })}>
                  {INCOTERMS.map(i => <option key={i}>{i}</option>)}</select></div>
            </div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Buy Price (USD/MT)</label>
                <input style={s.input} type="number" step="0.01" value={form.buyPrice || ''} onChange={e => setForm({ ...form, buyPrice: e.target.value })} /></div>
              <div><label style={s.formLabel}>Sell Price (USD/MT)</label>
                <input style={s.input} type="number" step="0.01" value={form.sellPrice || ''} onChange={e => setForm({ ...form, sellPrice: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 12 }}>
              <button style={s.btn(false)} onClick={() => setShowCreate(false)}>Cancel</button>
              <button style={s.btn(true)} onClick={createOpportunity}>Create Opportunity</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
