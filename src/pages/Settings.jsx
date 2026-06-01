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

export default function Settings({ data, manual, onSave, onReset }) {
  const seed = () => ({
    accounts: (manual.accounts?.length ? manual.accounts : data.accounts).map((a) => ({
      id: a.id, name: a.name || '', owner: a.owner || '', type: a.type || 'personal', balance: a.balance ?? 0,
    })),
    orders: (manual.standingOrders ?? data.standingOrders ?? []).map((o) => ({
      id: o.id || newId(), recipient: o.recipient || '', amount: o.amount ?? 0, rhythm: o.rhythm || 'monthly',
      accountId: o.accountId || '', category: o.category || 'Sonstiges', executionDay: o.executionDay || 1,
    })),
    transfers: (manual.transfers ?? data.transfers ?? []).map((t) => ({
      id: t.id || newId(), recipient: t.recipient || '', amount: t.amount ?? 0,
      fromAccountId: t.fromAccountId || '', toAccountId: t.toAccountId || '', executionDay: t.executionDay || 1,
    })),
  })

  const [form, setForm] = useState(seed)
  const [saved, setSaved] = useState(false)

  const accounts = form.accounts
  const personalAccts = accounts.filter((a) => a.type === 'personal')
  const jointAccts = accounts.filter((a) => a.type === 'joint')

  const up = (patch) => { setForm((f) => ({ ...f, ...patch })); setSaved(false) }
  const setRow = (key, id, field, value) =>
    up({ [key]: form[key].map((r) => (r.id === id ? { ...r, [field]: value } : r)) })
  const delRow = (key, id) => up({ [key]: form[key].filter((r) => r.id !== id) })

  const addOrder = () =>
    up({ orders: [...form.orders, { id: newId(), recipient: '', amount: 0, rhythm: 'monthly', accountId: jointAccts[0]?.id || accounts[0]?.id || '', category: 'Sonstiges', executionDay: 1 }] })
  const addTransfer = () =>
    up({ transfers: [...form.transfers, { id: newId(), recipient: 'Haushaltsbeitrag', amount: 0, fromAccountId: personalAccts[0]?.id || '', toAccountId: jointAccts[0]?.id || '', executionDay: 1 }] })
  const addAccount = () =>
    up({ accounts: [...form.accounts, { id: newId(), name: 'Neues Konto', owner: '', type: 'personal', balance: 0 }] })

  function save() {
    const payload = {
      accounts: form.accounts.map((a) => ({ ...a, balance: Number(a.balance) || 0 })),
      standingOrders: form.orders.map((o) => ({
        ...o, amount: Number(o.amount) || 0, executionDay: Number(o.executionDay) || 1,
        nextExecution: nextExec(o.executionDay), monthInterval: o.rhythm === 'yearly' ? 12 : o.rhythm === 'quarterly' ? 3 : 1,
      })),
      transfers: form.transfers.map((t) => ({
        ...t, amount: Number(t.amount) || 0, executionDay: Number(t.executionDay) || 1, rhythm: 'monthly',
        nextExecution: nextExec(t.executionDay),
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

  const acctName = (id) => accounts.find((a) => a.id === id)?.name || '—'

  return (
    <div>
      <div className="page-header">
        <h1>Meine Daten</h1>
        <p>
          Konten, Daueraufträge und Beiträge selbst pflegen. Alles bleibt <strong>nur in deinem
          Browser</strong> (localStorage) – nichts wird hochgeladen. GoCardless-Umsätze (aus
          <code> public/data.json</code>) bleiben erhalten; hier ergänzt du die Struktur.
        </p>
      </div>

      <div className="privacy-note">
        🔒 Diese Daten verlassen dein Gerät nicht. Die öffentliche Seite zeigt für alle anderen
        weiterhin nur Demo-Daten.
      </div>

      {/* Konten */}
      <div className="card mt">
        <h2>Konten</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Name</th><th>Inhaber</th><th>Typ</th><th className="num">Saldo (€)</th><th></th></tr>
            </thead>
            <tbody>
              {form.accounts.map((a) => (
                <tr key={a.id}>
                  <td><input value={a.name} onChange={(e) => setRow('accounts', a.id, 'name', e.target.value)} /></td>
                  <td><input value={a.owner} onChange={(e) => setRow('accounts', a.id, 'owner', e.target.value)} /></td>
                  <td>
                    <select value={a.type} onChange={(e) => setRow('accounts', a.id, 'type', e.target.value)}>
                      <option value="joint">Gemeinschaft</option>
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
        <button className="btn add" onClick={addAccount}>+ Konto</button>
      </div>

      {/* Daueraufträge */}
      <div className="card mt">
        <h2>Daueraufträge (Fixkosten)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Empfänger</th><th className="num">Betrag</th><th>Rhythmus</th><th>Konto</th><th>Kategorie</th><th className="num">Tag</th><th></th></tr>
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
                  <td className="num"><input type="number" min="1" max="31" value={o.executionDay} onChange={(e) => setRow('orders', o.id, 'executionDay', e.target.value)} /></td>
                  <td className="num"><button className="btn-del" onClick={() => delRow('orders', o.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn add" onClick={addOrder}>+ Dauerauftrag</button>
      </div>

      {/* Beiträge */}
      <div className="card mt">
        <h2>Beiträge (Privat → Gemeinschaft)</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Bezeichnung</th><th className="num">Betrag</th><th>von</th><th>nach</th><th className="num">Tag</th><th></th></tr>
            </thead>
            <tbody>
              {form.transfers.map((t) => (
                <tr key={t.id}>
                  <td><input value={t.recipient} onChange={(e) => setRow('transfers', t.id, 'recipient', e.target.value)} /></td>
                  <td className="num"><input type="number" value={t.amount} onChange={(e) => setRow('transfers', t.id, 'amount', e.target.value)} /></td>
                  <td>
                    <select value={t.fromAccountId} onChange={(e) => setRow('transfers', t.id, 'fromAccountId', e.target.value)}>
                      {personalAccts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={t.toAccountId} onChange={(e) => setRow('transfers', t.id, 'toAccountId', e.target.value)}>
                      {jointAccts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td className="num"><input type="number" min="1" max="31" value={t.executionDay} onChange={(e) => setRow('transfers', t.id, 'executionDay', e.target.value)} /></td>
                  <td className="num"><button className="btn-del" onClick={() => delRow('transfers', t.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="btn add" onClick={addTransfer}>+ Beitrag</button>
      </div>

      <div className="settings-actions">
        <button className="btn-primary" onClick={save}>Speichern</button>
        <button className="btn" onClick={reset}>Auf Demo-Daten zurücksetzen</button>
        {saved && <span className="saved-hint">✓ Gespeichert (nur in diesem Browser)</span>}
      </div>
    </div>
  )
}
