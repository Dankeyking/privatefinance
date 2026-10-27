import './setup.js'
import { Bar } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'
import { tokens } from '../../lib/palettes.js'

// Balkendiagramm je Person: Einnahmen, Ausgaben und Sparen.
//
// Sparen hat einen eigenen Balken, weil es vorher im Ausgaben-Balken steckte.
// Das las sich wie „alles weg" — dabei ist der Betrag ja noch da, nur auf
// einem anderen Konto. Die Farbe ist deshalb bewusst nicht rot.
//
// Die drei Farben kommen aus der gewählten Palette (--pos / --neg /
// --savings). Jede Palette verschiebt die Töne, aber nicht die Bedeutung:
// grün bleibt Einnahmen, rot bleibt Ausgaben, Sparen bleibt nicht-rot.
export default function IncomeExpenseBar({ labels, income, expenses, savings }) {
  const t = tokens()
  const datasets = [
    { label: 'Einnahmen', data: income, backgroundColor: t.pos, borderRadius: 6 },
    { label: 'Ausgaben', data: expenses, backgroundColor: t.neg, borderRadius: 6 },
  ]
  // Ohne Sparposten keinen leeren dritten Balken zeichnen.
  if (savings && savings.some((v) => v > 0)) {
    datasets.push({ label: 'Sparen', data: savings, backgroundColor: t.savings, borderRadius: 6 })
  }

  const data = { labels, datasets }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: { label: (c) => `${c.dataset.label}: ${formatEUR(c.parsed.y)}` },
      },
    },
    scales: {
      // Die Gitterfarbe war fest hell (#eef2f7) und leuchtete im dunklen
      // Design weiss ueber dem Diagramm. Jetzt kommt sie aus der Palette.
      y: { ticks: { callback: (v) => `${v} €` }, grid: { color: t.chart.grid } },
      x: { grid: { display: false } },
    },
  }

  return (
    <div className="chart-box">
      <Bar data={data} options={options} />
    </div>
  )
}
