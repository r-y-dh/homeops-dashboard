import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { image_base64, mime_type, context } = await req.json()
    // context: 'electricity_topup' | 'municipal' | null (auto-detect)

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    const prompt = context === 'electricity_topup'
      ? `Extract electricity top-up purchase data from this screenshot. Return ONLY a JSON object:
{
  "type": "electricity_topup",
  "data": {
    "date": "YYYY-MM-DD",
    "amount": <total rands paid as number>,
    "service_fee": <domestic capacity/service charge as number>,
    "units": <kWh received as number>,
    "token": "<token digits if visible>"
  }
}
For date: use today's date in YYYY-MM-DD format if not clearly shown. Service fee is typically labeled "Domestic Capacity/Service Charge".`

      : context === 'municipal'
      ? `Extract municipal billing data from this image. Return ONLY a JSON object:
{
  "type": "municipal",
  "data": {
    "month": "YYYY-MM",
    "water": <water & sanitation charge as number>,
    "rates": <property rates as number>,
    "refuse": <refuse removal charge as number>,
    "sewerage": <sewerage charge as number>,
    "other": <other charges as number>,
    "previous_balance": <previous account balance as number>,
    "water_kl": <kilolitres consumed as number>,
    "water_daily_avg_kl": <daily average kL as number>,
    "reading_days": <number of reading days as integer>
  }
}`

      : context === 'fuel_receipt'
      ? `Extract fuel fill-up data from this receipt. Return ONLY a JSON object:
{
  "type": "fuel_receipt",
  "data": {
    "date": "YYYY-MM-DD",
    "litres": <litres pumped as number>,
    "cost": <total rands paid as number>,
    "price_per_litre": <price per litre as number>,
    "odometer": <odometer reading as number or null if not shown>
  }
}
Use today's date in YYYY-MM-DD format if not clearly visible on the receipt.`

      : `Analyze this image and extract utility/home finance data. Determine what type of image this is and return ONLY a JSON object:

{
  "type": "electricity_topup" | "municipal" | "dab_dashboard" | "fuel_receipt" | "unknown",
  "data": { ... }
}

For "electricity_topup" (City Power purchase confirmation):
data: { "date": "YYYY-MM-DD", "amount": <total R>, "service_fee": <capacity charge R>, "units": <kWh>, "token": "<token>" }

For "municipal" (municipal bill/statement):
data: { "month": "YYYY-MM", "water": <R>, "rates": <R>, "refuse": <R>, "sewerage": <R>, "other": <R>, "previous_balance": <R>, "water_kl": <kL>, "water_daily_avg_kl": <kL>, "reading_days": <int> }

For "dab_dashboard" (DAB utility dashboard showing water mc and kWh usage):
data: { "current_month": "YYYY-MM", "water_kl": <current month water in mc/kL as number>, "prev_water_kl": <previous month>, "units_kwh": <current month kWh as number>, "prev_units_kwh": <previous month kWh> }

For "fuel_receipt" (petrol station receipt):
data: { "date": "YYYY-MM-DD", "litres": <L>, "cost": <total R>, "price_per_litre": <R/L>, "odometer": <km or null> }

Use today's date to infer the current month if needed. Return ONLY the JSON.`

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 512,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mime_type as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp', data: image_base64 } },
          { type: 'text', text: prompt },
        ],
      }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found in response')
    const result = JSON.parse(match[0])

    return new Response(JSON.stringify(result), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
