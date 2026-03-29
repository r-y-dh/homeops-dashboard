import { useState } from 'react'
import { T } from '../lib/constants'
import { useHouseholdConfig } from '../lib/hooks'
import { FormField, Empty, inp } from '../components/UI'

export default function ConfigPage({ category, title, icon, subtitle, fields, emptyDesc }) {
  const { data, loading, save } = useHouseholdConfig(category)
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({})

  const startEdit = () => { setForm(data || {}); setEditing(true) }
  const doSave = async () => { await save(form); setEditing(false) }

  if (loading) return <div style={{ color: T.textMuted, padding: 40 }}>Loading…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 17, color: T.text }}>{icon} {title}</h2>
          <div style={{ fontSize: 11, color: T.textDim, marginTop: 2 }}>{subtitle}</div>
        </div>
        {data && !editing && <button onClick={startEdit} style={{ background: T.border, color: T.text, border: 'none', borderRadius: 7, padding: '7px 16px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>}
      </div>

      {!data && !editing ? (
        <Empty title={`No ${title.toLowerCase()} data yet`} desc={emptyDesc} fields={fields.map(f => f.label)} onAction={startEdit} />
      ) : editing ? (
        <div style={{ background: T.cardAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {fields.map(f => <FormField key={f.key} label={f.label}><input type={f.type||'text'} placeholder={f.placeholder||''} value={form[f.key]||''} onChange={e => setForm({...form, [f.key]: e.target.value})} style={inp} /></FormField>)}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <button onClick={doSave} style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 7, padding: '8px 24px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
            <button onClick={() => setEditing(false)} style={{ background: T.border, color: T.text, border: 'none', borderRadius: 7, padding: '8px 24px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {fields.map(f => (
            <div key={f.key} style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 10, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 3 }}>{f.label}</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: f.color || T.text, fontFamily: "'JetBrains Mono', monospace" }}>{data[f.key] ? (f.prefix||'') + data[f.key] : '—'}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
