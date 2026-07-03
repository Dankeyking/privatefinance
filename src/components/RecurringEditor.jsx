import { useMemo, useState } from 'react'
import { getCategories } from '../lib/categoryStore.js'
import { makeNewOrder, parseAmountDE } from '../lib/orderForm.js'
import { sortRows, nextSortState } from '../lib/sorting.js'
import SortTh from './SortTh.jsx'

const RHYTHMS = [
  { id: 'monthly', label: 'monatlich' },
  { id: 'quarterly', label: 'vierteljährlich' },
  { id: 'yearly', label: 'jährlich' },
]

// Inline-editierbare Tabelle für Fixkosten & Abos inkl. Aufteilung.
// Voll kontrolliert: `orders` (Formularzeilen) rein, `onChange(next)` raus.
export default function RecurringEditor({ accounts, persons, orders, onChange }) {
  const categories = getCategories()
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const accName = (id) => accounts.find((a) => a.id === id)?.name || ''

  const set = (id, field, value) =>
    onChange(orders.map((r) => (r.id === id ? { ...r, [field]: value } : r)))
  const setShare = (id, person, value) =>
    onChange(orders.map((r) => (r.id === id ? { ...r, splitShares: { ...r.splitShares, [person]: value } } : r)))
  const del = (id) => onChange(orders.filter((r) => r.id !== id))
  const add = (kind) => onChange([...orders, makeNewOrder(kind, accounts)])

  const sorted = useMemo(() => {
    if (!sort.key) return orders
    return sortRows(orders, sort.key, sort.dir, (r, k) => {
      if (k === 'amount') return parseAmountDE(r.amount)
      if (k === 'accountId') return accName(r.accountId)
      return r[k] || ''
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orders, sort, accounts])

  return (
    <div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortTh label="Empfänger" sortKey="recipient" sort={sort} onSort={(k) => setSort((s) => nextSortState(s, k, false))} />
              <SortTh label="Betrag" sortKey="amount" sort={sort} onSort={(k) => setSort((s) => nextSortState(s, k, true))} className="num" />
              <th>Rhythmus</th>
              <SortTh label="Konto" sortKey="accountId" sort={sort} onSort={(k) => setSort((s) => nextSortState(s, k, false))} />
              <SortTh label="Kategorie" sortKey="category" sort={sort} onSort={(k) => setSort((s) => nextSortState(s, k, false))} />
              <SortTh label="Art" sortKey="kind" sort={sort} onSort={(k) => setSort((s) => nextSortState(s, k, false))} />
              <th className="num">Tag</th>
              <SortTh label="Ende" sortKey="endDate" sort={sort} onSort={(k) => setSort((s) => nextSortState(s, k, false))} />
              <th>Aufteilung</th><th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((o) => (
              <tr key={o.id}>
                <td><input value={o.recipient} placeholder="z. B. Netflix" onChange={(e) => set(o.id, 'recipient', e.target.value)} /></td>
                <td className="num"><input type="text" inputMode="decimal" value={o.amount} placeholder="0,00" onChange={(e) => set(o.id, 'amount', e.target.value)} /></td>
                <td>
                  <select value={o.rhythm} onChange={(e) => set(o.id, 'rhythm', e.target.value)}>
                    {RHYTHMS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                  </select>
                </td>
                <td>
                  <select value={o.accountId} onChange={(e) => set(o.id, 'accountId', e.target.value)}>
                    {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </td>
                <td>
                  <select value={o.category} onChange={(e) => set(o.id, 'category', e.target.value)}>
                    {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                </td>
                <td>
                  <select value={o.kind} onChange={(e) => set(o.id, 'kind', e.target.value)}>
                    <option value="fixed">Fixkosten</option>
                    <option value="subscription">Abo</option>
                  </select>
                </td>
                <td className="num"><input type="number" min="1" max="31" value={o.executionDay} onChange={(e) => set(o.id, 'executionDay', e.target.value)} /></td>
                <td><input type="date" value={o.endDate || ''} title="Optionales Enddatum (z. B. letzte Rate)" onChange={(e) => set(o.id, 'endDate', e.target.value)} /></td>
                <td>
                  <div className="split-cell">
                    <select value={o.splitMode} onChange={(e) => set(o.id, 'splitMode', e.target.value)}>
                      <option value="even">Gleich (alle)</option>
                      <option value="single">Eine Person</option>
                      <option value="percent">Prozent</option>
                      <option value="amount">Beträge €</option>
                    </select>
                    {o.splitMode === 'single' && (
                      <select value={o.splitPerson} onChange={(e) => set(o.id, 'splitPerson', e.target.value)}>
                        {persons.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    )}
                    {(o.splitMode === 'percent' || o.splitMode === 'amount') &&
                      persons.map((p) => (
                        <label key={p} className="split-share">
                          <span>{p}</span>
                          <input type="text" inputMode="decimal" value={o.splitShares?.[p] ?? ''} onChange={(e) => setShare(o.id, p, e.target.value)} />
                          <span>{o.splitMode === 'percent' ? '%' : '€'}</span>
                        </label>
                      ))}
                  </div>
                </td>
                <td className="num"><button className="btn-del" onClick={() => del(o.id)} title="Löschen">✕</button></td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={10} className="muted" style={{ textAlign: 'center', padding: 22 }}>
                Noch keine Fixkosten/Abos – füge unten welche hinzu.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
      <button className="btn add" onClick={() => add('fixed')}>+ Fixkosten</button>
      <button className="btn add" onClick={() => add('subscription')}>+ Abo</button>
    </div>
  )
}
