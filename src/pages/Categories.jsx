import { CATEGORIES, KEYWORD_RULES } from '../lib/categories.js'

export default function Categories({ data, overrides, onResetAll, onClearOne }) {
  const itemsById = {}
  ;[...(data.standingOrders || []), ...(data.transfers || []), ...(data.incomes || [])].forEach((i) => {
    itemsById[i.id] = i
  })
  const overrideEntries = Object.entries(overrides)

  return (
    <div>
      <div className="page-header">
        <h1>Kategorien</h1>
        <p>
          Vordefinierte Kategorien mit Auto-Zuordnung per Schlüsselwort. Manuelle Änderungen
          (in der Tabelle „Kosten &amp; Abos") überschreiben die Automatik und werden lokal gespeichert.
        </p>
      </div>

      <div className="card">
        <h2>Auto-Kategorisierung – Regeln</h2>
        <div className="rules-list">
          {CATEGORIES.map((c) => (
            <div className="card rule-card" key={c.id} style={{ boxShadow: 'none' }}>
              <h3>
                <span className="dot" style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                {c.label}
              </h3>
              {(KEYWORD_RULES[c.id] || []).length ? (
                (KEYWORD_RULES[c.id] || []).map((kw) => <span className="kw" key={kw}>{kw}</span>)
              ) : (
                <span className="muted" style={{ fontSize: 13 }}>Fallback – wenn keine andere Regel greift.</span>
              )}
            </div>
          ))}
        </div>
        <p className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          Erweitern: Schlüsselwörter in <code>src/lib/categories.js</code> (KEYWORD_RULES) ergänzen.
        </p>
      </div>

      <div className="card mt">
        <h2>
          Manuelle Overrides ({overrideEntries.length})
          {overrideEntries.length > 0 && (
            <button className="btn" style={{ float: 'right' }} onClick={onResetAll}>Alle zurücksetzen</button>
          )}
        </h2>
        {overrideEntries.length === 0 ? (
          <p className="muted">Noch keine manuellen Kategorie-Zuweisungen.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Empfänger</th><th>Manuelle Kategorie</th><th></th></tr>
              </thead>
              <tbody>
                {overrideEntries.map(([id, cat]) => (
                  <tr key={id}>
                    <td>{itemsById[id]?.recipient || id}</td>
                    <td>{cat}</td>
                    <td className="num">
                      <button className="btn" onClick={() => onClearOne(id)}>zurücksetzen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
