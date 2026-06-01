import './setup.js'
import { Line } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'

// Verlauf des Gemeinschaftskonto-Saldos über den Monat (nach Ausführungstag).
// "Nur Beiträge (ab 0 €)" zeigt, wann es ohne Puffer negativ würde;
// "mit aktuellem Puffer" zeigt den realen Saldo.
export default function TimingChart({ labels, flowOnly, withBuffer }) {
  const data = {
    labels,
    datasets: [
      {
        label: 'Nur Beiträge (ab 0 €)',
        data: flowOnly,
        borderColor: '#d97706',
        backgroundColor: 'rgba(217, 119, 6, 0.12)',
        stepped: true,
        fill: true,
        pointRadius: 0,
      },
      {
        label: 'Mit aktuellem Puffer',
        data: withBuffer,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.08)',
        stepped: true,
        fill: false,
        pointRadius: 0,
        borderDash: [5, 4],
      },
    ],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'bottom' },
      tooltip: {
        callbacks: {
          title: (items) => `Tag ${items[0].label}`,
          label: (c) => `${c.dataset.label}: ${formatEUR(c.parsed.y)}`,
        },
      },
    },
    scales: {
      y: {
        ticks: { callback: (v) => `${v} €` },
        grid: {
          color: (ctx) => (ctx.tick.value === 0 ? '#dc2626' : '#eef2f7'),
          lineWidth: (ctx) => (ctx.tick.value === 0 ? 2 : 1),
        },
      },
      x: {
        title: { display: true, text: 'Tag im Monat' },
        grid: { display: false },
      },
    },
  }
  return (
    <div className="chart-box">
      <Line data={data} options={options} />
    </div>
  )
}
