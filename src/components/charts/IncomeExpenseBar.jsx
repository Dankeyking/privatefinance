import './setup.js'
import { Bar } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'

// Balkendiagramm je Person: Einnahmen, Ausgaben und Sparen.
//
// Sparen hat einen eigenen Balken, weil es vorher im Ausgaben-Balken steckte.
// Das las sich wie „alles weg" — dabei ist der Betrag ja noch da, nur auf
// einem anderen Konto. Die Farbe ist deshalb bewusst nicht rot.
export default function IncomeExpenseBar({ labels, income, expenses, savings }) {
  const datasets = [
    { label: 'Einnahmen', data: income, backgroundColor: '#16a34a', borderRadius: 6 },
    { label: 'Ausgaben', data: expenses, backgroundColor: '#dc2626', borderRadius: 6 },
  ]
  // Ohne Sparposten keinen leeren dritten Balken zeichnen.
  if (savings && savings.some((v) => v > 0)) {
    datasets.push({ label: 'Sparen', data: savings, backgroundColor: '#2563eb', borderRadius: 6 })
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
      // Design weiss ueber dem Diagramm. Halbdurchsichtig passt zu beidem.
      y: { ticks: { callback: (v) => `${v} €` }, grid: { color: 'rgba(148, 163, 184, 0.25)' } },
      x: { grid: { display: false } },
    },
  }

  return (
    <div className="chart-box">
      <Bar data={data} options={options} />
    </div>
  )
}
