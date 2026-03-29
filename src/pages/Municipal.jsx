import { useState, useRef } from 'react'
import { Buildings, FilePdf, CircleNotch } from '@phosphor-icons/react'
import { T } from '../lib/constants'
import { useMunicipal } from '../lib/hooks'
import { supabase } from '../lib/supabase'
import { Stat, FormField, SectionLabel, Empty, inp } from '../components/UI'

const EMPTY_FORM = {
  month: '', water: '', rates: '', refuse: '', sewerage: '', other: '',
  previousBalance: '', waterKL: '', waterDailyAvgKL: '', readingDays: '',
  meterStart: '', meterEnd: '', standSize: '', portion: '', valuation: '', region: '',
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to parse PDF')
  }
  return res.json()
}

const fmt = (v) => v != null && v !== '' ? `R${Number(v).toLocaleString()}` : '—'
const fmtN = (v) => v != null && v !== '' ? Number(v).toLocaleString() : '—'

// Table header cell
const TH = ({ children, style = {} }) => (
  <th style={{ textAlign: 'left', padding: '6px 8px', color: T.textDim, fontWeight: 500, fontSize: 10, textTransform: 'uppercase', whiteSpace: 'nowrap', ...style }}>{children}</th>
)
// Table data cell
const TD = ({ children, style = {} }) => (
  <td style={{ padding: '6px 8px', fontFamily: "'JetBrains Mono', monospace", fontSize: 12, ...style }}>{children}</td>
)

export default function MunicipalPage() {
  const { entries, loading, add, remove } = useMunicipal()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [pdfState, setPdfState] = useState('idle')
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
        month:           data.month           ?? '',
        water:           data.water           ?? '',
        rates:           data.rates           ?? '',
        refuse:          data.refuse          ?? '',
        sewerage:        data.sewerage        ?? '',
        other:           data.other           ?? '',
        previousBalance: data.previous_balance ?? '',
        waterKL:         data.water_kl        ?? '',
        waterDailyAvgKL: data.water_daily_avg_kl ?? '',
        readingDays:     data.reading_days    ?? '',
        meterStart:      data.meter_start     ?? '',
        meterEnd:        data.meter_end       ?? '',
        standSize:       data.stand_size      ?? '',
        portion:         data.portion         ?? '',
        valuation:       data.valuation       ?? '',
        region:          data.region          ?? '',
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

  const f = (k) => (e) => setForm({ ...form, [k]: e.target.value })

  if (loading) return <div style={{ color: T.textMuted, padding: 40 }}>Loading…</div>
  const latest = entries.length ? entries[entries.length - 1] : null

  // Property info from latest entry that has it
  const prop = [...entries].reverse().find(e => e.stand_size || e.region || e.valuation)

  // Missing months in past 12 months
  const missingMonths = (() => {
    const now = new Date()
    const present = new Set(entries.map(e => e.month))
    const missing = []
    for (let i = 1; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!present.has(key)) missing.unshift(key)
    }
    return missing
  })()

  // Water bg tint for table grouping
  const waterBg = 'rgba(34,211,238,0.04)'
  const waterBorder = `1px solid ${T.cyanDim}30`

  return (
    <div>
      {/* Sticky summary */}
      <div style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 10, padding: '20px 28px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: entries.length > 0 ? 16 : 0 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 20, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Buildings size={20} weight="fill" /> Municipal Account
            </h2>
            <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>Water • Rates • Refuse • Sewerage</div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={handlePDF} />
            <button onClick={() => fileRef.current?.click()} disabled={pdfState === 'parsing'}
              style={{ background: T.cardAlt, color: T.cyan, border: `1px solid ${T.cyanDim}`, borderRadius: 7, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: pdfState === 'parsing' ? 0.6 : 1 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {pdfState === 'parsing' ? <><CircleNotch size={14} style={{ animation: 'spin 1s linear infinite' }} /> Reading PDF…</> : <><FilePdf size={14} /> Upload PDF</>}
              </span>
            </button>
            <button onClick={() => { setShowForm(!showForm); setForm(EMPTY_FORM) }}
              style={{ background: showForm ? T.border : T.cyan, color: showForm ? T.text : T.bg, border: 'none', borderRadius: 7, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {showForm ? 'Cancel' : '+ Add Month'}
            </button>
          </div>
        </div>

        {entries.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {latest.previous_balance != null && (
              <Stat label="Prev Balance" value={Number(latest.previous_balance).toLocaleString()} prefix="R"
                color={Number(latest.previous_balance) < 0 ? T.green : Number(latest.previous_balance) > 0 ? T.amber : T.textMuted}
                sub={latest.month} />
            )}
            <Stat label="Current Charges" value={Number(latest.current_charges ?? (Number(latest.rates||0)+Number(latest.water||0)+Number(latest.refuse||0)+Number(latest.sewerage||0)+Number(latest.other||0))).toLocaleString()} prefix="R" sub="This period" />
            <Stat label="Total Due" value={Number(latest.total).toLocaleString()} prefix="R" color={T.cyan} sub={latest.month} />
            <Stat label="Water & Sewer" value={Number(latest.water).toLocaleString()} prefix="R" color={T.cyan} />
            <Stat label="Rates" value={Number(latest.rates).toLocaleString()} prefix="R" />
            <Stat label="Refuse" value={Number(latest.refuse).toLocaleString()} prefix="R" />
          </div>
        )}
      </div>

      {/* Scrollable body */}
      <div style={{ padding: '16px 28px' }}>
        {/* Property info strip */}
        {prop && (
          <div style={{ display: 'flex', gap: 20, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 16px', marginBottom: 12, flexWrap: 'wrap' }}>
            {[['Stand Size', prop.stand_size ? `${Number(prop.stand_size).toLocaleString()} m²` : null],
              ['Portion',    prop.portion],
              ['Valuation',  prop.valuation ? `R${Number(prop.valuation).toLocaleString()}` : null],
              ['Region',     prop.region],
            ].map(([label, val]) => val ? (
              <div key={label}>
                <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: T.text, marginTop: 1 }}>{val}</div>
              </div>
            ) : null)}
          </div>
        )}

        {/* Missing months */}
        {missingMonths.length > 0 && (
          <div style={{ background: T.cardAlt, border: `1px solid ${T.amberDim}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.amber, marginBottom: 6 }}>
              Missing statements — {missingMonths.length} month{missingMonths.length > 1 ? 's' : ''} in the past year
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {missingMonths.map(m => (
                <span key={m} onClick={() => { setForm({ ...EMPTY_FORM, month: m }); setShowForm(true) }}
                  style={{ fontSize: 12, color: T.amber, background: `${T.amber}18`, border: `1px solid ${T.amberDim}`, borderRadius: 5, padding: '3px 8px', cursor: 'pointer', fontFamily: "'JetBrains Mono', monospace" }}>
                  {m}
                </span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: T.textDim, marginTop: 6 }}>Click a month to add it, or upload its PDF above.</div>
          </div>
        )}

        {/* PDF error */}
        {pdfState === 'error' && (
          <div style={{ background: T.redDim, border: `1px solid ${T.red}`, borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 13, color: T.red }}>
            PDF parse error: {pdfError}
          </div>
        )}

        {/* Add/edit form */}
        {showForm && (
          <div style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16, marginBottom: 16 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 10 }}>
              <FormField label="Month"><input type="month" value={form.month} onChange={f('month')} style={inp} /></FormField>
              <FormField label="Previous Account Balance (R)"><input type="number" value={form.previousBalance} onChange={f('previousBalance')} style={inp} /></FormField>
            </div>

            <div style={{ fontSize: 11, color: T.cyan, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Water & Sanitation</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 10 }}>
              {[['Water & Sanitation (R)','water'],['Sewerage (R)','sewerage'],['kL Used','waterKL'],['Daily Avg kL','waterDailyAvgKL'],['Reading Days','readingDays']].map(([l,k]) => (
                <FormField key={k} label={l}><input type="number" value={form[k]} onChange={f(k)} style={inp} /></FormField>
              ))}
            </div>

            <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Fixed Charges</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 10 }}>
              {[['Rates (R)','rates'],['Refuse (R)','refuse'],['Other (R)','other']].map(([l,k]) => (
                <FormField key={k} label={l}><input type="number" value={form[k]} onChange={f(k)} style={inp} /></FormField>
              ))}
            </div>

            <div style={{ fontSize: 11, color: T.textDim, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>Property Details</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10, marginBottom: 12 }}>
              {[['Stand Size (m²)','standSize'],['Portion','portion'],['Valuation (R)','valuation'],['Region','region']].map(([l,k]) => (
                <FormField key={k} label={l}>
                  <input type={['standSize','valuation'].includes(k) ? 'number' : 'text'} value={form[k]} onChange={f(k)} style={inp} />
                </FormField>
              ))}
            </div>

            <button onClick={handleSubmit} style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 7, padding: '8px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save</button>
          </div>
        )}

        {entries.length === 0 ? (
          <Empty title="No municipal data yet" desc="Upload a COJ municipal PDF to auto-extract data, or add months manually." fields={['Water & sewer charges', 'Property rates', 'Refuse removal']} onAction={() => setShowForm(true)} />
        ) : (
          <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
            <SectionLabel>History ({entries.length} months)</SectionLabel>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  {/* Group row */}
                  <tr style={{ borderBottom: `1px solid ${T.border}20` }}>
                    <th style={{ padding: '4px 8px' }} />
                    <th colSpan={4} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, color: T.cyan, textAlign: 'left', background: waterBg, borderLeft: waterBorder, borderTop: waterBorder, borderRight: waterBorder }}>
                      WATER &amp; SANITATION
                    </th>
                    <th colSpan={2} style={{ padding: '4px 8px', fontSize: 10, fontWeight: 600, color: T.textDim, textAlign: 'left' }}>
                      FIXED
                    </th>
                    <th colSpan={3} style={{ padding: '4px 8px' }} />
                  </tr>
                  {/* Column row */}
                  <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                    <TH>Month</TH>
                    <TH style={{ background: waterBg, borderLeft: waterBorder }}>Water</TH>
                    <TH style={{ background: waterBg }}>Sewer</TH>
                    <TH style={{ background: waterBg }}>kL</TH>
                    <TH style={{ background: waterBg, borderRight: waterBorder }}>Daily Avg</TH>
                    <TH>Rates</TH>
                    <TH>Refuse</TH>
                    <TH>Current</TH>
                    <TH>Prev Bal</TH>
                    <TH>Total Due</TH>
                    <TH></TH>
                  </tr>
                </thead>
                <tbody>
                  {[...entries].reverse().map(e => {
                    const current = e.current_charges ?? (Number(e.rates||0)+Number(e.water||0)+Number(e.refuse||0)+Number(e.sewerage||0)+Number(e.other||0))
                    const prevBal = e.previous_balance
                    return (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${T.border}15` }}>
                        <TD style={{ color: T.text }}>{e.month}</TD>
                        <TD style={{ color: T.cyan, background: waterBg, borderLeft: waterBorder }}>{fmt(e.water)}</TD>
                        <TD style={{ color: Number(e.sewerage) > 0 ? T.text : T.textDim, background: waterBg }}>{Number(e.sewerage) > 0 ? fmt(e.sewerage) : '—'}</TD>
                        <TD style={{ color: T.textMuted, background: waterBg }}>{fmtN(e.water_kl)}</TD>
                        <TD style={{ color: T.textMuted, background: waterBg, borderRight: waterBorder }}>{e.water_daily_avg_kl ? Number(e.water_daily_avg_kl).toFixed(3) : '—'}</TD>
                        <TD style={{ color: T.text }}>{fmt(e.rates)}</TD>
                        <TD style={{ color: T.text }}>{fmt(e.refuse)}</TD>
                        <TD style={{ color: T.text }}>{fmt(current)}</TD>
                        <TD style={{ color: prevBal == null ? T.textDim : Number(prevBal) < 0 ? T.green : Number(prevBal) > 0 ? T.amber : T.textMuted }}>
                          {prevBal != null ? fmt(prevBal) : '—'}
                        </TD>
                        <TD style={{ color: T.cyan, fontWeight: 600 }}>{fmt(e.total)}</TD>
                        <TD style={{ textAlign: 'right' }}>
                          <span onClick={() => remove(e.id)} style={{ cursor: 'pointer', color: T.red, fontSize: 12 }}>×</span>
                        </TD>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
