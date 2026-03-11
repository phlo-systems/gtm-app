'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  FUTURES_CONTRACTS,
  getAvailableContracts,
  calculateFlatPrice,
  detectPriceUnit,
} from '@/lib/futures-pricing';

export default function FuturesPricingWidget({
  buyPrice = '', sellPrice = '',
  onBuyPriceChange, onSellPriceChange, onPricingDataChange,
  disabled = false, S = {},
}) {
  const [mode, setMode] = useState('flat');
  const [contractCode, setContractCode] = useState('S');
  const [contractMonth, setContractMonth] = useState('');
  const [futuresPrice, setFuturesPrice] = useState('');    // Always stored in BASE unit (e.g. $/bushel)
  const [buyBasis, setBuyBasis] = useState('');
  const [sellBasis, setSellBasis] = useState('');
  const [fetchingPrices, setFetchingPrices] = useState(false);
  const [marketData, setMarketData] = useState(null);
  const [priceError, setPriceError] = useState('');
  const [needsRoll, setNeedsRoll] = useState(false);
  const [rollToMonth, setRollToMonth] = useState('');
  const [rollSpread, setRollSpread] = useState('');

  const contract = useMemo(() => FUTURES_CONTRACTS.find(c => c.code === contractCode), [contractCode]);
  const availableMonths = useMemo(() => getAvailableContracts(contractCode), [contractCode]);

  // Calculate flat prices from basis (futures is already in base unit)
  useEffect(() => {
    if (mode !== 'basis' || !futuresPrice || (!buyBasis && !sellBasis)) return;
    const fp = parseFloat(futuresPrice);
    if (isNaN(fp)) return;

    let effectiveFutures = fp;
    if (needsRoll && rollSpread) effectiveFutures = fp + parseFloat(rollSpread);

    // quoteInBaseUnit = true because we store futures in base unit ($/bushel, not cents)
    const buyCalc = calculateFlatPrice(effectiveFutures, parseFloat(buyBasis) || 0, contractCode, true);
    const sellCalc = calculateFlatPrice(effectiveFutures, parseFloat(sellBasis) || 0, contractCode, true);

    if (buyCalc.pricePerMT && onBuyPriceChange) onBuyPriceChange(buyCalc.pricePerMT);
    if (sellCalc.pricePerMT && onSellPriceChange) onSellPriceChange(sellCalc.pricePerMT);

    if (onPricingDataChange) {
      onPricingDataChange({
        mode: 'basis', contractCode, contractMonth, futuresPrice: fp,
        buyBasis: parseFloat(buyBasis) || 0, sellBasis: parseFloat(sellBasis) || 0,
        baseUnit: contract?.baseUnit, quoteUnit: contract?.quoteUnit,
        mtConversion: contract?.mtConversion, divisor: contract?.divisor,
        buyFlatPrice: buyCalc.pricePerMT, sellFlatPrice: sellCalc.pricePerMT,
        buyFormula: buyCalc.formula, sellFormula: sellCalc.formula,
        needsRoll, rollToMonth, rollSpread: parseFloat(rollSpread) || 0, effectiveFutures,
      });
    }
  }, [mode, futuresPrice, buyBasis, sellBasis, contractCode, needsRoll, rollSpread]);

  // Fetch prices from AI — auto-detect cents vs dollars
  const fetchPrices = async () => {
    if (!contract) return;
    setFetchingPrices(true);
    setPriceError('');
    setMarketData(null);
    try {
      const selectedMonth = availableMonths.find(m => m.symbol === contractMonth);
      const res = await fetch('/api/futures/prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contract: contract.name,
          month: selectedMonth?.monthName || 'front month',
          year: selectedMonth?.year || new Date().getFullYear(),
          code: contractMonth || contract.code,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.result?.prices) {
        setMarketData(data.result);
        // Auto-fill: get the best price and convert to base unit
        const rawPrice = data.result.prices.lastSettle || data.result.prices.lastClose || data.result.prices.lastTrade;
        if (rawPrice) {
          // Auto-detect: is this in cents/bushel or $/bushel?
          const detection = detectPriceUnit(rawPrice, contractCode);
          const priceInBase = detection.isBaseUnit ? rawPrice : rawPrice / contract.divisor;
          setFuturesPrice(priceInBase.toString());
        }
      }
    } catch (e) { setPriceError(e.message); }
    setFetchingPrices(false);
  };

  const s = {
    container: { background: '#F5F7F0', borderRadius: 10, padding: 16, border: '1px solid #D4DBC8' },
    modeToggle: { display: 'flex', gap: 0, marginBottom: 14, borderRadius: 6, overflow: 'hidden', border: '1px solid #CCC' },
    modeBtn: (active) => ({
      flex: 1, padding: '7px 12px', fontSize: 11, fontWeight: 600, border: 'none', cursor: disabled ? 'default' : 'pointer',
      background: active ? '#1B4332' : '#FFF', color: active ? '#FFF' : '#666', letterSpacing: 0.5, transition: 'all 0.15s',
    }),
    label: { fontSize: 10, color: '#888', display: 'block', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.5 },
    input: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box', outline: 'none', background: disabled ? '#F0EDE6' : '#FFF' },
    row: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 },
    select: { width: '100%', padding: '8px 10px', borderRadius: 6, border: '1px solid #DDD', fontSize: 13, boxSizing: 'border-box', background: disabled ? '#F0EDE6' : '#FFF' },
    calcResult: { fontSize: 11, color: '#1B4332', background: '#E8F0E0', padding: '6px 10px', borderRadius: 6, marginTop: 6, fontFamily: 'monospace', lineHeight: 1.5 },
    rollSection: { marginTop: 10, padding: '10px 12px', background: '#FFF8E1', borderRadius: 8, border: '1px solid #FFECB3' },
    checkbox: { marginRight: 6, accentColor: '#1B4332' },
    tag: { display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700, background: '#D4EDDA', color: '#155724', marginLeft: 6 },
    fetchBtn: {
      padding: '8px 14px', borderRadius: 6, border: 'none', background: '#2196F3', color: '#FFF',
      fontSize: 11, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
    },
    marketDataBox: { marginTop: 10, padding: 12, background: '#FFF', borderRadius: 8, border: '1px solid #E0E0E0' },
    priceRow: { display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 12 },
    priceLabel: { color: '#888' },
    priceVal: { fontWeight: 600, fontFamily: 'monospace', color: '#1B4332' },
    confidence: (c) => ({
      display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 9, fontWeight: 700,
      background: c === 'high' ? '#D4EDDA' : c === 'medium' ? '#FFF3CD' : '#F8D7DA',
      color: c === 'high' ? '#155724' : c === 'medium' ? '#856404' : '#721C24',
    }),
    conversionBox: { fontSize: 10, color: '#666', background: '#F5F3F0', padding: '6px 10px', borderRadius: 6, marginBottom: 10, lineHeight: 1.5 },
    error: { fontSize: 11, color: '#C62828', marginTop: 6 },
    spinner: { display: 'inline-block', width: 12, height: 12, border: '2px solid #FFF', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginRight: 6, verticalAlign: 'middle' },
  };

  return (
    <div style={s.container}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={s.modeToggle}>
        <button style={s.modeBtn(mode === 'flat')} onClick={() => !disabled && setMode('flat')}>Flat Price</button>
        <button style={s.modeBtn(mode === 'basis')} onClick={() => !disabled && setMode('basis')}>Basis + Futures</button>
      </div>

      {mode === 'flat' ? (
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
        <>
          {/* Contract Selection */}
          <div style={s.row}>
            <div>
              <label style={s.label}>Futures Contract</label>
              <select style={s.select} value={contractCode} disabled={disabled}
                onChange={e => { setContractCode(e.target.value); setContractMonth(''); setMarketData(null); setFuturesPrice(''); }}>
                {FUTURES_CONTRACTS.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={s.label}>Contract Month</label>
              <select style={s.select} value={contractMonth} disabled={disabled}
                onChange={e => { setContractMonth(e.target.value); setMarketData(null); }}>
                <option value="">Select month...</option>
                {availableMonths.map(m => <option key={m.symbol} value={m.symbol}>{m.shortLabel}</option>)}
              </select>
            </div>
          </div>

          {/* Conversion Info Box */}
          {contract && (
            <div style={s.conversionBox}>
              <strong>{contract.exchange}:</strong> Quoted in <strong>{contract.quoteUnit}</strong>
              {contract.divisor > 1 && <> → divide by {contract.divisor} = <strong>{contract.baseUnit}</strong></>}
              {contract.mtConversion !== 1 && <> → × {contract.mtConversion} = <strong>USD/MT</strong></>}
              {contract.mtConversion === 1 && contract.baseUnit.includes('MT') && <> (already per MT)</>}
            </div>
          )}

          {/* Futures Price + Fetch Button */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 10 }}>
            <div>
              <label style={s.label}>Futures Price ({contract?.baseUnit || ''})</label>
              <input style={s.input} type="number" step="0.0001" value={futuresPrice} readOnly={disabled}
                onChange={e => setFuturesPrice(e.target.value)}
                placeholder={`e.g. ${contract?.divisor === 100 ? '11.50' : '350.00'} (in ${contract?.baseUnit || ''})`} />
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button style={{ ...s.fetchBtn, opacity: fetchingPrices ? 0.7 : 1 }} disabled={fetchingPrices || disabled}
                onClick={fetchPrices}>
                {fetchingPrices ? <><span style={s.spinner} />Fetching...</> : 'Fetch Prices'}
              </button>
            </div>
          </div>

          {/* Market Data Panel */}
          {marketData && (
            <div style={s.marketDataBox}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#1B4332' }}>
                  {marketData.contract} — {marketData.month} {marketData.year}
                </span>
                <span style={s.confidence(marketData.confidence)}>{marketData.confidence}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                {[
                  ['Last Settle', marketData.prices?.lastSettle],
                  ['Last Close', marketData.prices?.lastClose],
                  ['Last Trade', marketData.prices?.lastTrade],
                  ['Best Bid', marketData.prices?.bestBid],
                  ['Best Ask', marketData.prices?.bestAsk],
                  ['Open', marketData.prices?.open],
                  ['High', marketData.prices?.high],
                  ['Low', marketData.prices?.low],
                ].filter(([, v]) => v).map(([label, val]) => {
                  // Show both raw and converted values for cents-based contracts
                  const detection = detectPriceUnit(val, contractCode);
                  const displayVal = contract?.divisor > 1 && !detection.isBaseUnit
                    ? `${val} (${(val / contract.divisor).toFixed(4)} ${contract.baseUnit})`
                    : val;
                  return (
                    <div key={label} style={s.priceRow}>
                      <span style={s.priceLabel}>{label}</span>
                      <span style={s.priceVal}>{displayVal}</span>
                    </div>
                  );
                })}
              </div>
              {marketData.priceDate && (
                <div style={{ fontSize: 10, color: '#AAA', marginTop: 6 }}>
                  As of: {marketData.priceDate} | Raw: {marketData.unit || contract?.quoteUnit}
                  {marketData.source && <> | Source: {marketData.source}</>}
                </div>
              )}
            </div>
          )}
          {priceError && <div style={s.error}>{priceError}</div>}

          {/* Buy/Sell Basis */}
          <div style={s.row}>
            <div>
              <label style={s.label}>Buy Basis ({contract?.baseUnit || ''})</label>
              <input style={s.input} type="number" step="0.0001" value={buyBasis} readOnly={disabled}
                onChange={e => setBuyBasis(e.target.value)} placeholder="e.g. 2.35" />
            </div>
            <div>
              <label style={s.label}>Sell Basis ({contract?.baseUnit || ''})</label>
              <input style={s.input} type="number" step="0.0001" value={sellBasis} readOnly={disabled}
                onChange={e => setSellBasis(e.target.value)} placeholder="e.g. 2.50" />
            </div>
          </div>

          {/* Calculated Flat Prices */}
          {futuresPrice && (buyBasis || sellBasis) && (
            <div style={s.row}>
              <div>
                <label style={s.label}>Buy Price (USD/MT) <span style={s.tag}>calculated</span></label>
                <input style={{ ...s.input, background: '#E8F0E0', fontWeight: 700, color: '#1B4332' }} readOnly value={buyPrice || ''} />
              </div>
              <div>
                <label style={s.label}>Sell Price (USD/MT) <span style={s.tag}>calculated</span></label>
                <input style={{ ...s.input, background: '#E8F0E0', fontWeight: 700, color: '#1B4332' }} readOnly value={sellPrice || ''} />
              </div>
            </div>
          )}

          {/* Show formula */}
          {futuresPrice && buyBasis && (
            <div style={s.calcResult}>
              <div><strong>Buy:</strong> ({futuresPrice} + {buyBasis}) {contract?.baseUnit} × {contract?.mtConversion} = <strong>{buyPrice} USD/MT</strong></div>
              {sellBasis && <div><strong>Sell:</strong> ({futuresPrice} + {sellBasis}) {contract?.baseUnit} × {contract?.mtConversion} = <strong>{sellPrice} USD/MT</strong></div>}
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
                      {availableMonths.map(m => <option key={m.symbol} value={m.symbol}>{m.shortLabel}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={s.label}>Roll Spread ({contract?.baseUnit || ''})</label>
                    <input style={s.input} type="number" step="0.0001" value={rollSpread} readOnly={disabled}
                      onChange={e => setRollSpread(e.target.value)} placeholder="e.g. -0.1525" />
                  </div>
                </div>
                {rollSpread && (
                  <div style={s.calcResult}>
                    Effective futures: {futuresPrice} + ({rollSpread}) = <strong>{(parseFloat(futuresPrice) + parseFloat(rollSpread)).toFixed(4)}</strong> {contract?.baseUnit}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
