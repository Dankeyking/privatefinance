import { useMemo, useState } from 'react'
import KpiCard from '../components/KpiCard.jsx'
import InlineAmount from '../components/InlineAmount.jsx'
import Icon from '../components/Icon.jsx'
import { formatEUR, toMonthly, RHYTHM_LABELS } from '../lib/normalize.js'

let idc = 0
const newId = () => `d${Date.now()}${idc++}`

const emptyDebt = (accounts) => ({
  id: newId(),
  name: 'Neue Schuld',
  creditor: '',
  totalAmount: 0,
  remainingAmount: 0,
  rate: 0,
  rhythm: 'monthly',
  accountId: accounts[0]?.id || '',
})

export default function Debts({ data, onSaveDebts }) {
  const accounts = data.accounts || []
  const [debts, setDebts] = useState(() => (data.debts || []).map((d) => ({ ...d })))

  const totalRemaining = debts.reduce((s, d) => s + (Number(d.remainingAmount) || 0), 0)
  const monthlyRate = debts.reduce((s, d) => s + toMonthly(Number(d.rate) || 0, d.rhythm), 0)

  function persist(next) {
    setDebts(next)
    onSaveDebts?.(next)
  }
  function update(id, patch) {
    persist(debts.map((d) => (d.id === id ? { ...d, ...patch } : d)))
  }
  function remove(id) {
    if (!window.confirm('Diese Schuld wirklich löschen?')) return
    persist(debts.filter((d) => d.id !== id))
  }
  function add() {
    persist([...debts, emptyDebt(accounts)])
  }

  return (
    <div>
      <div className="page-header">
        <h1>Schulden</h1>
        <p>Offene Kredite und Schulden im Blick – Restbetrag, Rate und wem du sie schuldest.</p>
      </div>

      <div className="grid kpis">
        <KpiCard label="Restschulden gesamt" value={totalRemaining} tone="neg" hint={`${debts.length} Eintrag${debts.length === 1 ? '' : 'e'}`} />
        <KpiCard label="Rate gesamt / Monat" value={monthlyRate} tone="neg" />
      </div>

      <div className="editor-head mt" style={{ alignItems: 'center' }}>
        <h2 className="section-title" style={{ margin: 0 }}>Alle Schulden</h2>
        <button className="btn" onClick={add}>
          <Icon name="plus" size={15} /> Neue Schuld
        </button>
      </div>

      {debts.length === 0 ? (
        <div className="card mt">
          <p className="muted">Noch keine Schulden eingetragen. Klicke oben auf „Neue Schuld", um eine anzulegen.</p>
        </div>
      ) : (
        <div className="grid accounts mt">
          {debts.map((d) => {
            const total = Number(d.totalAmount) || 0
            const remaining = Number(d.remainingAmount) || 0
            const paidPct = total > 0 ? Math.min(100, Math.round(((total - remaining) / total) * 100)) : 0
            return (
              <div className="card acct" key={d.id}>
                <div className="editor-head" style={{ marginBottom: 4 }}>
                  <input
                    className="debt-name-input"
                    value={d.name}
                    placeholder="Bezeichnung"
                    onChange={(e) => update(d.id, { name: e.target.value })}
                  />
                  <button className="link-btn" onClick={() => remove(d.id)} title="Schuld löschen">✕</button>
                </div>
                <label className="debt-field">
                  <span className="muted" style={{ fontSize: 12 }}>Bei wem</span>
                  <input
                    value={d.creditor}
                    placeholder="z. B. Bank, Person …"
                    onChange={(e) => update(d.id, { creditor: e.target.value })}
                  />
                </label>

                <div className="acct-balance" style={{ marginTop: 10 }}>
                  <InlineAmount value={d.remainingAmount} onChange={(v) => update(d.id, { remainingAmount: v })} />
                  <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}> Restschuld</span>
                </div>

                {total > 0 && (
                  <div className="goal">
                    <div className="goal-bar">
                      <div className="goal-fill" style={{ width: `${paidPct}%`, background: 'var(--neg)' }} />
                    </div>
                    <div className="goal-sub muted">{paidPct} % abbezahlt</div>
                  </div>
                )}

                <div className="filters" style={{ marginTop: 12 }}>
                  <label>
                    Gesamtbetrag
                    <InlineAmount value={d.totalAmount} onChange={(v) => update(d.id, { totalAmount: v })} />
                  </label>
                  <label>
                    Rate
                    <InlineAmount value={d.rate} onChange={(v) => update(d.id, { rate: v })} />
                  </label>
                  <label>
                    Periode
                    <select value={d.rhythm} onChange={(e) => update(d.id, { rhythm: e.target.value })}>
                      {Object.entries(RHYTHM_LABELS).map(([id, label]) => (
                        <option key={id} value={id}>{label}</option>
                      ))}
                    </select>
                  </label>
                  {accounts.length > 0 && (
                    <label>
                      Konto
                      <select value={d.accountId || ''} onChange={(e) => update(d.id, { accountId: e.target.value })}>
                        <option value="">–</option>
                        {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </label>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
