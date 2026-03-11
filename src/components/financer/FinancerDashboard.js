'use client';
import { useState, useEffect } from 'react';

/**
 * TRADE FINANCER DASHBOARD
 * ========================
 * Portfolio view for banks, trade finance funds, LC issuers:
 * - Portfolio summary (total financed, outstanding, utilisation)
 * - Active facilities (LCs, loans, discounts)
 * - Exposure by counterparty, commodity, country
 * - LC lifecycle management
 * - Risk indicators
 */

const LC_STATUSES = [
  { value: 'draft', label: 'Draft', color: '#E8E4DE', fg: '#666' },
  { value: 'applied', label: 'Applied', color: '#FFF3CD', fg: '#856404' },
  { value: 'issued', label: 'Issued', color: '#CCE5FF', fg: '#004085' },
  { value: 'advised', label: 'Advised', color: '#D4E6F1', fg: '#1A5276' },
  { value: 'docs_presented', label: 'Docs Presented', color: '#E8DAEF', fg: '#6C3483' },
  { value: 'discrepancies', label: 'Discrepancies', color: '#F8D7DA', fg: '#721C24' },
  { value: 'accepted', label: 'Accepted', color: '#D4EDDA', fg: '#155724' },
  { value: 'paid', label: 'Paid', color: '#C3E6CB', fg: '#0B5B2A' },
  { value: 'expired', label: 'Expired', color: '#E8E4DE', fg: '#888' },
  { value: 'cancelled', label: 'Cancelled', color: '#F8D7DA', fg: '#721C24' },
];

const FACILITY_TYPES = [
  { value: 'lc_sight', label: 'LC at Sight' },
  { value: 'lc_usance', label: 'Usance LC' },
  { value: 'lc_deferred', label: 'Deferred Payment LC' },
  { value: 'pre_export', label: 'Pre-Export Finance' },
  { value: 'post_shipment', label: 'Post-Shipment Finance' },
  { value: 'bill_discount', label: 'Bill Discounting' },
  { value: 'warehouse', label: 'Warehouse Finance' },
  { value: 'open_account', label: 'Open Account Finance' },
];

export default function FinancerDashboard({ deals = [], S }) {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [form, setForm] = useState({
    deal_id: '', type: 'lc_sight', applicant: '', beneficiary: '',
    amount: '', currency: 'USD', tenor_days: '', interest_rate: '',
    issuing_bank: '', advising_bank: '', expiry_date: '', notes: '',
  });

  useEffect(() => { fetchFacilities(); }, []);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/finance/lc');
      const data = await res.json();
      if (data.facilities) setFacilities(data.facilities);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addFacility = async () => {
    try {
      const res = await fetch('/api/finance/lc', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount) || 0,
          tenor_days: parseInt(form.tenor_days) || 0,
          interest_rate: parseFloat(form.interest_rate) || 0,
          status: 'draft',
          deal_number: deals.find(d => d.id === form.deal_id)?.deal_number,
        }),
      });
      if (res.ok) { setShowAddModal(false); fetchFacilities(); }
    } catch (e) { console.error(e); }
  };

  const updateFacilityStatus = async (id, status) => {
    try {
      await fetch('/api/finance/lc', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchFacilities();
    } catch (e) { console.error(e); }
  };

  // Portfolio calculations
  const totalFacilityAmount = facilities.reduce((s, f) => s + (f.amount || 0), 0);
  const activeAmount = facilities.filter(f => !['paid', 'expired', 'cancelled'].includes(f.status)).reduce((s, f) => s + (f.amount || 0), 0);
  const paidAmount = facilities.filter(f => f.status === 'paid').reduce((s, f) => s + (f.amount || 0), 0);
  const activeFacilities = facilities.filter(f => !['paid', 'expired', 'cancelled'].includes(f.status));

  // Exposure by counterparty
  const exposureByParty = {};
  activeFacilities.forEach(f => {
    const key = f.applicant || 'Unknown';
    exposureByParty[key] = (exposureByParty[key] || 0) + (f.amount || 0);
  });

  // Exposure by facility type
  const exposureByType = {};
  activeFacilities.forEach(f => {
    const key = FACILITY_TYPES.find(t => t.value === f.type)?.label || f.type;
    exposureByType[key] = (exposureByType[key] || 0) + (f.amount || 0);
  });

  // Interest income estimate
  const estInterestIncome = activeFacilities.reduce((s, f) => {
    const rate = f.interest_rate || 0;
    const days = f.tenor_days || 90;
    return s + (f.amount * rate / 100 * days / 365);
  }, 0);

  const s = {
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 },
    grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 },
    card: (accent) => ({
      background: '#FAF8F5', borderRadius: 10, padding: '14px 16px', border: '1px solid #E8E4DE',
      borderLeft: `4px solid ${accent}`,
    }),
    cardLabel: { fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
    cardValue: (color) => ({ fontSize: 22, fontWeight: 800, color: color || '#1B4332', marginTop: 4 }),
    cardSub: { fontSize: 10, color: '#AAA', marginTop: 2 },
    section: { background: '#FAF8F5', borderRadius: 12, padding: 20, border: '1px solid #E8E4DE', marginBottom: 20 },
    sectionTitle: { fontSize: 11, fontWeight: 700, color: '#1B4332', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    th: { padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E8E4DE' },
    td: { padding: '8px 10px', borderBottom: '1px solid #F0EDE6' },
    btn: (primary) => ({
      padding: '6px 14px', borderRadius: 6, border: primary ? 'none' : '1px solid #DDD',
      background: primary ? '#1B4332' : '#FFF', color: primary ? '#FFF' : '#666',
      fontSize: 11, fontWeight: 600, cursor: 'pointer',
    }),
    badge: (bg, fg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: bg, color: fg }),
    tabs: { display: 'flex', gap: 0, marginBottom: 20, borderRadius: 6, overflow: 'hidden', border: '1px solid #CCC' },
    tab: (active) => ({
      padding: '8px 20px', fontSize: 12, fontWeight: active ? 700 : 400, cursor: 'pointer', border: 'none',
      background: active ? '#1B4332' : '#FFF', color: active ? '#FFF' : '#666',
    }),
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: '#FFF', borderRadius: 12, padding: 24, width: 560, maxHeight: '80vh', overflow: 'auto' },
    input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box' },
    select: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box' },
    label: { fontSize: 10, color: '#888', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
    row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 },
    exposureBar: (pct, color) => ({
      height: 8, borderRadius: 4, background: '#E8E4DE', overflow: 'hidden', marginTop: 4,
    }),
    exposureFill: (pct, color) => ({
      height: '100%', borderRadius: 4, background: color, width: `${Math.min(pct, 100)}%`, transition: 'width 0.3s',
    }),
  };

  const fmt = (n) => '$' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  const statusBadge = (status) => {
    const st = LC_STATUSES.find(s => s.value === status) || LC_STATUSES[0];
    return <span style={s.badge(st.color, st.fg)}>{st.label}</span>;
  };

  const nextStatus = (current) => {
    const flow = ['draft', 'applied', 'issued', 'advised', 'docs_presented', 'accepted', 'paid'];
    const idx = flow.indexOf(current);
    return idx >= 0 && idx < flow.length - 1 ? flow[idx + 1] : null;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1B4332', margin: 0 }}>Trade Finance</h2>
        <button style={s.btn(true)} onClick={() => setShowAddModal(true)}>+ New Facility</button>
      </div>

      {/* Tabs */}
      <div style={s.tabs}>
        {['overview', 'facilities', 'exposure'].map(tab => (
          <button key={tab} style={s.tab(activeTab === tab)} onClick={() => setActiveTab(tab)}>
            {tab === 'overview' ? 'Portfolio' : tab === 'facilities' ? 'Facilities & LCs' : 'Exposure'}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          <div style={s.grid4}>
            <div style={s.card('#1B4332')}>
              <div style={s.cardLabel}>Total Portfolio</div>
              <div style={s.cardValue()}>{fmt(totalFacilityAmount)}</div>
              <div style={s.cardSub}>{facilities.length} facilities</div>
            </div>
            <div style={s.card('#2196F3')}>
              <div style={s.cardLabel}>Active Exposure</div>
              <div style={s.cardValue('#2196F3')}>{fmt(activeAmount)}</div>
              <div style={s.cardSub}>{activeFacilities.length} outstanding</div>
            </div>
            <div style={s.card('#1B7A43')}>
              <div style={s.cardLabel}>Settled</div>
              <div style={s.cardValue('#1B7A43')}>{fmt(paidAmount)}</div>
              <div style={s.cardSub}>successfully closed</div>
            </div>
            <div style={s.card('#FF9800')}>
              <div style={s.cardLabel}>Est. Interest Income</div>
              <div style={s.cardValue('#FF9800')}>{fmt(estInterestIncome)}</div>
              <div style={s.cardSub}>on active facilities</div>
            </div>
          </div>

          {/* LC Pipeline */}
          <div style={s.section}>
            <div style={s.sectionTitle}>LC Pipeline</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8 }}>
              {['draft', 'issued', 'docs_presented', 'accepted', 'paid'].map(status => {
                const count = facilities.filter(f => f.status === status).length;
                const amount = facilities.filter(f => f.status === status).reduce((s, f) => s + (f.amount || 0), 0);
                const st = LC_STATUSES.find(s => s.value === status);
                return (
                  <div key={status} style={{ textAlign: 'center', padding: 12, borderRadius: 8, background: st?.color || '#EEE' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: st?.fg }}>{count}</div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: st?.fg, marginTop: 2 }}>{st?.label}</div>
                    <div style={{ fontSize: 10, color: st?.fg, opacity: 0.7, marginTop: 2 }}>{fmt(amount)}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Facilities Tab */}
      {activeTab === 'facilities' && (
        <div style={s.section}>
          <div style={s.sectionTitle}>Active Facilities & Letters of Credit</div>
          {facilities.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#AAA' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🏦</div>
              <div style={{ fontSize: 13 }}>No facilities yet</div>
              <div style={{ fontSize: 11, marginTop: 4 }}>Click "+ New Facility" to create an LC or financing facility</div>
            </div>
          ) : (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Deal</th>
                  <th style={s.th}>Type</th>
                  <th style={s.th}>Applicant</th>
                  <th style={s.th}>Beneficiary</th>
                  <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                  <th style={s.th}>Tenor</th>
                  <th style={s.th}>Rate</th>
                  <th style={s.th}>Status</th>
                  <th style={s.th}>Action</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((f, i) => (
                  <tr key={i}>
                    <td style={{ ...s.td, fontWeight: 600, color: '#1B4332' }}>{f.deal_number || '—'}</td>
                    <td style={s.td}>{FACILITY_TYPES.find(t => t.value === f.type)?.label || f.type}</td>
                    <td style={s.td}>{f.applicant || '—'}</td>
                    <td style={s.td}>{f.beneficiary || '—'}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{f.currency} {(f.amount || 0).toLocaleString()}</td>
                    <td style={s.td}>{f.tenor_days ? `${f.tenor_days}d` : '—'}</td>
                    <td style={s.td}>{f.interest_rate ? `${f.interest_rate}%` : '—'}</td>
                    <td style={s.td}>{statusBadge(f.status)}</td>
                    <td style={s.td}>
                      {nextStatus(f.status) && (
                        <button style={s.btn(false)} onClick={() => updateFacilityStatus(f.id, nextStatus(f.status))}>
                          → {LC_STATUSES.find(s => s.value === nextStatus(f.status))?.label}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Exposure Tab */}
      {activeTab === 'exposure' && (
        <>
          <div style={s.grid2}>
            <div style={s.section}>
              <div style={s.sectionTitle}>Exposure by Counterparty</div>
              {Object.entries(exposureByParty).sort((a, b) => b[1] - a[1]).map(([party, amount], i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{party}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fmt(amount)}</span>
                  </div>
                  <div style={s.exposureBar()}>
                    <div style={s.exposureFill(activeAmount > 0 ? (amount / activeAmount) * 100 : 0, '#1B4332')} />
                  </div>
                  <div style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                    {activeAmount > 0 ? ((amount / activeAmount) * 100).toFixed(1) : 0}% of portfolio
                  </div>
                </div>
              ))}
              {Object.keys(exposureByParty).length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#AAA', fontSize: 12 }}>No active exposure</div>
              )}
            </div>

            <div style={s.section}>
              <div style={s.sectionTitle}>Exposure by Facility Type</div>
              {Object.entries(exposureByType).sort((a, b) => b[1] - a[1]).map(([type, amount], i) => (
                <div key={i} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                    <span style={{ fontWeight: 600 }}>{type}</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 700 }}>{fmt(amount)}</span>
                  </div>
                  <div style={s.exposureBar()}>
                    <div style={s.exposureFill(activeAmount > 0 ? (amount / activeAmount) * 100 : 0, '#2196F3')} />
                  </div>
                </div>
              ))}
              {Object.keys(exposureByType).length === 0 && (
                <div style={{ textAlign: 'center', padding: 20, color: '#AAA', fontSize: 12 }}>No active exposure</div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Add Facility Modal */}
      {showAddModal && (
        <div style={s.modal} onClick={() => setShowAddModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>New Financing Facility</h3>
            <div style={s.row}>
              <div>
                <label style={s.label}>Linked Deal</label>
                <select style={s.select} value={form.deal_id} onChange={e => setForm({ ...form, deal_id: e.target.value })}>
                  <option value="">Select deal...</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.deal_number} — {d.customer?.name || d.customer_name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Facility Type</label>
                <select style={s.select} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {FACILITY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Applicant (Buyer)</label>
                <input style={s.input} value={form.applicant} onChange={e => setForm({ ...form, applicant: e.target.value })} placeholder="Company name" />
              </div>
              <div>
                <label style={s.label}>Beneficiary (Seller)</label>
                <input style={s.input} value={form.beneficiary} onChange={e => setForm({ ...form, beneficiary: e.target.value })} placeholder="Company name" />
              </div>
            </div>
            <div style={s.row3}>
              <div>
                <label style={s.label}>Amount</label>
                <input style={s.input} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label style={s.label}>Currency</label>
                <select style={s.select} value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                  <option>USD</option><option>EUR</option><option>GBP</option><option>ZAR</option><option>SGD</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Tenor (days)</label>
                <input style={s.input} type="number" value={form.tenor_days} onChange={e => setForm({ ...form, tenor_days: e.target.value })} placeholder="e.g. 90" />
              </div>
            </div>
            <div style={s.row3}>
              <div>
                <label style={s.label}>Interest Rate (%)</label>
                <input style={s.input} type="number" step="0.01" value={form.interest_rate} onChange={e => setForm({ ...form, interest_rate: e.target.value })} placeholder="e.g. 6.5" />
              </div>
              <div>
                <label style={s.label}>Issuing Bank</label>
                <input style={s.input} value={form.issuing_bank} onChange={e => setForm({ ...form, issuing_bank: e.target.value })} placeholder="Bank name" />
              </div>
              <div>
                <label style={s.label}>Advising Bank</label>
                <input style={s.input} value={form.advising_bank} onChange={e => setForm({ ...form, advising_bank: e.target.value })} placeholder="Bank name" />
              </div>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={s.label}>Notes</label>
              <input style={s.input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={s.btn(false)} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button style={s.btn(true)} onClick={addFacility}>Create Facility</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
