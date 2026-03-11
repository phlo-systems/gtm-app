'use client';
import { useState, useEffect } from 'react';

/**
 * COMMISSION AGENT DASHBOARD
 * ==========================
 * Overview for commodity brokers/commission agents:
 * - Commission summary (earned, pending, paid)
 * - Active deals with commission per deal
 * - Receivables aging
 * - Principal (buyer/seller) book
 * - Quick-add commission to any deal
 */

const COMMISSION_TYPES = [
  { value: 'pct_cif', label: '% of CIF Value' },
  { value: 'pct_margin', label: '% of Margin' },
  { value: 'flat_per_mt', label: 'Flat per MT' },
  { value: 'flat_total', label: 'Flat Total' },
];

export default function AgentDashboard({ deals = [], S }) {
  const [commissions, setCommissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState(null);
  const [form, setForm] = useState({
    type: 'pct_cif', rate: '', principal: '', side: 'buyer', notes: '',
  });

  useEffect(() => {
    fetchCommissions();
  }, []);

  const fetchCommissions = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/commissions');
      const data = await res.json();
      if (data.commissions) setCommissions(data.commissions);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const addCommission = async () => {
    if (!selectedDeal || !form.rate) return;
    try {
      const deal = deals.find(d => d.id === selectedDeal);
      const tonnage = parseFloat(deal?.quantity) || parseFloat(deal?.extended?.tonnage) || 100;
      const cifValue = (parseFloat(deal?.unit_price) || 0) * tonnage;

      let amount = 0;
      switch (form.type) {
        case 'pct_cif': amount = cifValue * (parseFloat(form.rate) / 100); break;
        case 'pct_margin': amount = (deal?.margin || 0) * (parseFloat(form.rate) / 100); break;
        case 'flat_per_mt': amount = parseFloat(form.rate) * tonnage; break;
        case 'flat_total': amount = parseFloat(form.rate); break;
      }

      const res = await fetch('/api/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_id: selectedDeal,
          deal_number: deal?.deal_number,
          principal: form.principal,
          side: form.side,
          commission_type: form.type,
          rate: parseFloat(form.rate),
          amount: Math.round(amount * 100) / 100,
          currency: deal?.cost_currency || 'USD',
          status: 'pending',
          notes: form.notes,
        }),
      });
      if (res.ok) {
        setShowAddModal(false);
        setForm({ type: 'pct_cif', rate: '', principal: '', side: 'buyer', notes: '' });
        fetchCommissions();
      }
    } catch (e) { console.error(e); }
  };

  const updateStatus = async (id, status) => {
    try {
      await fetch('/api/commissions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      fetchCommissions();
    } catch (e) { console.error(e); }
  };

  // Calculate summary
  const totalEarned = commissions.reduce((s, c) => s + (c.amount || 0), 0);
  const totalPending = commissions.filter(c => c.status === 'pending').reduce((s, c) => s + (c.amount || 0), 0);
  const totalInvoiced = commissions.filter(c => c.status === 'invoiced').reduce((s, c) => s + (c.amount || 0), 0);
  const totalPaid = commissions.filter(c => c.status === 'paid').reduce((s, c) => s + (c.amount || 0), 0);

  const s = {
    grid4: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 },
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
    badge: (bg, fg) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: bg, color: fg,
    }),
    modal: {
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    },
    modalContent: { background: '#FFF', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflow: 'auto' },
    input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box' },
    select: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box' },
    label: { fontSize: 10, color: '#888', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 },
  };

  const fmt = (n) => '$' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const statusBadge = (status) => {
    const colors = { pending: ['#FFF3CD', '#856404'], invoiced: ['#CCE5FF', '#004085'], paid: ['#D4EDDA', '#155724'], cancelled: ['#F8D7DA', '#721C24'] };
    const [bg, fg] = colors[status] || ['#E8E4DE', '#666'];
    return <span style={s.badge(bg, fg)}>{status}</span>;
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1B4332', margin: 0 }}>Commission Agent</h2>
        <button style={s.btn(true)} onClick={() => setShowAddModal(true)}>+ Add Commission</button>
      </div>

      {/* Summary Cards */}
      <div style={s.grid4}>
        <div style={s.card('#1B4332')}>
          <div style={s.cardLabel}>Total Earned</div>
          <div style={s.cardValue()}>{fmt(totalEarned)}</div>
          <div style={s.cardSub}>{commissions.length} commissions</div>
        </div>
        <div style={s.card('#FF9800')}>
          <div style={s.cardLabel}>Pending</div>
          <div style={s.cardValue('#FF9800')}>{fmt(totalPending)}</div>
          <div style={s.cardSub}>{commissions.filter(c => c.status === 'pending').length} deals</div>
        </div>
        <div style={s.card('#2196F3')}>
          <div style={s.cardLabel}>Invoiced</div>
          <div style={s.cardValue('#2196F3')}>{fmt(totalInvoiced)}</div>
          <div style={s.cardSub}>awaiting payment</div>
        </div>
        <div style={s.card('#1B7A43')}>
          <div style={s.cardLabel}>Paid</div>
          <div style={s.cardValue('#1B7A43')}>{fmt(totalPaid)}</div>
          <div style={s.cardSub}>collected</div>
        </div>
      </div>

      {/* Commission Tracker Table */}
      <div style={s.section}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={s.sectionTitle}>Commission Tracker</div>
        </div>
        {commissions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: '#AAA' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>💼</div>
            <div style={{ fontSize: 13 }}>No commissions yet</div>
            <div style={{ fontSize: 11, marginTop: 4 }}>Click "+ Add Commission" to track your first deal</div>
          </div>
        ) : (
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>Deal</th>
                <th style={s.th}>Principal</th>
                <th style={s.th}>Side</th>
                <th style={s.th}>Type</th>
                <th style={s.th}>Rate</th>
                <th style={{ ...s.th, textAlign: 'right' }}>Amount</th>
                <th style={s.th}>Status</th>
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {commissions.map((c, i) => (
                <tr key={i}>
                  <td style={{ ...s.td, fontWeight: 600, color: '#1B4332' }}>{c.deal_number || 'N/A'}</td>
                  <td style={s.td}>{c.principal || '—'}</td>
                  <td style={s.td}><span style={s.badge(c.side === 'buyer' ? '#E3F2FD' : '#FFF3E0', c.side === 'buyer' ? '#1565C0' : '#E65100')}>{c.side}</span></td>
                  <td style={s.td}>{COMMISSION_TYPES.find(t => t.value === c.commission_type)?.label || c.commission_type}</td>
                  <td style={s.td}>{c.rate}{c.commission_type?.includes('pct') ? '%' : c.commission_type === 'flat_per_mt' ? '/MT' : ''}</td>
                  <td style={{ ...s.td, textAlign: 'right', fontWeight: 700, fontFamily: 'monospace' }}>{fmt(c.amount)}</td>
                  <td style={s.td}>{statusBadge(c.status)}</td>
                  <td style={s.td}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {c.status === 'pending' && <button style={s.btn(false)} onClick={() => updateStatus(c.id, 'invoiced')}>Invoice</button>}
                      {c.status === 'invoiced' && <button style={s.btn(false)} onClick={() => updateStatus(c.id, 'paid')}>Mark Paid</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#F0EDE6' }}>
                <td colSpan={5} style={{ ...s.td, fontWeight: 700 }}>Total</td>
                <td style={{ ...s.td, textAlign: 'right', fontWeight: 800, fontSize: 14, color: '#1B4332' }}>{fmt(totalEarned)}</td>
                <td colSpan={2} style={s.td}></td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Recent Deals with Commission Status */}
      <div style={s.section}>
        <div style={s.sectionTitle}>Deals Overview</div>
        <table style={s.table}>
          <thead>
            <tr>
              <th style={s.th}>Deal</th>
              <th style={s.th}>Buyer</th>
              <th style={s.th}>Seller</th>
              <th style={s.th}>Incoterms</th>
              <th style={s.th}>Status</th>
              <th style={{ ...s.th, textAlign: 'right' }}>Commission</th>
            </tr>
          </thead>
          <tbody>
            {deals.slice(0, 10).map((d, i) => {
              const dealComm = commissions.filter(c => c.deal_id === d.id);
              const totalComm = dealComm.reduce((s, c) => s + (c.amount || 0), 0);
              return (
                <tr key={i}>
                  <td style={{ ...s.td, fontWeight: 600, color: '#1B4332' }}>{d.deal_number}</td>
                  <td style={s.td}>{d.customer?.name || d.customer_name || '—'}</td>
                  <td style={s.td}>{d.supplier?.name || d.supplier_name || '—'}</td>
                  <td style={s.td}>{d.buy_incoterm} → {d.sell_incoterm}</td>
                  <td style={s.td}>{statusBadge(d.status)}</td>
                  <td style={{ ...s.td, textAlign: 'right' }}>
                    {totalComm > 0 ? (
                      <span style={{ fontWeight: 700, color: '#1B7A43' }}>{fmt(totalComm)}</span>
                    ) : (
                      <button style={{ ...s.btn(false), fontSize: 10 }} onClick={() => { setSelectedDeal(d.id); setShowAddModal(true); }}>Add</button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add Commission Modal */}
      {showAddModal && (
        <div style={s.modal} onClick={() => setShowAddModal(false)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>Add Commission</h3>
            <div style={s.row}>
              <div>
                <label style={s.label}>Deal</label>
                <select style={s.select} value={selectedDeal || ''} onChange={e => setSelectedDeal(e.target.value)}>
                  <option value="">Select deal...</option>
                  {deals.map(d => <option key={d.id} value={d.id}>{d.deal_number} — {d.customer?.name || d.customer_name}</option>)}
                </select>
              </div>
              <div>
                <label style={s.label}>Principal (who pays you)</label>
                <input style={s.input} value={form.principal} onChange={e => setForm({ ...form, principal: e.target.value })} placeholder="Company name" />
              </div>
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Side</label>
                <select style={s.select} value={form.side} onChange={e => setForm({ ...form, side: e.target.value })}>
                  <option value="buyer">Buyer side</option>
                  <option value="seller">Seller side</option>
                  <option value="both">Both sides</option>
                </select>
              </div>
              <div>
                <label style={s.label}>Commission Type</label>
                <select style={s.select} value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                  {COMMISSION_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div style={s.row}>
              <div>
                <label style={s.label}>Rate</label>
                <input style={s.input} type="number" step="0.01" value={form.rate} onChange={e => setForm({ ...form, rate: e.target.value })}
                  placeholder={form.type.includes('pct') ? 'e.g. 1.5' : 'e.g. 5.00'} />
              </div>
              <div>
                <label style={s.label}>Notes</label>
                <input style={s.input} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Optional" />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
              <button style={s.btn(false)} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button style={s.btn(true)} onClick={addCommission}>Add Commission</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
