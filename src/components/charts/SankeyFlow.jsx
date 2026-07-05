import './setup.js'
import { Chart } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'

// Animiertes Sankey-Diagramm: Einkommen → Privatkonten → Gemeinschaftskonto → Kategorien.
// Flussbreite ∝ monatlicher Betrag.
export default function SankeyFlow({ flows, nodeColors, columns, labels }) {
  if (!flows || flows.length === 0) {
    return <p className="muted">Keine Flussdaten vorhanden.</p>
  }

  const colorOf = (name) => nodeColors[name] || '#94a3b8'

  const data = {
    datasets: [
      {
        data: flows,
        labels,
        colorFrom: (c) => colorOf(c.dataset.data[c.dataIndex]?.from),
        colorTo: (c) => colorOf(c.dataset.data[c.dataIndex]?.to),
        colorMode: 'gradient',
        column: columns,
        alpha: 0.55,
        size: 'max',
        borderWidth: 0,
        nodeWidth: 14,
        padding: 26,
        font: { family: "-apple-system, 'Segoe UI', Roboto, sans-serif", size: 12, weight: '600' },
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 4, right: 8, top: 6, bottom: 6 } },
    animation: { duration: 900, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          label: (c) => {
            const f = c.dataset.data[c.dataIndex]
            return `${f.from} → ${f.to}: ${formatEUR(f.flow)}/Mt`
          },
        },
      },
    },
  }

  return (
    <div className="chart-box sankey">
      <Chart type="sankey" data={data} options={options} />
    </div>
  )
}
