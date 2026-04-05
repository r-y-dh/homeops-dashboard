import { useState } from 'react'
import { GasPump } from '@phosphor-icons/react'
import { T } from '../lib/constants'
import { useFuel } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { Stat, FormField, SectionLabel, Empty, inp } from '../components/UI'
import AddFileDropdown from '../components/AddFileDropdown'

export default function FuelPage() {
  const { entries, loading, add, update, remove } = useFuel()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ date: '', litres: '', cost: '', odometer: '', notes: '' })
  const [editId, setEditId] = useState(null)
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
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      const base64 = canvas.toDataURL('image/jpeg', 0.85).split(',')[1]
      resolve({ base64, mime_type: 'image/jpeg' })
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
      setForm({
        date:     d.date     || new Date().toISOString().slice(0, 10),
        litres:   d.litres   != null ? String(d.litres)   : '',
        cost:     d.cost     != null ? String(d.cost)     : '',
        odometer: d.odometer != null ? String(d.odometer) : '',
        notes:    '',
      })
      setEditId(null)
      setShowForm(true)
      setParseState('idle')
    } catch (err) {
      setParseError(err.message)
      setParseState('error')
    }
  }

  const handleSubmit = async () => {
    if (!form.date || !form.litres || !form.cost) return
    let result
    if (editId) {
      result = await update(editId, form)
      setEditId(null)
    } else {
      result = await add(form)
    }
    if (result?.error) {
      setParseError(result.error.message)
      return
    }
    setForm({ date: '', litres: '', cost: '', odometer: '', notes: '' })
    setShowForm(false)
  }

  const handleEdit = (e) => {
    setForm({
      date:     e.date,
      litres:   String(e.litres),
      cost:     String(e.cost),
      odometer: e.odometer != null ? String(e.odometer) : '',
      notes:    e.notes || '',
    })
    setEditId(e.id)
    setShowForm(true)
  }

  if (loading) return <div style={{ color: T.textMuted, padding: 40, textAlign: 'center' }}>Loading…</div>

  const totalCost   = entries.reduce((s, e) => s + Number(e.cost), 0)
  const totalLitres = entries.reduce((s, e) => s + Number(e.litres), 0)
  const avgPPL      = totalLitres > 0 ? (totalCost / totalLitres).toFixed(4) : '—'
  const latestOdo   = [...entries].reverse().find(e => e.odometer != null)?.odometer ?? null

  const monthly = {}
  entries.forEach(e => {
    const m = e.date.substring(0, 7)
    if (!monthly[m]) monthly[m] = { cost: 0, litres: 0 }
    monthly[m].cost   += Number(e.cost)
    monthly[m].litres += Number(e.litres)
  })
  const last6    = Object.entries(monthly).sort(([a],[b]) => a.localeCompare(b)).slice(-6)
  const maxCost  = Math.max(...last6.map(([,v]) => v.cost), 1)

  const livePPL = form.litres && form.cost && parseFloat(form.litres) > 0
    ? (parseFloat(form.cost) / parseFloat(form.litres)).toFixed(4)
    : null

  return (
    <div>
      {/* Sticky summary */}
      <div style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 10, padding: '20px 28px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: entries.length > 0 ? 16 : 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: T.text, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <GasPump size={20} weight="fill" /> Fuel Tracker
            </h2>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>Vehicle fill-ups &amp; fuel cost tracking</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <AddFileDropdown
              onFile={handleFile}
              loading={parseState === 'parsing'}
              label="Add receipt"
              accept="image/*"
            />
            <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm({ date: '', litres: '', cost: '', odometer: '', notes: '' }) }} style={{
              background: showForm ? T.border : T.cyan, color: showForm ? T.text : T.bg,
              border: 'none', borderRadius: 7, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>{showForm ? 'Cancel' : '+ Log Fill-up'}</button>
          </div>
        </div>

        {entries.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Stat label="Total Spend" value={totalCost.toLocaleString()} prefix="R" color={T.cyan} sub="All fill-ups" />
            <Stat label="Total Litres" value={totalLitres.toFixed(1)} sub="Litres pumped" color={T.text} />
            <Stat label="Avg Price/L" value={`R${avgPPL}`} sub="Across all fill-ups" color={T.amber} />
            {latestOdo != null && <Stat label="Odometer" value={Number(latestOdo).toLocaleString()} sub="Latest reading (km)" color={T.textMuted} />}
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div style={{ padding: '20px 28px' }}>
        {parseState === 'error' && (
          <div style={{ background: T.redDim, border: `1px solid ${T.red}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: T.red }}>
            Parse error: {parseError}
          </div>
        )}
        {showForm && (
          <div style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
              <FormField label="Date"><input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} style={inp} /></FormField>
              <FormField label="Litres"><input type="number" placeholder="e.g. 40.5" value={form.litres} onChange={e => setForm({...form, litres: e.target.value})} style={inp} /></FormField>
              <FormField label="Total Cost (R)"><input type="number" placeholder="e.g. 900" value={form.cost} onChange={e => setForm({...form, cost: e.target.value})} style={inp} /></FormField>
              <FormField label={`Price/L${livePPL ? ` — R${livePPL}` : ''}`}>
                <div style={{ ...inp, color: T.textDim, display: 'flex', alignItems: 'center' }}>
                  {livePPL ? `R${livePPL}` : 'Auto-calculated'}
                </div>
              </FormField>
              <FormField label="Odometer (km)"><input type="number" placeholder="Optional" value={form.odometer} onChange={e => setForm({...form, odometer: e.target.value})} style={inp} /></FormField>
            </div>
            <button onClick={handleSubmit} style={{ marginTop: 10, background: T.cyan, color: T.bg, border: 'none', borderRadius: 7, padding: '8px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {editId ? 'Update' : 'Save'}
            </button>
          </div>
        )}

        {entries.length === 0 ? (
          <Empty title="No fuel data yet" desc="Start logging your fill-ups to track spend and fuel price trends." fields={['Date', 'Litres', 'Total cost', 'Odometer']} onAction={() => setShowForm(true)} actionLabel="Log First Fill-up" />
        ) : (
          <>
            {last6.length > 0 && (
              <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 14 }}>
                <SectionLabel>Monthly Spend Trend</SectionLabel>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 90, marginTop: 8 }}>
                  {last6.map(([month, v], i) => {
                    const h = Math.max(6, (v.cost / maxCost) * 72)
                    return (
                      <div key={i} style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', height: 72, justifyContent: 'flex-end' }}>
                          <div title={`R${v.cost.toLocaleString()} • ${v.litres.toFixed(1)}L`} style={{ width: '70%', height: h, background: `linear-gradient(to top, ${T.amberDim}, ${T.amber})`, borderRadius: '3px 3px 0 0' }} />
                        </div>
                        <div style={{ fontSize: 10, color: T.textDim, marginTop: 4 }}>{month.substring(5)}/{month.substring(2,4)}</div>
                        <div style={{ fontSize: 10, color: T.textMuted }}>R{v.cost.toLocaleString()}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
              <SectionLabel>Fill-up Log ({entries.length} entries)</SectionLabel>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                      {['Date', 'Litres', 'Cost', 'R/L', 'Odometer', ''].map(h => (
                        <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: T.textDim, fontWeight: 500, fontSize: 10, textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[...entries].reverse().map((e) => {
                      const ppl = e.price_per_litre != null ? `R${Number(e.price_per_litre).toFixed(4)}` : '—'
                      return (
                        <tr key={e.id} style={{ borderBottom: `1px solid ${T.border}15` }}>
                          <td style={{ padding: '6px 8px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{e.date}</td>
                          <td style={{ padding: '6px 8px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{Number(e.litres).toFixed(2)}L</td>
                          <td style={{ padding: '6px 8px', color: T.cyan, fontFamily: "'JetBrains Mono', monospace" }}>R{Number(e.cost).toLocaleString()}</td>
                          <td style={{ padding: '6px 8px', color: T.amber, fontFamily: "'JetBrains Mono', monospace" }}>{ppl}</td>
                          <td style={{ padding: '6px 8px', color: e.odometer != null ? T.text : T.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{e.odometer != null ? `${Number(e.odometer).toLocaleString()} km` : '—'}</td>
                          <td style={{ padding: '6px 8px', textAlign: 'right' }}>
                            <span onClick={() => handleEdit(e)} style={{ cursor: 'pointer', color: T.textDim, marginRight: 8, fontSize: 11 }}>edit</span>
                            <span onClick={() => remove(e.id)} style={{ cursor: 'pointer', color: T.red, fontSize: 11 }}>×</span>
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
    </div>
  )
}
