import { useState } from 'react'
import { T, MODULES } from './lib/constants'
import { useAuth } from './lib/hooks'
import Login from './components/Login'
import OverviewPage from './pages/Overview'
import ElectricityPage from './pages/Electricity'
import MunicipalPage from './pages/Municipal'
import ConfigPage from './pages/ConfigPage'
import { Empty } from './components/UI'

const bondFields = [
  { key: 'bank', label: 'Bank', placeholder: 'e.g. FNB' },
  { key: 'rate', label: 'Interest Rate (%)', type: 'number', placeholder: 'e.g. 11.5' },
  { key: 'repayment', label: 'Monthly Repayment (R)', type: 'number', prefix: 'R', color: T.cyan },
  { key: 'balance', label: 'Remaining Balance (R)', type: 'number', prefix: 'R' },
  { key: 'termRemaining', label: 'Term Remaining (months)', type: 'number' },
  { key: 'originalTerm', label: 'Original Term (years)', type: 'number' },
]

const medFields = [
  { key: 'provider', label: 'Provider', placeholder: 'e.g. Discovery' },
  { key: 'plan', label: 'Plan Name', placeholder: 'e.g. Classic Saver' },
  { key: 'premium', label: 'Monthly Premium (R)', type: 'number', prefix: 'R', color: T.cyan },
  { key: 'members', label: 'Covered Members', type: 'number' },
  { key: 'lastIncrease', label: 'Last Increase (%)', type: 'number' },
  { key: 'nextReview', label: 'Next Review', placeholder: 'e.g. 2026-01' },
]

const insFields = [
  { key: 'homeProvider', label: 'Home Provider' },
  { key: 'homePremium', label: 'Home Premium (R/mo)', type: 'number', prefix: 'R' },
  { key: 'contentsProvider', label: 'Contents Provider' },
  { key: 'contentsPremium', label: 'Contents Premium (R/mo)', type: 'number', prefix: 'R' },
  { key: 'vehicleProvider', label: 'Vehicle Provider' },
  { key: 'vehiclePremium', label: 'Vehicle Premium (R/mo)', type: 'number', prefix: 'R' },
  { key: 'totalPremium', label: 'Total Insurance (R/mo)', type: 'number', prefix: 'R', color: T.cyan },
  { key: 'excess', label: 'Typical Excess (R)', type: 'number', prefix: 'R' },
]

function SolarPlaceholder() {
  return <Empty title="Solar Planning — Coming Soon" desc="Once your electricity baseline is established, this module will help you size a system, compare rent-to-own providers, and model payback." fields={['Baseline daily usage', 'Daytime vs evening load split', 'Provider quotes', 'System size (kW + kWh)']} />
}

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [tab, setTab] = useState('overview')
  const [sidebar, setSidebar] = useState(true)

  if (loading) return <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted }}>Loading…</div>

  if (!user) {
    return <Login onAuth={async (email, password, isSignUp) => {
      return isSignUp ? await signUp(email, password) : await signIn(email, password)
    }} />
  }

  const render = () => {
    switch (tab) {
      case 'overview': return <OverviewPage />
      case 'electricity': return <ElectricityPage />
      case 'municipal': return <MunicipalPage />
      case 'bond': return <ConfigPage category="bond" title="Home Loan" icon="🏠" subtitle="Bond repayment & balance" fields={bondFields} emptyDesc="Add your home loan details to track repayments and remaining balance." />
      case 'medical': return <ConfigPage category="medical" title="Medical Aid" icon="✚" subtitle="Provider, plan & premium" fields={medFields} emptyDesc="Add your medical aid details to track premiums and escalations." />
      case 'insurance': return <ConfigPage category="insurance" title="Insurance" icon="🛡" subtitle="Home, contents & vehicle" fields={insFields} emptyDesc="Add your insurance policies to track total premium outflow." />
      case 'solar': return <SolarPlaceholder />
      default: return null
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: T.bg, color: T.text, minHeight: '100vh', display: 'flex' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      <div style={{ width: sidebar ? 190 : 48, background: T.surface, borderRight: `1px solid ${T.border}`, padding: '14px 0', transition: 'width 0.2s', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '0 10px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: sidebar ? 'space-between' : 'center' }}>
          {sidebar && <span style={{ fontSize: 12, fontWeight: 700, color: T.cyan, letterSpacing: 2, textTransform: 'uppercase' }}>Home OPS</span>}
          <span onClick={() => setSidebar(!sidebar)} style={{ cursor: 'pointer', color: T.textDim, fontSize: 14 }}>{sidebar ? '◂' : '▸'}</span>
        </div>
        {MODULES.map(m => (
          <div key={m.id} onClick={() => setTab(m.id)} style={{
            display: 'flex', alignItems: 'center', gap: 9,
            padding: sidebar ? '9px 14px' : '9px 0', justifyContent: sidebar ? 'flex-start' : 'center',
            cursor: 'pointer',
            background: tab === m.id ? T.cyanGlow : 'transparent',
            borderRight: tab === m.id ? `2px solid ${T.cyan}` : '2px solid transparent',
            color: tab === m.id ? T.cyan : T.textMuted,
            fontSize: 12, fontWeight: tab === m.id ? 600 : 400, transition: 'all 0.15s',
          }}>
            <span style={{ fontSize: 14 }}>{m.icon}</span>
            {sidebar && <span>{m.label}</span>}
          </div>
        ))}
        <div style={{ marginTop: 'auto', padding: '10px 14px' }}>
          {sidebar && <span onClick={signOut} style={{ fontSize: 11, color: T.textDim, cursor: 'pointer' }}>Sign out</span>}
        </div>
      </div>

      <div style={{ flex: 1, padding: 20, maxWidth: 860, overflowY: 'auto' }}>
        {render()}
      </div>
    </div>
  )
}
