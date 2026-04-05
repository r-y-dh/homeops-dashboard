import { useState } from 'react'
import { T } from '../lib/constants'
import { supabase } from '../lib/supabase'
import { useBudgetAccounts, useDebitOrders, useBudgetCategories, useBudgetTransactions, useBudgetMonth } from '../lib/hooks'
import { Stat, FormField, SectionLabel, Empty, inp, Card } from '../components/UI'
import { ChevronLeft, ChevronRight, Upload, Plus, X, Pencil, Trash } from '@phosphor-icons/react'

export default function BudgetPage() {
  const [activeTab, setActiveTab] = useState('month')
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7))

  // Hooks
  const { accounts, loading: l1, add: addAccount, update: updateAccount, remove: removeAccount } = useBudgetAccounts()
  const { orders, loading: l2, add: addDebitOrder, update: updateDebitOrder, remove: removeDebitOrder } = useDebitOrders()
  const { categories, loading: l3, add: addCategory, update: updateCategory, remove: removeCategory } = useBudgetCategories()
  const { transactions, loading: l4, add: addTransaction, addBatch, remove: removeTransaction } = useBudgetTransactions({ month })
  const { accounts: monthAccounts, categories: monthCategories, totalRemaining, loading: l5, setOpeningBalance } = useBudgetMonth(month)

  const loading = l1 || l2 || l3 || l4 || l5

  // Month navigation
  const prevMonth = () => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() - 1)
    setMonth(d.toISOString().slice(0, 7))
  }
  const nextMonth = () => {
    const d = new Date(month + '-01')
    d.setMonth(d.getMonth() + 1)
    setMonth(d.toISOString().slice(0, 7))
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, borderBottom: `1px solid ${T.border}`, paddingBottom: 16 }}>
        {['month', 'transactions', 'setup'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 14,
              fontWeight: activeTab === tab ? 600 : 400,
              color: activeTab === tab ? T.cyan : T.textDim,
              cursor: 'pointer',
              paddingBottom: 8,
              borderBottom: activeTab === tab ? `2px solid ${T.cyan}` : 'none',
              textTransform: 'capitalize',
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* TAB 1: MONTH VIEW */}
      {activeTab === 'month' && (
        <div>
          {/* Month selector + upload */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: T.cyan, cursor: 'pointer', fontSize: 20 }}><ChevronLeft size={20} /></button>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                style={{ ...inp, width: 140 }}
              />
              <button onClick={nextMonth} style={{ background: none, border: 'none', color: T.cyan, cursor: 'pointer', fontSize: 20 }}><ChevronRight size={20} /></button>
            </div>
            <UploadStatementButton month={month} onImport={addBatch} setOpeningBalance={setOpeningBalance} />
          </div>

          {/* Total remaining */}
          {totalRemaining != null && (
            <Stat
              label="Total Remaining (All Accounts)"
              value={totalRemaining.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              color={totalRemaining >= 0 ? T.green : T.red}
              prefix="R"
            />
          )}

          {/* Account cards */}
          <SectionLabel>Account Summary</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
            {monthAccounts.filter(a => ['cheque', 'credit'].includes(a.type)).map(acc => (
              <Card key={acc.id} style={{ padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{acc.name}</div>
                <div style={{ fontSize: 11, color: T.textDim, marginBottom: 8 }}>{acc.type.toUpperCase()}</div>
                <div style={{ fontSize: 13, marginBottom: 10 }}>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: T.textDim }}>Opening:</span> <span style={{ float: 'right', fontWeight: 600 }}>R{acc.opening_balance != null ? acc.opening_balance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>
                  </div>
                  {acc.debit_orders_total > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ color: T.textDim }}>Debit Orders:</span> <span style={{ float: 'right', fontWeight: 600, color: T.red }}>−R{acc.debit_orders_total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {acc.spend > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ color: T.textDim }}>Spend:</span> <span style={{ float: 'right', fontWeight: 600, color: T.amber }}>−R{acc.spend.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  {acc.income > 0 && (
                    <div style={{ marginBottom: 6 }}>
                      <span style={{ color: T.textDim }}>Income:</span> <span style={{ float: 'right', fontWeight: 600, color: T.green }}>+R{acc.income.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  )}
                </div>
                <div style={{ paddingTop: 10, borderTop: `1px solid ${T.border}`, marginTop: 10, fontSize: 14, fontWeight: 600 }}>
                  Remaining: <span style={{ float: 'right', color: acc.remaining >= 0 ? T.green : T.red }}>R{acc.remaining != null ? acc.remaining.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Category breakdown */}
          <SectionLabel>Category Spend</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {monthCategories.map(cat => (
              <Card key={cat.id} style={{ padding: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 12, height: 12, borderRadius: 3, background: cat.color }} />
                  <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{cat.name}</span>
                  <span style={{ fontSize: 12, color: T.textDim }}>R{cat.spent.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                {cat.budgeted && (
                  <div style={{ fontSize: 11, color: T.textDim }}>
                    Budget: R{cat.budgeted.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <div style={{ width: '100%', height: 4, background: T.border, borderRadius: 2, marginTop: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: cat.spent > cat.budgeted ? T.red : T.cyan, width: `${Math.min((cat.spent / cat.budgeted) * 100, 100)}%` }} />
                    </div>
                  </div>
                )}
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 2: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <TransactionsTab accounts={accounts} categories={categories} transactions={transactions} onAdd={addTransaction} onRemove={removeTransaction} />
      )}

      {/* TAB 3: SETUP */}
      {activeTab === 'setup' && (
        <SetupTab
          accounts={accounts}
          orders={orders}
          categories={categories}
          onAddAccount={addAccount}
          onUpdateAccount={updateAccount}
          onRemoveAccount={removeAccount}
          onAddOrder={addDebitOrder}
          onUpdateOrder={updateDebitOrder}
          onRemoveOrder={removeDebitOrder}
          onAddCategory={addCategory}
          onUpdateCategory={updateCategory}
          onRemoveCategory={removeCategory}
        />
      )}
    </div>
  )
}

// ─── Upload Statement Button ──────────────────────────────────
function UploadStatementButton({ month, onImport, setOpeningBalance }) {
  const [state, setState] = useState('idle')
  const [review, setReview] = useState(null)
  const [error, setError] = useState('')

  const handleFile = async (file) => {
    setState('uploading')
    setError('')
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      let binary = ''
      for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i])
      const base64 = btoa(binary)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-statement`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body: JSON.stringify({ file_base64: base64, mime_type: file.type }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Parse failed')
      const result = await res.json()
      setReview(result)
      setState('review')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  const handleConfirm = async () => {
    if (!review) return
    setState('saving')
    try {
      const { data: { user } } = await supabase.auth.getUser()

      // Get or create account for this month
      const { data: acc } = await supabase.from('budget_accounts').select('id').eq('name', 'Primary').eq('user_id', user.id).maybeSingle()
      const accountId = acc?.id || (await supabase.from('budget_accounts').insert({
        user_id: user.id,
        name: 'Primary',
        type: 'cheque',
      }).select().then(r => r.data?.[0]?.id))

      // Get categories to map names to IDs
      const { data: cats } = await supabase.from('budget_categories').select('id, name').eq('user_id', user.id)
      const catMap = Object.fromEntries((cats || []).map(c => [c.name, c.id]))

      // Set opening balance
      await setOpeningBalance(accountId, review.opening_balance)

      // Import transactions
      const txns = (review.transactions || []).map(t => ({
        account_id: accountId,
        date: t.date,
        description: t.description,
        amount: t.amount,
        type: t.type,
        category_id: catMap[t.suggested_category] || null,
      }))
      await onImport(txns)

      setReview(null)
      setState('idle')
      setError('')
    } catch (err) {
      setError(err.message)
      setState('error')
    }
  }

  if (state === 'review' && review) {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
        <div style={{ background: T.card, borderRadius: 10, padding: 20, maxWidth: 600, maxHeight: '80vh', overflow: 'auto', boxShadow: '0 20px 25px rgba(0,0,0,0.3)' }}>
          <h3 style={{ marginTop: 0 }}>Review Statement: {review.month}</h3>
          <div style={{ fontSize: 13, marginBottom: 16 }}>
            <div>Opening: R{review.opening_balance.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div>Transactions: {(review.transactions || []).length}</div>
          </div>
          <div style={{ maxHeight: 300, overflowY: 'auto', background: T.surface, borderRadius: 6, padding: 8, fontSize: 11, marginBottom: 16 }}>
            {(review.transactions || []).slice(0, 20).map((t, i) => (
              <div key={i} style={{ padding: 4, borderBottom: `1px solid ${T.border}` }}>
                {t.date} | {t.description.slice(0, 30)} | {t.type === 'debit' ? '−' : '+'}R{t.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | {t.suggested_category}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleConfirm}
              style={{ background: T.green, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}
            >
              {state === 'saving' ? 'Saving...' : 'Confirm & Import'}
            </button>
            <button
              onClick={() => setReview(null)}
              style={{ background: T.border, color: T.text, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', flex: 1 }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <label style={{ cursor: 'pointer' }}>
      <input type="file" accept=".csv,.pdf" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} style={{ display: 'none' }} />
      <button style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
        <Upload size={16} /> {state === 'uploading' ? 'Uploading...' : 'Upload Statement'}
      </button>
    </label>
  )
}

// ─── Transactions Tab ─────────────────────────────────────────
function TransactionsTab({ accounts, categories, transactions, onAdd, onRemove }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ account_id: '', date: '', description: '', amount: '', type: 'debit', category_id: '' })

  const handleSubmit = async () => {
    if (!form.account_id || !form.date || !form.amount) return
    await onAdd(form)
    setForm({ account_id: '', date: '', description: '', amount: '', type: 'debit', category_id: '' })
    setShowForm(false)
  }

  return (
    <div>
      <button
        onClick={() => setShowForm(!showForm)}
        style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        <Plus size={16} /> Add Transaction
      </button>

      {showForm && (
        <Card style={{ marginBottom: 16, padding: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
            <FormField label="Date">
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} style={inp} />
            </FormField>
            <FormField label="Account">
              <select value={form.account_id} onChange={(e) => setForm({ ...form, account_id: e.target.value })} style={inp}>
                <option value="">Select account</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label="Type">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} style={inp}>
                <option value="debit">Debit</option>
                <option value="credit">Credit</option>
              </select>
            </FormField>
            <FormField label="Amount">
              <input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={inp} placeholder="0.00" />
            </FormField>
            <FormField label="Category">
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} style={inp}>
                <option value="">None</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </FormField>
            <FormField label="Description">
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={inp} placeholder="Optional" />
            </FormField>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
            <button onClick={handleSubmit} style={{ background: T.green, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Save</button>
            <button onClick={() => setShowForm(false)} style={{ background: T.border, color: T.text, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', flex: 1 }}>Cancel</button>
          </div>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {transactions.length === 0 ? (
          <Empty title="No transactions" desc="Add a transaction or import a statement." />
        ) : (
          transactions.map(t => (
            <Card key={t.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{t.date}</div>
                <div style={{ fontSize: 12, color: T.textDim }}>{t.description}</div>
                {t.budget_categories && <div style={{ fontSize: 11, color: T.cyan }}>📌 {t.budget_categories.name}</div>}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: t.type === 'debit' ? T.red : T.green, minWidth: 80, textAlign: 'right' }}>
                {t.type === 'debit' ? '−' : '+'}R{parseFloat(t.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <button onClick={() => onRemove(t.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 16, marginLeft: 12 }}><Trash size={16} /></button>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Setup Tab ────────────────────────────────────────────────
function SetupTab({ accounts, orders, categories, onAddAccount, onRemoveAccount, onAddOrder, onRemoveOrder, onAddCategory, onRemoveCategory }) {
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountForm, setAccountForm] = useState({ name: '', type: 'cheque', bank: 'Discovery Bank', color: '#22d3ee' })

  const [showOrderForm, setShowOrderForm] = useState(false)
  const [orderForm, setOrderForm] = useState({ account_id: '', name: '', amount: '', category: '', day_of_month: '' })

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [categoryForm, setCategoryForm] = useState({ name: '', color: '#22d3ee', monthly_budget: '' })

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
      {/* Accounts */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>Accounts</h3>
        {showAccountForm && (
          <Card style={{ marginBottom: 12, padding: 12 }}>
            <FormField label="Name"><input type="text" value={accountForm.name} onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })} style={inp} /></FormField>
            <FormField label="Type">
              <select value={accountForm.type} onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value })} style={inp}>
                <option value="cheque">Cheque</option>
                <option value="savings">Savings</option>
                <option value="credit">Credit</option>
                <option value="loan">Loan</option>
                <option value="investment">Investment</option>
              </select>
            </FormField>
            <FormField label="Bank"><input type="text" value={accountForm.bank} onChange={(e) => setAccountForm({ ...accountForm, bank: e.target.value })} style={inp} /></FormField>
            <FormField label="Color">
              <input type="color" value={accountForm.color} onChange={(e) => setAccountForm({ ...accountForm, color: e.target.value })} style={{ ...inp, height: 34, cursor: 'pointer' }} />
            </FormField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={async () => { await onAddAccount(accountForm); setAccountForm({ name: '', type: 'cheque', bank: 'Discovery Bank', color: '#22d3ee' }); setShowAccountForm(false) }} style={{ background: T.green, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Save</button>
              <button onClick={() => setShowAccountForm(false)} style={{ background: T.border, color: T.text, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', flex: 1 }}>Cancel</button>
            </div>
          </Card>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {accounts.map(a => (
            <Card key={a.id} style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 11, color: T.textDim }}>{a.type} • {a.bank}</div>
              </div>
              <button onClick={() => onRemoveAccount(a.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer' }}><Trash size={16} /></button>
            </Card>
          ))}
        </div>
        {!showAccountForm && <button onClick={() => setShowAccountForm(true)} style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}><Plus size={16} /> Add Account</button>}
      </div>

      {/* Debit Orders */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>Debit Orders</h3>
        {showOrderForm && (
          <Card style={{ marginBottom: 12, padding: 12 }}>
            <FormField label="Account">
              <select value={orderForm.account_id} onChange={(e) => setOrderForm({ ...orderForm, account_id: e.target.value })} style={inp}>
                <option value="">Select</option>
                {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </FormField>
            <FormField label="Name"><input type="text" value={orderForm.name} onChange={(e) => setOrderForm({ ...orderForm, name: e.target.value })} style={inp} /></FormField>
            <FormField label="Amount"><input type="number" step="0.01" value={orderForm.amount} onChange={(e) => setOrderForm({ ...orderForm, amount: e.target.value })} style={inp} /></FormField>
            <FormField label="Category"><input type="text" value={orderForm.category} onChange={(e) => setOrderForm({ ...orderForm, category: e.target.value })} style={inp} placeholder="Bond, Medical, etc" /></FormField>
            <FormField label="Day of Month"><input type="number" min="1" max="31" value={orderForm.day_of_month} onChange={(e) => setOrderForm({ ...orderForm, day_of_month: e.target.value })} style={inp} /></FormField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={async () => { await onAddOrder(orderForm); setOrderForm({ account_id: '', name: '', amount: '', category: '', day_of_month: '' }); setShowOrderForm(false) }} style={{ background: T.green, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Save</button>
              <button onClick={() => setShowOrderForm(false)} style={{ background: T.border, color: T.text, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', flex: 1 }}>Cancel</button>
            </div>
          </Card>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {orders.map(o => (
            <Card key={o.id} style={{ padding: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{o.name}</div>
                <div style={{ fontSize: 11, color: T.textDim }}>R{parseFloat(o.amount).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} • Day {o.day_of_month || '—'} • {o.category || 'Uncategorized'}</div>
              </div>
              <button onClick={() => onRemoveOrder(o.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer' }}><Trash size={16} /></button>
            </Card>
          ))}
        </div>
        {!showOrderForm && <button onClick={() => setShowOrderForm(true)} style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}><Plus size={16} /> Add Debit Order</button>}
      </div>

      {/* Categories */}
      <div>
        <h3 style={{ marginTop: 0, marginBottom: 14 }}>Categories</h3>
        {showCategoryForm && (
          <Card style={{ marginBottom: 12, padding: 12 }}>
            <FormField label="Name"><input type="text" value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} style={inp} /></FormField>
            <FormField label="Color">
              <input type="color" value={categoryForm.color} onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })} style={{ ...inp, height: 34, cursor: 'pointer' }} />
            </FormField>
            <FormField label="Monthly Budget (optional)"><input type="number" step="0.01" value={categoryForm.monthly_budget} onChange={(e) => setCategoryForm({ ...categoryForm, monthly_budget: e.target.value })} style={inp} placeholder="Leave blank for no limit" /></FormField>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={async () => { await onAddCategory(categoryForm); setCategoryForm({ name: '', color: '#22d3ee', monthly_budget: '' }); setShowCategoryForm(false) }} style={{ background: T.green, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Save</button>
              <button onClick={() => setShowCategoryForm(false)} style={{ background: T.border, color: T.text, border: 'none', borderRadius: 6, padding: '8px 16px', fontSize: 13, cursor: 'pointer', flex: 1 }}>Cancel</button>
            </div>
          </Card>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          {categories.map(c => (
            <Card key={c.id} style={{ padding: 10, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: c.color }} />
                <span style={{ fontSize: 12, fontWeight: 600, flex: 1 }}>{c.name}</span>
                <button onClick={() => onRemoveCategory(c.id)} style={{ background: 'none', border: 'none', color: T.red, cursor: 'pointer', fontSize: 12 }}><X size={14} /></button>
              </div>
              {c.monthly_budget && <div style={{ fontSize: 11, color: T.textDim }}>Budget: R{parseFloat(c.monthly_budget).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>}
            </Card>
          ))}
        </div>
        {!showCategoryForm && <button onClick={() => setShowCategoryForm(true)} style={{ background: T.cyan, color: T.bg, border: 'none', borderRadius: 6, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 10, display: 'flex', alignItems: 'center', gap: 6, width: '100%', justifyContent: 'center' }}><Plus size={16} /> Add Category</button>}
      </div>
    </div>
  )
}
