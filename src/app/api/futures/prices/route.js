/**
 * POST /api/futures/prices
 * AI-powered futures price lookup.
 * Body: { contract, month, year, code }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { contract, month, year, code } = body;
    if (!contract) return Response.json({ error: 'Missing contract name' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const prompt = `You are a commodity futures market data specialist. Provide the most recent available price data for:

Contract: ${contract}
Month: ${month || 'front month'}
Year: ${year || new Date().getFullYear()}
Symbol: ${code || 'N/A'}

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "contract": "${contract}",
  "symbol": "${code || ''}",
  "month": "${month || 'front month'}",
  "year": ${year || new Date().getFullYear()},
  "exchange": "exchange name",
  "currency": "USD",
  "unit": "pricing unit (e.g. cents/bushel, USD/short ton)",
  "prices": {
    "lastSettle": 0,
    "lastClose": 0,
    "lastTrade": 0,
    "bestBid": 0,
    "bestAsk": 0,
    "open": 0,
    "high": 0,
    "low": 0,
    "prevClose": 0
  },
  "change": 0,
  "changePct": 0,
  "volume": "approximate daily volume",
  "openInterest": "approximate OI",
  "priceDate": "YYYY-MM-DD",
  "contractExpiry": "first notice / last trade date",
  "marketStatus": "open/closed",
  "notes": "any caveats about accuracy or recency",
  "confidence": "high/medium/low"
}

Use actual recent prices. If the specific month isn't trading yet, provide nearest month and note it.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1500, messages: [{ role: 'user', content: prompt }] }),
    });

    if (!response.ok) return Response.json({ error: `AI error: ${response.status}` }, { status: 502 });
    const aiResponse = await response.json();
    const rawText = aiResponse.content?.[0]?.text || '';
    let result;
    try { const m = rawText.match(/\{[\s\S]*\}/); result = m ? JSON.parse(m[0]) : null; } catch (e) { result = null; }

    return Response.json({ result: result || { rawResponse: rawText }, disclaimer: 'AI-generated. Verify with broker before trading.' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
