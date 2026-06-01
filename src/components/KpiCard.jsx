import { formatEUR } from '../lib/normalize.js'

// KPI-Karte mit Label + Wert. tone: 'pos' | 'neg' | undefined.
export default function KpiCard({ label, value, tone, hint }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className={`kpi-value ${tone || ''}`}>{formatEUR(value)}</div>
      {hint && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{hint}</div>}
    </div>
  )
}
