import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import Anthropic from 'npm:@anthropic-ai/sdk'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const CATEGORIES = [
  'Groceries', 'Eating Out', 'Shopping', 'Kids & Family',
  'Fuel', 'Utilities', 'Medical', 'Insurance', 'Bond',
  'Savings', 'Transfer', 'Salary', 'Other',
]

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { file_base64, mime_type, account_name } = await req.json()
    // mime_type: 'text/csv' | 'text/plain' | 'application/pdf' | 'image/jpeg' | 'image/png'

    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') })

    const categoryList = CATEGORIES.join(' | ')
    const jsonShape = `{
  "month": "YYYY-MM",
  "opening_balance": <number>,
  "closing_balance": <number>,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "<merchant or payee name, cleaned up>",
      "amount": <positive number>,
      "type": "debit" | "credit",
      "suggested_category": "<one of: ${categoryList}>"
    }
  ]
}`

    const instructions = `You are parsing a Discovery Bank${account_name ? ` account statement for "${account_name}"` : ' account statement'}.

Extract:
1. Statement month (YYYY-MM) — use the month most transactions fall in
2. Opening balance at start of the period
3. Closing balance at end of the period
4. Every transaction — skip opening/closing balance lines themselves

For suggested_category, use your best judgement from the description:
- "Groceries": Checkers, Woolworths Food, Pick n Pay, Spar, food stores
- "Eating Out": restaurants, Uber Eats, Mr D, coffee shops, fast food
- "Shopping": clothing, electronics, retail, Amazon, Takealot
- "Kids & Family": schools, creches, toys, baby stores, kids activities
- "Fuel": petrol stations, fuel, garage
- "Utilities": electricity, water, municipal, prepaid
- "Medical": pharmacy, doctors, hospitals, medical aid
- "Insurance": insurance premiums
- "Bond": home loan, bond repayment, FNB home loan
- "Savings": savings transfers, unit trusts, investments
- "Transfer": inter-account transfers, EFT payments to known contacts
- "Salary": salary, payroll, income credits
- "Other": anything else

Return ONLY valid JSON — no markdown, no explanation:
${jsonShape}`

    let message
    const isText = mime_type === 'text/csv' || mime_type === 'text/plain'

    if (isText) {
      // Decode base64 to text and send as text content
      const csvText = atob(file_base64)
      message = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `${instructions}\n\nStatement content:\n\`\`\`\n${csvText}\n\`\`\``,
        }],
      })
    } else {
      // PDF or image — send as vision
      const mediaType = mime_type as 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
      message = await anthropic.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: file_base64 } },
            { type: 'text', text: instructions },
          ],
        }],
      })
    }

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found in response')
    const result = JSON.parse(match[0])

    // Ensure transactions is always an array
    if (!Array.isArray(result.transactions)) result.transactions = []

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
