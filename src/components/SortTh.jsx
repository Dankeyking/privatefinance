// Klickbare Tabellen-Kopfzelle mit Sortier-Pfeil.
export default function SortTh({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey
  return (
    <th className={`sortable-th ${className}`} onClick={() => onSort(sortKey)} title="Sortieren">
      {label}
      {/* Auch wenn nicht nach dieser Spalte sortiert wird, steht ein blasses
          Zeichen da: ohne das sah man den Koepfen nicht an, dass sie klickbar
          sind - die Sortierung war vorhanden, aber unsichtbar. */}
      {active
        ? <span className="sort-arrow">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>
        : <span className="sort-hint" aria-hidden="true"> ⇅</span>}
    </th>
  )
}
