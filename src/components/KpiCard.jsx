import { formatEUR } from '../lib/normalize.js'
import Icon from './Icon.jsx'

// KPI-Karte mit Label + Wert. tone: 'pos' | 'neg' | undefined.
// icon (optional): Icon-Name für das Symbol rechts oben.
// trend (optional): { dir: 'up'|'down', text } zeigt eine Veränderung an.
export default function KpiCard({ label, value, tone, hint, trend, icon }) {
  return (
    <div className="card kpi">
      {icon && <span className={`kpi-icon ${tone || ''}`}><Icon name={icon} size={17} /></span>}
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${tone || ''}`}>{formatEUR(value)}</div>
      {trend && (
        <div className={`kpi-trend ${trend.dir === 'down' ? 'neg' : trend.dir === 'up' ? 'pos' : ''}`}>
          {trend.dir === 'down' ? '▼' : trend.dir === 'up' ? '▲' : '▬'} {trend.text}
        </div>
      )}
      {hint && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
