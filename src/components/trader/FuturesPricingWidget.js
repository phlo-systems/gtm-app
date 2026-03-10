'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  FUTURES_CONTRACTS,
  getAvailableContracts,
  calculateFlatPrice,
  calculateRollPrice,
} from '@/lib/futures-pricing';

/**
 * FuturesPricingWidget
 * ====================
 * Compact widget that replaces/augments the buy/sell price fields.
 * Shows flat price mode by default, with toggle to basis + futures mode.
 *
 * Props:
 *   buyPrice / sellPrice      - current values
 *   onBuyPriceChange(val)     - callback when flat buy price changes
 *   onSellPriceChange(val)    - callback when flat sell price changes
 *   onPricingDataChange(data) - callback with full pricing metadata
 *   disabled                  - read-only mode
 *   S                         - shared styles object
 */
export default function FuturesPricingWidget({
  buyPrice = '',
  sellPrice = '',
  onBuyPriceChange,
  onSellPriceChange,
  onPricingDataChange,
  disabled = false,
  S = {},
}) {
  const [mode, setMode] = useState('flat'); // 'flat' or 'basis'
  const [contractCode, setContractCode] = useState('S');
  const [contractMonth, setContractMonth] = useState('');
  const [futuresPrice, setFuturesPrice] = useState('');
  const [buyBasis, setBuyBasis] = useState('');
  const [sellBasis, setSellBasis] = useState('');
  const [uom, setUom] = useState('Metric Ton');

  // Roll state
  const [needsRoll, setNeedsRoll] = useState(false);
  const [rollToMonth, setRollToMonth] = useState('');
  const [rollSpread, setRollSpread] = useState('');

  const contract = useMemo(() =>
    FUTURES_CONTRACTS.find(c => c.code === contractCode),
    [contractCode]
  );

  const availableMonths = useMemo(() =>
    getAvailableContracts(contractCode),
    [contractCode]
  );

  // Calculate flat prices from basis
  useEffect(() => {
    if (mode !== 'basis' || !futuresPrice || (!buyBasis && !sellBasis)) return;

    const fp = parseFloat(futuresPrice);
    if (isNaN(fp)) return;

    let effectiveFutures = fp;
    let effectiveBuyBasis = parseFloat(buyBasis) || 0;
    let effectiveSellBasis = parseFloat(sellBasis) || 0;

    // Apply roll if needed
    if (needsRoll && rollSpread) {
      effectiveFutures = fp + parseFloat(rollSpread);
    }

    const buyCalc = calculateFlatPrice(effectiveFutures, effectiveBuyBasis, contractCode);
    const sellCalc = calculateFlatPrice(effectiveFutures, effectiveSellBasis, contractCode);

    if (buyCalc.pricePerMT && onBuyPriceChange) onBuyPriceChange(buyCalc.pricePerMT);
    if (sellCalc.pricePerMT && onSellPriceChange) onSellPriceChange(sellCalc.pricePerMT);

    if (onPricingDataChange) {
      onPricingDataChange({
        mode: 'basis',
        contractCode,
        contractMonth,
        futuresPrice: fp,
        buyBasis: effectiveBuyBasis,
        sellBasis: effectiveSellBasis,
        uom: contract?.unit,
        conversionFactor: contract?.mtConversion,
        buyFlatPrice: buyCalc.pricePerMT,
        sellFlatPrice: sellCalc.pricePerMT,
        needsRoll,
        rollToMonth,
        rollSpread: parseFloat(rollSpread) || 0,
        effectiveFutures,
      });
    }
  }, [mode, futuresPrice, buyBasis, sellBasis, contractCode, needsRoll, rollSpread]);

  // ── Styles ──
  const s = {
    container: { background: '#F5F7F0', borderRadius: 10, padding: 16, border: '1px solid #D4DBC8' },
    modeToggle: { display: 'flex', gap: 0, marginBottom: 14, borderRadius: 6, overflow: 'hidden', border: '1px solid #CCC' },
    modeBtn: (active) => ({
      flex: 1, padding: '7px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: disabled ? 'default' : 'pointer',
      background: active ? '#1B4332' : '#FFF', color: active ? '#FFF' : '#666',
      letterSpacing: 0.5, transition: 'all 0.15s',
    }),
    label: { fontSize: 10, color: '#888', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: {
      width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13,
      boxSizing: 'border-box', outline: 'none', background: disabled ? '#F0EDE6' : '#FFF',
    },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
    row3: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 10 },
    select: {
      width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13,
      boxSizing: 'border-box', background: disabled ? '#F0EDE6' : '#FFF',
    },
    calcResult: {
      fontSize: 11, color: '#1B4332', background: '#E8F0E0', padding: '6px 10px', borderRadius: 6,
      marginTop: 6, fontFamily: 'monospace',
    },
    rollSection: {
      marginTop: 10, padding: '10px 12px', background: '#FFF8E1', borderRadius: 8, border: '1px solid #FFECB3',
    },
    checkbox: { marginRight: 6, accentColor: '#1B4332' },
    tag: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: '#D4EDDA', color: '#155724', marginLeft: 6 },
  };

  return (
    <div style={s.container}>
      {/* Mode Toggle */}
      <div style={s.modeToggle}>
        <button style={s.modeBtn(mode === 'flat')} onClick={() => !disabled && setMode('flat')}>
          Flat Price
        </button>
        <button style={s.modeBtn(mode === 'basis')} onClick={() => !disabled && setMode('basis')}>
          Basis + Futures
        </button>
      </div>

      {mode === 'flat' ? (
        /* ── Flat Price Mode ── */
        <div style={s.row}>
          <div>
            <label style={s.label}>Buy Price (USD/MT)</label>
            <input style={s.input} type="number" step="0.01" value={buyPrice} readOnly={disabled}
              onChange={e => onBuyPriceChange?.(parseFloat(e.target.value) || 0)} placeholder="0.00" />
          </div>
          <div>
            <label style={s.label}>Sell Price (USD/MT)</label>
            <input style={s.input} type="number" step="0.01" value={sellPrice} readOnly={disabled}
              onChange={e => onSellPriceChange?.(parseFloat(e.target.value) || 0)} placeholder="0.00" />
          </div>
        </div>
      ) : (
        /* ── Basis + Futures Mode ── */
        <>
          {/* Contract Selection */}
          <div style={s.row}>
            <div>
              <label style={s.label}>Futures Contract</label>
              <select style={s.select} value={contractCode} disabled={disabled}
                onChange={e => { setContractCode(e.target.value); setContractMonth(''); }}>
                {FUTURES_CONTRACTS.map(c => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={s.label}>Contract Month</label>
              <select style={s.select} value={contractMonth} disabled={disabled}
                onChange={e => setContractMonth(e.target.value)}>
                <option value="">Select month...</option>
                {availableMonths.map(m => (
                  <option key={m.symbol} value={m.symbol}>{m.shortLabel}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Futures Price + UOM */}
          <div style={s.row3}>
            <div>
              <label style={s.label}>Futures Price ({contract?.unit || ''})</label>
              <input style={s.input} type="number" step="0.01" value={futuresPrice} readOnly={disabled}
                onChange={e => setFuturesPrice(e.target.value)} placeholder="Last close" />
            </div>
            <div>
              <label style={s.label}>UOM</label>
              <input style={{ ...s.input, background: '#F0EDE6' }} readOnly value={contract?.unit || ''} />
            </div>
            <div>
              <label style={s.label}>Conversion to MT</label>
              <input style={{ ...s.input, background: '#F0EDE6' }} readOnly value={contract?.mtConversion || ''} />
            </div>
          </div>

          {/* Buy/Sell Basis */}
          <div style={s.row}>
            <div>
              <label style={s.label}>Buy Basis ({contract?.unit || ''})</label>
              <input style={s.input} type="number" step="0.01" value={buyBasis} readOnly={disabled}
                onChange={e => setBuyBasis(e.target.value)} placeholder="e.g. 45" />
            </div>
            <div>
              <label style={s.label}>Sell Basis ({contract?.unit || ''})</label>
              <input style={s.input} type="number" step="0.01" value={sellBasis} readOnly={disabled}
                onChange={e => setSellBasis(e.target.value)} placeholder="e.g. 55" />
            </div>
          </div>

          {/* Calculated Flat Prices */}
          {futuresPrice && (buyBasis || sellBasis) && (
            <div style={s.row}>
              <div>
                <label style={s.label}>Buy Price (USD/MT) <span style={s.tag}>calculated</span></label>
                <input style={{ ...s.input, background: '#E8F0E0', fontWeight: 700, color: '#1B4332' }}
                  readOnly value={buyPrice || ''} />
              </div>
              <div>
                <label style={s.label}>Sell Price (USD/MT) <span style={s.tag}>calculated</span></label>
                <input style={{ ...s.input, background: '#E8F0E0', fontWeight: 700, color: '#1B4332' }}
                  readOnly value={sellPrice || ''} />
              </div>
            </div>
          )}

          {/* Calculation breakdown */}
          {futuresPrice && buyBasis && (
            <div style={s.calcResult}>
              Buy: ({needsRoll && rollSpread ? `${futuresPrice} + ${rollSpread} spread = ${parseFloat(futuresPrice) + parseFloat(rollSpread)}` : futuresPrice} + {buyBasis}) × {contract?.mtConversion} = <strong>{buyPrice} USD/MT</strong>
            </div>
          )}

          {/* Roll Section */}
          <div style={{ marginTop: 10 }}>
            <label style={{ fontSize: 11, cursor: 'pointer', color: '#666' }}>
              <input type="checkbox" style={s.checkbox} checked={needsRoll} disabled={disabled}
                onChange={e => setNeedsRoll(e.target.checked)} />
              Contract needs rolling
            </label>

            {needsRoll && (
              <div style={s.rollSection}>
                <div style={s.row}>
                  <div>
                    <label style={s.label}>Roll To</label>
                    <select style={s.select} value={rollToMonth} disabled={disabled}
                      onChange={e => setRollToMonth(e.target.value)}>
                      <option value="">Select month...</option>
                      {availableMonths.map(m => (
                        <option key={m.symbol} value={m.symbol}>{m.shortLabel}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Roll Spread ({contract?.unit || ''})</label>
                    <input style={s.input} type="number" step="0.0001" value={rollSpread} readOnly={disabled}
                      onChange={e => setRollSpread(e.target.value)} placeholder="e.g. -0.1525" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
