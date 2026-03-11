'use client';
import { useState, useEffect } from 'react';

/**
 * M2M Dashboard Widget
 * ====================
 * Shows consolidated Mark-to-Market report on the dashboard.
 * - Summary cards: Total P&L, Exposure, Fixed/Unfixed counts
 * - Contract-wise breakup table with P&L per deal
 * - Color-coded gains/losses
 * - Refresh market prices button
 */
export default function M2MWidget({ S }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchM2M = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/m2m');
      const json = await res.json();
      setData(json);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchM2M(); }, []);

  const refreshPrices = async () => {
    if (!data?.positions) return;
    setRefreshing(true);
    // For each position with a futures contract, fetch current price
    for (const pos of data.positions) {
      if (pos.futuresContract && pos.tonnage > 0) {
        try {
          const res = await fetch('/api/futures/prices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contract: pos.futuresContract,
              month: pos.futuresMonth,
              code: pos.futuresContract,
            }),
          });
          const priceData = await res.json();
          if (priceData.result?.prices?.lastSettle) {
            // Update deal's market price
            await fetch('/api/m2m', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                dealId: pos.dealId,
                action: 'update_market_price',
                data: { marketPrice: priceData.result.prices.lastSettle },
              }),
            });
          }
        } catch (e) { console.error(e); }
      }
    }
    await fetchM2M();
    setRefreshing(false);
  };

  const s = {
    container: { marginBottom: 24 },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 16, fontWeight: 700, color: '#1B4332' },
    refreshBtn: {
      padding: '6px 14px', borderRadius: 6, border: '1px solid #1B4332', background: 'transparent',
      color: '#1B4332', fontSize: 11, fontWeight: 600, cursor: 'pointer',
    },
    summaryGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 },
    summaryCard: (accent) => ({
      background: '#FAF8F5', borderRadius: 10, padding: '14px 16px', border: '1px solid #E8E4DE',
      borderLeft: `4px solid ${accent}`,
    }),
    summaryLabel: { fontSize: 10, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: (color) => ({ fontSize: 22, fontWeight: 800, color: color || '#1B4332', marginTop: 4 }),
    summarySubtext: { fontSize: 10, color: '#AAA', marginTop: 2 },
    table: { width: '100%', borderCollapse: 'collapse', fontSize: 12 },
    th: { padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '2px solid #E8E4DE' },
    thRight: { textAlign: 'right' },
    td: { padding: '8px 10px', borderBottom: '1px solid #F0EDE6' },
    tdRight: { textAlign: 'right', fontFamily: 'monospace' },
    pnlPositive: { color: '#1B7A43', fontWeight: 700 },
    pnlNegative: { color: '#C62828', fontWeight: 700 },
    badge: (bg, fg) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700,
      background: bg, color: fg,
    }),
    emptyState: { textAlign: 'center', padding: 40, color: '#AAA' },
    spinner: {
      display: 'inline-block', width: 12, height: 12, border: '2px solid #1B4332',
      borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite',
      marginRight: 6, verticalAlign: 'middle',
    },
  };

  const fmt = (n, currency = 'USD') => {
    if (n === null || n === undefined) return '—';
    const sign = n >= 0 ? '' : '-';
    return `${sign}$${Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const pnlColor = (n) => n >= 0 ? '#1B7A43' : '#C62828';
  const pnlStyle = (n) => n >= 0 ? s.pnlPositive : s.pnlNegative;

  if (loading) {
    return (
      <div style={{ ...s.container, textAlign: 'center', padding: 40 }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <div style={{ ...s.spinner, width: 24, height: 24, borderWidth: 3, margin: '0 auto 12px' }} />
        <div style={{ fontSize: 13, color: '#888' }}>Loading M2M positions...</div>
      </div>
    );
  }

  const summary = data?.summary || {};
  const positions = data?.positions || [];

  return (
    <div style={s.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={s.header}>
        <div style={s.title}>Mark-to-Market</div>
        <button style={s.refreshBtn} onClick={refreshPrices} disabled={refreshing}>
          {refreshing ? <><span style={s.spinner} /> Refreshing...</> : 'Refresh Prices'}
        </button>
      </div>

      {positions.length === 0 ? (
        <div style={s.emptyState}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
          <div style={{ fontSize: 13, fontWeight: 600 }}>No open positions</div>
          <div style={{ fontSize: 11, marginTop: 4 }}>Create deals with pricing data to see M2M</div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={s.summaryGrid}>
            <div style={s.summaryCard(pnlColor(summary.totalUnrealisedPnl))}>
              <div style={s.summaryLabel}>Unrealised P&L</div>
              <div style={s.summaryValue(pnlColor(summary.totalUnrealisedPnl))}>
                {fmt(summary.totalUnrealisedPnl)}
              </div>
              <div style={s.summarySubtext}>{summary.avgPnlPct >= 0 ? '+' : ''}{summary.avgPnlPct}% avg</div>
            </div>
            <div style={s.summaryCard('#1B4332')}>
              <div style={s.summaryLabel}>Total Exposure</div>
              <div style={s.summaryValue()}>{fmt(summary.totalExposure)}</div>
              <div style={s.summarySubtext}>{summary.dealCount} contracts</div>
            </div>
            <div style={s.summaryCard('#2196F3')}>
              <div style={s.summaryLabel}>Price Fixation</div>
              <div style={s.summaryValue()}>{summary.fixedCount}</div>
              <div style={s.summarySubtext}>{summary.unfixedCount} unfixed</div>
            </div>
            <div style={s.summaryCard('#FF9800')}>
              <div style={s.summaryLabel}>Rollovers</div>
              <div style={s.summaryValue()}>{summary.rolledCount}</div>
              <div style={s.summarySubtext}>contracts rolled</div>
            </div>
          </div>

          {/* Contract-wise Breakup Table */}
          <div style={{ background: '#FAF8F5', borderRadius: 12, padding: 16, border: '1px solid #E8E4DE' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1B4332', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>
              Contract-wise M2M Breakup
            </div>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Deal</th>
                  <th style={s.th}>Counterparty</th>
                  <th style={s.th}>Contract</th>
                  <th style={{ ...s.th, ...s.thRight }}>Qty (MT)</th>
                  <th style={{ ...s.th, ...s.thRight }}>Contract Px</th>
                  <th style={{ ...s.th, ...s.thRight }}>Market Px</th>
                  <th style={{ ...s.th, ...s.thRight }}>Unrealised P&L</th>
                  <th style={s.th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : '#FAFAF8' }}>
                    <td style={s.td}>
                      <span style={{ fontWeight: 600, color: '#1B4332' }}>{p.dealNumber || `Deal ${p.dealId?.slice(0, 8)}`}</span>
                    </td>
                    <td style={s.td}>{p.customer || p.supplier || '—'}</td>
                    <td style={s.td}>
                      {p.futuresContract ? (
                        <span style={s.badge('#E8F5E9', '#1B7A43')}>{p.futuresContract} {p.futuresMonth}</span>
                      ) : (
                        <span style={s.badge('#E8E4DE', '#888')}>Flat</span>
                      )}
                    </td>
                    <td style={{ ...s.td, ...s.tdRight }}>{p.tonnage?.toLocaleString() || '—'}</td>
                    <td style={{ ...s.td, ...s.tdRight }}>{p.contractPrice ? `$${p.contractPrice.toLocaleString()}` : '—'}</td>
                    <td style={{ ...s.td, ...s.tdRight }}>
                      {p.marketPrice && p.marketPrice !== p.contractPrice
                        ? <span style={{ color: pnlColor(p.marketPrice - p.contractPrice) }}>${p.marketPrice.toLocaleString()}</span>
                        : <span style={{ color: '#AAA' }}>{p.marketPrice ? `$${p.marketPrice.toLocaleString()}` : '—'}</span>
                      }
                    </td>
                    <td style={{ ...s.td, ...s.tdRight, ...pnlStyle(p.unrealisedPnl) }}>
                      {p.unrealisedPnl !== 0 ? fmt(p.unrealisedPnl) : '—'}
                      {p.unrealisedPnlPct !== 0 && (
                        <div style={{ fontSize: 9, fontWeight: 400, color: pnlColor(p.unrealisedPnlPct) }}>
                          {p.unrealisedPnlPct >= 0 ? '+' : ''}{p.unrealisedPnlPct}%
                        </div>
                      )}
                    </td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {p.isFixed && <span style={s.badge('#D4EDDA', '#155724')}>Fixed</span>}
                        {!p.isFixed && p.contractPrice > 0 && <span style={s.badge('#FFF3CD', '#856404')}>Unfixed</span>}
                        {p.hasRollover && <span style={s.badge('#CCE5FF', '#004085')}>Rolled</span>}
                        <span style={s.badge(
                          p.status === 'approved' ? '#D4EDDA' : p.status === 'submitted' ? '#CCE5FF' : '#E8E4DE',
                          p.status === 'approved' ? '#155724' : p.status === 'submitted' ? '#004085' : '#666'
                        )}>{p.status}</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F0EDE6' }}>
                  <td colSpan={3} style={{ ...s.td, fontWeight: 700 }}>Total</td>
                  <td style={{ ...s.td, ...s.tdRight, fontWeight: 700 }}>
                    {positions.reduce((s, p) => s + (p.tonnage || 0), 0).toLocaleString()}
                  </td>
                  <td style={s.td}></td>
                  <td style={s.td}></td>
                  <td style={{ ...s.td, ...s.tdRight, fontWeight: 800, fontSize: 14, color: pnlColor(summary.totalUnrealisedPnl) }}>
                    {fmt(summary.totalUnrealisedPnl)}
                  </td>
                  <td style={s.td}></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Last Updated */}
          {summary.lastCalculated && (
            <div style={{ fontSize: 10, color: '#AAA', marginTop: 8, textAlign: 'right' }}>
              Last calculated: {new Date(summary.lastCalculated).toLocaleString()}
            </div>
          )}
        </>
      )}
    </div>
  );
}
