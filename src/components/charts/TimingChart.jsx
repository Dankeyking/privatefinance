import './setup.js'
import { Line } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'

// Cash-Flow-Verlauf des Gemeinschaftskontos über den Monat: laufender Saldo
// allein aus den Beiträgen (ab 0 €). Fläche unter 0 € = Gefahrenzone (ohne Puffer
// nicht gedeckt). Punkte markieren die Tage mit Buchungen/Beiträgen.
export default function TimingChart({ labels, flowOnly, events }) {
  // Pro Tag: gibt es eine Buchung, und in welche Richtung (netto)?
  const netByDay = {}
  events.forEach((e) => {
    netByDay[e.day] = (netByDay[e.day] || 0) + (e.kind === 'in' ? e.amount : -e.amount)
  })

  const data = {
    labels,
    datasets: [
      {
        label: 'Saldo aus Beiträgen',
        data: flowOnly,
        stepped: true,
        borderColor: '#0f766e',
        borderWidth: 2,
        fill: {
          target: 'origin',
          above: 'rgba(16, 185, 129, 0.16)',
          below: 'rgba(220, 38, 38, 0.20)',
        },
        pointRadius: (ctx) => (netByDay[labels[ctx.dataIndex]] !== undefined ? 5 : 0),
        pointHoverRadius: 7,
        pointBackgroundColor: (ctx) => {
          const net = netByDay[labels[ctx.dataIndex]]
          if (net === undefined) return 'transparent'
          return net >= 0 ? '#16a34a' : '#dc2626'
        },
        pointBorderColor: '#fff',
        pointBorderWidth: 1.5,
      },
    ],
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 800, easing: 'easeOutQuart' },
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items) => `Tag ${items[0].label}`,
          label: (c) => `Saldo (ab 0 €): ${formatEUR(c.parsed.y)}`,
          afterBody: (items) => {
            const day = Number(items[0].label)
            const todays = events.filter((e) => e.day === day)
            return todays.map(
              (e) => `${e.kind === 'in' ? '+' : '−'}${formatEUR(e.amount)}  ${e.label}`,
            )
          },
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
