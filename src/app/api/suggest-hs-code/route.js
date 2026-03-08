import { NextResponse } from 'next/server'

// Common HS code mappings for quick lookup (avoids API call for well-known products)
const QUICK_LOOKUP = {
  'sugar': { code: '1701.99', desc: 'Cane or beet sugar, refined' },
  'rice': { code: '1006.30', desc: 'Semi-milled or wholly milled rice' },
  'wheat': { code: '1001.99', desc: 'Wheat, other than seed' },
  'coffee': { code: '0901.11', desc: 'Coffee, not roasted, not decaffeinated' },
  'cocoa': { code: '1801.00', desc: 'Cocoa beans, whole or broken' },
  'palm oil': { code: '1511.10', desc: 'Palm oil, crude' },
  'soybean': { code: '1201.90', desc: 'Soya beans' },
  'soybean oil': { code: '1507.10', desc: 'Soya-bean oil, crude' },
  'sunflower oil': { code: '1512.11', desc: 'Sunflower-seed oil, crude' },
  'corn': { code: '1005.90', desc: 'Maize (corn)' },
  'cotton': { code: '5201.00', desc: 'Cotton, not carded or combed' },
  'copper': { code: '7403.11', desc: 'Refined copper, cathodes' },
  'aluminium': { code: '7601.10', desc: 'Aluminium, not alloyed, unwrought' },
  'steel': { code: '7208.51', desc: 'Flat-rolled products of iron or non-alloy steel' },
  'crude oil': { code: '2709.00', desc: 'Petroleum oils, crude' },
  'petrol': { code: '2710.12', desc: 'Light petroleum oils' },
  'diesel': { code: '2710.19', desc: 'Medium petroleum oils' },
  'natural gas': { code: '2711.11', desc: 'Natural gas, liquefied' },
  'coal': { code: '2701.12', desc: 'Bituminous coal' },
  'cement': { code: '2523.29', desc: 'Portland cement' },
  'fertilizer': { code: '3105.20', desc: 'Mineral or chemical fertilizers' },
  'rubber': { code: '4001.22', desc: 'Technically specified natural rubber (TSNR)' },
  'timber': { code: '4407.11', desc: 'Wood sawn or chipped, coniferous' },
  'fruit': { code: '0810.90', desc: 'Fresh fruit' },
  'frozen fish': { code: '0303.89', desc: 'Frozen fish' },
  'chicken': { code: '0207.14', desc: 'Frozen cuts of chicken' },
  'beef': { code: '0202.30', desc: 'Frozen boneless beef' },
  'milk powder': { code: '0402.21', desc: 'Milk powder, not sweetened' },
  'butter': { code: '0405.10', desc: 'Butter' },
  'cheese': { code: '0406.90', desc: 'Cheese' },
  'wine': { code: '2204.21', desc: 'Wine of fresh grapes' },
  'beer': { code: '2203.00', desc: 'Beer made from malt' },
  'cigarettes': { code: '2402.20', desc: 'Cigarettes containing tobacco' },
  'electronics': { code: '8542.31', desc: 'Electronic integrated circuits' },
  'mobile phone': { code: '8517.13', desc: 'Smartphones' },
  'laptop': { code: '8471.30', desc: 'Portable digital computers' },
  'textile': { code: '5209.42', desc: 'Woven fabrics of cotton' },
  'shoes': { code: '6404.19', desc: 'Footwear with outer soles of rubber' },
  'plastic': { code: '3901.10', desc: 'Polyethylene in primary forms' },
  'paper': { code: '4802.55', desc: 'Paper and paperboard' },
  'medicine': { code: '3004.90', desc: 'Medicaments in measured doses' },
  'soap': { code: '3401.11', desc: 'Soap for toilet use' },
  'canned food': { code: '2005.99', desc: 'Vegetables, prepared or preserved' },
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const product = (searchParams.get('product') || '').toLowerCase().trim()

  if (!product) {
    return NextResponse.json({ error: 'Product description required' }, { status: 400 })
  }

  // Try quick lookup first
  for (const [key, val] of Object.entries(QUICK_LOOKUP)) {
    if (product.includes(key) || key.includes(product)) {
      return NextResponse.json({
        suggestions: [{ hs_code: val.code, description: val.desc, confidence: 'high' }],
        source: 'internal database',
      })
    }
  }

  // Use Claude API for intelligent suggestion
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY || '', 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        messages: [{ role: 'user', content: `For the product "${product}", suggest the most likely HS code (Harmonized System, 6-digit). Return ONLY a JSON array of 1-3 suggestions like: [{"hs_code":"1234.56","description":"brief desc","confidence":"high|medium|low"}]. No other text.` }],
      }),
    })

    if (res.ok) {
      const data = await res.json()
      const text = data.content?.[0]?.text || ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const suggestions = JSON.parse(jsonMatch[0])
        return NextResponse.json({ suggestions, source: 'AI classification' })
      }
    }
  } catch {}

  // Fallback: return generic suggestion based on first word
  return NextResponse.json({
    suggestions: [{ hs_code: '9999.99', description: 'Could not classify - please enter manually', confidence: 'low' }],
    source: 'fallback',
  })
}
