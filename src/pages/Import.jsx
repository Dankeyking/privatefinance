import { useMemo, useState } from 'react'
import { getCategories } from '../lib/categoryStore.js'
import { formatEUR, RHYTHM_LABELS, toMonthly } from '../lib/normalize.js'
import { formToOrder, newOrderId } from '../lib/orderForm.js'
import { personsFromAccounts } from '../lib/recurring.js'
import {
  parseCSV,
  guessMapping,
  parseTransactions,
  detectRecurring,
} from '../lib/csvImport.js'

const RHYTHMS = ['monthly', 'quarterly', 'yearly']
const MAP_FIELDS = [
  { key: 'date', label: 'Datum' },
  { key: 'recipient', label: 'Empfänger' },
  { key: 'amount', label: 'Betrag' },
  { key: 'purpose', label: 'Verwendungszweck' },
]

export default function Import({ data, onSaveOrders, onNavigate }) {
  const accounts = data.accounts || []
  const categories = getCategories()
  const persons = useMemo(() => personsFromAccounts(accounts), [accounts])
  const defaultAccount = accounts.find((a) => a.type === 'joint')?.id || accounts[0]?.id || ''

  const [raw, setRaw] = useState('')
  const [parsed, setParsed] = useState(null)
  const [mapping, setMapping] = useState(null)
  const [items, setItems] = useState([])
  const [txCount, setTxCount] = useState(0)
  const [done, setDone] = useState(null)

  function analyze(p, map) {
    const tx = parseTransactions(p.rows, map)
    setTxCount(tx.length)
    const rec = detectRecurring(tx)
    setItems(
      rec.map((r) => ({
        id: newOrderId(),
        include: true,
        recipient: r.recipient,
        amount: r.amount,
        rhythm: r.rhythm,
        kind: 'fixed',
        category: r.category,
        accountId: defaultAccount,
        splitMode: 'even',
        splitPerson: persons[0] || '',
        months: r.months,
      })),
    )
  }

  function handleParse(text) {
    const t = text ?? raw
    if (!t.trim()) return
    const p = parseCSV(t)
    const map = guessMapping(p.headers)
    setParsed(p)
    setMapping(map)
    setDone(null)
    analyze(p, map)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const text = await file.text()
    setRaw(text)
    handleParse(text)
  }

  const setItem = (id, field, value) =>
    setItems((list) => list.map((r) => (r.id === id ? { ...r, [field]: value } : r)))

  function doImport() {
    const chosen = items.filter((i) => i.include && i.recipient && Number(i.amount) > 0)
    const newOrders = chosen.map((i) =>
      formToOrder(
        {
          id: newOrderId(),
          recipient: i.recipient,
          amount: i.amount,
          rhythm: i.rhythm,
          accountId: i.accountId,
          category: i.category,
          kind: i.kind,
          executionDay: 1,
          splitMode: i.splitMode,
          splitPerson: i.splitPerson,
          splitShares: {},
        },
        persons,
      ),
    )
    onSaveOrders([...(data.standingOrders || []), ...newOrders])
    setDone(newOrders.length)
    setItems((list) => list.filter((i) => !i.include))
  }

  const includeCount = items.filter((i) => i.include).length
  // Was die Auswahl monatlich bedeutet – die eine Zahl, die vor dem
  // Übernehmen zählt.
  const selectedMonthly = items
    .filter((i) => i.include)
    .reduce((s, i) => s + toMonthly(Number(i.amount) || 0, i.rhythm), 0)

  return (
    <div>
      <div className="page-header">
        <h1>CSV-Import</h1>
        <p>
          Umsatz-Export deiner Bank (CSV) einlesen. Die App erkennt <strong>wiederkehrende
          Zahlungen</strong> und schlägt sie als Fixkosten/Abos vor – du wählst aus, ordnest
          Konto &amp; Aufteilung zu und übernimmst sie.
        </p>
      </div>

      <div className="privacy-note">
        🔒 Die CSV wird nur lokal im Browser verarbeitet – nichts wird hochgeladen.
      </div>

      {/* Eingabe */}
      <div className="card mt">
        <h2>1 · CSV laden</h2>
        <div className="import-input">
          <label className="btn add" style={{ marginTop: 0 }}>
            📄 Datei wählen
            <input type="file" accept=".csv,text/csv,text/plain" onChange={handleFile} style={{ display: 'none' }} />
          </label>
          <span className="muted" style={{ fontSize: 13 }}>oder CSV-Text einfügen:</span>
        </div>
        <textarea
          className="import-textarea"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={'Buchungstag;Empfänger;Verwendungszweck;Betrag\n01.05.2026;Netflix;Abo;-17,99\n…'}
        />
        <button className="btn-primary" onClick={() => handleParse()} style={{ marginTop: 10 }}>
          Einlesen
        </button>
      </div>

      {/* Mapping */}
      {parsed && parsed.headers.length > 0 && (
        <div className="card mt">
          <h2>2 · Spalten zuordnen</h2>
          <div className="filters">
            {MAP_FIELDS.map((f) => (
              <label key={f.key}>
                {f.label}
                <select
                  value={mapping[f.key]}
                  onChange={(e) => setMapping((m) => ({ ...m, [f.key]: Number(e.target.value) }))}
                >
                  <option value={-1}>—</option>
                  {parsed.headers.map((h, i) => (
                    <option key={i} value={i}>{h || `Spalte ${i + 1}`}</option>
                  ))}
                </select>
              </label>
            ))}
            <button className="btn" onClick={() => analyze(parsed, mapping)}>Erneut erkennen</button>
          </div>
          <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
            {txCount} Buchungen gelesen · {items.length} wiederkehrende Muster erkannt (über ≥ 2 Monate).
          </p>
        </div>
      )}

      {items.length > 0 && (
        <div className="bento">
          <section className="bento-hero" aria-label="Ausgewählte Posten">
            <div className="bento-hero-label">Auswahl kostet im Monat</div>
            <div className="bento-hero-value">{formatEUR(selectedMonthly)}</div>
            <p className="bento-hero-sub">
              {includeCount} von {items.length} erkannten Posten ausgewählt
              {txCount > 0 && <> · aus {txCount} Buchungen</>}. Jährliche Posten sind durch
              zwölf geteilt.
            </p>
          </section>

          <div className="bento-tile">
            <div className="bento-label">Erkannt</div>
            <div className="bento-value">{items.length}</div>
            <div className="bento-hint">wiederkehrende Muster</div>
          </div>

          <div className="bento-tile">
            <div className="bento-label">Ausgewählt</div>
            <div className="bento-value">{includeCount}</div>
            <div className="bento-bar">
              <span style={{ width: `${items.length ? (includeCount / items.length) * 100 : 0}%` }} />
            </div>
          </div>
        </div>
      )}

      {/* Vorschläge */}
      {parsed && (
        <div className="card mt">
          <h2>3 · Wiederkehrende Posten übernehmen</h2>
          {items.length === 0 ? (
            <p className="muted">
              Keine wiederkehrenden Ausgaben erkannt. Prüfe die Spaltenzuordnung oben – oder der
              Export umfasst zu wenige Monate (jährliche Posten erscheinen ggf. nur einmal).
            </p>
          ) : (
            <>
              <div className="table-wrap">
                <table className="resp-table">
                  <thead>
                    <tr>
                      <th><input type="checkbox" checked={includeCount === items.length}
                        onChange={(e) => setItems((l) => l.map((i) => ({ ...i, include: e.target.checked })))} /></th>
                      <th>Empfänger</th><th className="num">Betrag</th><th>Rhythmus</th>
                      <th>Art</th><th>Kategorie</th><th>Konto</th><th>Aufteilung</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((i) => (
                      <tr key={i.id} className={i.include ? '' : 'muted'}>
                        <td data-label="Übernehmen"><input type="checkbox" checked={i.include} onChange={(e) => setItem(i.id, 'include', e.target.checked)} /></td>
                        <td data-label="Empfänger"><input value={i.recipient} onChange={(e) => setItem(i.id, 'recipient', e.target.value)} /></td>
                        <td className="num" data-label="Betrag"><input type="number" value={i.amount} onChange={(e) => setItem(i.id, 'amount', e.target.value)} /></td>
                        <td data-label="Rhythmus">
                          <select value={i.rhythm} onChange={(e) => setItem(i.id, 'rhythm', e.target.value)}>
                            {RHYTHMS.map((r) => <option key={r} value={r}>{RHYTHM_LABELS[r]}</option>)}
                          </select>
                        </td>
                        <td data-label="Art">
                          <select value={i.kind} onChange={(e) => setItem(i.id, 'kind', e.target.value)}>
                            <option value="fixed">Fixkosten</option>
                            <option value="subscription">Abo</option>
                          </select>
                        </td>
                        <td data-label="Kategorie">
                          <select value={i.category} onChange={(e) => setItem(i.id, 'category', e.target.value)}>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
                          </select>
                        </td>
                        <td data-label="Konto">
                          <select value={i.accountId} onChange={(e) => setItem(i.id, 'accountId', e.target.value)}>
                            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                          </select>
                        </td>
                        <td data-label="Aufteilung">
                          <div className="split-cell">
                            <select value={i.splitMode} onChange={(e) => setItem(i.id, 'splitMode', e.target.value)}>
                              <option value="even">Gleich (alle)</option>
                              <option value="single">Eine Person</option>
                            </select>
                            {i.splitMode === 'single' && (
                              <select value={i.splitPerson} onChange={(e) => setItem(i.id, 'splitPerson', e.target.value)}>
                                {persons.map((p) => <option key={p} value={p}>{p}</option>)}
                              </select>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="settings-actions">
                <button className="btn-primary" onClick={doImport} disabled={includeCount === 0}>
                  {includeCount} Posten übernehmen
                </button>
                <span className="muted" style={{ fontSize: 12 }}>
                  Feineinstellung (Prozent/Betrag-Aufteilung) danach in der Übersicht.
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {/* Fest helle Werte (#bbf7d0/#f0fdf4) leuchteten im dunklen Design. */}
      {done != null && (
        <div className="card mt" style={{ borderColor: 'var(--ok-border)', background: 'var(--ok-soft)' }}>
          <strong style={{ color: 'var(--pos)' }}>✓ {done} Posten übernommen.</strong>{' '}
          <button className="btn" style={{ marginLeft: 8 }} onClick={() => onNavigate?.('overview')}>
            Zur Übersicht
          </button>
        </div>
      )}
    </div>
  )
}
