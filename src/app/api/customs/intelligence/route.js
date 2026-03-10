/**
 * POST /api/customs/intelligence
 * ================================
 * AI-powered customs intelligence for any country and product.
 *
 * Actions:
 *   suggest_hs_code    — Product description → HS code suggestions
 *   describe_hs_code   — HS code → product description + classification
 *   calculate_duties   — Full duty/tax/restriction analysis with landed cost
 *
 * Body: { action, product, hsCode, importCountry, exportCountry, cifValue, currency }
 */

export async function POST(request) {
  try {
    const body = await request.json();
    const { action = 'calculate_duties' } = body;

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY not configured' }, { status: 500 });
    }

    let prompt;
    switch (action) {
      case 'suggest_hs_code':
        prompt = buildHsCodePrompt(body);
        break;
      case 'describe_hs_code':
        prompt = buildDescribePrompt(body);
        break;
      case 'calculate_duties':
      default:
        prompt = buildDutiesPrompt(body);
        break;
    }

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
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      return Response.json({ error: `AI service error: ${response.status}` }, { status: 502 });
    }

    const aiResponse = await response.json();
    const rawText = aiResponse.content?.[0]?.text || '';

    let result;
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch (e) {
      result = null;
    }

    return Response.json({
      result: result || { rawResponse: rawText },
      action,
      disclaimer: 'AI-generated estimate. Verify with official customs authority before making commercial decisions.',
    });
  } catch (error) {
    console.error('[customs/intelligence]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function buildHsCodePrompt({ product }) {
  return `You are an international trade classification expert. Given a product description, suggest the most likely HS (Harmonized System) codes.

Product: "${product}"

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "suggestions": [
    {
      "hsCode": "XXXX.XX",
      "description": "official HS heading/subheading description",
      "confidence": "high/medium/low",
      "notes": "why this classification applies"
    }
  ],
  "product": "${product}",
  "classificationNotes": "any general notes about classifying this product"
}

Provide 2-4 suggestions ranked by likelihood. Use 6-digit HS codes minimum (8-10 digits if you know the specific country tariff subheading).`;
}

function buildDescribePrompt({ hsCode }) {
  return `You are an international trade classification expert. Given an HS code, provide the official description and classification details.

HS Code: "${hsCode}"

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "hsCode": "${hsCode}",
  "description": "official HS description at this level",
  "chapter": 0,
  "chapterTitle": "chapter title",
  "section": "section number and title",
  "hierarchy": [
    { "level": "Chapter", "code": "XX", "description": "..." },
    { "level": "Heading", "code": "XXXX", "description": "..." },
    { "level": "Subheading", "code": "XXXX.XX", "description": "..." }
  ],
  "commonProducts": ["list of common products classified under this code"],
  "notes": "any relevant classification notes or exclusions"
}`;
}

function buildDutiesPrompt({ product, hsCode, importCountry, exportCountry, cifValue, currency }) {
  const hsLine = hsCode ? `HS Code: ${hsCode}` : 'HS Code: suggest the most appropriate one';
  const cifLine = cifValue ? `CIF Value: ${cifValue} ${currency || 'USD'}. Calculate landed cost.` : '';
  const originLine = exportCountry ? `Exporting from: ${exportCountry}` : '';

  return `You are a customs and trade compliance expert with detailed knowledge of import tariffs worldwide. Provide accurate, current import duty and tax information:

Product: ${product}
${hsLine}
Importing into: ${importCountry}
${originLine}
${cifLine}

Respond ONLY with a JSON object (no markdown, no backticks):
{
  "hsCode": "the HS code (with dots)",
  "hsDescription": "official HS description",
  "product": "${product}",
  "importCountry": "${importCountry}",
  "exportCountry": "${exportCountry || 'Not specified'}",
  "duties": {
    "mfnRate": "MFN duty rate as string (e.g. '15%', '240c/kg', 'free')",
    "mfnRatePct": 15.0,
    "preferentialRates": [
      { "agreement": "trade agreement name", "rate": "preferential rate", "ratePct": 0, "countries": "applicable countries" }
    ],
    "applicableRate": "rate that applies for this origin-destination pair",
    "applicableRatePct": 0,
    "dutyType": "ad_valorem / specific / compound / free"
  },
  "taxes": {
    "vat": { "name": "VAT/GST name used in this country", "rate": "15%", "ratePct": 15.0, "appliedOn": "CIF + duty" },
    "excise": { "applicable": false, "rate": "", "description": "" },
    "otherLevies": [
      { "name": "levy name", "rate": "rate", "description": "what it covers" }
    ]
  },
  "restrictions": {
    "importPermitRequired": false,
    "sanitaryPhytosanitary": false,
    "labellingRequirements": "any specific requirements",
    "quotas": "any quota info or 'none'",
    "prohibitions": "any prohibitions or 'none'",
    "standards": "applicable standards (e.g. SABS, CE, FDA)",
    "otherRequirements": [],
    "regulatoryBody": "customs authority name and website"
  },
  ${cifValue ? `"landedCost": {
    "cifValue": ${cifValue},
    "currency": "${currency || 'USD'}",
    "dutyAmount": 0,
    "vatAmount": 0,
    "otherCharges": 0,
    "totalLandedCost": 0,
    "effectiveRate": "total charges as % of CIF"
  },` : '"landedCost": null,'}
  "tradeAgreements": "list any relevant FTAs between origin and destination",
  "notes": "important caveats, recent tariff changes, anti-dumping duties if applicable",
  "confidence": "high/medium/low"
}

Be specific and accurate. Include actual current duty rates, not generic placeholders. If you're uncertain about exact rates, say so in the confidence field and notes.`;
}
