import { useState } from 'react'
import { GasPump } from '@phosphor-icons/react'
import { useFuel } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { FormField, Empty, inp } from '../components/UI'
import AddFileDropdown from '../components/AddFileDropdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, Line, ComposedChart, XAxis, YAxis } from 'recharts'

const chartConfig = {
  cost: { label: 'Spend (R)',  color: 'oklch(0.79 0.13 210)' },
  ppl:  { label: 'Price/L',   color: 'oklch(0.73 0.17 82)'  },
}

export default function FuelPage() {
  const { entries, loading, add, update, remove } = useFuel()
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ date: '', litres: '', cost: '', odometer: '', notes: '' })
  const [editId, setEditId]         = useState(null)
  const [parseState, setParseState] = useState('idle')
  const [parseError, setParseError] = useState('')

  const compressImage = (file) => new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const MAX = 1600
      let { width, height } = img
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX }
        else { width = Math.round(width * MAX / height); height = MAX }
      }
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      resolve({ base64: canvas.toDataURL('image/jpeg', 0.85).split(',')[1], mime_type: 'image/jpeg' })
    }
    img.src = url
  })

  const handleFile = async (file) => {
    setParseState('parsing')
    setParseError('')
    try {
      const { base64, mime_type } = await compressImage(file)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ image_base64: base64, mime_type, context: 'fuel_receipt' }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to parse')
      const result = await res.json()
      const d = result.data || result
      setForm({ date: d.date || new Date().toISOString().slice(0,10), litres: d.litres != null ? String(d.litres) : '', cost: d.cost != null ? String(d.cost) : '', odometer: d.odometer != null ? String(d.odometer) : '', notes: '' })
      setEditId(null)
      setShowForm(true)
      setParseState('idle')
    } catch (err) { setParseError(err.message); setParseState('error') }
  }

  const handleSubmit = async () => {
    if (!form.date || !form.litres || !form.cost) return
    let result
    if (editId) { result = await update(editId, form); setEditId(null) }
    else result = await add(form)
    if (result?.error) { setParseError(result.error.message); return }
    setForm({ date: '', litres: '', cost: '', odometer: '', notes: '' })
    setShowForm(false)
  }

  const handleEdit = (e) => {
    setForm({ date: e.date, litres: String(e.litres), cost: String(e.cost), odometer: e.odometer != null ? String(e.odometer) : '', notes: e.notes || '' })
    setEditId(e.id)
    setShowForm(true)
  }

  if (loading) return <div className="p-10 text-muted-foreground text-center">Loading…</div>

  const totalCost   = entries.reduce((s,e) => s + Number(e.cost), 0)
  const totalLitres = entries.reduce((s,e) => s + Number(e.litres), 0)
  const avgPPL      = totalLitres > 0 ? (totalCost / totalLitres).toFixed(4) : '—'
  const latestOdo   = [...entries].reverse().find(e => e.odometer != null)?.odometer ?? null

  const monthly = {}
  entries.forEach(e => {
    const m = e.date.substring(0,7)
    if (!monthly[m]) monthly[m] = { cost: 0, litres: 0 }
    monthly[m].cost   += Number(e.cost)
    monthly[m].litres += Number(e.litres)
  })

  const chartData = Object.entries(monthly)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({
      month: `${month.substring(5)}/${month.substring(2,4)}`,
      cost: Math.round(v.cost),
      ppl:  v.litres > 0 ? parseFloat((v.cost / v.litres).toFixed(2)) : null,
    }))

  const livePPL = form.litres && form.cost && parseFloat(form.litres) > 0
    ? (parseFloat(form.cost) / parseFloat(form.litres)).toFixed(4)
    : null

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <GasPump size={20} weight="fill" className="text-primary" /> Fuel Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Vehicle fill-ups &amp; fuel cost tracking</p>
        </div>
        <div className="flex gap-2">
          <AddFileDropdown onFile={handleFile} loading={parseState === 'parsing'} label="Add receipt" accept="image/*" />
          <Button variant={showForm ? 'outline' : 'default'} size="sm"
            onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ date: '', litres: '', cost: '', odometer: '', notes: '' }) }}>
            {showForm ? 'Cancel' : '+ Log Fill-up'}
          </Button>
        </div>
      </div>

      {parseState === 'error' && (
        <div className="px-4 py-2 rounded-lg text-sm border border-red-800 bg-red-950 text-red-400">
          Parse error: {parseError}
        </div>
      )}

      {/* Stats */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Spend',    value: `R${totalCost.toLocaleString()}`, sub: 'All fill-ups', accent: true },
            { label: 'Total Litres',   value: `${totalLitres.toFixed(1)}L` },
            { label: 'Avg Price/L',    value: totalLitres > 0 ? `R${avgPPL}` : '—', sub: 'Across all fill-ups' },
            { label: 'Odometer',       value: latestOdo != null ? `${Number(latestOdo).toLocaleString()} km` : '—', sub: 'Latest reading' },
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

      {/* Entry form */}
      {showForm && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-3">
              <FormField label="Date"><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inp} /></FormField>
              <FormField label="Litres"><input type="number" placeholder="e.g. 40.5" value={form.litres} onChange={e => setForm({...form, litres: e.target.value})} style={inp} /></FormField>
              <FormField label="Total Cost (R)"><input type="number" placeholder="e.g. 900" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} style={inp} /></FormField>
              <FormField label={`Price/L${livePPL ? ` — R${livePPL}` : ''}`}>
                <div style={inp} className="flex items-center text-muted-foreground">
                  {livePPL ? `R${livePPL}` : 'Auto-calculated'}
                </div>
              </FormField>
              <FormField label="Odometer (km)"><input type="number" placeholder="Optional" value={form.odometer} onChange={e => setForm({...form, odometer: e.target.value})} style={inp} /></FormField>
            </div>
            <Button onClick={handleSubmit} size="sm">{editId ? 'Update' : 'Save'}</Button>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty title="No fuel data yet" desc="Start logging your fill-ups to track spend and fuel price trends." fields={['Date', 'Litres', 'Total cost', 'Odometer']} onAction={() => setShowForm(true)} actionLabel="Log First Fill-up" />
      ) : (
        <>
          {/* Chart */}
          {chartData.length > 1 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Spend &amp; Price Trend</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 24, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="cost" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `R${v.toLocaleString()}`} width={65} />
                    <YAxis yAxisId="ppl" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `R${v}`} width={45} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v, name) => name === 'ppl' ? `R${v}/L` : `R${Number(v).toLocaleString()}`} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar    yAxisId="cost" dataKey="cost" fill="var(--color-cost)" radius={[4,4,0,0]} />
                    <Line  yAxisId="ppl"  dataKey="ppl"  stroke="var(--color-ppl)" strokeWidth={2} dot={{ r: 3 }} type="monotone" />
                  </ComposedChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Log table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Fill-up Log ({entries.length} entries)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {['Date','Litres','Cost','R/L','Odometer',''].map(h => (
                        <th key={h} className="text-left px-2 py-2 text-muted-foreground font-medium uppercase tracking-wide text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...entries].reverse().map(e => {
                      const ppl = e.price_per_litre != null ? `R${Number(e.price_per_litre).toFixed(4)}` : '—'
                      return (
                        <tr key={e.id} className="border-b border-border/10">
                          <td className="px-2 py-1.5 font-mono text-foreground">{e.date}</td>
                          <td className="px-2 py-1.5 font-mono text-foreground">{Number(e.litres).toFixed(2)}L</td>
                          <td className="px-2 py-1.5 font-mono text-primary">R{Number(e.cost).toLocaleString()}</td>
                          <td className="px-2 py-1.5 font-mono text-amber-400">{ppl}</td>
                          <td className="px-2 py-1.5 font-mono text-muted-foreground">{e.odometer != null ? `${Number(e.odometer).toLocaleString()} km` : '—'}</td>
                          <td className="px-2 py-1.5 text-right">
                            <span onClick={() => handleEdit(e)} className="cursor-pointer text-muted-foreground hover:text-foreground mr-2">edit</span>
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
