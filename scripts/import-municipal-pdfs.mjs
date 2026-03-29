#!/usr/bin/env node
/**
 * Bulk import COJ municipal PDFs into Supabase.
 * Calls Claude API directly (no edge function needed),
 * then upserts via service role key (bypasses RLS).
 *
 * Usage: node scripts/import-municipal-pdfs.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

// ─── Config ──────────────────────────────────────────────────
// Load from .env if present (dotenv not required — values can be exported in shell)
const SUPABASE_URL      = process.env.VITE_SUPABASE_URL      || 'https://frsixdfsirkhiijjzaub.supabase.co'
const SUPABASE_SERVICE  = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANTHROPIC_KEY     = process.env.ANTHROPIC_API_KEY
const USER_ID           = process.env.HOMEOPS_USER_ID         || '4ec432e7-527b-4b2c-917e-b9670cfe42ba'

if (!SUPABASE_SERVICE) { console.error('Missing SUPABASE_SERVICE_ROLE_KEY env var'); process.exit(1) }
if (!ANTHROPIC_KEY)    { console.error('Missing ANTHROPIC_API_KEY env var');         process.exit(1) }
const PDF_DIR           = '/Users/riyadhg/Library/Mobile Documents/com~apple~CloudDocs/— Personal/Home/Rates & Taxes/COJ Statements'
const CONCURRENCY       = 1   // serial to stay under 50k tokens/min rate limit
const DELAY_MS          = 10000 // 10s between requests to avoid rate limits

const PROMPT = `You are parsing a South African municipal utility bill (City of Johannesburg / COJ).
Extract the following fields and return ONLY a valid JSON object with no markdown, no explanation.

Fields to extract:
- month: billing month in YYYY-MM format (use the statement/billing month, not the due date)
- rates: property rates amount in Rands (number, no currency symbol)
- water: total water & sanitation charges in Rands (combine water + sanitation if on one line)
- refuse: refuse/Pikitup removal charge in Rands
- sewerage: sewerage charge in Rands if broken out separately (0 if included in water)
- other: any other charges not covered above (0 if none)
- total: total amount due in Rands
- water_kl: kilolitres of water consumed (number)
- water_daily_avg_kl: daily average kilolitres (number, calculate if not shown: water_kl / reading_days)
- reading_days: number of days in the meter reading period
- meter_start: water meter reading at start of period (number)
- meter_end: water meter reading at end of period (number)

If a field cannot be determined, use null. Return only the JSON object.`

// ─── Helpers ─────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function parsePDF(filePath) {
  const base64 = readFileSync(filePath).toString('base64')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  })

  if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`)
  const body = await res.json()
  let text = body.content?.[0]?.text ?? ''
  // Strip markdown code fences if present
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  return JSON.parse(text)
}

async function upsertEntry(supabase, data) {
  if (!data.month) throw new Error('No month extracted')
  const row = {
    user_id:            USER_ID,
    month:              data.month,
    rates:              data.rates              ?? 0,
    water:              data.water              ?? 0,
    refuse:             data.refuse             ?? 0,
    sewerage:           data.sewerage           ?? 0,
    other:              data.other              ?? 0,
    total:              data.total              ?? null,
    water_kl:           data.water_kl           ?? null,
    water_daily_avg_kl: data.water_daily_avg_kl ?? null,
    reading_days:       data.reading_days       ?? null,
    meter_start:        data.meter_start        ?? null,
    meter_end:          data.meter_end          ?? null,
  }
  const { error } = await supabase.from('municipal_entries').upsert(row, { onConflict: 'user_id,month' })
  if (error) throw new Error(error.message)
  return row
}

// ─── Main ────────────────────────────────────────────────────
async function main() {
  console.log('🏛  COJ Municipal PDF Bulk Import')
  console.log('─'.repeat(50))

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE)

  const files = readdirSync(PDF_DIR)
    .filter(f => f.startsWith('COJ_') && f.endsWith('.pdf'))
    .sort()

  console.log(`Found ${files.length} COJ PDFs\n`)

  const results = { ok: [], failed: [] }

  for (let i = 0; i < files.length; i += CONCURRENCY) {
    const batch = files.slice(i, i + CONCURRENCY)

    await Promise.all(batch.map(async (filename, bi) => {
      const idx = i + bi + 1
      const label = filename.replace('COJ_', '').replace(/_\d{9}/, '').replace('.pdf', '')
      process.stdout.write(`  ${String(idx).padStart(2)}/${files.length}  ${label}  … `)
      try {
        const data = await parsePDF(join(PDF_DIR, filename))
        const row = await upsertEntry(supabase, data)
        console.log(`✓  R${Number(data.total ?? 0).toLocaleString()}  (${data.month})`)
        results.ok.push({ filename, month: data.month, total: data.total })
      } catch (err) {
        console.log(`✗  ${err.message.slice(0, 80)}`)
        results.failed.push({ filename, error: err.message })
      }
    }))

    if (i + CONCURRENCY < files.length) await sleep(DELAY_MS)
  }

  console.log('\n' + '─'.repeat(50))
  console.log(`✅ Imported:  ${results.ok.length}`)
  if (results.failed.length) {
    console.log(`❌ Failed:    ${results.failed.length}`)
    results.failed.forEach(f => console.log(`   • ${f.filename}\n     ${f.error}`))
  }
  if (results.ok.length) {
    const total = results.ok.reduce((s, r) => s + (Number(r.total) || 0), 0)
    console.log(`\n💰 Total spend across imported months: R${total.toLocaleString()}`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
