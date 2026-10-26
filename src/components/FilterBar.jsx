import { useEffect, useState } from 'react'
import { personsFromAccounts } from '../lib/recurring.js'
import { getCategories } from '../lib/categoryStore.js'
import {
  EMPTY_FILTER,
  KIND_OPTIONS,
  isEmptyFilter,
  activeFilterCount,
  filterSummary,
  normalizeFilter,
} from '../lib/viewFilter.js'

// Dieselbe Leiste auf Übersicht, Kosten & Abos, Schulden und Analyse; der
// Zustand liegt in App.jsx, damit der Filter beim Seitenwechsel stehen bleibt.
//
// Am Handy ist die Leiste zu breit: dort steht nur ein „Filter"-Knopf mit der
// Zahl der gesetzten Bedingungen, und die Bedienelemente liegen in einer
// Schublade am unteren Rand. Umschaltung über CSS, damit es keine zweite
// Zustandsquelle für die Bildschirmbreite gibt.

// Die Bedienelemente selbst – einmal geschrieben, zweimal eingehängt.
// `only` grenzt ein, was gezeigt wird: in der Leiste stehen nur Person und
// Art, weil man die ständig umschaltet. Konto, Kategorie und Suche füllten
// sonst vier Zeilen über dem Inhalt; sie liegen in derselben Schublade.
function Controls({ data, filter, onChange, idPrefix, only = 'all' }) {
  const persons = personsFromAccounts(data.accounts || [])
  const accounts = data.accounts || []
  const categories = getCategories()
  const set = (patch) => onChange({ ...filter, ...patch })

  return (
    <>
      {only !== 'rest' && persons.length > 0 && (
        <div className="filterbar-group">
          <span className="filterbar-label">Person</span>
          <button type="button" className={`chip ${filter.person === 'all' ? 'on' : ''}`}
            aria-pressed={filter.person === 'all'} onClick={() => set({ person: 'all' })}>Alle</button>
          {persons.map((p) => (
            <button type="button" key={p} className={`chip ${filter.person === p ? 'on' : ''}`}
              aria-pressed={filter.person === p} onClick={() => set({ person: p })}>{p}</button>
          ))}
        </div>
      )}

      {only !== 'rest' && (
      <div className="filterbar-group">
        <span className="filterbar-label">Art</span>
        {KIND_OPTIONS.map((k) => (
          <button type="button" key={k.id} className={`chip ${filter.kind === k.id ? 'on' : ''}`}
            aria-pressed={filter.kind === k.id} onClick={() => set({ kind: k.id })}>{k.label}</button>
        ))}
      </div>
      )}

      {only !== 'quick' && (
      <>

      <div className="filterbar-group">
        <label className="filterbar-label" htmlFor={`${idPrefix}-account`}>Konto</label>
        <select id={`${idPrefix}-account`} className="chip chip-select" value={filter.accountId}
          onChange={(e) => set({ accountId: e.target.value })}>
          <option value="all">Alle Konten</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="filterbar-group">
        <label className="filterbar-label" htmlFor={`${idPrefix}-category`}>Kategorie</label>
        <select id={`${idPrefix}-category`} className="chip chip-select" value={filter.category}
          onChange={(e) => set({ category: e.target.value })}>
          <option value="all">Alle Kategorien</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>

      <div className="filterbar-group">
        <label className="filterbar-label" htmlFor={`${idPrefix}-search`}>Suche</label>
        <input id={`${idPrefix}-search`} className="chip chip-input" value={filter.search}
          placeholder="Empfänger …" onChange={(e) => set({ search: e.target.value })} />
      </div>
      </>
      )}
    </>
  )
}

// Wie viele der Bedingungen hinter „Weitere Filter" sind gesetzt?
function restCount(filter) {
  let n = 0
  if (filter.accountId !== 'all') n++
  if (filter.category !== 'all') n++
  if (filter.search.trim()) n++
  return n
}

export default function FilterBar({ data, value, onChange }) {
  const filter = normalizeFilter(value)
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const count = activeFilterCount(filter)
  const empty = isEmptyFilter(filter)

  // Schließen mit Abwärtsbewegung, also auf demselben Weg, auf dem die
  // Schublade hereinkommt – darum der kurze Zwischenzustand.
  function close() {
    setClosing(true)
    window.setTimeout(() => {
      setClosing(false)
      setOpen(false)
    }, 200)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <>
      <div className="filterbar" role="group" aria-label="Ansicht filtern">
        <Controls data={data} filter={filter} onChange={onChange} idPrefix="fb" only="quick" />
        <button type="button" className={`chip chip-filter ${restCount(filter) ? 'on' : ''}`}
          onClick={() => setOpen(true)} aria-expanded={open}>
          Weitere Filter
          {restCount(filter) > 0 && <span className="chip-badge">{restCount(filter)}</span>}
        </button>
        {!empty && (
          <button type="button" className="chip chip-reset" onClick={() => onChange(EMPTY_FILTER)}>
            Filter zurücksetzen
          </button>
        )}
      </div>

      <div className="filterbar-compact">
        <button type="button" className={`chip chip-filter ${empty ? '' : 'on'}`}
          onClick={() => setOpen(true)} aria-expanded={open}>
          Filter{count > 0 && <span className="chip-badge">{count}</span>}
        </button>
        {!empty && (
          <>
            <span className="filterbar-summary">{filterSummary(filter, data)}</span>
            <button type="button" className="chip chip-reset" aria-label="Filter zurücksetzen"
              onClick={() => onChange(EMPTY_FILTER)}>✕</button>
          </>
        )}
      </div>

      {open && (
        <>
          <div className={`sheet-backdrop ${closing ? 'out' : ''}`} onClick={close} />
          <div className={`filter-sheet ${closing ? 'out' : ''}`} role="dialog" aria-modal="true"
            aria-label="Ansicht filtern">
            <div className="sheet-head">
              <strong>Filter</strong>
              {!empty && (
                <button type="button" className="link-btn" onClick={() => onChange(EMPTY_FILTER)}>
                  zurücksetzen
                </button>
              )}
              <button type="button" className="btn" onClick={close}>Fertig</button>
            </div>
            <div className="sheet-body">
              {/* Person und Art stehen am Rechner schon in der Leiste; dort
                  blendet CSS diesen Teil aus, am Handy ist er der Hauptteil. */}
              <div className="sheet-quick">
                <Controls data={data} filter={filter} onChange={onChange} idPrefix="fsq" only="quick" />
              </div>
              <Controls data={data} filter={filter} onChange={onChange} idPrefix="fs" only="rest" />
            </div>
          </div>
        </>
      )}
    </>
  )
}
