import Icon from './Icon.jsx'

const NAV = [
  { id: 'overview', label: 'Übersicht', icon: 'overview' },
  { id: 'accounts', label: 'Konten', icon: 'cash' },
  { id: 'recurring', label: 'Kosten & Abos', icon: 'standing' },
  { id: 'import', label: 'CSV-Import', icon: 'export' },
  { id: 'analytics', label: 'Analyse', icon: 'analytics' },
  { id: 'categories', label: 'Kategorien', icon: 'categories' },
  { id: 'settings', label: 'Meine Daten', icon: 'settings' },
]

export default function Sidebar({ page, onNavigate, source, hasManual, onExport, open, onClose }) {
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
        Private<span>Finance</span>
        <button className="sidebar-close" onClick={onClose} aria-label="Menü schließen">✕</button>
      </div>
      <nav className="nav">
        {NAV.map((item) => (
          <button
            key={item.id}
            className={page === item.id ? 'active' : ''}
            onClick={() => onNavigate(item.id)}
          >
            <span className="ico"><Icon name={item.icon} /></span>
            {item.label}
          </button>
        ))}
      </nav>

      <span className={`source-badge ${hasManual ? 'live' : source}`}>
        {hasManual ? '● Eigene Daten' : '● Demo-/Mock-Daten'}
      </span>

      <button className="export-btn" onClick={onExport}>
        <Icon name="export" size={16} /> Export für Claude
      </button>
      <div className="export-hint">
        Lädt eine JSON mit Konten, Einnahmen, Fixkosten/Abos und Kosten je Konto/Person.
        Gib sie Claude für eine Auswertung deines Haushalts.
      </div>
    </aside>
  )
}
