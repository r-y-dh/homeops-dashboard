import { useState, useRef } from 'react'
import { T } from '../lib/constants'
import { useMunicipal } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { Stat, FormField, SectionLabel, Empty, inp } from '../components/UI'

const EMPTY_FORM = { month: '', water: '', rates: '', refuse: '', sewerage: '', other: '', waterKL: '', waterDailyAvgKL: '', readingDays: '', meterStart: '', meterEnd: '' }

async function parsePDF(file) {
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
  const base64 = btoa(binary)

  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-municipal-pdf`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ pdf_base64: base64 }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to parse PDF')
  }
  return res.json()
}

export default function MunicipalPage() {
  const { entries, loading, add, remove } = useMunicipal()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pdfState, setPdfState] = useState('idle') // idle | parsing | error
  const [pdfError, setPdfError] = useState('')
  const fileRef = useRef()

  const handlePDF = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setPdfState('parsing')
    setPdfError('')
    try {
      const data = await parsePDF(file)
      setForm({
        month: data.month ?? '',
        water: data.water ?? '',
        rates: data.rates ?? '',
        refuse: data.refuse ?? '',
        sewerage: data.sewerage ?? '',
        other: data.other ?? '',
        waterKL: data.water_kl ?? '',
        waterDailyAvgKL: data.water_daily_avg_kl ?? '',
        readingDays: data.reading_days ?? '',
        meterStart: data.meter_start ?? '',
        meterEnd: data.meter_end ?? '',
      })
      setShowForm(true)
      setPdfState('idle')
    } catch (err) {
      setPdfError(err.message)
      setPdfState('error')
    }
    e.target.value = ''
  }

  const handleSubmit = async () => {
    if (!form.month) return
    await add(form)
    setForm(EMPTY_FORM)
    setShowForm(false)
  }

  if (loading) return <div style={{ color: T.textMuted, padding: 40 }}>Loading…</div>
  const latest = entries.length ? entries[entries.length - 1] : null

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: T.text }}>🏛 Municipal Account</h2>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>Water • Rates • Refuse • Sewerage</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePDF} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={pdfState === 'parsing'}
            style={{ background: T.cardAlt, color: T.cyan, border: `1px solid ${T.cyanDim}`, borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', opacity: pdfState === 'parsing' ? 0.6 : 1 }}
          >
            {pdfState === 'parsing' ? '⏳ Reading PDF…' : '📄 Upload PDF'}
          </button>
          <button
            onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM) }}
            style={{ background: showForm ? T.border : T.cyan, color: showForm ? T.text : T.bg, border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            {showForm ? 'Cancel' : '+ Add Month'}
          </button>
        </div>
      </div>

      {pdfState === 'error' && (
        <div style={{ background: T.redDim, border: `1px solid ${T.red}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: T.red }}>
          PDF parse error: {pdfError}
        </div>
      )}

      {showForm && (
        <div style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <FormField label="Month"><input type="month" value={form.month} onChange={e => setForm({...form, month: e.target.value})} style={inp} /></FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            {[['Water & Sewer','water'],['Rates','rates'],['Refuse','refuse'],['Sewerage (extra)','sewerage'],['Other','other']].map(([l,k]) => (
              <FormField key={k} label={`${l} (R)`}><input type="number" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} style={inp} /></FormField>
            ))}
          </div>
          <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 10, color: T.textDim, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Water meter</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr', gap: 10 }}>
              {[['kL Used','waterKL'],['Daily Avg kL','waterDailyAvgKL'],['Reading Days','readingDays'],['Meter Start','meterStart'],['Meter End','meterEnd']].map(([l,k]) => (
                <FormField key={k} label={l}><input type="number" value={form[k]} onChange={e => setForm({...form, [k]: e.target.value})} style={inp} /></FormField>
              ))}
            </div>
          </div>
          <button onClick={handleSubmit} style={{ marginTop: 12, background: T.cyan, color: T.bg, border: 'none', borderRadius: 7, padding: '8px 24px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
        </div>
      )}

      {entries.length === 0 ? (
        <Empty title="No municipal data yet" desc="Upload a COJ municipal PDF to auto-extract data, or add months manually." fields={['Water & sewer charges', 'Property rates', 'Refuse removal']} onAction={() => setShowForm(true)} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
            <Stat label="Latest Total" value={Number(latest.total).toLocaleString()} prefix="R" sub={latest.month} color={T.cyan} />
            <Stat label="Water & Sewer" value={Number(latest.water).toLocaleString()} prefix="R" />
            <Stat label="Rates" value={Number(latest.rates).toLocaleString()} prefix="R" />
            <Stat label="Refuse" value={Number(latest.refuse).toLocaleString()} prefix="R" />
          </div>
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
            <SectionLabel>History ({entries.length} months)</SectionLabel>
            <div style={{ maxHeight: 320, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                <thead><tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Month','Water','Rates','Refuse','kL','Daily Avg','Total'].map(h => <th key={h} style={{ textAlign: 'left', padding: '5px 6px', color: T.textDim, fontWeight: 500, fontSize: 9, textTransform: 'uppercase' }}>{h}</th>)}
                </tr></thead>
                <tbody>{[...entries].reverse().map(e => (
                  <tr key={e.id} style={{ borderBottom: `1px solid ${T.border}15` }}>
                    <td style={{ padding: '5px 6px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>{e.month}</td>
                    <td style={{ padding: '5px 6px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>R{Number(e.water).toLocaleString()}</td>
                    <td style={{ padding: '5px 6px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>R{Number(e.rates).toLocaleString()}</td>
                    <td style={{ padding: '5px 6px', color: T.text, fontFamily: "'JetBrains Mono', monospace" }}>R{Number(e.refuse).toLocaleString()}</td>
                    <td style={{ padding: '5px 6px', color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{e.water_kl ?? '—'}</td>
                    <td style={{ padding: '5px 6px', color: T.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>{e.water_daily_avg_kl ?? '—'}</td>
                    <td style={{ padding: '5px 6px', color: T.cyan, fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>R{Number(e.total).toLocaleString()}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
