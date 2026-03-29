import { T } from '../lib/constants'

const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }

export const inp = {
  width: '100%', boxSizing: 'border-box', background: T.bg, border: `1px solid ${T.border}`,
  borderRadius: 6, padding: '7px 10px', color: T.text, fontSize: 14,
  fontFamily: "'JetBrains Mono', monospace", outline: 'none',
}

export function Stat({ label, value, sub, color, prefix }) {
  return (
    <div style={{ ...card, flex: 1, minWidth: 130 }}>
      <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: color || T.text, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.1 }}>{prefix}{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.textDim, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export function FormField({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 3 }}>{label}</label>
      {children}
    </div>
  )
}

export function Empty({ title, desc, fields, onAction, actionLabel }) {
  return (
    <div style={{ ...card, textAlign: 'center', padding: 36, borderStyle: 'dashed', borderColor: T.borderLight }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: T.textMuted, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, color: T.textDim, maxWidth: 380, margin: '0 auto 14px' }}>{desc}</div>
      {fields && (
        <div style={{ fontSize: 12, color: T.textDim, textAlign: 'left', maxWidth: 300, margin: '0 auto 14px' }}>
          <div style={{ fontWeight: 600, color: T.textMuted, marginBottom: 4 }}>Data needed:</div>
          {fields.map((f, i) => <div key={i} style={{ padding: '1px 0' }}>• {f}</div>)}
        </div>
      )}
      {onAction && <button onClick={onAction} style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 7, padding: '9px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>{actionLabel || 'Add Data'}</button>}
    </div>
  )
}

export function SectionLabel({ children }) {
  return <div style={{ fontSize: 11, color: T.textDim, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10, marginTop: 4 }}>{children}</div>
}

export function Card({ children, style }) {
  return <div style={{ ...card, ...style }}>{children}</div>
}
