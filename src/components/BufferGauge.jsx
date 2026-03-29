import { T, WINTER_TARGETS, SERVICE_FEE } from '../lib/constants'
import { SectionLabel } from './UI'

export default function BufferGauge({ balance }) {
  const pct = Math.min(100, (balance / WINTER_TARGETS.ideal) * 100)
  const minPct = (WINTER_TARGETS.min / WINTER_TARGETS.ideal) * 100
  const comfPct = (WINTER_TARGETS.comfortable / WINTER_TARGETS.ideal) * 100
  const color = balance >= WINTER_TARGETS.comfortable ? T.green : balance >= WINTER_TARGETS.min ? T.amber : T.red
  const status = balance >= WINTER_TARGETS.ideal ? 'Ideal' : balance >= WINTER_TARGETS.comfortable ? 'Comfortable' : balance >= WINTER_TARGETS.min ? 'Minimum Met' : 'At Risk'
  const gap = Math.max(0, WINTER_TARGETS.ideal - balance)

  return (
    <div style={{ background: T.card, border: `1px solid ${T.border}`, borderRadius: 10, padding: 16 }}>
      <SectionLabel>Winter Buffer Status</SectionLabel>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{status}</span>
        <span style={{ fontSize: 12, color: T.textMuted }}>{balance.toFixed(0)} / {WINTER_TARGETS.ideal} kWh</span>
      </div>
      <div style={{ position: 'relative', height: 18, background: T.bg, borderRadius: 9, overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ position: 'absolute', left: `${minPct}%`, top: 0, bottom: 0, width: 1, background: T.red, opacity: 0.5 }} />
        <div style={{ position: 'absolute', left: `${comfPct}%`, top: 0, bottom: 0, width: 1, background: T.amber, opacity: 0.5 }} />
        <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${T.cyanDim}, ${color})`, borderRadius: 9, transition: 'width 0.4s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: T.textDim }}>
        <span>0</span><span style={{ color: T.red }}>Min {WINTER_TARGETS.min}</span><span style={{ color: T.amber }}>Comf {WINTER_TARGETS.comfortable}</span><span style={{ color: T.green }}>Ideal {WINTER_TARGETS.ideal}</span>
      </div>
      {gap > 0 && <div style={{ fontSize: 11, color: T.amber, marginTop: 8 }}>Gap to ideal: {gap.toFixed(0)} kWh (~R{(gap * 3.3 + SERVICE_FEE).toFixed(0)} top-up)</div>}
    </div>
  )
}
