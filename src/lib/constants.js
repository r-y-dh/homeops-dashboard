export const T = {
  bg: '#06090f',
  surface: '#0c1220',
  card: '#111a2d',
  cardAlt: '#152038',
  border: '#1a2744',
  borderLight: '#243456',
  text: '#dfe6f0',
  textMuted: '#7a8ba4',
  textDim: '#4a5c74',
  cyan: '#22d3ee',
  cyanDim: '#0e7490',
  cyanGlow: 'rgba(34,211,238,0.08)',
  amber: '#f59e0b',
  amberDim: '#78520a',
  red: '#ef4444',
  redDim: '#7f1d1d',
  green: '#10b981',
  greenDim: '#064e3b',
  greenGlow: 'rgba(16,185,129,0.08)',
}

import { SquaresFour, Lightning, Buildings, House, FirstAidKit, ShieldCheck, Sun, GasPump, Wallet } from '@phosphor-icons/react'

export const MODULES = [
  { id: 'overview',     label: 'Overview',    Icon: SquaresFour },
  { id: 'budget',       label: 'Budget',       Icon: Wallet      },
  { id: 'electricity',  label: 'Electricity',  Icon: Lightning   },
  { id: 'municipal',    label: 'Municipal',    Icon: Buildings   },
  { id: 'fuel',         label: 'Fuel',         Icon: GasPump     },
  { id: 'bond',         label: 'Bond',         Icon: House       },
  { id: 'medical',      label: 'Medical Aid',  Icon: FirstAidKit },
  { id: 'insurance',    label: 'Insurance',    Icon: ShieldCheck },
  { id: 'solar',        label: 'Solar',        Icon: Sun         },
]

export const WINTER_TARGETS = { min: 1200, comfortable: 1400, ideal: 1600 }
export const SERVICE_FEE = 200
export const DAILY_USAGE_NORMAL = 21
export const DAILY_USAGE_WINTER = 31
