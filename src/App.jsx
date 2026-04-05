import { useState } from 'react'
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
import { TooltipProvider } from '@/components/ui/tooltip'
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarHeader,
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarProvider, SidebarTrigger, SidebarInset,
  SidebarGroup, SidebarGroupLabel, SidebarGroupContent,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

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
    <div className="p-7">
      <Empty title="Solar Planning — Coming Soon" desc="Once your electricity baseline is established, this module will help you size a system, compare rent-to-own providers, and model payback." fields={['Baseline daily usage', 'Daytime vs evening load split', 'Provider quotes', 'System size (kW + kWh)']} />
    </div>
  )
}

const PRIMARY_NAV = ['overview', 'budget', 'electricity', 'municipal', 'fuel']
const SECONDARY_NAV = ['bond', 'medical', 'insurance', 'solar']

function AppSidebar({ tab, setTab, signOut }) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold shrink-0">H</div>
          <span className="font-bold text-sm tracking-widest uppercase text-primary group-data-[collapsible=icon]:hidden">Home OPS</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {PRIMARY_NAV.map(id => {
                const m = MODULES.find(x => x.id === id)
                return (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton isActive={tab === id} onClick={() => setTab(id)} tooltip={m.label}>
                      <m.Icon size={16} weight={tab === id ? 'fill' : 'regular'} />
                      <span>{m.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Fixed Costs</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {SECONDARY_NAV.map(id => {
                const m = MODULES.find(x => x.id === id)
                return (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton isActive={tab === id} onClick={() => setTab(id)} tooltip={m.label}>
                      <m.Icon size={16} weight={tab === id ? 'fill' : 'regular'} />
                      <span>{m.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={signOut} tooltip="Sign out">
              <span className="text-muted-foreground text-xs">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [tab, setTab] = useState('overview')

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
      Loading…
    </div>
  )

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

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar tab={tab} setTab={setTab} signOut={signOut} />
        <SidebarInset>
          <header className="flex h-12 shrink-0 items-center gap-2 border-b border-border px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="h-4 mx-1" />
            <span className="text-sm font-medium text-muted-foreground">
              {MODULES.find(m => m.id === tab)?.label}
            </span>
          </header>
          <div className="flex-1 overflow-y-auto">
            {render()}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}
