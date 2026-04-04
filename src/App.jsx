import { useState, useEffect } from 'react'
import { List, X } from '@phosphor-icons/react'
import { T, MODULES } from './lib/constants'
import { useAuth } from './lib/hooks'
import Login from './components/Login'
import OverviewPage from './pages/Overview'
import ElectricityPage from './pages/Electricity'
import MunicipalPage from './pages/Municipal'
import ConfigPage from './pages/ConfigPage'
import FuelPage from './pages/Fuel'
import BudgetPage from './pages/Budget'
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
  return (
    <div style={{ padding: '24px 28px' }}>
      <Empty title="Solar Planning — Coming Soon" desc="Once your electricity baseline is established, this module will help you size a system, compare rent-to-own providers, and model payback." fields={['Baseline daily usage', 'Daytime vs evening load split', 'Provider quotes', 'System size (kW + kWh)']} />
    </div>
  )
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 680)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 680)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [tab, setTab] = useState('overview')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const isMobile = useIsMobile()

  if (loading) return <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textMuted }}>Loading…</div>

  if (!user) {
    return <Login onAuth={async (email, password, isSignUp) => {
      return isSignUp ? await signUp(email, password) : await signIn(email, password)
    }} />
  }

  const render = () => {
    switch (tab) {
      case 'overview':    return <OverviewPage />
      case 'budget':      return <BudgetPage />
      case 'electricity': return <ElectricityPage />
      case 'municipal':   return <MunicipalPage />
      case 'fuel':        return <FuelPage />
      case 'bond':        return <ConfigPage category="bond" title="Home Loan" icon={MODULES.find(m => m.id === 'bond').Icon} subtitle="Bond repayment & balance" fields={bondFields} emptyDesc="Add your home loan details to track repayments and remaining balance." />
      case 'medical':     return <ConfigPage category="medical" title="Medical Aid" icon={MODULES.find(m => m.id === 'medical').Icon} subtitle="Provider, plan & premium" fields={medFields} emptyDesc="Add your medical aid details to track premiums and escalations." />
      case 'insurance':   return <ConfigPage category="insurance" title="Insurance" icon={MODULES.find(m => m.id === 'insurance').Icon} subtitle="Home, contents & vehicle" fields={insFields} emptyDesc="Add your insurance policies to track total premium outflow." />
      case 'solar':       return <SolarPlaceholder />
      default:            return null
    }
  }

  const navItem = (m) => (
    <div key={m.id} onClick={() => { setTab(m.id); setMobileMenuOpen(false) }} style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: isMobile ? '12px 16px' : '6px 12px',
      borderRadius: isMobile ? 8 : 7,
      cursor: 'pointer',
      background: tab === m.id ? T.cyanGlow : 'transparent',
      color: tab === m.id ? T.cyan : T.textMuted,
      fontSize: 13, fontWeight: tab === m.id ? 600 : 400,
      borderBottom: !isMobile && tab === m.id ? `2px solid ${T.cyan}` : !isMobile ? '2px solid transparent' : 'none',
      transition: 'all 0.15s',
      width: isMobile ? '100%' : 'auto',
    }}>
      <m.Icon size={16} weight={tab === m.id ? 'fill' : 'regular'} />
      <span>{m.label}</span>
    </div>
  )

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: T.bg, color: T.text, minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />

      {/* Top nav bar */}
      <div style={{
        height: 52, background: T.surface, borderBottom: `1px solid ${T.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 4,
        position: 'sticky', top: 0, zIndex: 100, flexShrink: 0,
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.cyan, letterSpacing: 2, textTransform: 'uppercase', marginRight: isMobile ? 0 : 12 }}>Home OPS</span>

        {/* Desktop nav items */}
        {!isMobile && MODULES.map(navItem)}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {!isMobile && <span onClick={signOut} style={{ fontSize: 12, color: T.textDim, cursor: 'pointer' }}>Sign out</span>}
          {isMobile && (
            <div onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={{ cursor: 'pointer', color: T.textMuted, display: 'flex', alignItems: 'center' }}>
              {mobileMenuOpen ? <X size={22} /> : <List size={22} />}
            </div>
          )}
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {isMobile && mobileMenuOpen && (
        <div style={{
          position: 'fixed', top: 52, left: 0, right: 0, bottom: 0,
          background: T.surface, zIndex: 99, padding: '8px 8px',
          borderTop: `1px solid ${T.border}`, overflowY: 'auto',
          display: 'flex', flexDirection: 'column',
        }}>
          {MODULES.map(navItem)}
          <div style={{ marginTop: 'auto', padding: '16px 16px 8px' }}>
            <span onClick={() => { signOut(); setMobileMenuOpen(false) }} style={{ fontSize: 13, color: T.textDim, cursor: 'pointer' }}>Sign out</span>
          </div>
        </div>
      )}

      {/* Page content */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {render()}
      </div>
    </div>
  )
}
