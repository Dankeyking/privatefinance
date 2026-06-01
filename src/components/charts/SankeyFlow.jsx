import './setup.js'
import { Chart } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'

// Animiertes Sankey-Diagramm: Einkommen → Konten → Kategorien.
// Flussbreite ∝ monatlicher Betrag.
export default function SankeyFlow({ flows, nodeColors, columns }) {
  if (!flows || flows.length === 0) {
    return <p className="muted">Keine Flussdaten vorhanden.</p>
  }

  const colorOf = (name) => nodeColors[name] || '#94a3b8'

  const data = {
    datasets: [
      {
        data: flows,
        colorFrom: (c) => colorOf(c.dataset.data[c.dataIndex]?.from),
        colorTo: (c) => colorOf(c.dataset.data[c.dataIndex]?.to),
        colorMode: 'gradient',
        column: columns,
        alpha: 0.6,
        size: 'max',
        borderWidth: 0,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (c) => {
            const f = c.dataset.data[c.dataIndex]
            return `${f.from} → ${f.to}: ${formatEUR(f.flow)}`
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
