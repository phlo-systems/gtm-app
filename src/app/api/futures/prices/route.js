/**
 * POST /api/futures/prices
 * AI-powered futures price lookup WITH WEB SEARCH for real-time data.
 * Body: { contract, month, year, code }
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { contract, month, year, code } = body;
    if (!contract) return Response.json({ error: 'Missing contract name' }, { status: 400 });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });

    const prompt = `Search the web for the latest futures price data for:

Contract: ${contract}
Month: ${month || 'front month'}
Year: ${year || new Date().getFullYear()}
Symbol: ${code || 'N/A'}

Search for the most recent settlement price, closing price, and trading data from sources like CME Group, barchart.com, investing.com, or tradingeconomics.com.

After searching, respond ONLY with a JSON object (no markdown, no backticks):
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
  "volume": "daily volume",
  "openInterest": "open interest",
  "priceDate": "YYYY-MM-DD",
  "contractExpiry": "first notice / last trade date",
  "marketStatus": "open/closed",
  "source": "where you found this data",
  "notes": "any caveats about accuracy or recency",
  "confidence": "high/medium/low"
}

Use the ACTUAL prices you find from today's web search. Do NOT use training data.`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) return Response.json({ error: `AI error: ${response.status}` }, { status: 502 });
    const aiResponse = await response.json();

    // Extract text from all content blocks (web search returns multiple blocks)
    const textParts = (aiResponse.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('\n');

    let result;
    try {
      const m = textParts.match(/\{[\s\S]*\}/);
      result = m ? JSON.parse(m[0]) : null;
    } catch (e) { result = null; }

    return Response.json({
      result: result || { rawResponse: textParts },
      disclaimer: 'Prices sourced via web search. Verify with broker before trading.',
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
