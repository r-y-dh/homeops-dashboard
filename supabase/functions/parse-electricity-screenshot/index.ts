import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PROMPT = `You are extracting data from a South African prepaid electricity purchase confirmation screenshot (typically from a banking app or City Power portal).

Extract the following fields and return ONLY a valid JSON object with no markdown, no explanation.

Fields to extract:
- date: purchase date in YYYY-MM-DD format (null if not visible in the screenshot)
- amount: total amount paid in Rands as a number (e.g. 2000, not "R2,000.00") — this is the full purchase amount
- service_fee: the domestic capacity/service charge in Rands as a number (typically 200, labelled "Domestic Capacity/Service Charge")
- units: kilowatt-hours received as a number (e.g. 541.80)
- token: the electricity token/voucher number as a string with no spaces (digits only)

If a field cannot be determined, use null. Return only the JSON object.`

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const { image_base64, media_type } = await req.json()
    if (!image_base64) throw new Error('Missing image_base64')

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: media_type ?? 'image/jpeg', data: image_base64 },
            },
            { type: 'text', text: PROMPT },
          ],
        }],
      }),
    })

    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`)

    const body = await res.json()
    let text = body.content?.[0]?.text ?? ''
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
    const data = JSON.parse(text)

    return new Response(JSON.stringify(data), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
