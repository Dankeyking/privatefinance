import { useState } from 'react'
import RecurringEditor from '../components/RecurringEditor.jsx'
import { orderToForm, formToOrder, newOrderId, parseAmountDE } from '../lib/orderForm.js'
import { ACCOUNT_PALETTE } from '../lib/accountColors.js'

const RHYTHMS = [
  { id: 'monthly', label: 'monatlich' },
  { id: 'quarterly', label: 'vierteljährlich' },
  { id: 'yearly', label: 'jährlich' },
]

let idc = 0
const newId = () => `s${Date.now()}${idc++}`

export default function Settings({ data, manual, onSave, onReset }) {
  const seed = () => ({
    accounts: (manual.accounts?.length ? manual.accounts : data.accounts).map((a, i) => ({
      id: a.id, name: a.name || '', owner: a.owner || '', type: a.type || 'personal', balance: a.balance ?? 0,
      color: a.color || ACCOUNT_PALETTE[i % ACCOUNT_PALETTE.length],
    })),
    incomes: (manual.incomes ?? data.incomes ?? []).map((i) => ({
      id: i.id || newId(), name: i.name || '', amount: i.amount ?? 0, rhythm: i.rhythm || 'monthly',
      accountId: i.accountId || '', executionDay: i.executionDay || 1,
    })),
    orders: (manual.standingOrders ?? data.standingOrders ?? []).map(orderToForm),
    transfers: (manual.transfers ?? data.transfers ?? []).map((t) => ({
      id: t.id || newId(), label: t.label || '', amount: t.amount ?? 0,
      fromAccountId: t.fromAccountId || '', toAccountId: t.toAccountId || '', rhythm: t.rhythm || 'monthly',
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

  const addIncome = () =>
    up({ incomes: [...form.incomes, { id: newId(), name: 'Gehalt', amount: 0, rhythm: 'monthly', accountId: personalAccts[0]?.id || accounts[0]?.id || '', executionDay: 1 }] })
  const addTransfer = () =>
    up({ transfers: [...form.transfers, { id: newId(), label: 'Umbuchung', amount: 0, fromAccountId: accounts[0]?.id || '', toAccountId: accounts.find((a) => a.type === 'joint')?.id || accounts[1]?.id || '', rhythm: 'monthly' }] })
  const addAccount = (type) =>
    up({ accounts: [...form.accounts, { id: newId(), name: type === 'joint' ? 'Neues gemeinsames Konto' : 'Neues Privatkonto', owner: type === 'joint' ? 'Gemeinsam' : '', type, balance: 0, color: ACCOUNT_PALETTE[form.accounts.length % ACCOUNT_PALETTE.length] }] })

  function save() {
    const payload = {
      accounts: form.accounts.map((a) => ({
        ...a, balance: Number(a.balance) || 0, currency: 'EUR',
        owner: a.type === 'personal' ? (a.owner || a.name || 'Ich') : (a.owner || 'Gemeinsam'),
      })),
      incomes: form.incomes.map((i) => ({
        ...i, amount: Number(i.amount) || 0, executionDay: Number(i.executionDay) || 1,
      })),
      standingOrders: form.orders.map((o) => formToOrder(o, persons)),
      transfers: form.transfers.map((t) => ({
        id: t.id, label: t.label, amount: parseAmountDE(t.amount),
        fromAccountId: t.fromAccountId, toAccountId: t.toAccountId, rhythm: t.rhythm,
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
          Konten (inkl. Farbe), Einnahmen, Fixkosten/Abos und Umbuchungen selbst pflegen. Pro Posten
          legst du die <strong>Aufteilung</strong> fest (wer zahlt welchen Anteil) und das
          Abbuchungskonto – daraus berechnet die App Kosten je Person und den Geldfluss. Alles bleibt
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
              <tr><th>Farbe</th><th>Name</th><th>Inhaber</th><th>Typ</th><th className="num">Startsaldo (€)</th><th></th></tr>
            </thead>
            <tbody>
              {form.accounts.map((a) => (
                <tr key={a.id}>
                  <td><input type="color" className="color-input" value={a.color || '#3b82f6'} onChange={(e) => setRow('accounts', a.id, 'color', e.target.value)} /></td>
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
        <RecurringEditor
          accounts={form.accounts}
          persons={persons}
          orders={form.orders}
          onChange={(next) => up({ orders: next })}
        />
      </div>

      {/* Umbuchungen */}
      <div className="card mt">
        <h2>Umbuchungen <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(Überträge zwischen Konten, z. B. Sparen)</span></h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>Bezeichnung</th><th className="num">Betrag</th><th>von</th><th>nach</th><th>Rhythmus</th><th></th></tr>
            </thead>
            <tbody>
              {form.transfers.map((t) => (
                <tr key={t.id}>
                  <td><input value={t.label} placeholder="z. B. Sparen Urlaub" onChange={(e) => setRow('transfers', t.id, 'label', e.target.value)} /></td>
                  <td className="num"><input type="text" inputMode="decimal" value={t.amount} placeholder="0,00" onChange={(e) => setRow('transfers', t.id, 'amount', e.target.value)} /></td>
                  <td>
                    <select value={t.fromAccountId} onChange={(e) => setRow('transfers', t.id, 'fromAccountId', e.target.value)}>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={t.toAccountId} onChange={(e) => setRow('transfers', t.id, 'toAccountId', e.target.value)}>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={t.rhythm} onChange={(e) => setRow('transfers', t.id, 'rhythm', e.target.value)}>
                      {RHYTHMS.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="num"><button className="btn-del" onClick={() => delRow('transfers', t.id)}>✕</button></td>
                </tr>
              ))}
              {form.transfers.length === 0 && (
                <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 18 }}>Noch keine Umbuchungen.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <button className="btn add" onClick={addTransfer}>+ Umbuchung</button>
      </div>

      <div className="settings-actions">
        <button className="btn-primary" onClick={save}>Speichern</button>
        <button className="btn" onClick={reset}>Auf Startdaten zurücksetzen</button>
        {saved && <span className="saved-hint">✓ Gespeichert (nur in diesem Browser)</span>}
      </div>
    </div>
  )
}
