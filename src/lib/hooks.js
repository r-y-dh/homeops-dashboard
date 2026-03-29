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
