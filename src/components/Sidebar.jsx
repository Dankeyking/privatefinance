import Icon from './Icon.jsx'

// Navigation in Gruppen: Dashboard, Planen (Daten pflegen), Auswerten, Verwaltung.
// "Schulden" wird nur eingeblendet, wenn tatsächlich welche eingetragen sind (siehe hasDebts).
function buildNavGroups(hasDebts) {
  return [
    {
      label: null,
      items: [{ id: 'overview', label: 'Übersicht', icon: 'overview' }],
    },
    {
      label: 'Planen',
      items: [
        { id: 'accounts', label: 'Konten', icon: 'cash' },
        { id: 'recurring', label: 'Kosten & Abos', icon: 'standing' },
        ...(hasDebts ? [{ id: 'debts', label: 'Schulden', icon: 'debt' }] : []),
      ],
    },
    {
      label: 'Auswerten',
      items: [{ id: 'analytics', label: 'Analyse', icon: 'analytics' }],
    },
    {
      label: 'Daten',
      items: [
        { id: 'import', label: 'CSV-Import', icon: 'export' },
        { id: 'categories', label: 'Kategorien', icon: 'categories' },
        { id: 'settings', label: 'Meine Daten', icon: 'settings' },
      ],
    },
  ]
}

export default function Sidebar({ page, onNavigate, source, hasManual, hasDebts, onExport, open, onClose, theme, onToggleTheme }) {
  const navGroups = buildNavGroups(hasDebts)
  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
      <div className="brand">
        <span className="brand-mark">€</span>
        <span className="brand-name">Private<span>Finance</span></span>
        <button className="sidebar-close" onClick={onClose} aria-label="Menü schließen">✕</button>
      </div>
      <nav className="nav">
        {navGroups.map((g, gi) => (
          <div className="nav-group" key={gi}>
            {g.label && <div className="nav-group-label">{g.label}</div>}
            {g.items.map((item) => (
              <button
                key={item.id}
                className={page === item.id ? 'active' : ''}
                onClick={() => onNavigate(item.id)}
              >
                <span className="ico"><Icon name={item.icon} /></span>
                {item.label}
              </button>
            ))}
          </div>
        ))}
      </nav>

      <button className="theme-toggle" onClick={onToggleTheme}>
        <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={15} />
        {theme === 'dark' ? 'Helles Design' : 'Dunkles Design'}
      </button>

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
