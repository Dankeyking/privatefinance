import { useEffect, useMemo, useRef, useState } from 'react'
import RecurringEditor from '../components/RecurringEditor.jsx'
import SortTh from '../components/SortTh.jsx'
import { orderToForm, formToOrder, newOrderId, parseAmountDE } from '../lib/orderForm.js'
import { ACCOUNT_PALETTE } from '../lib/accountColors.js'
import { sortRows, nextSortState } from '../lib/sorting.js'
import { downloadBackup, parseBackup, restoreBackup } from '../lib/backup.js'

const RHYTHMS = [
  { id: 'monthly', label: 'monatlich' },
  { id: 'quarterly', label: 'vierteljährlich' },
  { id: 'yearly', label: 'jährlich' },
]
const RHYTHM_RANK = { monthly: 0, quarterly: 1, yearly: 2 }

let idc = 0
const newId = () => `s${Date.now()}${idc++}`

const AUTOSAVE_DELAY = 800

export default function Settings({ data, manual, categoryOverrides, onSave, onReset, onNavigate }) {
  const seed = () => ({
    accounts: (manual.accounts?.length ? manual.accounts : data.accounts).map((a, i) => ({
      id: a.id, name: a.name || '', owner: a.owner || '', type: a.type || 'personal', balance: a.balance ?? 0,
      color: a.color || ACCOUNT_PALETTE[i % ACCOUNT_PALETTE.length], goal: a.goal ?? '',
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
  // 'idle' (noch nie geändert) | 'pending' (Änderung wartet auf Auto-Save) | 'saving' | 'saved'
  const [saveStatus, setSaveStatus] = useState('idle')
  const [backupError, setBackupError] = useState(null)
  const [acctSort, setAcctSort] = useState({ key: null, dir: 'asc' })
  const [incomeSort, setIncomeSort] = useState({ key: null, dir: 'asc' })
  const [transferSort, setTransferSort] = useState({ key: null, dir: 'asc' })

  const accounts = form.accounts
  const personalAccts = accounts.filter((a) => a.type === 'personal')
  const persons = [...new Set(personalAccts.map((a) => a.owner || a.name).filter(Boolean))]

  // Sortierwert je Spalte: Beträge numerisch, Rhythmus nach Häufigkeit,
  // Konto-Spalten nach Kontonamen, Rest alphabetisch.
  const numericKeys = new Set(['balance', 'goal', 'amount', 'executionDay'])
  const accNameById = (id) => accounts.find((a) => a.id === id)?.name || ''
  const sortValue = (r, k) => {
    if (numericKeys.has(k)) return parseAmountDE(r[k])
    if (k === 'rhythm') return RHYTHM_RANK[r.rhythm] ?? 0
    if (k === 'accountId' || k === 'fromAccountId' || k === 'toAccountId') return accNameById(r[k])
    return r[k] || ''
  }
  const sortedAccounts = useMemo(
    () => sortRows(form.accounts, acctSort.key, acctSort.dir, sortValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.accounts, acctSort],
  )
  const sortedIncomes = useMemo(
    () => sortRows(form.incomes, incomeSort.key, incomeSort.dir, sortValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.incomes, incomeSort, form.accounts],
  )
  const sortedTransfers = useMemo(
    () => sortRows(form.transfers, transferSort.key, transferSort.dir, sortValue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form.transfers, transferSort, form.accounts],
  )

  const up = (patch) => { setForm((f) => ({ ...f, ...patch })); setSaveStatus('pending') }
  const setRow = (key, id, field, value) =>
    up({ [key]: form[key].map((r) => (r.id === id ? { ...r, [field]: value } : r)) })
  const delRow = (key, id) => up({ [key]: form[key].filter((r) => r.id !== id) })

  const addIncome = () =>
    up({ incomes: [...form.incomes, { id: newId(), name: 'Gehalt', amount: 0, rhythm: 'monthly', accountId: personalAccts[0]?.id || accounts[0]?.id || '', executionDay: 1 }] })
  const addTransfer = () =>
    up({ transfers: [...form.transfers, { id: newId(), label: 'Umbuchung', amount: 0, fromAccountId: accounts[0]?.id || '', toAccountId: accounts.find((a) => a.type === 'joint')?.id || accounts[1]?.id || '', rhythm: 'monthly' }] })
  const addAccount = (type) =>
    up({ accounts: [...form.accounts, { id: newId(), name: type === 'joint' ? 'Neues gemeinsames Konto' : 'Neues Privatkonto', owner: type === 'joint' ? 'Gemeinsam' : '', type, balance: 0, color: ACCOUNT_PALETTE[form.accounts.length % ACCOUNT_PALETTE.length] }] })

  function buildPayload(f) {
    return {
      accounts: f.accounts.map((a) => ({
        ...a, balance: Number(a.balance) || 0, goal: Number(a.goal) || 0, currency: 'EUR',
        owner: a.type === 'personal' ? (a.owner || a.name || 'Ich') : (a.owner || 'Gemeinsam'),
      })),
      incomes: f.incomes.map((i) => ({
        ...i, amount: Number(i.amount) || 0, executionDay: Number(i.executionDay) || 1,
      })),
      standingOrders: f.orders.map((o) => formToOrder(o, persons)),
      transfers: f.transfers.map((t) => ({
        id: t.id, label: t.label, amount: parseAmountDE(t.amount),
        fromAccountId: t.fromAccountId, toAccountId: t.toAccountId, rhythm: t.rhythm,
      })),
    }
  }

  // Automatisches Speichern: Änderungen werden gesammelt und nach kurzer
  // Pause (kein weiterer Tastendruck) in einem Rutsch gespeichert – vermeidet
  // eine Server-Anfrage pro Tastendruck.
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    setSaveStatus('saving')
    const timer = setTimeout(async () => {
      await onSave(buildPayload(form))
      setSaveStatus('saved')
    }, AUTOSAVE_DELAY)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form])

  async function reset() {
    await onReset()
    setForm(seed())
    setSaveStatus('idle')
  }

  async function handleBackupFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBackupError(null)
    try {
      const json = parseBackup(await file.text())
      if (!window.confirm(
        'Backup einspielen? Das überschreibt deine aktuellen Konten, Einnahmen, ' +
        'Fixkosten/Abos, Umbuchungen und Kategorie-Zuordnungen.',
      )) return
      await restoreBackup(json)
      window.location.reload()
    } catch (err) {
      setBackupError(err.message || 'Datei konnte nicht gelesen werden.')
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Meine Daten</h1>
        <p>
          Konten (inkl. Farbe), Einnahmen, Fixkosten/Abos und Umbuchungen selbst pflegen. Pro Posten
          legst du die <strong>Aufteilung</strong> fest (wer zahlt welchen Anteil) und das
          Abbuchungskonto – daraus berechnet die App Kosten je Person und den Geldfluss. Änderungen
          werden automatisch gespeichert.
        </p>
      </div>

      <div className="privacy-note">
        🔒 Diese Daten sind durch deinen Login geschützt und nur für dich sichtbar (bzw. für alle,
        die sich dieselbe Gruppe teilen).
      </div>

      {/* Datensicherung */}
      <div className="card mt">
        <h2>Datensicherung</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Sichert alle eigenen Daten (Konten, Einnahmen, Fixkosten/Abos, Umbuchungen,
          Kategorie-Zuordnungen) als JSON-Datei – zum Übertragen auf ein anderes Gerät oder
          als Backup.
        </p>
        <div className="settings-actions">
          <button className="btn" onClick={() => downloadBackup(manual, categoryOverrides)}>⬇ Backup herunterladen</button>
          <label className="btn add" style={{ marginTop: 0 }}>
            ⬆ Backup importieren
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleBackupFile}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        {backupError && (
          <p style={{ color: 'var(--neg)', fontSize: 13, marginTop: 6 }}>{backupError}</p>
        )}
      </div>

      {/* Schulden */}
      <div className="card mt">
        <h2>Schulden</h2>
        <p className="muted" style={{ fontSize: 13, marginBottom: 12 }}>
          Kredite und Schulden mit Restbetrag, Rate und Gläubiger verwalten. Eine eigene Übersicht
          dafür erscheint automatisch in der Navigation und auf der Startseite, sobald du die erste
          Schuld eingetragen hast.
        </p>
        <button className="btn" onClick={() => onNavigate?.('debts')}>Schulden verwalten</button>
      </div>

      {/* Konten */}
      <div className="card mt">
        <h2>Konten</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Farbe</th>
                <SortTh label="Name" sortKey="name" sort={acctSort} onSort={(k) => setAcctSort((s) => nextSortState(s, k, false))} />
                <SortTh label="Inhaber" sortKey="owner" sort={acctSort} onSort={(k) => setAcctSort((s) => nextSortState(s, k, false))} />
                <SortTh label="Typ" sortKey="type" sort={acctSort} onSort={(k) => setAcctSort((s) => nextSortState(s, k, false))} />
                <SortTh label="Saldo (€)" sortKey="balance" sort={acctSort} onSort={(k) => setAcctSort((s) => nextSortState(s, k, true))} className="num" />
                <SortTh label="Sparziel (€)" sortKey="goal" sort={acctSort} onSort={(k) => setAcctSort((s) => nextSortState(s, k, true))} className="num" />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedAccounts.map((a) => (
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
                  <td className="num"><input type="number" value={a.goal} placeholder="—" onChange={(e) => setRow('accounts', a.id, 'goal', e.target.value)} /></td>
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
              <tr>
                <SortTh label="Bezeichnung" sortKey="name" sort={incomeSort} onSort={(k) => setIncomeSort((s) => nextSortState(s, k, false))} />
                <SortTh label="Betrag" sortKey="amount" sort={incomeSort} onSort={(k) => setIncomeSort((s) => nextSortState(s, k, true))} className="num" />
                <SortTh label="Rhythmus" sortKey="rhythm" sort={incomeSort} onSort={(k) => setIncomeSort((s) => nextSortState(s, k, false))} />
                <SortTh label="Konto" sortKey="accountId" sort={incomeSort} onSort={(k) => setIncomeSort((s) => nextSortState(s, k, false))} />
                <SortTh label="Tag" sortKey="executionDay" sort={incomeSort} onSort={(k) => setIncomeSort((s) => nextSortState(s, k, true))} className="num" />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedIncomes.map((i) => (
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
                      <option value="">– Konto wählen –</option>
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
              <tr>
                <SortTh label="Bezeichnung" sortKey="label" sort={transferSort} onSort={(k) => setTransferSort((s) => nextSortState(s, k, false))} />
                <SortTh label="Betrag" sortKey="amount" sort={transferSort} onSort={(k) => setTransferSort((s) => nextSortState(s, k, true))} className="num" />
                <SortTh label="von" sortKey="fromAccountId" sort={transferSort} onSort={(k) => setTransferSort((s) => nextSortState(s, k, false))} />
                <SortTh label="nach" sortKey="toAccountId" sort={transferSort} onSort={(k) => setTransferSort((s) => nextSortState(s, k, false))} />
                <SortTh label="Rhythmus" sortKey="rhythm" sort={transferSort} onSort={(k) => setTransferSort((s) => nextSortState(s, k, false))} />
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sortedTransfers.map((t) => (
                <tr key={t.id}>
                  <td><input value={t.label} placeholder="z. B. Sparen Urlaub" onChange={(e) => setRow('transfers', t.id, 'label', e.target.value)} /></td>
                  <td className="num"><input type="text" inputMode="decimal" value={t.amount} placeholder="0,00" onChange={(e) => setRow('transfers', t.id, 'amount', e.target.value)} /></td>
                  <td>
                    <select value={t.fromAccountId} onChange={(e) => setRow('transfers', t.id, 'fromAccountId', e.target.value)}>
                      <option value="">– Konto wählen –</option>
                      {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>
                  </td>
                  <td>
                    <select value={t.toAccountId} onChange={(e) => setRow('transfers', t.id, 'toAccountId', e.target.value)}>
                      <option value="">– Konto wählen –</option>
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
        <button className="btn" onClick={reset}>Auf Startdaten zurücksetzen</button>
        {saveStatus === 'saving' && <span className="saved-hint muted">Wird gespeichert …</span>}
        {saveStatus === 'saved' && <span className="saved-hint">✓ Gespeichert</span>}
      </div>
    </div>
  )
}
