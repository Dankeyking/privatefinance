import { useMemo, useState } from 'react'
import { CATEGORIES, KEYWORD_RULES, SAVINGS_CATEGORY } from '../lib/categories.js'
import { monthlyByCategory } from '../lib/recurring.js'
import { formatEUR } from '../lib/normalize.js'
import { getCategories, categoryLabel, addCategory, updateCategory, removeCategory, isCustomCategory } from '../lib/categoryStore.js'

export default function Categories({ data, overrides, onResetAll, onClearOne }) {
  const itemsById = {}
  ;[...(data.standingOrders || []), ...(data.incomes || [])].forEach((i) => {
    itemsById[i.id] = i
  })
  const overrideEntries = Object.entries(overrides)

  const [list, setList] = useState(getCategories)

  // Was die Kategorien tatsächlich kosten – sonst ist die Seite eine reine
  // Stammdatenliste, ohne Bezug zum Geld.
  const byCategory = useMemo(() => monthlyByCategory(data, overrides), [data, overrides])
  const ranking = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
  const totalMonthly = ranking.reduce((s, [, v]) => s + v, 0)
  const top = ranking[0]
  const customCount = list.filter((c) => isCustomCategory(c.id)).length

  function editLabel(id, label) {
    updateCategory(id, { label })
    setList((l) => l.map((c) => (c.id === id ? { ...c, label } : c)))
  }
  function editColor(id, color) {
    updateCategory(id, { color })
    setList((l) => l.map((c) => (c.id === id ? { ...c, color } : c)))
  }
  function addNew() {
    addCategory('Neue Kategorie', '#64748b')
    setList(getCategories())
  }
  function remove(id) {
    if (removeCategory(id)) setList((l) => l.filter((c) => c.id !== id))
  }

  return (
    <div>
      <div className="page-header">
        <h1>Kategorien</h1>
        <p>
          Eigene Kategorien anlegen und Namen/Farben anpassen – zusätzlich zur
          Auto-Zuordnung per Schlüsselwort für die vordefinierten Kategorien.
        </p>
      </div>

      <div className="bento">
        <section className="bento-hero" aria-label="Größte Kategorie">
          <div className="bento-hero-label">Größte Kategorie</div>
          <div className="bento-hero-value">{top ? categoryLabel(top[0]) : '–'}</div>
          <p className="bento-hero-sub">
            {top
              ? <>{formatEUR(top[1])} im Monat – von {formatEUR(totalMonthly)} über {ranking.length} Kategorien.</>
              : <>Noch keine Posten mit Kategorie.</>}
          </p>
          <div className="bento-hero-split">
            {ranking.slice(1, 4).map(([id, amount]) => (
              <div className="bento-person" key={id}>
                <span className="bento-person-name">{categoryLabel(id)}</span>
                <span className="bento-person-value">{formatEUR(amount)}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="bento-tile">
          <div className="bento-label">Kategorien</div>
          <div className="bento-value">{list.length}</div>
          <div className="bento-hint">davon {customCount} eigene</div>
        </div>

        <div className="bento-tile">
          <div className="bento-label">Manuell zugeordnet</div>
          <div className="bento-value">{overrideEntries.length}</div>
          <div className="bento-hint">Posten mit eigener Kategorie</div>
        </div>
      </div>

      {/* Kategorien verwalten */}
      <div className="card">
        <div className="editor-head" style={{ marginBottom: 14 }}>
          <h2 style={{ margin: 0 }}>Alle Kategorien ({list.length})</h2>
          <button className="btn" onClick={addNew}>+ Kategorie</button>
        </div>
        <div className="table-wrap">
          <table className="resp-table">
            <thead>
              <tr><th>Farbe</th><th>Name</th><th></th><th></th></tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id}>
                  <td data-label="Farbe"><input type="color" className="color-input" value={c.color} onChange={(e) => editColor(c.id, e.target.value)} /></td>
                  <td data-label="Name"><input value={c.label} onChange={(e) => editLabel(c.id, e.target.value)} /></td>
                  <td data-label="" style={{ whiteSpace: 'nowrap' }}>
                    {!isCustomCategory(c.id) && <span className="pill fix">Standard</span>}
                    {c.id === SAVINGS_CATEGORY && <span className="pill sav" style={{ marginLeft: 6 }}>steuert Sparen</span>}
                  </td>
                  <td className="num" data-label="">
                    {isCustomCategory(c.id) ? (
                      <button className="btn-del" onClick={() => remove(c.id)} title="Löschen">✕</button>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }} title="Standard-Kategorien können nicht gelöscht werden">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 12 }}>
          Standard-Kategorien lassen sich umbenennen &amp; einfärben, aber nicht löschen. Die
          Kategorie „{categoryLabel(SAVINGS_CATEGORY)}" steuert, was als Sparen zählt (nicht als Kosten).
        </p>
      </div>

      <div className="card mt">
        <h2>Auto-Kategorisierung – Regeln</h2>
        <div className="rules-list">
          {CATEGORIES.map((c) => (
            <div className="card rule-card" key={c.id} style={{ boxShadow: 'none' }}>
              <h3>
                <span className="dot" style={{ width: 12, height: 12, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
                {categoryLabel(c.id)}
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
          Eigene Kategorien werden nicht automatisch zugeordnet – wähle sie manuell am Kategorie-Chip.
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
            <table className="resp-table">
              <thead>
                <tr><th>Empfänger</th><th>Manuelle Kategorie</th><th></th></tr>
              </thead>
              <tbody>
                {overrideEntries.map(([id, cat]) => (
                  <tr key={id}>
                    <td data-label="Empfänger">{itemsById[id]?.recipient || id}</td>
                    <td data-label="Manuelle Kategorie">{categoryLabel(cat)}</td>
                    <td className="num" data-label="">
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
