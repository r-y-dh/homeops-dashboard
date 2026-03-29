import { useState } from 'react'
import { Lightning } from '@phosphor-icons/react'
import { T, WINTER_TARGETS, DAILY_USAGE_NORMAL, DAILY_USAGE_WINTER } from '../lib/constants'
import { useElectricity } from '../lib/hooks'
import { Stat, FormField, SectionLabel, Empty, inp } from '../components/UI'
import BufferGauge from '../components/BufferGauge'

export default function ElectricityPage() {
  const { entries, loading, add, update, remove } = useElectricity()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '', amount: '', units: '', balance: '', serviceFee: '200' })
  const [editId, setEditId] = useState(null)

  const handleSubmit = async () => {
    if (!form.date || !form.amount) return
    if (editId) {
      await update(editId, form)
      setEditId(null)
    } else {
      await add(form)
    }
    setForm({ date: '', amount: '', units: '', balance: '', serviceFee: '200' })
    setShowForm(false)
  }

  const handleEdit = (e) => {
    setForm({ date: e.date, amount: String(e.amount), units: String(e.units), balance: e.balance !== null ? String(e.balance) : '', serviceFee: String(e.service_fee || 200) })
    setEditId(e.id)
    setShowForm(true)
  }

  if (loading) return <div style={{ color: T.textMuted, padding: 40, textAlign: 'center' }}>Loading…</div>

  const totalSpend = entries.reduce((s, e) => s + Number(e.amount), 0)
  const totalFees = entries.reduce((s, e) => s + Number(e.service_fee || 0), 0)
  const totalEnergy = entries.reduce((s, e) => s + Number(e.energy_value || 0), 0)
  const totalUnits = entries.reduce((s, e) => s + Number(e.units || 0), 0)
  const avgEffRate = totalUnits > 0 ? (totalEnergy / totalUnits).toFixed(2) : '—'
  const avgTrueRate = totalUnits > 0 ? (totalSpend / totalUnits).toFixed(2) : '—'
  const latestBalance = [...entries].reverse().find(e => e.balance !== null)?.balance || 0
  const daysRemaining = latestBalance > 0 ? Math.floor(latestBalance / DAILY_USAGE_NORMAL) : 0
  const nextTopUpDate = new Date()
  nextTopUpDate.setDate(nextTopUpDate.getDate() + daysRemaining)
  const feePct = totalSpend > 0 ? ((totalFees / totalSpend) * 100).toFixed(1) : 0

  const monthly = {}
  entries.forEach(e => {
    const m = e.date.substring(0, 7)
    if (!monthly[m]) monthly[m] = { spend: 0, fees: 0, units: 0, energy: 0 }
    monthly[m].spend += Number(e.amount)
    monthly[m].fees += Number(e.service_fee || 0)
    monthly[m].units += Number(e.units)
    monthly[m].energy += Number(e.energy_value || 0)
  })
  const last6 = Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b)).slice(-6)
  const maxSpend = Math.max(...last6.map(([,v]) => v.spend), 1)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><Lightning size={18} weight="fill" /> Electricity Tracker</h2>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>City Power Johannesburg • Prepaid • Meter #14288734024</div>
        </div>
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ date: '', amount: '', units: '', balance: '', serviceFee: '200' }) }} style={{
          background: showForm ? T.border : T.cyan, color: showForm ? T.text : T.bg,
          border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer',
        }}>{showForm ? 'Cancel' : '+ Log Top-up'}</button>
      </div>

      {showForm && (
        <div style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <FormField label="Date"><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inp} /></FormField>
            <FormField label="Total Amount (R)"><input type="number" placeholder="e.g. 2000" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} style={inp} /></FormField>
            <FormField label="Service Fee (R)"><input type="number" value={form.serviceFee} onChange={e => setForm({...form, serviceFee: e.target.value})} style={inp} /></FormField>
            <FormField label="kWh Received"><input type="number" placeholder="e.g. 541.80" value={form.units} onChange={e => setForm({...form, units: e.target.value})} style={inp} /></FormField>
            <FormField label="Meter Balance (kWh)"><input type="number" placeholder="After top-up" value={form.balance} onChange={e => setForm({...form, balance: e.target.value})} style={inp} /></FormField>
          </div>
          <button onClick={handleSubmit} style={{ marginTop: 10, background: T.cyan, color: T.bg, border: 'none', borderRadius: 7, padding: '8px 24px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {editId ? 'Update' : 'Save'}
          </button>
        </div>
      )}

      {entries.length === 0 ? (
        <Empty title="No electricity data yet" desc="Start logging your prepaid top-ups." fields={['Date', 'Amount (R)', 'kWh received', 'Meter balance']} onAction={() => setShowForm(true)} actionLabel="Log First Top-up" />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <Stat label="Current Balance" value={`${Number(latestBalance).toFixed(0)}`} color={latestBalance < WINTER_TARGETS.min ? T.red : T.green} sub={`~${daysRemaining} days remaining`} />
            <Stat label="Effective Rate" value={`R${avgEffRate}`} sub="Per kWh (excl. fee)" color={T.cyan} />
            <Stat label="True Rate" value={`R${avgTrueRate}`} sub="Per kWh (incl. fee)" color={T.amber} />
            <Stat label="Fee Drag" value={`${feePct}%`} sub={`R${totalFees.toLocaleString()} total`} color={parseFloat(feePct) > 10 ? T.red : T.textMuted} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
              <SectionLabel>Next Top-up Forecast</SectionLabel>
              <div style={{ fontSize: 18, fontWeight: 700, color: T.cyan, fontFamily: "'JetBrains Mono', monospace" }}>
                ~{nextTopUpDate.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
              </div>
              <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>At {DAILY_USAGE_NORMAL} kWh/day normal</div>
              <div style={{ fontSize: 11, color: T.amber, marginTop: 2 }}>Winter: ~{Math.floor(latestBalance / DAILY_USAGE_WINTER)} days</div>
            </div>
            <BufferGauge balance={Number(latestBalance)} />
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
            <SectionLabel>Monthly Spend Trend</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, marginTop: 8 }}>
              {last6.map(([month, v], i) => {
                const h = Math.max(6, (v.spend / maxSpend) * 72)
                const feeH = Math.max(1, (v.fees / maxSpend) * 72)
                return (
                  <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 72, justifyContent: 'flex-end' }}>
                      <div title={`Fees: R${v.fees}`} style={{ width: '70%', height: feeH, background: T.amber, borderRadius: '3px 3px 0 0', opacity: 0.7 }} />
                      <div title={`Energy: R${v.energy}`} style={{ width: '70%', height: h - feeH, background: `linear-gradient(to top, ${T.cyanDim}, ${T.cyan})`, borderRadius: '0 0 3px 3px' }} />
                    </div>
                    <div style={{ fontSize: 9, color: T.textDim, marginTop: 4 }}>{month.substring(5)}/{month.substring(2,4)}</div>
                    <div style={{ fontSize: 9, color: T.textMuted }}>R{v.spend.toLocaleString()}</div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 9, color: T.textDim }}>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, background: T.cyan, borderRadius: 2, marginRight: 4 }} />Energy</span>
              <span><span style={{ display: 'inline-block', width: 8, height: 8, background: T.amber, borderRadius: 2, marginRight: 4 }} />Service Fee</span>
            </div>
          </div>

          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
            <SectionLabel>Purchase Log ({entries.length} entries)</SectionLabel>
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    {['Date', 'Total', 'Fee', 'Energy', 'kWh', 'R/kWh', 'Balance', ''].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '5px 6px', color: T.textDim, fontWeight: 500, fontSize: 9, textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().map((e) => {
                    const rate = e.units > 0 ? (Number(e.energy_value) / Number(e.units)).toFixed(2) : '—'
                    return (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${T.border}15` }}>
                        <td style={{ padding: '5px 6px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{e.date}</td>
                        <td style={{ padding: '5px 6px', color: T.cyan, fontFamily: "'JetBrains Mono', monospace" }}>R{Number(e.amount).toLocaleString()}</td>
                        <td style={{ padding: '5px 6px', color: Number(e.service_fee) > 0 ? T.amber : T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>R{e.service_fee || 0}</td>
                        <td style={{ padding: '5px 6px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>R{Number(e.energy_value).toLocaleString()}</td>
                        <td style={{ padding: '5px 6px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{e.units}</td>
                        <td style={{ padding: '5px 6px', color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{rate}</td>
                        <td style={{ padding: '5px 6px', color: e.balance ? T.text : T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{e.balance ?? '—'}</td>
                        <td style={{ padding: '5px 6px', textAlign: 'right' }}>
                          <span onClick={() => handleEdit(e)} style={{ cursor: 'pointer', color: T.textDim, marginRight: 6, fontSize: 10 }}>edit</span>
                          <span onClick={() => remove(e.id)} style={{ cursor: 'pointer', color: T.red, fontSize: 10 }}>×</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
