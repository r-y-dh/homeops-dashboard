import { useState, useEffect, useCallback } from 'react'
import { supabase } from './supabase'

// ─── Auth ────────────────────────────────────────────────────
export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  const signUp = async (email, password) => {
    const { error } = await supabase.auth.signUp({ email, password })
    return { error }
  }

  const signOut = () => supabase.auth.signOut()

  return { user, loading, signIn, signUp, signOut }
}

// ─── Electricity ─────────────────────────────────────────────
export function useElectricity() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('electricity_purchases')
      .select('*')
      .order('date', { ascending: true })
    if (!error) setEntries(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = async (entry) => {
    const { data: { user } } = await supabase.auth.getUser()
    const row = {
      user_id: user.id,
      date: entry.date,
      amount: parseFloat(entry.amount),
      service_fee: parseFloat(entry.serviceFee) || 0,
      energy_value: parseFloat(entry.amount) - (parseFloat(entry.serviceFee) || 0),
      units: parseFloat(entry.units) || 0,
      balance: entry.balance ? parseFloat(entry.balance) : null,
    }
    const { error } = await supabase.from('electricity_purchases').insert(row)
    if (!error) await fetch()
    return { error }
  }

  const update = async (id, entry) => {
    const row = {
      date: entry.date,
      amount: parseFloat(entry.amount),
      service_fee: parseFloat(entry.serviceFee) || 0,
      energy_value: parseFloat(entry.amount) - (parseFloat(entry.serviceFee) || 0),
      units: parseFloat(entry.units) || 0,
      balance: entry.balance ? parseFloat(entry.balance) : null,
    }
    const { error } = await supabase.from('electricity_purchases').update(row).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('electricity_purchases').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { entries, loading, add, update, remove, refresh: fetch }
}

// ─── Municipal ───────────────────────────────────────────────
export function useMunicipal() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('municipal_entries')
      .select('*')
      .order('month', { ascending: true })
    if (!error) setEntries(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = async (entry) => {
    const { data: { user } } = await supabase.auth.getUser()
    const rates    = parseFloat(entry.rates)    || 0
    const water    = parseFloat(entry.water)    || 0
    const refuse   = parseFloat(entry.refuse)   || 0
    const sewerage = parseFloat(entry.sewerage) || 0
    const other    = parseFloat(entry.other)    || 0
    const currentCharges = rates + water + refuse + sewerage + other
    const prevBal  = entry.previousBalance ? parseFloat(entry.previousBalance) : null
    const row = {
      user_id:          user.id,
      month:            entry.month,
      rates, water, refuse, sewerage, other,
      current_charges:  currentCharges,
      total:            entry.total ? parseFloat(entry.total) : (prevBal != null ? prevBal + currentCharges : currentCharges),
      previous_balance: prevBal,
      water_kl:         entry.waterKL         ? parseFloat(entry.waterKL)         : null,
      water_daily_avg_kl: entry.waterDailyAvgKL ? parseFloat(entry.waterDailyAvgKL) : null,
      reading_days:     entry.readingDays      ? parseInt(entry.readingDays)       : null,
      meter_start:      entry.meterStart       ? parseFloat(entry.meterStart)      : null,
      meter_end:        entry.meterEnd         ? parseFloat(entry.meterEnd)        : null,
      stand_size:       entry.standSize        || null,
      portion:          entry.portion          || null,
      valuation:        entry.valuation        ? parseFloat(entry.valuation)       : null,
      region:           entry.region           || null,
    }
    const { error } = await supabase.from('municipal_entries').upsert(row, { onConflict: 'user_id,month' })
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('municipal_entries').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { entries, loading, add, remove, refresh: fetch }
}

// ─── Fuel ────────────────────────────────────────────────────
export function useFuel() {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('fuel_purchases')
      .select('*')
      .order('date', { ascending: true })
    if (!error) setEntries(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = async (entry) => {
    const { data: { user } } = await supabase.auth.getUser()
    const litres = parseFloat(entry.litres)
    const cost   = parseFloat(entry.cost)
    const row = {
      user_id:         user.id,
      date:            entry.date,
      litres,
      cost,
      price_per_litre: litres > 0 ? cost / litres : null,
      odometer:        entry.odometer ? parseFloat(entry.odometer) : null,
      notes:           entry.notes || null,
    }
    const { error } = await supabase.from('fuel_purchases').insert(row)
    if (!error) await fetch()
    return { error }
  }

  const update = async (id, entry) => {
    const litres = parseFloat(entry.litres)
    const cost   = parseFloat(entry.cost)
    const row = {
      date:            entry.date,
      litres,
      cost,
      price_per_litre: litres > 0 ? cost / litres : null,
      odometer:        entry.odometer ? parseFloat(entry.odometer) : null,
      notes:           entry.notes || null,
    }
    const { error } = await supabase.from('fuel_purchases').update(row).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('fuel_purchases').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { entries, loading, add, update, remove, refresh: fetch }
}

// ─── Budget: Accounts ────────────────────────────────────────
export function useBudgetAccounts() {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('budget_accounts')
      .select('*')
      .order('sort_order', { ascending: true })
    if (!error) setAccounts(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = async (entry) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('budget_accounts').insert({
      user_id:    user.id,
      name:       entry.name,
      type:       entry.type || 'cheque',
      bank:       entry.bank || 'Discovery Bank',
      color:      entry.color || '#22d3ee',
      is_active:  entry.is_active !== false,
      sort_order: entry.sort_order || 0,
      notes:      entry.notes || null,
    })
    if (!error) await fetch()
    return { error }
  }

  const update = async (id, entry) => {
    const { error } = await supabase.from('budget_accounts').update({
      name:       entry.name,
      type:       entry.type,
      bank:       entry.bank,
      color:      entry.color,
      is_active:  entry.is_active,
      sort_order: entry.sort_order,
      notes:      entry.notes || null,
    }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('budget_accounts').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { accounts, loading, add, update, remove, refresh: fetch }
}

// ─── Budget: Debit Orders ────────────────────────────────────
export function useDebitOrders(accountId = null) {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    let query = supabase
      .from('debit_orders')
      .select('*, budget_accounts(name)')
      .order('day_of_month', { ascending: true })
    if (accountId) query = query.eq('account_id', accountId)
    const { data, error } = await query
    if (!error) setOrders(data || [])
    setLoading(false)
  }, [accountId])

  useEffect(() => { fetch() }, [fetch])

  const add = async (entry) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('debit_orders').insert({
      user_id:      user.id,
      account_id:   entry.account_id,
      name:         entry.name,
      amount:       parseFloat(entry.amount),
      category:     entry.category || null,
      day_of_month: entry.day_of_month ? parseInt(entry.day_of_month) : null,
      is_active:    entry.is_active !== false,
      notes:        entry.notes || null,
    })
    if (!error) await fetch()
    return { error }
  }

  const update = async (id, entry) => {
    const { error } = await supabase.from('debit_orders').update({
      account_id:   entry.account_id,
      name:         entry.name,
      amount:       parseFloat(entry.amount),
      category:     entry.category || null,
      day_of_month: entry.day_of_month ? parseInt(entry.day_of_month) : null,
      is_active:    entry.is_active !== false,
      notes:        entry.notes || null,
    }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('debit_orders').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { orders, loading, add, update, remove, refresh: fetch }
}

// ─── Budget: Categories ──────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name: 'Groceries',     color: '#10b981', monthly_budget: null, sort_order: 0 },
  { name: 'Eating Out',    color: '#f59e0b', monthly_budget: null, sort_order: 1 },
  { name: 'Shopping',      color: '#22d3ee', monthly_budget: null, sort_order: 2 },
  { name: 'Kids & Family', color: '#a855f7', monthly_budget: null, sort_order: 3 },
  { name: 'Fuel',          color: '#ef4444', monthly_budget: null, sort_order: 4 },
  { name: 'Utilities',     color: '#64748b', monthly_budget: null, sort_order: 5 },
  { name: 'Medical',       color: '#06b6d4', monthly_budget: null, sort_order: 6 },
  { name: 'Insurance',     color: '#8b5cf6', monthly_budget: null, sort_order: 7 },
  { name: 'Bond',          color: '#f97316', monthly_budget: null, sort_order: 8 },
  { name: 'Savings',       color: '#84cc16', monthly_budget: null, sort_order: 9 },
  { name: 'Transfer',      color: '#4a5c74', monthly_budget: null, sort_order: 10 },
  { name: 'Salary',        color: '#10b981', monthly_budget: null, sort_order: 11 },
  { name: 'Other',         color: '#4a5c74', monthly_budget: null, sort_order: 12 },
]

export function useBudgetCategories() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data, error } = await supabase
      .from('budget_categories')
      .select('*')
      .order('sort_order', { ascending: true })
    if (!error) {
      if ((data || []).length === 0) {
        // Seed defaults on first use
        const { data: { user } } = await supabase.auth.getUser()
        const rows = DEFAULT_CATEGORIES.map(c => ({ ...c, user_id: user.id }))
        const { data: seeded } = await supabase.from('budget_categories').insert(rows).select()
        setCategories(seeded || [])
      } else {
        setCategories(data)
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = async (entry) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('budget_categories').insert({
      user_id:        user.id,
      name:           entry.name,
      color:          entry.color || '#22d3ee',
      monthly_budget: entry.monthly_budget ? parseFloat(entry.monthly_budget) : null,
      sort_order:     entry.sort_order || 0,
    })
    if (!error) await fetch()
    return { error }
  }

  const update = async (id, entry) => {
    const { error } = await supabase.from('budget_categories').update({
      name:           entry.name,
      color:          entry.color,
      monthly_budget: entry.monthly_budget ? parseFloat(entry.monthly_budget) : null,
      sort_order:     entry.sort_order,
    }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('budget_categories').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { categories, loading, add, update, remove, refresh: fetch }
}

// ─── Budget: Transactions ────────────────────────────────────
export function useBudgetTransactions({ accountId = null, month = null } = {}) {
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    let query = supabase
      .from('budget_transactions')
      .select('*, budget_categories(name, color), budget_accounts(name)')
      .order('date', { ascending: false })
    if (accountId) query = query.eq('account_id', accountId)
    if (month)     query = query.gte('date', `${month}-01`).lte('date', `${month}-31`)
    const { data, error } = await query
    if (!error) setTransactions(data || [])
    setLoading(false)
  }, [accountId, month])

  useEffect(() => { fetch() }, [fetch])

  const add = async (entry) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('budget_transactions').insert({
      user_id:        user.id,
      account_id:     entry.account_id,
      category_id:    entry.category_id || null,
      date:           entry.date,
      amount:         parseFloat(entry.amount),
      description:    entry.description || null,
      type:           entry.type || 'debit',
      source:         entry.source || 'manual',
      debit_order_id: entry.debit_order_id || null,
      notes:          entry.notes || null,
    })
    if (!error) await fetch()
    return { error }
  }

  const addBatch = async (rows) => {
    const { data: { user } } = await supabase.auth.getUser()
    const mapped = rows.map(r => ({
      user_id:     user.id,
      account_id:  r.account_id,
      category_id: r.category_id || null,
      date:        r.date,
      amount:      parseFloat(r.amount),
      description: r.description || null,
      type:        r.type || 'debit',
      source:      'import',
      notes:       null,
    }))
    const { error } = await supabase.from('budget_transactions').insert(mapped)
    if (!error) await fetch()
    return { error }
  }

  const update = async (id, entry) => {
    const { error } = await supabase.from('budget_transactions').update({
      category_id: entry.category_id || null,
      date:        entry.date,
      amount:      parseFloat(entry.amount),
      description: entry.description || null,
      type:        entry.type,
      notes:       entry.notes || null,
    }).eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  const remove = async (id) => {
    const { error } = await supabase.from('budget_transactions').delete().eq('id', id)
    if (!error) await fetch()
    return { error }
  }

  return { transactions, loading, add, addBatch, update, remove, refresh: fetch }
}

// ─── Budget: Month View ──────────────────────────────────────
export function useBudgetMonth(month) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const [
      { data: accounts },
      { data: orders },
      { data: setups },
      { data: txns },
      { data: cats },
    ] = await Promise.all([
      supabase.from('budget_accounts').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('debit_orders').select('*').eq('is_active', true),
      supabase.from('budget_month_setups').select('*').eq('month', month),
      supabase.from('budget_transactions').select('*, budget_categories(name, color)').gte('date', `${month}-01`).lte('date', `${month}-31`),
      supabase.from('budget_categories').select('*').order('sort_order'),
    ])

    const accountsData = (accounts || []).map(acc => {
      const setup   = (setups || []).find(s => s.account_id === acc.id)
      const accOrders = (orders || []).filter(o => o.account_id === acc.id)
      const accTxns   = (txns   || []).filter(t => t.account_id === acc.id)
      const openingBalance  = setup ? Number(setup.opening_balance) : null
      const debitOrdersTotal = accOrders.reduce((s, o) => s + Number(o.amount), 0)
      const spend    = accTxns.filter(t => t.type === 'debit').reduce((s, t) => s + Number(t.amount), 0)
      const income   = accTxns.filter(t => t.type === 'credit').reduce((s, t) => s + Number(t.amount), 0)
      const remaining = openingBalance != null
        ? openingBalance - debitOrdersTotal - spend + income
        : null
      return { ...acc, opening_balance: openingBalance, debit_orders: accOrders, debit_orders_total: debitOrdersTotal, spend, income, remaining }
    })

    const catData = (cats || []).map(cat => {
      const catTxns = (txns || []).filter(t => t.category_id === cat.id && t.type === 'debit')
      const spent = catTxns.reduce((s, t) => s + Number(t.amount), 0)
      return { ...cat, spent, budgeted: cat.monthly_budget ? Number(cat.monthly_budget) : null }
    })

    const trackableAccounts = accountsData.filter(a => ['cheque', 'credit'].includes(a.type))
    const totalRemaining = trackableAccounts.every(a => a.remaining != null)
      ? trackableAccounts.reduce((s, a) => s + (a.remaining || 0), 0)
      : null

    setData({ accounts: accountsData, categories: catData, totalRemaining })
    setLoading(false)
  }, [month])

  useEffect(() => { fetch() }, [fetch])

  const setOpeningBalance = async (accountId, openingBalance) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('budget_month_setups').upsert({
      user_id: user.id,
      account_id: accountId,
      month,
      opening_balance: parseFloat(openingBalance),
    }, { onConflict: 'user_id,account_id,month' })
    if (!error) await fetch()
    return { error }
  }

  return {
    accounts:       data?.accounts      || [],
    categories:     data?.categories    || [],
    totalRemaining: data?.totalRemaining ?? null,
    loading,
    setOpeningBalance,
    refresh: fetch,
  }
}

// ─── Household Config (Bond, Medical, Insurance) ─────────────
export function useHouseholdConfig(category) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    const { data: rows, error } = await supabase
      .from('household_config')
      .select('*')
      .eq('category', category)
      .maybeSingle()
    if (!error) setData(rows?.data || null)
    setLoading(false)
  }, [category])

  useEffect(() => { fetch() }, [fetch])

  const save = async (configData) => {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('household_config')
      .upsert({
        user_id: user.id,
        category,
        data: configData,
      }, { onConflict: 'user_id,category' })
    if (!error) {
      setData(configData)
    }
    return { error }
  }

  return { data, loading, save, refresh: fetch }
}
