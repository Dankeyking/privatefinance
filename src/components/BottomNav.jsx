import Icon from './Icon.jsx'

// Navigation am unteren Rand, nur auf schmalen Bildschirmen sichtbar (CSS).
// Bewusst vier Ziele plus „Mehr": Das sind die Seiten, die man unterwegs
// wirklich aufruft. Alles Übrige (Konten, Import, Kategorien, Meine Daten)
// bleibt in der Schublade hinter „Mehr".
const ITEMS = [
  { id: 'overview', label: 'Übersicht', icon: 'overview' },
  { id: 'recurring', label: 'Kosten', icon: 'standing' },
  { id: 'debts', label: 'Schulden', icon: 'debt' },
  { id: 'analytics', label: 'Analyse', icon: 'analytics' },
]

export default function BottomNav({ page, onNavigate, onMore }) {
  return (
    <nav className="bottomnav" aria-label="Hauptnavigation">
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={page === item.id ? 'active' : ''}
          aria-current={page === item.id ? 'page' : undefined}
          onClick={() => onNavigate(item.id)}
        >
          <span className="bn-ico"><Icon name={item.icon} size={20} /></span>
          {item.label}
        </button>
      ))}
      <button type="button" onClick={onMore} aria-label="Weitere Bereiche öffnen">
        <span className="bn-ico"><Icon name="settings" size={20} /></span>
        Mehr
      </button>
    </nav>
  )
}
