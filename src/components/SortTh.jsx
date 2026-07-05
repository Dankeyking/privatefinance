// Klickbare Tabellen-Kopfzelle mit Sortier-Pfeil.
export default function SortTh({ label, sortKey, sort, onSort, className = '' }) {
  const active = sort.key === sortKey
  return (
    <th className={`sortable-th ${className}`} onClick={() => onSort(sortKey)} title="Sortieren">
      {label}
      {active && <span className="sort-arrow">{sort.dir === 'asc' ? ' ▲' : ' ▼'}</span>}
    </th>
  )
}
