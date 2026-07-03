import './setup.js'
import { Chart } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'

// Animiertes Sankey-Diagramm: Flussbreite ∝ monatlicher Betrag.
// Optional interaktiv: `selected` ({from,to}|null) hebt einen Fluss hervor
// (alle anderen werden ausgegraut), Klick auf einen Fluss ruft `onSelect` auf
// (erneuter Klick oder Klick ins Leere hebt die Auswahl auf).
export default function SankeyFlow({ flows, nodeColors, columns, labels, selected, onSelect }) {
  if (!flows || flows.length === 0) {
    return <p className="muted">Keine Flussdaten vorhanden.</p>
  }

  const colorOf = (name) => nodeColors[name] || '#94a3b8'
  const MUTED = 'rgba(148, 163, 184, 0.3)'
  const isSel = (f) => selected && f && f.from === selected.from && f.to === selected.to
  const anySel = Boolean(selected)

  const data = {
    datasets: [
      {
        data: flows,
        labels,
        colorFrom: (c) => {
          const f = c.dataset.data[c.dataIndex]
          return anySel && !isSel(f) ? MUTED : colorOf(f?.from)
        },
        colorTo: (c) => {
          const f = c.dataset.data[c.dataIndex]
          return anySel && !isSel(f) ? MUTED : colorOf(f?.to)
        },
        colorMode: 'gradient',
        column: columns,
        alpha: anySel ? 0.85 : 0.55,
        size: 'max',
        borderWidth: 0,
        nodeWidth: 14,
        padding: 26,
        font: { family: "'Inter Variable', 'Segoe UI', Roboto, sans-serif", size: 12, weight: '600' },
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { left: 4, right: 8, top: 6, bottom: 6 } },
    animation: { duration: 900, easing: 'easeOutQuart' },
    onClick: (evt, elements) => {
      if (!onSelect) return
      if (elements?.length) {
        const f = flows[elements[0].index]
        onSelect(isSel(f) ? null : { from: f.from, to: f.to })
      } else {
        onSelect(null)
      }
    },
    onHover: (evt, elements) => {
      const target = evt?.native?.target
      if (target) target.style.cursor = elements?.length && onSelect ? 'pointer' : 'default'
    },
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
