'use client';
import { useState } from 'react';

/**
 * DealLifecyclePanel
 * ==================
 * Shows deal lifecycle progress and provides action buttons for each stage:
 * Draft → Approved → Price Fixed → Contracted → Shipped → Delivered → Invoiced → Settled → Closed
 */

const STAGES = [
  { key: 'draft', label: 'Draft', icon: '📝' },
  { key: 'approved', label: 'Approved', icon: '✅' },
  { key: 'fixing', label: 'Pricing', icon: '📊' },
  { key: 'contracted', label: 'Contracted', icon: '📃' },
  { key: 'shipped', label: 'Shipped', icon: '🚢' },
  { key: 'delivered', label: 'Delivered', icon: '📦' },
  { key: 'invoiced', label: 'Invoiced', icon: '🧾' },
  { key: 'settled', label: 'Settled', icon: '💰' },
  { key: 'closed', label: 'Closed', icon: '🔒' },
];

export default function DealLifecyclePanel({ deal, onRefresh }) {
  const [loading, setLoading] = useState('');
  const [showModal, setShowModal] = useState(null);
  const [form, setForm] = useState({});
  const [result, setResult] = useState(null);

  const ext = deal?.extended || {};
  const lifecycle = ext.lifecycle || { stage: deal?.status || 'draft', history: [], payments: [], invoices: [] };
  const currentStage = lifecycle.stage || 'draft';
  const currentIdx = STAGES.findIndex(s => s.key === currentStage);

  const callLifecycle = async (action, data = {}) => {
    setLoading(action);
    setResult(null);
    try {
      const res = await fetch('/api/deals/lifecycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id, action, data }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setResult(json);
      setShowModal(null);
      setForm({});
      onRefresh?.();
      return json;
    } catch (e) {
      setResult({ error: e.message });
    } finally {
      setLoading('');
    }
  };

  const generateContract = async () => {
    setLoading('contract');
    try {
      const res = await fetch('/api/contracts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId: deal.id }),
      });
      const data = await res.json();
      if (data.html) {
        // Open contract in new window for printing
        const win = window.open('', '_blank');
        win.document.write(data.html);
        win.document.close();
        // Record in lifecycle
        await callLifecycle('generate_contract', { contractType: 'sale' });
      }
    } catch (e) { setResult({ error: e.message }); }
    setLoading('');
  };

  const s = {
    container: { background: '#FAF8F5', borderRadius: 12, padding: 20, border: '1px solid #E8E4DE', marginTop: 16 },
    title: { fontSize: 11, fontWeight: 700, color: '#1B4332', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16 },
    stageTrack: { display: 'flex', alignItems: 'center', marginBottom: 20, overflow: 'auto' },
    stage: (active, completed, current) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 80, position: 'relative',
    }),
    stageIcon: (active, completed, current) => ({
      width: 36, height: 36, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 16, border: `2px solid ${current ? '#1B4332' : completed ? '#1B7A43' : '#DDD'}`,
      background: current ? '#1B4332' : completed ? '#D4EDDA' : '#FFF',
      color: current ? '#FFF' : '#666', zIndex: 1, transition: 'all 0.3s',
    }),
    stageLabel: (current) => ({
      fontSize: 9, fontWeight: current ? 700 : 400, color: current ? '#1B4332' : '#888',
      marginTop: 4, textAlign: 'center',
    }),
    connector: (completed) => ({
      flex: 1, height: 2, background: completed ? '#1B7A43' : '#DDD', minWidth: 20,
    }),
    actions: { display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    btn: (primary, color) => ({
      padding: '8px 16px', borderRadius: 6, border: primary ? 'none' : '1px solid #DDD',
      background: primary ? (color || '#1B4332') : '#FFF', color: primary ? '#FFF' : '#666',
      fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.7 : 1,
    }),
    section: { marginBottom: 16, padding: 12, background: '#FFF', borderRadius: 8, border: '1px solid #E8E4DE' },
    sectionTitle: { fontSize: 10, fontWeight: 700, color: '#1B4332', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
    row: { display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 12, borderBottom: '1px solid #F5F3F0' },
    label: { color: '#888' },
    value: { fontWeight: 600, color: '#1B4332' },
    modal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
    modalContent: { background: '#FFF', borderRadius: 12, padding: 24, width: 480, maxHeight: '80vh', overflow: 'auto' },
    input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box', marginBottom: 12 },
    select: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box', marginBottom: 12 },
    formLabel: { fontSize: 10, color: '#888', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
    badge: (bg, fg) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: bg, color: fg }),
    historyItem: { padding: '6px 0', borderBottom: '1px solid #F5F3F0', fontSize: 11, display: 'flex', justifyContent: 'space-between' },
    error: { color: '#C62828', fontSize: 12, padding: '8px 12px', background: '#FFEBEE', borderRadius: 6, marginTop: 8 },
    success: { color: '#1B7A43', fontSize: 12, padding: '8px 12px', background: '#E8F5E9', borderRadius: 6, marginTop: 8 },
  };

  const fmt = (n) => '$' + (n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div style={s.container}>
      <div style={s.title}>Deal Lifecycle</div>

      {/* Stage Tracker */}
      <div style={s.stageTrack}>
        {STAGES.map((stage, i) => {
          const completed = i < currentIdx;
          const current = i === currentIdx;
          return (
            <div key={stage.key} style={{ display: 'flex', alignItems: 'center', flex: i < STAGES.length - 1 ? 1 : 'none' }}>
              <div style={s.stage(i <= currentIdx, completed, current)}>
                <div style={s.stageIcon(i <= currentIdx, completed, current)}>
                  {completed ? '✓' : stage.icon}
                </div>
                <div style={s.stageLabel(current)}>{stage.label}</div>
              </div>
              {i < STAGES.length - 1 && <div style={s.connector(completed)} />}
            </div>
          );
        })}
      </div>

      {/* Action Buttons — context-sensitive based on current stage */}
      <div style={s.actions}>
        {(currentStage === 'approved' || currentStage === 'fixing') && (
          <button style={s.btn(true, '#2196F3')} onClick={() => setShowModal('fix_price')} disabled={!!loading}>
            {loading === 'fix_price' ? '...' : '📊 Fix Price'}
          </button>
        )}
        {['approved', 'fixing', 'contracted'].includes(currentStage) && (
          <button style={s.btn(true, '#6B2D5B')} onClick={generateContract} disabled={!!loading}>
            {loading === 'contract' ? '...' : '📃 Generate Contract'}
          </button>
        )}
        {['contracted', 'fixing', 'approved'].includes(currentStage) && (
          <button style={s.btn(true, '#E65100')} onClick={() => setShowModal('record_shipment')} disabled={!!loading}>
            🚢 Record Shipment
          </button>
        )}
        {currentStage === 'shipped' && (
          <button style={s.btn(true, '#1B7A43')} onClick={() => setShowModal('record_delivery')} disabled={!!loading}>
            📦 Record Delivery
          </button>
        )}
        {['delivered', 'shipped'].includes(currentStage) && (
          <button style={s.btn(true, '#D4A017')} onClick={() => setShowModal('generate_invoice')} disabled={!!loading}>
            🧾 Generate Invoice
          </button>
        )}
        {/* Payment can be recorded at any stage */}
        {!['draft', 'closed'].includes(currentStage) && (
          <button style={s.btn(false)} onClick={() => setShowModal('record_payment')} disabled={!!loading}>
            💰 Record Payment
          </button>
        )}
        {['invoiced', 'settled', 'delivered'].includes(currentStage) && (
          <button style={s.btn(true, '#C62828')} onClick={() => callLifecycle('close_deal')} disabled={!!loading}>
            🔒 Close Deal
          </button>
        )}
      </div>

      {/* Summary Panels */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {/* Fixation Summary */}
        {lifecycle.fixationSummary && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Price Fixation</div>
            <div style={s.row}><span style={s.label}>Buy Fixed</span><span style={s.value}>{lifecycle.fixationSummary.buyFixed} MT</span></div>
            <div style={s.row}><span style={s.label}>Sell Fixed</span><span style={s.value}>{lifecycle.fixationSummary.sellFixed} MT</span></div>
            <div style={s.row}><span style={s.label}>Status</span>
              <span style={s.badge(lifecycle.fixationSummary.fullyFixed ? '#D4EDDA' : '#FFF3CD', lifecycle.fixationSummary.fullyFixed ? '#155724' : '#856404')}>
                {lifecycle.fixationSummary.fullyFixed ? 'Fully Fixed' : 'Partially Fixed'}
              </span>
            </div>
          </div>
        )}

        {/* Payment Summary */}
        {lifecycle.payments?.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Payments</div>
            {lifecycle.payments.map((p, i) => (
              <div key={i} style={s.row}>
                <span style={s.label}>{p.type === 'down_payment' ? 'Down Payment' : `Payment ${i + 1}`} ({p.method})</span>
                <span style={s.value}>{fmt(p.amount)}</span>
              </div>
            ))}
            {lifecycle.paymentSummary && (
              <>
                <div style={{ ...s.row, borderTop: '2px solid #1B4332', marginTop: 4, paddingTop: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: 11 }}>Total Paid</span>
                  <span style={{ fontWeight: 800, color: '#1B7A43' }}>{fmt(lifecycle.paymentSummary.totalPaid)}</span>
                </div>
                <div style={s.row}>
                  <span style={s.label}>Balance</span>
                  <span style={{ fontWeight: 700, color: lifecycle.paymentSummary.balance > 0 ? '#C62828' : '#1B7A43' }}>
                    {fmt(lifecycle.paymentSummary.balance)}
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Invoice Summary */}
        {lifecycle.invoices?.length > 0 && (
          <div style={s.section}>
            <div style={s.sectionTitle}>Invoices</div>
            {lifecycle.invoices.map((inv, i) => (
              <div key={i} style={s.row}>
                <span style={s.label}>{inv.number}</span>
                <div>
                  <span style={s.value}>{fmt(inv.total)}</span>
                  <span style={s.badge(
                    inv.status === 'paid' ? '#D4EDDA' : inv.status === 'sent' ? '#CCE5FF' : '#FFF3CD',
                    inv.status === 'paid' ? '#155724' : inv.status === 'sent' ? '#004085' : '#856404'
                  )}> {inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Closing P&L */}
        {lifecycle.closingPnl && (
          <div style={{ ...s.section, gridColumn: '1 / -1' }}>
            <div style={s.sectionTitle}>Final P&L</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
              <div style={s.row}><span style={s.label}>Revenue</span><span style={s.value}>{fmt(lifecycle.closingPnl.revenue)}</span></div>
              <div style={s.row}><span style={s.label}>Cost</span><span style={s.value}>{fmt(lifecycle.closingPnl.cost)}</span></div>
              <div style={s.row}><span style={s.label}>Gross Profit</span><span style={{ fontWeight: 800, color: lifecycle.closingPnl.grossProfit >= 0 ? '#1B7A43' : '#C62828' }}>{fmt(lifecycle.closingPnl.grossProfit)}</span></div>
              <div style={s.row}><span style={s.label}>Net Profit</span><span style={{ fontWeight: 800, fontSize: 14, color: lifecycle.closingPnl.netProfit >= 0 ? '#1B7A43' : '#C62828' }}>{fmt(lifecycle.closingPnl.netProfit)} ({lifecycle.closingPnl.grossMarginPct}%)</span></div>
            </div>
          </div>
        )}
      </div>

      {/* History */}
      {lifecycle.history?.length > 0 && (
        <details style={{ marginTop: 12 }}>
          <summary style={{ fontSize: 11, fontWeight: 600, color: '#888', cursor: 'pointer' }}>Activity Log ({lifecycle.history.length} events)</summary>
          <div style={{ marginTop: 8 }}>
            {lifecycle.history.slice().reverse().map((h, i) => (
              <div key={i} style={s.historyItem}>
                <span>{h.action.replace(/_/g, ' ')}</span>
                <span style={{ color: '#AAA' }}>{new Date(h.date).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Result Message */}
      {result?.error && <div style={s.error}>{result.error}</div>}
      {result?.success && <div style={s.success}>Action completed successfully</div>}

      {/* ── Modals ── */}
      {showModal === 'fix_price' && (
        <div style={s.modal} onClick={() => setShowModal(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>Fix Price</h3>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Side</label>
                <select style={s.select} value={form.side || 'buy'} onChange={e => setForm({ ...form, side: e.target.value })}>
                  <option value="buy">Buy Side</option><option value="sell">Sell Side</option>
                </select></div>
              <div><label style={s.formLabel}>Quantity (MT)</label>
                <input style={s.input} type="number" value={form.quantity || ''} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder={deal?.quantity || ext.tonnage || '500'} /></div>
            </div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Fixed Price (USD/MT)</label>
                <input style={s.input} type="number" step="0.01" value={form.price || ''} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="e.g. 509.54" /></div>
              <div><label style={s.formLabel}>Futures Price at Fixation</label>
                <input style={s.input} type="number" step="0.01" value={form.futuresPrice || ''} onChange={e => setForm({ ...form, futuresPrice: e.target.value })} /></div>
            </div>
            <div><label style={s.formLabel}>Basis at Fixation</label>
              <input style={s.input} type="number" step="0.01" value={form.basis || ''} onChange={e => setForm({ ...form, basis: e.target.value })} /></div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btn(false)} onClick={() => setShowModal(null)}>Cancel</button>
              <button style={s.btn(true, '#2196F3')} onClick={() => callLifecycle('fix_price', form)}>Fix Price</button>
            </div>
          </div>
        </div>
      )}

      {showModal === 'record_shipment' && (
        <div style={s.modal} onClick={() => setShowModal(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>Record Shipment</h3>
            <div><label style={s.formLabel}>BL Number</label>
              <input style={s.input} value={form.blNumber || ''} onChange={e => setForm({ ...form, blNumber: e.target.value })} placeholder="Bill of Lading number" /></div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Vessel Name</label>
                <input style={s.input} value={form.vesselName || ''} onChange={e => setForm({ ...form, vesselName: e.target.value })} /></div>
              <div><label style={s.formLabel}>Voyage Number</label>
                <input style={s.input} value={form.voyageNumber || ''} onChange={e => setForm({ ...form, voyageNumber: e.target.value })} /></div>
            </div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>ETD</label>
                <input style={s.input} type="date" value={form.etd || ''} onChange={e => setForm({ ...form, etd: e.target.value })} /></div>
              <div><label style={s.formLabel}>ETA</label>
                <input style={s.input} type="date" value={form.eta || ''} onChange={e => setForm({ ...form, eta: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btn(false)} onClick={() => setShowModal(null)}>Cancel</button>
              <button style={s.btn(true, '#E65100')} onClick={() => callLifecycle('record_shipment', form)}>Record Shipment</button>
            </div>
          </div>
        </div>
      )}

      {showModal === 'record_delivery' && (
        <div style={s.modal} onClick={() => setShowModal(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>Record Delivery</h3>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Delivery Date</label>
                <input style={s.input} type="date" value={form.deliveryDate || ''} onChange={e => setForm({ ...form, deliveryDate: e.target.value })} /></div>
              <div><label style={s.formLabel}>Actual Quantity (MT)</label>
                <input style={s.input} type="number" step="0.01" value={form.actualQuantity || ''} onChange={e => setForm({ ...form, actualQuantity: e.target.value })} placeholder={deal?.quantity || ext.tonnage || '500'} /></div>
            </div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Demurrage Charges (USD)</label>
                <input style={s.input} type="number" step="0.01" value={form.demurrageCharges || ''} onChange={e => setForm({ ...form, demurrageCharges: e.target.value })} placeholder="0" /></div>
              <div><label style={s.formLabel}>Detention Charges (USD)</label>
                <input style={s.input} type="number" step="0.01" value={form.detentionCharges || ''} onChange={e => setForm({ ...form, detentionCharges: e.target.value })} placeholder="0" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btn(false)} onClick={() => setShowModal(null)}>Cancel</button>
              <button style={s.btn(true, '#1B7A43')} onClick={() => callLifecycle('record_delivery', form)}>Record Delivery</button>
            </div>
          </div>
        </div>
      )}

      {showModal === 'generate_invoice' && (
        <div style={s.modal} onClick={() => setShowModal(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>Generate Invoice</h3>
            <div><label style={s.formLabel}>Invoice Type</label>
              <select style={s.select} value={form.invoiceType || 'commercial'} onChange={e => setForm({ ...form, invoiceType: e.target.value })}>
                <option value="commercial">Commercial Invoice</option>
                <option value="proforma">Proforma Invoice</option>
                <option value="debit_note">Debit Note</option>
                <option value="credit_note">Credit Note</option>
              </select></div>
            <p style={{ fontSize: 12, color: '#666' }}>The invoice will be calculated from the deal's contracted quantity, unit price, and any delivery adjustments.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btn(false)} onClick={() => setShowModal(null)}>Cancel</button>
              <button style={s.btn(true, '#D4A017')} onClick={() => callLifecycle('generate_invoice', form)}>Generate Invoice</button>
            </div>
          </div>
        </div>
      )}

      {showModal === 'record_payment' && (
        <div style={s.modal} onClick={() => setShowModal(null)}>
          <div style={s.modalContent} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#1B4332' }}>Record Payment</h3>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Payment Type</label>
                <select style={s.select} value={form.type || 'down_payment'} onChange={e => setForm({ ...form, type: e.target.value })}>
                  <option value="down_payment">Down Payment</option>
                  <option value="balance">Balance Payment</option>
                  <option value="adjustment">Adjustment</option>
                </select></div>
              <div><label style={s.formLabel}>Amount (USD)</label>
                <input style={s.input} type="number" step="0.01" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" /></div>
            </div>
            <div style={s.formRow}>
              <div><label style={s.formLabel}>Method</label>
                <select style={s.select} value={form.method || 'TT'} onChange={e => setForm({ ...form, method: e.target.value })}>
                  <option value="TT">Telegraphic Transfer (TT)</option>
                  <option value="LC">Letter of Credit</option>
                  <option value="cheque">Cheque</option>
                  <option value="cash">Cash</option>
                </select></div>
              <div><label style={s.formLabel}>Reference</label>
                <input style={s.input} value={form.reference || ''} onChange={e => setForm({ ...form, reference: e.target.value })} placeholder="Payment reference" /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={s.btn(false)} onClick={() => setShowModal(null)}>Cancel</button>
              <button style={s.btn(true)} onClick={() => callLifecycle('record_payment', form)}>Record Payment</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
