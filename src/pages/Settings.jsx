import { useState } from 'react'
import { CATEGORIES } from '../lib/categories.js'

const RHYTHMS = [
  { id: 'monthly', label: 'monatlich' },
  { id: 'quarterly', label: 'vierteljährlich' },
  { id: 'yearly', label: 'jährlich' },
]

let idc = 0
const newId = () => `m${Date.now()}${idc++}`

function localISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function nextExec(day) {
  const t = new Date()
  const d = new Date(t.getFullYear(), t.getMonth(), Number(day) || 1)
  if (d <= t) d.setMonth(d.getMonth() + 1)
  return localISO(d)
}

// Aufteilung aus gespeichertem split-Objekt in Formularfelder zerlegen.
function splitToForm(split = { mode: 'even' }) {
  return {
    splitMode: split.mode || 'even',
    splitPerson: split.person || '',
    splitShares: { ...(split.shares || {}) },
  }
}

export default function Settings({ data, manual, onSave, onReset }) {
  const seed = () => ({
    accounts: (manual.accounts?.length ? manual.accounts : data.accounts).map((a) => ({
      id: a.id, name: a.name || '', owner: a.owner || '', type: a.type || 'personal', balance: a.balance ?? 0,
    })),
    incomes: (manual.incomes ?? data.incomes ?? []).map((i) => ({
      id: i.id || newId(), name: i.name || '', amount: i.amount ?? 0, rhythm: i.rhythm || 'monthly',
      accountId: i.accountId || '', executionDay: i.executionDay || 1,
    })),
    orders: (manual.standingOrders ?? data.standingOrders ?? []).map((o) => ({
      id: o.id || newId(), recipient: o.recipient || '', amount: o.amount ?? 0, rhythm: o.rhythm || 'monthly',
      accountId: o.accountId || '', category: o.category || 'Sonstiges', kind: o.kind || 'fixed', executionDay: o.executionDay || 1,
      ...splitToForm(o.split),
    })),
  })

  const [form, setForm] = useState(seed)
  const [saved, setSaved] = useState(false)

  const accounts = form.accounts
  const personalAccts = accounts.filter((a) => a.type === 'personal')
  const persons = [...new Set(personalAccts.map((a) => a.owner || a.name).filter(Boolean))]

  const up = (patch) => { setForm((f) => ({ ...f, ...patch })); setSaved(false) }
  const setRow = (key, id, field, value) =>
    up({ [key]: form[key].map((r) => (r.id === id ? { ...r, [field]: value } : r)) })
  const delRow = (key, id) => up({ [key]: form[key].filter((r) => r.id !== id) })
  const setShare = (id, person, value) =>
    up({ orders: form.orders.map((r) => (r.id === id ? { ...r, splitShares: { ...r.splitShares, [person]: value } } : r)) })

  const addIncome = () =>
    up({ incomes: [...form.incomes, { id: newId(), name: 'Gehalt', amount: 0, rhythm: 'monthly', accountId: personalAccts[0]?.id || accounts[0]?.id || '', executionDay: 1 }] })
  const addOrder = (kind) =>
    up({ orders: [...form.orders, { id: newId(), recipient: '', amount: 0, rhythm: 'monthly', accountId: accounts.find((a) => a.type === 'joint')?.id || accounts[0]?.id || '', category: 'Sonstiges', kind, executionDay: 1, splitMode: 'even', splitPerson: persons[0] || '', splitShares: {} }] })
  const addAccount = (type) =>
    up({ accounts: [...form.accounts, { id: newId(), name: type === 'joint' ? 'Neues gemeinsames Konto' : 'Neues Privatkonto', owner: type === 'joint' ? 'Gemeinsam' : '', type, balance: 0 }] })

  function buildSplit(o) {
    if (o.splitMode === 'single') return { mode: 'single', person: o.splitPerson || persons[0] || '' }
    if (o.splitMode === 'percent' || o.splitMode === 'amount') {
      const shares = {}
      persons.forEach((p) => { shares[p] = Number(o.splitShares?.[p]) || 0 })
      return { mode: o.splitMode, shares }
    }
    return { mode: 'even' }
  }

  function save() {
    const payload = {
      accounts: form.accounts.map((a) => ({
        ...a, balance: Number(a.balance) || 0, currency: 'EUR',
        owner: a.type === 'personal' ? (a.owner || a.name || 'Ich') : (a.owner || 'Gemeinsam'),
      })),
      incomes: form.incomes.map((i) => ({
        ...i, amount: Number(i.amount) || 0, executionDay: Number(i.executionDay) || 1,
      })),
      standingOrders: form.orders.map((o) => ({
        id: o.id, recipient: o.recipient, amount: Number(o.amount) || 0, rhythm: o.rhythm,
        accountId: o.accountId, category: o.category, kind: o.kind === 'subscription' ? 'subscription' : 'fixed',
        executionDay: Number(o.executionDay) || 1, split: buildSplit(o),
        nextExecution: nextExec(o.executionDay), monthInterval: o.rhythm === 'yearly' ? 12 : o.rhythm === 'quarterly' ? 3 : 1,
      })),
    }
    onSave(payload)
    setSaved(true)
  }
  function reset() {
    onReset()
    setForm(seed())
    setSaved(false)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Meine Daten</h1>
        <p>
          Konten, Einnahmen und Fixkosten/Abos selbst pflegen. Pro Posten legst du die
          <strong> Aufteilung</strong> fest (wer zahlt welchen Anteil) und das Abbuchungskonto –
          daraus berechnet die App Kosten je Person und den Geldfluss. Alles bleibt
          <strong> nur in deinem Browser</strong>.
        </p>
      </div>

      <div className="privacy-note">
        🔒 Diese Daten verlassen dein Gerät nicht. Die öffentliche Seite zeigt für alle anderen
        weiterhin nur die Startdaten.
      </div>

      {/* Konten */}
      <div className="card mt">
        <h2>Konten</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Inhaber</th><th>Typ</th><th className="num">Startsaldo (€)</th><th></th></tr>
            </thead>
            <tbody>
              {form.accounts.map((a) => (
                <tr key={a.id}>
                  <td><input value={a.name} onChange={(e) => setRow('accounts', a.id, 'name', e.target.value)} /></td>
                  <td><input value={a.owner} placeholder={a.type === 'personal' ? 'z. B. Elisa' : 'Gemeinsam'} onChange={(e) => setRow('accounts', a.id, 'owner', e.target.value)} /></td>
                  <td>
                    <select value={a.type} onChange={(e) => setRow('accounts', a.id, 'type', e.target.value)}>
                      <option value="joint">Gemeinsam</option>
                      <option value="personal">Privat</option>
                    </select>
                  </td>
                  <td className="num"><input type="number" value={a.balance} onChange={(e) => setRow('accounts', a.id, 'balance', e.target.value)} /></td>
                  <td className="num"><button className="btn-del" onClick={() => delRow('accounts', a.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn add" onClick={() => addAccount('personal')}>+ Privatkonto</button>
        <button className="btn add" onClick={() => addAccount('joint')}>+ Gemeinsames Konto</button>
      </div>

      {/* Einnahmen */}
      <div className="card mt">
        <h2>Einnahmen</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Bezeichnung</th><th className="num">Betrag</th><th>Rhythmus</th><th>Konto</th><th className="num">Tag</th><th></th></tr>
            </thead>
            <tbody>
              {form.incomes.map((i) => (
                <tr key={i.id}>
                  <td><input value={i.name} onChange={(e) => setRow('incomes', i.id, 'name', e.target.value)} /></td>
                  <td className="num"><input type="number" value={i.amount} onChange={(e) => setRow('incomes', i.id, 'amount', e.target.value)} /></td>
                  <td>
                    <select value={i.rhythm} onChange={(e) => setRow('incomes', i.id, 'rhythm', e.target.value)}>
                      {RHYTHMS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={i.accountId} onChange={(e) => setRow('incomes', i.id, 'accountId', e.target.value)}>
                      {personalAccts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td className="num"><input type="number" min="1" max="31" value={i.executionDay} onChange={(e) => setRow('incomes', i.id, 'executionDay', e.target.value)} /></td>
                  <td className="num"><button className="btn-del" onClick={() => delRow('incomes', i.id)}>✕</button></td>
                </tr>
              ))}
              {form.incomes.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 18 }}>Noch keine Einnahmen.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button className="btn add" onClick={addIncome}>+ Einnahme</button>
      </div>

      {/* Fixkosten & Abos */}
      <div className="card mt">
        <h2>Fixkosten & Abos</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Empfänger</th><th className="num">Betrag</th><th>Rhythmus</th><th>Konto</th>
                <th>Kategorie</th><th>Art</th><th className="num">Tag</th><th>Aufteilung</th><th></th>
              </tr>
            </thead>
            <tbody>
              {form.orders.map((o) => (
                <tr key={o.id}>
                  <td><input value={o.recipient} onChange={(e) => setRow('orders', o.id, 'recipient', e.target.value)} /></td>
                  <td className="num"><input type="number" value={o.amount} onChange={(e) => setRow('orders', o.id, 'amount', e.target.value)} /></td>
                  <td>
                    <select value={o.rhythm} onChange={(e) => setRow('orders', o.id, 'rhythm', e.target.value)}>
                      {RHYTHMS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={o.accountId} onChange={(e) => setRow('orders', o.id, 'accountId', e.target.value)}>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={o.category} onChange={(e) => setRow('orders', o.id, 'category', e.target.value)}>
                      {CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={o.kind} onChange={(e) => setRow('orders', o.id, 'kind', e.target.value)}>
                      <option value="fixed">Fixkosten</option>
                      <option value="subscription">Abo</option>
                    </select>
                  </td>
                  <td className="num"><input type="number" min="1" max="31" value={o.executionDay} onChange={(e) => setRow('orders', o.id, 'executionDay', e.target.value)} /></td>
                  <td>
                    <div className="split-cell">
                      <select value={o.splitMode} onChange={(e) => setRow('orders', o.id, 'splitMode', e.target.value)}>
                        <option value="even">Gleich (alle)</option>
                        <option value="single">Eine Person</option>
                        <option value="percent">Prozent</option>
                        <option value="amount">Beträge €</option>
                      </select>
                      {o.splitMode === 'single' && (
                        <select value={o.splitPerson} onChange={(e) => setRow('orders', o.id, 'splitPerson', e.target.value)}>
                          {persons.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      )}
                      {(o.splitMode === 'percent' || o.splitMode === 'amount') &&
                        persons.map((p) => (
                          <label key={p} className="split-share">
                            <span>{p}</span>
                            <input type="number" value={o.splitShares?.[p] ?? ''} onChange={(e) => setShare(o.id, p, e.target.value)} />
                            <span>{o.splitMode === 'percent' ? '%' : '€'}</span>
                          </label>
                        ))}
                    </div>
                  </td>
                  <td className="num"><button className="btn-del" onClick={() => delRow('orders', o.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn add" onClick={() => addOrder('fixed')}>+ Fixkosten</button>
        <button className="btn add" onClick={() => addOrder('subscription')}>+ Abo</button>
      </div>

      <div className="settings-actions">
        <button className="btn-primary" onClick={save}>Speichern</button>
        <button className="btn" onClick={reset}>Auf Startdaten zurücksetzen</button>
        {saved && <span className="saved-hint">✓ Gespeichert (nur in diesem Browser)</span>}
      </div>
    </div>
  )
}
