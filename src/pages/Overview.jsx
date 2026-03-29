import { useState, useEffect } from 'react'
import { SquaresFour } from '@phosphor-icons/react'
import { T } from '../lib/constants'
import { useElectricity, useMunicipal, useHouseholdConfig } from '../lib/hooks'
import { Stat, SectionLabel } from '../components/UI'
import BufferGauge from '../components/BufferGauge'

export default function OverviewPage() {
  const { entries: elec, loading: l1 } = useElectricity()
  const { entries: muni, loading: l2 } = useMunicipal()
  const { data: bond, loading: l3 } = useHouseholdConfig('bond')
  const { data: medical, loading: l4 } = useHouseholdConfig('medical')
  const { data: insurance, loading: l5 } = useHouseholdConfig('insurance')

  const loading = l1 || l2 || l3 || l4 || l5
  if (loading) return <div style={{ color: T.textMuted, padding: 40 }}>Loading…</div>

  const now = new Date()
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`
  const elecMonth = elec.filter(e => e.date.startsWith(thisMonth))
  const elecSpend = elecMonth.reduce((s,e) => s + Number(e.amount), 0)
  const latestBalance = [...elec].reverse().find(e => e.balance !== null)?.balance || 0
  const muniLatest = muni.length ? muni[muni.length-1] : null
  const muniTotal = muniLatest ? Number(muniLatest.total) : 0
  const bondAmt = bond?.repayment ? parseFloat(bond.repayment) : 0
  const medAmt = medical?.premium ? parseFloat(medical.premium) : 0
  const insAmt = insurance?.totalPremium ? parseFloat(insurance.totalPremium) : 0
  const totalMonthly = elecSpend + muniTotal + bondAmt + medAmt + insAmt
  const fixedCosts = bondAmt + medAmt + insAmt
  const variableCosts = elecSpend + muniTotal

  const modules = [
    { name: 'Electricity', active: elec.length > 0, value: elecSpend ? `R${elecSpend.toLocaleString()}` : 'Active' },
    { name: 'Municipal', active: muni.length > 0, value: muniTotal ? `R${muniTotal.toLocaleString()}` : null },
    { name: 'Bond', active: !!bond, value: bondAmt ? `R${bondAmt.toLocaleString()}` : null },
    { name: 'Medical Aid', active: !!medical, value: medAmt ? `R${medAmt.toLocaleString()}` : null },
    { name: 'Insurance', active: !!insurance, value: insAmt ? `R${insAmt.toLocaleString()}` : null },
    { name: 'Solar', active: false, value: null },
  ]
  const populated = modules.filter(m => m.active).length

  return (
    <div>
      {/* Sticky summary */}
      <div style={{ position: 'sticky', top: 0, background: T.bg, zIndex: 10, padding: '20px 28px 16px', borderBottom: `1px solid ${T.border}` }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 20, color: T.text, display: 'flex', alignItems: 'center', gap: 8 }}>
            <SquaresFour size={20} weight="fill" /> Home OPS Command Centre
          </h2>
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 3 }}>Riyadh Gordon • Johannesburg • {populated}/6 modules active</div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Stat label="Total Monthly" value={totalMonthly > 0 ? totalMonthly.toLocaleString() : '—'} prefix="R" color={T.cyan} sub="Known costs only" />
          <Stat label="Fixed" value={fixedCosts > 0 ? fixedCosts.toLocaleString() : '—'} prefix="R" sub="Bond + Medical + Insurance" />
          <Stat label="Variable" value={variableCosts > 0 ? variableCosts.toLocaleString() : '—'} prefix="R" sub="Electricity + Municipal" />
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
