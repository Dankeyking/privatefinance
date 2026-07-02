import { useMemo, useState } from 'react'
import CostsTable from '../components/CostsTable.jsx'
import { CATEGORIES } from '../lib/categories.js'
import { toMonthly, formatEUR } from '../lib/normalize.js'
import { orderToForm, formToOrder, parseAmountDE } from '../lib/orderForm.js'
import { personsFromAccounts } from '../lib/recurring.js'

const KIND_OPTS = [
  { id: 'all', label: 'Alle Arten' },
  { id: 'fixed', label: 'Fixkosten' },
  { id: 'subscription', label: 'Abos' },
  { id: 'savings', label: 'Sparen' },
]

// Ist eine Person an einem Posten beteiligt (gemäß Aufteilung)?
function involves(o, person) {
  const mode = o.splitMode || 'even'
  if (mode === 'even') return true
  if (mode === 'single') return o.splitPerson === person
  return Number(o.splitShares?.[person]) > 0
}

export default function StandingOrders({ data, onSaveOrders }) {
  const persons = useMemo(() => personsFromAccounts(data.accounts), [data.accounts])
  const accounts = data.accounts || []
  const [orders, setOrders] = useState(() => (data.standingOrders || []).map(orderToForm))

  const [fKind, setFKind] = useState('all')
  const [fAccount, setFAccount] = useState('all')
  const [fCategory, setFCategory] = useState('all')
  const [fPerson, setFPerson] = useState('all')
  const [search, setSearch] = useState('')

  const handleChange = (next) => {
    setOrders(next)
    onSaveOrders?.(next.map((o) => formToOrder(o, persons)))
  }

  const predicate = (o) => {
    if (fKind !== 'all' && (o.kind || 'fixed') !== fKind) return false
    if (fAccount !== 'all' && o.accountId !== fAccount) return false
    if (fCategory !== 'all' && o.category !== fCategory) return false
    if (fPerson !== 'all' && !involves(o, fPerson)) return false
    if (search.trim() && !(o.recipient || '').toLowerCase().includes(search.trim().toLowerCase())) return false
    return true
  }

  // Live-Aufschlüsselung (aus dem Entwurf, damit sie sofort mitzieht).
  const sums = useMemo(() => {
    const acc = { fixed: 0, sub: 0, savings: 0, count: orders.length }
    orders.forEach((o) => {
      const m = toMonthly(parseAmountDE(o.amount), o.rhythm)
      if (o.kind === 'savings') acc.savings += m
      else if (o.kind === 'subscription') acc.sub += m
      else acc.fixed += m
    })
    return acc
  }, [orders])

  const visibleCount = orders.filter(predicate).length
  const filtered = fKind !== 'all' || fAccount !== 'all' || fCategory !== 'all' || fPerson !== 'all' || search.trim()

  return (
    <div>
      <div className="page-header">
        <h1>Kosten &amp; Abos</h1>
        <p>
          Fixkosten, Abos und Sparen <strong>anlegen, bearbeiten und aufteilen</strong>. Änderungen
          werden automatisch gespeichert (nur in diesem Browser) und fließen sofort in alle
          Auswertungen ein.
        </p>
      </div>

      <div className="card">
        <div className="editor-head" style={{ marginBottom: 14 }}>
          <div>
            <h2 style={{ margin: 0 }}>Alle Posten</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              {sums.count} Posten · Fixkosten {formatEUR(sums.fixed)} · Abos {formatEUR(sums.sub)} · Sparen {formatEUR(sums.savings)}
              {filtered && ` · ${visibleCount} sichtbar`}
            </span>
          </div>
        </div>

        <div className="filters">
          <label>
            Art
            <select value={fKind} onChange={(e) => setFKind(e.target.value)}>
              {KIND_OPTS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}
            </select>
          </label>
          <label>
            Konto
            <select value={fAccount} onChange={(e) => setFAccount(e.target.value)}>
              <option value="all">Alle Konten</option>
              {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </label>
          <label>
            Kategorie
            <select value={fCategory} onChange={(e) => setFCategory(e.target.value)}>
              <option value="all">Alle Kategorien</option>
              {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </label>
          {persons.length > 0 && (
            <label>
              Person
              <select value={fPerson} onChange={(e) => setFPerson(e.target.value)}>
                <option value="all">Alle</option>
                {persons.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
          )}
          <label>
            Suche
            <input value={search} placeholder="Empfänger…" onChange={(e) => setSearch(e.target.value)} style={{ minWidth: 140 }} />
          </label>
          {filtered && (
            <button className="btn" onClick={() => { setFKind('all'); setFAccount('all'); setFCategory('all'); setFPerson('all'); setSearch('') }}>
              Filter zurücksetzen
            </button>
          )}
        </div>

        <CostsTable
          accounts={data.accounts}
          persons={persons}
          orders={orders}
          onChange={handleChange}
          filter={predicate}
        />
        <p className="muted" style={{ fontSize: 12, marginTop: 14 }}>
          Tipp: <strong>Auf eine Zelle klicken</strong>, um sie zu bearbeiten. Unter <em>Art</em>
          wählst du <strong>Fixkosten</strong>, <strong>Abo</strong> oder <strong>Sparen</strong> –
          Sparen zählt nicht als Kosten, sondern als Rücklage.
        </p>
      </div>
    </div>
  )
}
