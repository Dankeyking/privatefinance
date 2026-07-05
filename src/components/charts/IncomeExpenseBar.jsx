import './setup.js'
import { Bar } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'

// Animiertes Balkendiagramm: Einnahmen vs. Ausgaben (letzte 6 Monate).
export default function IncomeExpenseBar({ labels, income, expenses }) {
  const data = {
    labels,
    datasets: [
      { label: 'Einnahmen', data: income, backgroundColor: '#16a34a', borderRadius: 6 },
      { label: 'Ausgaben', data: expenses, backgroundColor: '#dc2626', borderRadius: 6 },
    ],
  }
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
      y: { ticks: { callback: (v) => `${v} €` }, grid: { color: '#eef2f7' } },
      x: { grid: { display: false } },
    },
  }
  return (
    <div className="chart-box">
      <Bar data={data} options={options} />
    </div>
  )
}
