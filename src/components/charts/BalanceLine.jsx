import './setup.js'
import { Line } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'

const LINE_COLORS = ['#3b82f6', '#0891b2', '#db2777', '#16a34a', '#d97706']

// Animiertes Liniendiagramm: Saldoverlauf je Konto über die Zeit.
// splitIndex (optional): ab diesem Punkt wird die Linie gestrichelt (= Prognose).
export default function BalanceLine({ labels, series, splitIndex }) {
  const hasForecast = typeof splitIndex === 'number' && splitIndex < labels.length - 1
  const data = {
    labels,
    datasets: series.map((s, i) => ({
      label: s.label,
      data: s.data,
      borderColor: LINE_COLORS[i % LINE_COLORS.length],
      backgroundColor: `${LINE_COLORS[i % LINE_COLORS.length]}22`,
      tension: 0.35,
      fill: true,
      pointRadius: (ctx) => (hasForecast && ctx.dataIndex > splitIndex ? 2 : 3),
      pointHoverRadius: 5,
      segment: hasForecast
        ? { borderDash: (ctx) => (ctx.p0DataIndex >= splitIndex ? [6, 5] : undefined) }
        : undefined,
    })),
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { callbacks: { label: (c) => `${c.dataset.label}: ${formatEUR(c.parsed.y)}` } },
    },
    scales: {
      y: { ticks: { callback: (v) => `${v} €` }, grid: { color: '#eef2f7' } },
      x: { grid: { display: false } },
    },
  }
  return (
    <div className="chart-box">
      <Line data={data} options={options} />
    </div>
  )
}
