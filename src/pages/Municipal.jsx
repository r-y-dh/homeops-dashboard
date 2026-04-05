import { useState } from 'react'
import { Buildings } from '@phosphor-icons/react'
import { useMunicipal } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { FormField, Empty, inp } from '../components/UI'
import AddFileDropdown from '../components/AddFileDropdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

const EMPTY_FORM = { month: '', water: '', rates: '', refuse: '', sewerage: '', other: '', previousBalance: '', waterKL: '', waterDailyAvgKL: '', readingDays: '', meterStart: '', meterEnd: '', standSize: '', portion: '', valuation: '', region: '' }

const chartConfig = {
  water:    { label: 'Water',   color: 'oklch(0.79 0.13 210)'  },
  rates:    { label: 'Rates',   color: 'oklch(0.73 0.17 82)'   },
  refuse:   { label: 'Refuse',  color: 'oklch(0.69 0.16 163)'  },
  sewerage: { label: 'Sewer',   color: 'oklch(0.59 0.025 250)' },
}

async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-municipal-pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ pdf_base64: base64 }),
  })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to parse PDF') }
  return res.json()
}

async function parseImage(file) {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-image`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
    body: JSON.stringify({ image_base64: base64, mime_type: file.type, context: 'municipal' }),
  })
  if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.error || 'Failed to parse image') }
  return res.json()
}

const fmt  = (v) => v != null && v !== '' ? `R${Number(v).toLocaleString()}` : '—'
const fmtN = (v) => v != null && v !== '' ? Number(v).toLocaleString() : '—'

export default function MunicipalPage() {
  const { entries, loading, add, remove } = useMunicipal()
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [parseState, setParseState] = useState('idle')
  const [parseError, setParseError] = useState('')

  const applyParsedData = (data) => {
    setForm({ month: data.month ?? '', water: data.water ?? '', rates: data.rates ?? '', refuse: data.refuse ?? '', sewerage: data.sewerage ?? '', other: data.other ?? '', previousBalance: data.previous_balance ?? '', waterKL: data.water_kl ?? '', waterDailyAvgKL: data.water_daily_avg_kl ?? '', readingDays: data.reading_days ?? '', meterStart: data.meter_start ?? '', meterEnd: data.meter_end ?? '', standSize: data.stand_size ?? '', portion: data.portion ?? '', valuation: data.valuation ?? '', region: data.region ?? '' })
    setShowForm(true)
  }

  const handleFile = async (file) => {
    setParseState('parsing')
    setParseError('')
    try {
      if (file.type === 'application/pdf') { const data = await parsePDF(file); applyParsedData(data) }
      else { const { data } = await parseImage(file); applyParsedData(data) }
      setParseState('idle')
    } catch (err) { setParseError(err.message); setParseState('error') }
  }

  const handleSubmit = async () => {
    if (!form.month) return
    await add(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (loading) return <div className="p-10 text-muted-foreground text-center">Loading…</div>

  const latest = entries.length ? entries[entries.length-1] : null
  const prop   = [...entries].reverse().find(e => e.stand_size || e.region || e.valuation)

  const missingMonths = (() => {
    const now = new Date()
    const present = new Set(entries.map(e => e.month))
    const missing = []
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`
      if (!present.has(key)) missing.unshift(key)
    }
    return missing
  })()

  const chartData = [...entries]
    .sort((a,b) => a.month.localeCompare(b.month))
    .slice(-6)
    .map(e => ({
      month:    e.month.substring(5) + '/' + e.month.substring(2,4),
      water:    Number(e.water    || 0),
      rates:    Number(e.rates    || 0),
      refuse:   Number(e.refuse   || 0),
      sewerage: Number(e.sewerage || 0),
    }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Buildings size={20} weight="fill" className="text-primary" /> Municipal Account
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Water • Rates • Refuse • Sewerage</p>
        </div>
        <div className="flex gap-2">
          <AddFileDropdown onFile={handleFile} loading={parseState === 'parsing'} label="Add file or photo" accept="image/*,application/pdf" />
          <Button variant={showForm ? 'outline' : 'default'} size="sm" onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM) }}>
            {showForm ? 'Cancel' : '+ Add Month'}
          </Button>
        </div>
      </div>

      {/* Latest stats */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Due',     value: fmt(latest.total), accent: true, sub: latest.month },
            { label: 'Water & Sewer', value: fmt(latest.water) },
            { label: 'Rates',         value: fmt(latest.rates) },
            { label: 'Prev Balance',  value: fmt(latest.previous_balance), sub: Number(latest.previous_balance) < 0 ? 'Credit' : Number(latest.previous_balance) > 0 ? 'Arrears' : undefined },
          ].map(s => (
            <Card key={s.label}>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{s.label}</div>
                <div className={`text-xl font-bold font-mono ${s.accent ? 'text-primary' : 'text-foreground'}`}>{s.value}</div>
                {s.sub && <div className="text-xs text-muted-foreground mt-1">{s.sub}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Property strip */}
      {prop && (
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap gap-6">
              {[['Stand Size', prop.stand_size ? `${Number(prop.stand_size).toLocaleString()} m²` : null], ['Portion', prop.portion], ['Valuation', prop.valuation ? `R${Number(prop.valuation).toLocaleString()}` : null], ['Region', prop.region]].map(([label, val]) => val ? (
                <div key={label}>
                  <div className="text-xs uppercase text-muted-foreground tracking-wide">{label}</div>
                  <div className="text-sm font-semibold text-foreground mt-0.5">{val}</div>
                </div>
              ) : null)}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Missing months */}
      {missingMonths.length > 0 && (
        <Card className="border-amber-800/40 bg-amber-950/20">
          <CardContent className="pt-4">
            <div className="text-sm font-semibold text-amber-400 mb-2">
              Missing {missingMonths.length} statement{missingMonths.length > 1 ? 's' : ''} in the past year
            </div>
            <div className="flex flex-wrap gap-2">
              {missingMonths.map(m => (
                <Badge key={m} variant="outline" className="cursor-pointer border-amber-700 text-amber-400 hover:bg-amber-900/30 font-mono text-xs"
                  onClick={() => { setForm({ ...EMPTY_FORM, month: m }); setShowForm(true) }}>
                  {m}
                </Badge>
              ))}
            </div>
            <div className="text-xs text-muted-foreground mt-2">Click a month to add it, or upload a PDF/photo above.</div>
          </CardContent>
        </Card>
      )}

      {parseState === 'error' && (
        <div className="px-4 py-2 rounded-lg text-sm border border-red-800 bg-red-950 text-red-400">
          Parse error: {parseError}
        </div>
      )}

      {/* Form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Month"><input type="month" value={form.month} onChange={f('month')} style={inp} /></FormField>
              <FormField label="Previous Account Balance (R)"><input type="number" value={form.previousBalance} onChange={f('previousBalance')} style={inp} /></FormField>
            </div>
            <div>
              <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2">Water & Sanitation</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[['Water & Sanitation (R)','water'],['Sewerage (R)','sewerage'],['kL Used','waterKL'],['Daily Avg kL','waterDailyAvgKL'],['Reading Days','readingDays']].map(([l,k]) => (
                  <FormField key={k} label={l}><input type="number" value={form[k]} onChange={f(k)} style={inp} /></FormField>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Fixed Charges</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[['Rates (R)','rates'],['Refuse (R)','refuse'],['Other (R)','other']].map(([l,k]) => (
                  <FormField key={k} label={l}><input type="number" value={form[k]} onChange={f(k)} style={inp} /></FormField>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Property Details</div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[['Stand Size (m²)','standSize'],['Portion','portion'],['Valuation (R)','valuation'],['Region','region']].map(([l,k]) => (
                  <FormField key={k} label={l}><input type={['standSize','valuation'].includes(k) ? 'number' : 'text'} value={form[k]} onChange={f(k)} style={inp} /></FormField>
                ))}
              </div>
            </div>
            <Button onClick={handleSubmit} size="sm">Save</Button>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty title="No municipal data yet" desc="Upload a PDF or photo of your municipal statement to auto-extract data, or add months manually." fields={['Water & sewer charges','Property rates','Refuse removal']} onAction={() => setShowForm(true)} />
      ) : (
        <>
          {/* Chart */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Charges Breakdown</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `R${v.toLocaleString()}`} width={65} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => `R${Number(v).toLocaleString()}`} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="water"    stackId="a" fill="var(--color-water)"    radius={[0,0,0,0]} />
                    <Bar dataKey="rates"    stackId="a" fill="var(--color-rates)"    radius={[0,0,0,0]} />
                    <Bar dataKey="refuse"   stackId="a" fill="var(--color-refuse)"   radius={[0,0,0,0]} />
                    <Bar dataKey="sewerage" stackId="a" fill="var(--color-sewerage)" radius={[4,4,0,0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* History table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">History ({entries.length} months)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {['Month','Water','Sewer','kL','Daily Avg','Rates','Refuse','Current','Prev Bal','Total Due',''].map(h => (
                        <th key={h} className="text-left px-2 py-2 text-muted-foreground font-medium uppercase tracking-wide text-[10px] whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...entries].reverse().map(e => {
                      const current = e.current_charges ?? (Number(e.rates||0)+Number(e.water||0)+Number(e.refuse||0)+Number(e.sewerage||0)+Number(e.other||0))
                      const prevBal = e.previous_balance
                      return (
                        <tr key={e.id} className="border-b border-border/10">
                          <td className="px-2 py-1.5 font-mono text-foreground">{e.month}</td>
                          <td className="px-2 py-1.5 font-mono text-primary">{fmt(e.water)}</td>
                          <td className="px-2 py-1.5 font-mono text-foreground">{Number(e.sewerage) > 0 ? fmt(e.sewerage) : '—'}</td>
                          <td className="px-2 py-1.5 font-mono text-muted-foreground">{fmtN(e.water_kl)}</td>
                          <td className="px-2 py-1.5 font-mono text-muted-foreground">{e.water_daily_avg_kl ? Number(e.water_daily_avg_kl).toFixed(3) : '—'}</td>
                          <td className="px-2 py-1.5 font-mono text-foreground">{fmt(e.rates)}</td>
                          <td className="px-2 py-1.5 font-mono text-foreground">{fmt(e.refuse)}</td>
                          <td className="px-2 py-1.5 font-mono text-foreground">{fmt(current)}</td>
                          <td className={`px-2 py-1.5 font-mono ${prevBal == null ? 'text-muted-foreground' : Number(prevBal) < 0 ? 'text-green-400' : Number(prevBal) > 0 ? 'text-amber-400' : 'text-muted-foreground'}`}>
                            {prevBal != null ? fmt(prevBal) : '—'}
                          </td>
                          <td className="px-2 py-1.5 font-mono text-primary font-semibold">{fmt(e.total)}</td>
                          <td className="px-2 py-1.5 text-right">
                            <span onClick={() => remove(e.id)} className="cursor-pointer text-red-400 hover:text-red-300">×</span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
