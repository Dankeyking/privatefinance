import { formatEUR } from '../lib/normalize.js'

// KPI-Karte mit Label + Wert. tone: 'pos' | 'neg' | undefined.
// trend (optional): { dir: 'up'|'down', text } zeigt eine Veränderung an.
export default function KpiCard({ label, value, tone, hint, trend }) {
  return (
    <div className="card kpi">
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
