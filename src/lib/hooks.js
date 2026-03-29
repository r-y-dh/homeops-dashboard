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
    const row = {
      user_id: user.id,
      month: entry.month,
      rates: parseFloat(entry.rates) || 0,
      water: parseFloat(entry.water) || 0,
      refuse: parseFloat(entry.refuse) || 0,
      sewerage: parseFloat(entry.sewerage) || 0,
      other: parseFloat(entry.other) || 0,
      total: (parseFloat(entry.rates) || 0) + (parseFloat(entry.water) || 0) +
             (parseFloat(entry.refuse) || 0) + (parseFloat(entry.sewerage) || 0) +
             (parseFloat(entry.other) || 0),
      water_kl: entry.waterKL ? parseFloat(entry.waterKL) : null,
      water_daily_avg_kl: entry.waterDailyAvgKL ? parseFloat(entry.waterDailyAvgKL) : null,
      reading_days: entry.readingDays ? parseInt(entry.readingDays) : null,
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
