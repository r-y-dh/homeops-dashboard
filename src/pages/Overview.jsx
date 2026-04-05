import { useState } from 'react'
import { SquaresFour } from '@phosphor-icons/react'
import { T } from '../lib/constants'
import { useElectricity, useMunicipal, useFuel, useHouseholdConfig, useBudgetMonth } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { SectionLabel } from '../components/UI'
import BufferGauge from '../components/BufferGauge'
import AddFileDropdown from '../components/AddFileDropdown'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts'

const COST_COLORS = {
  Electricity: 'var(--color-electricity)',
  Municipal:   'var(--color-municipal)',
  Fuel:        'var(--color-fuel)',
  Bond:        'var(--color-bond)',
  Medical:     'var(--color-medical)',
  Insurance:   'var(--color-insurance)',
}

const chartConfig = {
  electricity: { label: 'Electricity', color: 'oklch(0.79 0.13 210)' },
  municipal:   { label: 'Municipal',   color: 'oklch(0.73 0.17 82)'  },
  fuel:        { label: 'Fuel',        color: 'oklch(0.69 0.16 163)' },
  bond:        { label: 'Bond',        color: 'oklch(0.60 0.22 25)'  },
  medical:     { label: 'Medical',     color: 'oklch(0.59 0.025 250)'},
  insurance:   { label: 'Insurance',   color: 'oklch(0.51 0.10 210)' },
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{label}</div>
        <div className={`text-2xl font-bold font-mono ${highlight ? 'text-primary' : 'text-foreground'}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  )
}

export default function OverviewPage() {
  const { entries: elec, loading: l1, add: addElec } = useElectricity()
  const { entries: muni, loading: l2, add: addMuni } = useMunicipal()
  const { entries: fuel, loading: l6, add: addFuel } = useFuel()
  const { data: bond, loading: l3 } = useHouseholdConfig('bond')
  const { data: medical, loading: l4 } = useHouseholdConfig('medical')
  const { data: insurance, loading: l5 } = useHouseholdConfig('insurance')
  const thisMonth = `${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2,'0')}`
  const { totalRemaining, loading: l7 } = useBudgetMonth(thisMonth)

  const loading = l1 || l2 || l3 || l4 || l5 || l6 || l7
  const [uploadState, setUploadState] = useState('idle')
  const [uploadMsg, setUploadMsg] = useState('')

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
    setUploadState('parsing')
    setUploadMsg('')
    try {
      const isImage = file.type.startsWith('image/')
      let base64, mime_type
      if (isImage) {
        ;({ base64, mime_type } = await compressImage(file))
      } else {
        const arrayBuffer = await file.arrayBuffer()
        const bytes = new Uint8Array(arrayBuffer)
        let binary = ''
        for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
        base64 = btoa(binary)
        mime_type = file.type
      }
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ image_base64: base64, mime_type }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to parse')
      const result = await res.json()
      const d = result.data || result

      if (result.type === 'electricity_topup') {
        const { error } = await addElec({ date: d.date || new Date().toISOString().slice(0,10), amount: d.amount ?? 0, serviceFee: d.service_fee ?? 200, units: d.units ?? 0, balance: '' })
        if (error) throw new Error(error.message)
        setUploadMsg('Electricity top-up saved.')
      } else if (result.type === 'municipal' || result.type === 'dab_dashboard') {
        const { error } = await addMuni({ month: d.month || d.current_month || '', water: d.water ?? 0, rates: d.rates ?? 0, refuse: d.refuse ?? 0, sewerage: d.sewerage ?? 0, other: d.other ?? 0, previousBalance: d.previous_balance ?? '', waterKL: d.water_kl ?? '', waterDailyAvgKL: d.water_daily_avg_kl ?? '', readingDays: d.reading_days ?? '', meterStart: '', meterEnd: '', standSize: '', portion: '', valuation: '', region: '' })
        if (error) throw new Error(error.message)
        setUploadMsg('Municipal data saved.')
      } else if (result.type === 'fuel_receipt') {
        const { error } = await addFuel({ date: d.date || new Date().toISOString().slice(0,10), litres: d.litres ?? 0, cost: d.cost ?? 0, odometer: d.odometer ?? '', notes: '' })
        if (error) throw new Error(error.message)
        setUploadMsg('Fuel fill-up saved.')
      } else {
        setUploadMsg('Could not identify data type — try uploading on the specific page.')
        setUploadState('error')
        return
      }
      setUploadState('success')
      setTimeout(() => setUploadState('idle'), 4000)
    } catch (err) {
      setUploadMsg(err.message)
      setUploadState('error')
    }
  }

  if (loading) return <div className="p-10 text-muted-foreground text-center">Loading…</div>

  const elecSpend     = elec.filter(e => e.date.startsWith(thisMonth)).reduce((s,e) => s + Number(e.amount), 0)
  const latestBalance = [...elec].reverse().find(e => e.balance !== null)?.balance || 0
  const muniLatest    = muni.length ? muni[muni.length-1] : null
  const muniTotal     = muniLatest ? Number(muniLatest.total) : 0
  const fuelSpend     = fuel.filter(e => e.date.startsWith(thisMonth)).reduce((s,e) => s + Number(e.cost), 0)
  const bondAmt       = bond?.repayment    ? parseFloat(bond.repayment)       : 0
  const medAmt        = medical?.premium   ? parseFloat(medical.premium)      : 0
  const insAmt        = insurance?.totalPremium ? parseFloat(insurance.totalPremium) : 0
  const totalMonthly  = elecSpend + muniTotal + fuelSpend + bondAmt + medAmt + insAmt
  const fixedCosts    = bondAmt + medAmt + insAmt
  const variableCosts = elecSpend + muniTotal + fuelSpend

  const pieData = [
    { name: 'electricity', label: 'Electricity', value: elecSpend  },
    { name: 'municipal',   label: 'Municipal',   value: muniTotal  },
    { name: 'fuel',        label: 'Fuel',        value: fuelSpend  },
    { name: 'bond',        label: 'Bond',        value: bondAmt    },
    { name: 'medical',     label: 'Medical',     value: medAmt     },
    { name: 'insurance',   label: 'Insurance',   value: insAmt     },
  ].filter(d => d.value > 0)

  const modules = [
    { name: 'Electricity', active: elec.length > 0,       value: elecSpend ? `R${elecSpend.toLocaleString()}` : 'Active' },
    { name: 'Municipal',   active: muni.length > 0,       value: muniTotal ? `R${muniTotal.toLocaleString()}` : null },
    { name: 'Fuel',        active: fuel.length > 0,       value: fuelSpend ? `R${fuelSpend.toLocaleString()}` : null },
    { name: 'Bond',        active: !!bond,                value: bondAmt   ? `R${bondAmt.toLocaleString()}` : null },
    { name: 'Medical Aid', active: !!medical,             value: medAmt    ? `R${medAmt.toLocaleString()}` : null },
    { name: 'Insurance',   active: !!insurance,           value: insAmt    ? `R${insAmt.toLocaleString()}` : null },
    { name: 'Budget',      active: totalRemaining != null, value: totalRemaining != null ? `R${totalRemaining.toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2})} left` : null },
    { name: 'Solar',       active: false,                  value: null },
  ]
  const populated = modules.filter(m => m.active).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <SquaresFour size={20} weight="fill" className="text-primary" />
            Command Centre
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Riyadh Gordon • Johannesburg • {populated}/7 modules active</p>
        </div>
        <AddFileDropdown onFile={handleFile} loading={uploadState === 'parsing'} label="Add file or photo" accept="image/*,application/pdf" />
      </div>

      {(uploadState === 'success' || uploadState === 'error') && (
        <div className={`px-4 py-2 rounded-lg text-sm border ${uploadState === 'success' ? 'border-green-800 bg-green-950 text-green-400' : 'border-red-800 bg-red-950 text-red-400'}`}>
          {uploadMsg}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Monthly"  value={totalMonthly > 0 ? `R${totalMonthly.toLocaleString()}` : '—'} sub="Known costs only" highlight />
        <StatCard label="Fixed"          value={fixedCosts > 0 ? `R${fixedCosts.toLocaleString()}` : '—'} sub="Bond + Medical + Insurance" />
        <StatCard label="Variable"       value={variableCosts > 0 ? `R${variableCosts.toLocaleString()}` : '—'} sub="Electricity + Municipal + Fuel" />
        {totalRemaining != null && (
          <StatCard label="Remaining" value={`R${totalRemaining.toLocaleString('en-ZA',{minimumFractionDigits:2,maximumFractionDigits:2})}`} sub="After debit orders & spend" />
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cost breakdown donut */}
        {pieData.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Cost Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[200px]">
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="label" cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={2}>
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={chartConfig[entry.name]?.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent nameKey="label" formatter={(v) => `R${Number(v).toLocaleString()}`} />} />
                </PieChart>
              </ChartContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                {pieData.map(d => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: chartConfig[d.name]?.color }} />
                    {d.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Buffer gauge */}
        {latestBalance > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Electricity Buffer</CardTitle>
            </CardHeader>
            <CardContent>
              <BufferGauge balance={Number(latestBalance)} />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Module status */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Module Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {modules.map(m => (
              <div key={m.name} className={`rounded-lg p-3 border ${m.active ? 'border-primary/30 bg-primary/5' : 'border-border bg-background'}`}>
                <div className={`text-xs font-semibold mb-1 ${m.active ? 'text-primary' : 'text-muted-foreground'}`}>{m.name}</div>
                <div className={`text-sm font-bold font-mono ${m.active ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {m.value || (m.active ? 'Active' : 'Empty')}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
