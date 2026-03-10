/**
 * POST /api/customs/intelligence
 * ================================
 * AI-powered customs duty lookup for any country and product.
 * Uses Claude (Anthropic API) to provide:
 *   - Import duty rates (MFN + preferential agreements)
 *   - VAT / GST rates
 *   - Excise duties, environmental levies
 *   - Import restrictions, permits, licenses
 *   - Landed cost calculation
 *   - HS code suggestion
 *
 * Request Body:
 *   {
 *     product: "frozen chicken breast",
 *     hsCode: "0207.14.11" (optional),
 *     importCountry: "South Africa",
 *     exportCountry: "Brazil" (optional),
 *     cifValue: 100000 (optional, in local currency),
 *     currency: "ZAR" (optional)
 *   }
 *
 * Response:
 *   { result: { hsCode, duties, taxes, restrictions, landedCost, ... }, raw: "..." }
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { product, hsCode, importCountry, exportCountry, cifValue, currency } = body;

    if (!product || !importCountry) {
      return Response.json(
        { error: 'Missing required fields: product and importCountry' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json(
        { error: 'ANTHROPIC_API_KEY not configured. Add it to Vercel environment variables.' },
        { status: 500 }
      );
    }

    // Build the prompt
    const prompt = buildPrompt({ product, hsCode, importCountry, exportCountry, cifValue, currency });

    // Call Claude API
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('[customs/intelligence] Anthropic API error:', response.status, errText);
      return Response.json(
        { error: `AI service error: ${response.status}` },
        { status: 502 }
      );
    }

    const aiResponse = await response.json();
    const rawText = aiResponse.content?.[0]?.text || '';

    // Parse the structured JSON from Claude's response
    let result;
    try {
      // Extract JSON from the response (Claude wraps it in ```json blocks sometimes)
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (parseError) {
      // If JSON parsing fails, return the raw text
      result = null;
    }

    return Response.json({
      result: result || { rawResponse: rawText },
      query: { product, hsCode, importCountry, exportCountry, cifValue, currency },
      source: 'AI-generated estimate — verify with official customs authority before use',
    });
  } catch (error) {
    console.error('[customs/intelligence] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildPrompt({ product, hsCode, importCountry, exportCountry, cifValue, currency }) {
  const cifLine = cifValue
    ? `The CIF value is ${cifValue} ${currency || 'USD'}. Calculate the total landed cost including all duties, taxes and fees.`
    : '';

  const originLine = exportCountry
    ? `The goods are being exported from ${exportCountry} to ${importCountry}.`
    : `The goods are being imported into ${importCountry}.`;

  const hsLine = hsCode
    ? `The HS code is ${hsCode}.`
    : 'Suggest the most likely HS code (6-digit level minimum).';

  return `You are a customs and trade compliance expert. Provide import duty and tax information for the following:

Product: ${product}
${hsLine}
${originLine}
${cifLine}

Respond ONLY with a JSON object (no markdown, no backticks, no explanation outside the JSON) with this exact structure:

{
  "hsCode": "the HS code (6-8 digits with dots)",
  "hsDescription": "official HS description for this code",
  "product": "${product}",
  "importCountry": "${importCountry}",
  "exportCountry": "${exportCountry || 'Not specified'}",
  "duties": {
    "mfnRate": "the MFN/General duty rate (e.g. '15%' or '240c/kg' or 'free')",
    "mfnRatePct": number or null,
    "preferentialRates": [
      { "agreement": "name of trade agreement", "rate": "rate", "ratePct": number or null }
    ],
    "applicableRate": "the rate that applies given origin/destination",
    "applicableRatePct": number or null,
    "dutyType": "ad_valorem or specific or compound or free"
  },
  "taxes": {
    "vat": { "rate": "e.g. 15%", "ratePct": number, "appliedOn": "CIF + duty" },
    "excise": { "applicable": true/false, "rate": "rate if applicable", "description": "details" },
    "otherLevies": [ { "name": "levy name", "rate": "rate", "description": "details" } ]
  },
  "restrictions": {
    "importPermitRequired": true/false,
    "sanitaryRequirements": true/false,
    "labelling": "any labelling requirements",
    "quotas": "any quota restrictions",
    "prohibitions": "any prohibitions",
    "otherRequirements": ["list of other requirements"],
    "regulatoryBody": "name of the relevant customs/regulatory authority"
  },
  ${cifValue ? `"landedCost": {
    "cifValue": ${cifValue},
    "currency": "${currency || 'USD'}",
    "dutyAmount": number,
    "vatAmount": number,
    "otherCharges": number,
    "totalLandedCost": number,
    "effectiveRate": "total charges as % of CIF"
  },` : ''}
  "notes": "any important caveats, recent changes, or additional context",
  "lastKnownUpdate": "approximate date of the tariff data you're referencing",
  "confidence": "high/medium/low — how confident you are in this data"
}`;
}
