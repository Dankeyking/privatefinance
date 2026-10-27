import './setup.js'
import { Chart } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'
import { tokens, readableOn } from '../../lib/palettes.js'

// Treemap: jede Kachel = ein Posten, Größe = Monatsbetrag, Farbe = Kategorie.
// items: [{ label, value, category, color }]
export default function CostTreemap({ items }) {
  if (!items || items.length === 0) return <p className="muted">Noch keine Kosten erfasst.</p>
  const t = tokens()

  const data = {
    datasets: [
      {
        type: 'treemap',
        tree: items,
        key: 'value',
        spacing: 2,
        borderWidth: 0,
        borderRadius: 5,
        backgroundColor: (ctx) => (ctx.type === 'data' ? ctx.raw._data.color : 'transparent'),
        labels: {
          display: true,
          overflow: 'hidden',
          // Schrift je Kachel, nicht pauschal weiß: im dunklen Design sind die
          // Kategoriefarben die helleren Varianten, auf denen weiße Schrift
          // untergeht.
          color: (ctx) => readableOn(ctx.type === 'data' ? ctx.raw._data.color : t.card),
          font: { size: 11, weight: '600', family: "-apple-system, 'Segoe UI', Roboto, sans-serif" },
          formatter: (ctx) => {
            const d = ctx.raw._data
            return [d.label, formatEUR(d.value)]
          },
        },
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: t.chart.tooltipBg,
        titleColor: t.chart.tooltipFg,
        bodyColor: t.chart.tooltipFg,
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        callbacks: {
          title: (items) => items[0]?.raw._data.label || '',
          label: (ctx) => {
            const d = ctx.raw._data
            return `${d.category} · ${formatEUR(d.value)}/Monat`
          },
        },
      },
    },
  }

  return (
    <div className="chart-box" style={{ height: 340 }}>
      <Chart type="treemap" data={data} options={options} />
    </div>
  )
}
