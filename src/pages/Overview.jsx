import { useState } from 'react'
import { SquaresFour } from '@phosphor-icons/react'
import { T } from '../lib/constants'
import { useElectricity, useMunicipal, useFuel, useHouseholdConfig, useBudgetMonth } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { Stat, SectionLabel } from '../components/UI'
import BufferGauge from '../components/BufferGauge'
import AddFileDropdown from '../components/AddFileDropdown'

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
  const [uploadState, setUploadState] = useState('idle') // idle | parsing | success | error
  const [uploadMsg, setUploadMsg]   = useState('')

  const handleFile = async (file) => {
    setUploadState('parsing')
    setUploadMsg('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ image_base64: base64, mime_type: file.type }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Failed to parse')
      const result = await res.json()
      const d = result.data || result

      if (result.type === 'electricity_topup') {
        const { error } = await addElec({
          date:       d.date || new Date().toISOString().slice(0, 10),
          amount:     d.amount     ?? 0,
          serviceFee: d.service_fee ?? 200,
          units:      d.units      ?? 0,
          balance:    '',
        })
        if (error) throw new Error(error.message)
        setUploadMsg('Electricity top-up saved.')
      } else if (result.type === 'municipal' || result.type === 'dab_dashboard') {
        const waterKl = d.water_kl
        const { error } = await addMuni({
          month:           d.month || d.current_month || '',
          water:           d.water           ?? 0,
          rates:           d.rates           ?? 0,
          refuse:          d.refuse          ?? 0,
          sewerage:        d.sewerage        ?? 0,
          other:           d.other           ?? 0,
          previousBalance: d.previous_balance ?? '',
          waterKL:         waterKl            ?? '',
          waterDailyAvgKL: d.water_daily_avg_kl ?? '',
          readingDays:     d.reading_days    ?? '',
          meterStart:      '', meterEnd: '',
          standSize: '', portion: '', valuation: '', region: '',
        })
        if (error) throw new Error(error.message)
        setUploadMsg('Municipal data saved.')
      } else if (result.type === 'fuel_receipt') {
        const { error } = await addFuel({
          date:     d.date || new Date().toISOString().slice(0, 10),
          litres:   d.litres   ?? 0,
          cost:     d.cost     ?? 0,
          odometer: d.odometer ?? '',
          notes:    '',
        })
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

  if (loading) return <div style={{ color: T.textMuted, padding: 40 }}>Loading…</div>

  const elecMonth = elec.filter(e => e.date.startsWith(thisMonth))
  const elecSpend = elecMonth.reduce((s,e) => s + Number(e.amount), 0)
  const latestBalance = [...elec].reverse().find(e => e.balance !== null)?.balance || 0
  const muniLatest = muni.length ? muni[muni.length-1] : null
  const muniTotal = muniLatest ? Number(muniLatest.total) : 0
  const fuelMonth = fuel.filter(e => e.date.startsWith(thisMonth))
  const fuelSpend = fuelMonth.reduce((s, e) => s + Number(e.cost), 0)
  const bondAmt = bond?.repayment ? parseFloat(bond.repayment) : 0
  const medAmt = medical?.premium ? parseFloat(medical.premium) : 0
  const insAmt = insurance?.totalPremium ? parseFloat(insurance.totalPremium) : 0
  const totalMonthly = elecSpend + muniTotal + fuelSpend + bondAmt + medAmt + insAmt
  const fixedCosts = bondAmt + medAmt + insAmt
  const variableCosts = elecSpend + muniTotal + fuelSpend

  const modules = [
    { name: 'Electricity', active: elec.length > 0, value: elecSpend ? `R${elecSpend.toLocaleString()}` : 'Active' },
    { name: 'Municipal', active: muni.length > 0, value: muniTotal ? `R${muniTotal.toLocaleString()}` : null },
    { name: 'Fuel', active: fuel.length > 0, value: fuelSpend ? `R${fuelSpend.toLocaleString()}` : null },
    { name: 'Bond', active: !!bond, value: bondAmt ? `R${bondAmt.toLocaleString()}` : null },
    { name: 'Medical Aid', active: !!medical, value: medAmt ? `R${medAmt.toLocaleString()}` : null },
    { name: 'Insurance', active: !!insurance, value: insAmt ? `R${insAmt.toLocaleString()}` : null },
    { name: 'Budget', active: totalRemaining != null, value: totalRemaining != null ? `R${totalRemaining.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} left` : null },
    { name: 'Solar', active: false, value: null },
  ]
  const populated = modules.filter(m => m.active).length

  return (
    <div>
      {/* Sticky summary */}
      <div style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 10, padding: '20px 28px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <SquaresFour size={20} weight="fill" /> Home OPS Command Centre
            </h2>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>Riyadh Gordon • Johannesburg • {populated}/7 modules active</div>
          </div>
          <AddFileDropdown
            onFile={handleFile}
            loading={uploadState === 'parsing'}
            label="Add file or photo"
            accept="image/*,application/pdf"
          />
        </div>
        {(uploadState === 'success' || uploadState === 'error') && (
          <div style={{
            marginBottom: 12, padding: '8px 14px', borderRadius: 8, fontSize: 13,
            background: uploadState === 'success' ? `${T.green}18` : T.redDim,
            border: `1px solid ${uploadState === 'success' ? T.green : T.red}`,
            color: uploadState === 'success' ? T.green : T.red,
          }}>
            {uploadMsg}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat label="Total Monthly" value={totalMonthly > 0 ? totalMonthly.toLocaleString() : '—'} prefix="R" color={T.cyan} sub="Known costs only" />
          <Stat label="Fixed" value={fixedCosts > 0 ? fixedCosts.toLocaleString() : '—'} prefix="R" sub="Bond + Medical + Insurance" />
          <Stat label="Variable" value={variableCosts > 0 ? variableCosts.toLocaleString() : '—'} prefix="R" sub="Electricity + Municipal" />
          {totalRemaining != null && <Stat label="Remaining" value={totalRemaining.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} prefix="R" color={totalRemaining >= 0 ? T.green : T.red} sub="After debit orders & spend" />}
        </div>
      </div>

      {/* Scrollable body */}
      <div style={{ padding: '20px 28px' }}>
        {totalMonthly > 0 && (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <SectionLabel>Cost Split</SectionLabel>
            <div style={{ display: 'flex', height: 24, borderRadius: 6, overflow: 'hidden' }}>
              {fixedCosts > 0 && <div style={{ width: `${(fixedCosts/totalMonthly)*100}%`, background: T.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.bg, fontWeight: 600 }}>Fixed {Math.round((fixedCosts/totalMonthly)*100)}%</div>}
              {variableCosts > 0 && <div style={{ width: `${(variableCosts/totalMonthly)*100}%`, background: T.amber, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: T.bg, fontWeight: 600 }}>Variable {Math.round((variableCosts/totalMonthly)*100)}%</div>}
            </div>
          </div>
        )}

        {latestBalance > 0 && <div style={{ marginBottom: 14 }}><BufferGauge balance={Number(latestBalance)} /></div>}

        <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
          <SectionLabel>Module Status</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 8 }}>
            {modules.map(m => (
              <div key={m.name} style={{
                background: m.active ? T.cyanGlow : T.bg,
                border: `1px solid ${m.active ? T.cyanDim : T.border}`,
                borderRadius: 8, padding: 12,
              }}>
                <div style={{ fontSize: 11, color: m.active ? T.cyan : T.textDim, fontWeight: 600 }}>{m.name}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: m.active ? T.text : T.textDim, fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
                  {m.value || (m.active ? 'Active' : 'Empty')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
