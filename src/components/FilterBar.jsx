import { personsFromAccounts } from '../lib/recurring.js'
import { EMPTY_FILTER, isEmptyFilter } from '../lib/overviewFilter.js'

// Filterleiste als Chips. Bewusst keine Auswahlfelder: ein Chip zeigt den
// aktiven Zustand ohne Aufklappen, und auf dem Handy lässt sich die Zeile
// seitlich scrollen statt zu umbrechen.
export default function FilterBar({ data, value, onChange }) {
  const filter = value || EMPTY_FILTER
  const persons = personsFromAccounts(data.accounts || [])
  const accounts = data.accounts || []
  const set = (patch) => onChange({ ...filter, ...patch })

  return (
    <div className="filterbar" role="group" aria-label="Übersicht filtern">
      <div className="filterbar-group">
        <span className="filterbar-label">Person</span>
        <button type="button" className={`chip ${filter.person === 'all' ? 'on' : ''}`}
          aria-pressed={filter.person === 'all'} onClick={() => set({ person: 'all' })}>Beide</button>
        {persons.map((p) => (
          <button type="button" key={p} className={`chip ${filter.person === p ? 'on' : ''}`}
            aria-pressed={filter.person === p} onClick={() => set({ person: p })}>{p}</button>
        ))}
      </div>

      <div className="filterbar-group">
        <span className="filterbar-label">Art</span>
        <button type="button" className={`chip ${filter.kind === 'all' ? 'on' : ''}`}
          aria-pressed={filter.kind === 'all'} onClick={() => set({ kind: 'all' })}>Alles</button>
        <button type="button" className={`chip ${filter.kind === 'fixed' ? 'on' : ''}`}
          aria-pressed={filter.kind === 'fixed'} onClick={() => set({ kind: 'fixed' })}>Fixkosten</button>
        <button type="button" className={`chip ${filter.kind === 'subscription' ? 'on' : ''}`}
          aria-pressed={filter.kind === 'subscription'} onClick={() => set({ kind: 'subscription' })}>Abos</button>
      </div>

      <div className="filterbar-group">
        <label className="filterbar-label" htmlFor="fb-account">Konto</label>
        <select id="fb-account" className="chip chip-select" value={filter.accountId}
          onChange={(e) => set({ accountId: e.target.value })}>
          <option value="all">Alle Konten</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {!isEmptyFilter(filter) && (
        <button type="button" className="chip chip-reset" onClick={() => onChange(EMPTY_FILTER)}>
          Filter zurücksetzen
        </button>
      )}
    </div>
  )
}
