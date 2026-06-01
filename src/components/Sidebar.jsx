const NAV = [
  { id: 'overview', label: 'Übersicht', ico: '📊' },
  { id: 'standing', label: 'Daueraufträge', ico: '🔁' },
  { id: 'analytics', label: 'Analyse', ico: '📈' },
  { id: 'categories', label: 'Kategorien', ico: '🏷️' },
]

export default function Sidebar({ page, onNavigate, source, onExport }) {
  return (
    <aside className="sidebar">
      <div className="brand">Private<span>Finance</span></div>
      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={page === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
          >
            <span className="ico">{item.ico}</span>
            {item.label}
          </button>
        ))}
      </nav>

      <span className={`source-badge ${source}`}>
        {source === 'live' ? '● Echte Daten' : '● Demo-/Mock-Daten'}
      </span>

      <button className="export-btn" onClick={onExport}>
        ⬇︎ Export für Claude
      </button>
      <div className="export-hint">
        Lädt eine JSON mit allen Daueraufträgen – inkl. Markierung, welche noch übers
        Privatkonto laufen. Gib sie Claude für eine Umstell-Empfehlung.
      </div>
    </aside>
  )
}
