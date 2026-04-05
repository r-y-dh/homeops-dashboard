import { useState } from 'react'
import { Lightning } from '@phosphor-icons/react'
import { T, WINTER_TARGETS, DAILY_USAGE_NORMAL, DAILY_USAGE_WINTER } from '../lib/constants'
import { useElectricity } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { FormField, Empty, inp } from '../components/UI'
import BufferGauge from '../components/BufferGauge'
import AddFileDropdown from '../components/AddFileDropdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart'
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'

const chartConfig = {
  energy: { label: 'Energy',      color: 'oklch(0.79 0.13 210)'  },
  fee:    { label: 'Service Fee', color: 'oklch(0.73 0.17 82)'   },
}

export default function ElectricityPage() {
  const { entries, loading, add, update, remove } = useElectricity()
  const [showForm, setShowForm]   = useState(false)
  const [form, setForm]           = useState({ date: '', amount: '', units: '', balance: '', serviceFee: '200' })
  const [editId, setEditId]       = useState(null)
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
        body: JSON.stringify({ image_base64: base64, mime_type, context: 'electricity_topup' }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to parse')
      const result = await res.json()
      const d = result.data || result
      setForm({ date: d.date || new Date().toISOString().slice(0,10), amount: d.amount != null ? String(d.amount) : '', serviceFee: d.service_fee != null ? String(d.service_fee) : '200', units: d.units != null ? String(d.units) : '', balance: '' })
      setEditId(null)
      setShowForm(true)
      setParseState('idle')
    } catch (err) {
      setParseError(err.message)
      setParseState('error')
    }
  }

  const handleSubmit = async () => {
    if (!form.date || !form.amount) return
    if (editId) { await update(editId, form); setEditId(null) }
    else await add(form)
    setForm({ date: '', amount: '', units: '', balance: '', serviceFee: '200' })
    setShowForm(false)
  }

  const handleEdit = (e) => {
    setForm({ date: e.date, amount: String(e.amount), units: String(e.units), balance: e.balance !== null ? String(e.balance) : '', serviceFee: String(e.service_fee || 200) })
    setEditId(e.id)
    setShowForm(true)
  }

  if (loading) return <div className="p-10 text-muted-foreground text-center">Loading…</div>

  const totalSpend   = entries.reduce((s,e) => s + Number(e.amount), 0)
  const totalFees    = entries.reduce((s,e) => s + Number(e.service_fee || 0), 0)
  const totalEnergy  = entries.reduce((s,e) => s + Number(e.energy_value || 0), 0)
  const totalUnits   = entries.reduce((s,e) => s + Number(e.units || 0), 0)
  const avgEffRate   = totalUnits > 0 ? (totalEnergy / totalUnits).toFixed(2) : '—'
  const avgTrueRate  = totalUnits > 0 ? (totalSpend  / totalUnits).toFixed(2) : '—'
  const latestBalance = [...entries].reverse().find(e => e.balance !== null)?.balance || 0
  const daysRemaining = latestBalance > 0 ? Math.floor(latestBalance / DAILY_USAGE_NORMAL) : 0
  const nextTopUpDate = new Date()
  nextTopUpDate.setDate(nextTopUpDate.getDate() + daysRemaining)
  const feePct = totalSpend > 0 ? ((totalFees / totalSpend) * 100).toFixed(1) : 0

  const monthly = {}
  entries.forEach(e => {
    const m = e.date.substring(0,7)
    if (!monthly[m]) monthly[m] = { spend: 0, fees: 0, units: 0, energy: 0 }
    monthly[m].spend  += Number(e.amount)
    monthly[m].fees   += Number(e.service_fee || 0)
    monthly[m].units  += Number(e.units)
    monthly[m].energy += Number(e.energy_value || 0)
  })
  const chartData = Object.entries(monthly)
    .sort(([a],[b]) => a.localeCompare(b))
    .slice(-6)
    .map(([month, v]) => ({
      month: `${month.substring(5)}/${month.substring(2,4)}`,
      energy: Math.round(v.energy),
      fee:    Math.round(v.fees),
    }))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Lightning size={20} weight="fill" className="text-primary" /> Electricity Tracker
          </h1>
          <p className="text-sm text-muted-foreground mt-1">City Power Johannesburg • Prepaid • Meter #14288734024</p>
        </div>
        <div className="flex gap-2">
          <AddFileDropdown onFile={handleFile} loading={parseState === 'parsing'} label="Add receipt" accept="image/*" />
          <Button variant={showForm ? 'outline' : 'default'} size="sm" onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ date: '', amount: '', units: '', balance: '', serviceFee: '200' }) }}>
            {showForm ? 'Cancel' : '+ Log Top-up'}
          </Button>
        </div>
      </div>

      {parseState === 'error' && (
        <div className="px-4 py-2 rounded-lg text-sm border border-red-800 bg-red-950 text-red-400">
          Parse error: {parseError}
        </div>
      )}

      {/* Stat cards */}
      {entries.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Current Balance', value: `${Number(latestBalance).toFixed(0)} kWh`, sub: `~${daysRemaining} days remaining`, accent: latestBalance < WINTER_TARGETS.min },
            { label: 'Effective Rate',  value: `R${avgEffRate}/kWh`, sub: 'Excl. service fee', accent: true },
            { label: 'True Rate',       value: `R${avgTrueRate}/kWh`, sub: 'Incl. service fee' },
            { label: 'Fee Drag',        value: `${feePct}%`, sub: `R${totalFees.toLocaleString()} total` },
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
              <FormField label="Total Amount (R)"><input type="number" placeholder="e.g. 2000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={inp} /></FormField>
              <FormField label="Service Fee (R)"><input type="number" value={form.serviceFee} onChange={e => setForm({...form, serviceFee: e.target.value})} style={inp} /></FormField>
              <FormField label="kWh Received"><input type="number" placeholder="e.g. 541.80" value={form.units} onChange={e => setForm({...form, units: e.target.value})} style={inp} /></FormField>
              <FormField label="Meter Balance (kWh)"><input type="number" placeholder="After top-up" value={form.balance} onChange={e => setForm({...form, balance: e.target.value})} style={inp} /></FormField>
            </div>
            <Button onClick={handleSubmit} size="sm">{editId ? 'Update' : 'Save'}</Button>
          </CardContent>
        </Card>
      )}

      {entries.length === 0 ? (
        <Empty title="No electricity data yet" desc="Start logging your prepaid top-ups." fields={['Date', 'Amount (R)', 'kWh received', 'Meter balance']} onAction={() => setShowForm(true)} actionLabel="Log First Top-up" />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Next top-up forecast */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Next Top-up Forecast</CardTitle></CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-mono text-primary">
                  ~{nextTopUpDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                </div>
                <div className="text-xs text-muted-foreground mt-1">At {DAILY_USAGE_NORMAL} kWh/day normal usage</div>
                <div className="text-xs text-amber-400 mt-1">Winter estimate: ~{Math.floor(latestBalance / DAILY_USAGE_WINTER)} days at {DAILY_USAGE_WINTER} kWh/day</div>
              </CardContent>
            </Card>
            {/* Buffer gauge */}
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Buffer Status</CardTitle></CardHeader>
              <CardContent><BufferGauge balance={Number(latestBalance)} /></CardContent>
            </Card>
          </div>

          {/* Monthly spend chart */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Monthly Spend Trend</CardTitle></CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                  <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `R${v.toLocaleString()}`} width={60} />
                    <ChartTooltip content={<ChartTooltipContent formatter={(v) => `R${Number(v).toLocaleString()}`} />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Bar dataKey="energy" stackId="a" fill="var(--color-energy)" radius={[0,0,0,0]} />
                    <Bar dataKey="fee"    stackId="a" fill="var(--color-fee)"    radius={[4,4,0,0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* Log table */}
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Purchase Log ({entries.length} entries)</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      {['Date','Total','Fee','Energy','kWh','R/kWh','Balance',''].map(h => (
                        <th key={h} className="text-left px-2 py-2 text-muted-foreground font-medium uppercase tracking-wide text-[10px]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...entries].reverse().map(e => {
                      const rate = e.units > 0 ? (Number(e.energy_value) / Number(e.units)).toFixed(2) : '—'
                      return (
                        <tr key={e.id} className="border-b border-border/10">
                          <td className="px-2 py-1.5 font-mono text-foreground">{e.date}</td>
                          <td className="px-2 py-1.5 font-mono text-primary">R{Number(e.amount).toLocaleString()}</td>
                          <td className="px-2 py-1.5 font-mono text-amber-400">R{e.service_fee || 0}</td>
                          <td className="px-2 py-1.5 font-mono text-foreground">R{Number(e.energy_value).toLocaleString()}</td>
                          <td className="px-2 py-1.5 font-mono text-foreground">{e.units}</td>
                          <td className="px-2 py-1.5 font-mono text-muted-foreground">{rate}</td>
                          <td className="px-2 py-1.5 font-mono text-foreground">{e.balance ?? '—'}</td>
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
