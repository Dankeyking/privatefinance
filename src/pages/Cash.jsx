import { CATEGORIES, categoryColor } from '../lib/categories.js'
import { formatEUR, formatDate } from '../lib/normalize.js'
import { listWithdrawals, allocationTotal, withdrawalRemaining } from '../lib/cash.js'

let idc = 0
const newId = () => `c${Date.now()}${idc++}`
const DEFAULT_CAT = 'Sonstiges'

export default function Cash({ data, allocations, onSave }) {
  const withdrawals = listWithdrawals(data.transactions)
  const accById = Object.fromEntries((data.accounts || []).map((a) => [a.id, a]))

  const update = (txId, list) => onSave({ ...allocations, [txId]: list })

  function addRow(tx) {
    const list = allocations[tx.id] || []
    update(tx.id, [...list, { id: newId(), label: '', category: DEFAULT_CAT, amount: 0 }])
  }
  function removeRow(tx, allocId) {
    update(tx.id, (allocations[tx.id] || []).filter((a) => a.id !== allocId))
  }
  function setField(tx, allocId, field, value) {
    const W = Math.abs(tx.amount)
    const list = allocations[tx.id] || []
    const next = list.map((a) => {
      if (a.id !== allocId) return a
      if (field === 'amount') {
        const others = list.filter((x) => x.id !== allocId).reduce((s, x) => s + (Number(x.amount) || 0), 0)
        // Summe darf die Abhebung nicht übersteigen -> kappen
        const max = Math.max(0, Number((W - others).toFixed(2)))
        const val = Math.min(Math.max(0, Number(value) || 0), max)
        return { ...a, amount: val }
      }
      return { ...a, [field]: value }
    })
    update(tx.id, next)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Bargeld</h1>
        <p>
          Abhebungen aufteilen: ordne zu, wofür das abgehobene Bargeld ausgegeben wurde.
          Manuelle Ausgaben gibt es nur hier – und die Summe kann nie höher sein als die Abhebung.
        </p>
      </div>

      <div className="privacy-note">
        🔒 Die Aufteilungen bleiben nur in deinem Browser (localStorage) und fließen in die
        Kategorie-Auswertung ein. Der nicht zugeordnete Rest bleibt „Bargeld".
      </div>

      {withdrawals.length === 0 && (
        <div className="card mt"><p className="muted">Keine Bargeld-Abhebungen in den Daten gefunden.</p></div>
      )}

      {withdrawals.map((tx) => {
        const list = allocations[tx.id] || []
        const W = Math.abs(tx.amount)
        const used = allocationTotal(list)
        const remaining = withdrawalRemaining(tx, list)
        const pct = W > 0 ? Math.min(100, (used / W) * 100) : 0
        return (
          <div className="card mt cash-card" key={tx.id}>
            <div className="cash-head">
              <div>
                <div className="cash-title">Bargeldabhebung · {formatEUR(W)}</div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {formatDate(tx.date)} · {accById[tx.accountId]?.name || tx.accountId}
                </div>
              </div>
              <div className={`cash-remaining ${remaining === 0 ? 'done' : ''}`}>
                {remaining === 0 ? 'vollständig zugeordnet' : `${formatEUR(remaining)} übrig`}
              </div>
            </div>

            <div className="cash-bar">
              <div className="cash-fill" style={{ width: `${pct}%` }} />
            </div>

            {list.length > 0 && (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Wofür</th><th>Kategorie</th><th className="num">Betrag</th><th></th></tr>
                  </thead>
                  <tbody>
                    {list.map((a) => (
                      <tr key={a.id}>
                        <td><input value={a.label} placeholder="z. B. Bäcker, Markt …" onChange={(e) => setField(tx, a.id, 'label', e.target.value)} /></td>
                        <td>
                          <select value={a.category} onChange={(e) => setField(tx, a.id, 'category', e.target.value)}>
                            {CATEGORIES.filter((c) => c.id !== 'Bargeld').map((c) => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="num">
                          <input type="number" min="0" step="1" value={a.amount}
                            onChange={(e) => setField(tx, a.id, 'amount', e.target.value)} />
                        </td>
                        <td className="num"><button className="btn-del" onClick={() => removeRow(tx, a.id)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button className="btn add" onClick={() => addRow(tx)} disabled={remaining === 0}>
              + Aufteilung
            </button>
            {remaining === 0 && list.length > 0 && (
              <span className="muted" style={{ marginLeft: 12, fontSize: 13 }}>
                Abhebung vollständig aufgeteilt.
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}
