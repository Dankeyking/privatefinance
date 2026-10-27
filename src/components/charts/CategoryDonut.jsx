import './setup.js'
import { useRef } from 'react'
import { Doughnut } from 'react-chartjs-2'
import { getElementAtEvent } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'
import { tokens } from '../../lib/palettes.js'

// Animiertes Donut: Ausgaben je Kategorie. Klick auf Segment -> onSelect(index).
export default function CategoryDonut({ labels, values, colors, onSelect }) {
  const ref = useRef(null)

  // Segment-Rand in Kartenfarbe. Früher per getComputedStyle gelesen — das
  // geht nur, solange der Wert ein fertiger Farbwert ist, und nicht mehr,
  // sobald eine Palette ihn mischt. Jetzt direkt aus der Palette.
  const t = tokens()
  const ringBorder = t.card
  const data = {
    labels,
    datasets: [{ data: values, backgroundColor: colors, borderWidth: 2, borderColor: ringBorder }],
  }
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '62%',
    animation: { animateRotate: true, animateScale: true, duration: 800, easing: 'easeOutQuart' },
    plugins: {
      legend: { position: 'right' },
      tooltip: {
        backgroundColor: t.chart.tooltipBg,
        titleColor: t.chart.tooltipFg,
        bodyColor: t.chart.tooltipFg,
        callbacks: { label: (c) => `${c.label}: ${formatEUR(c.parsed)}` },
      },
    },
  }

  function handleClick(evt) {
    if (!ref.current || !onSelect) return
    const els = getElementAtEvent(ref.current, evt)
    if (els.length) onSelect(els[0].index)
  }

  return (
    <div className="chart-box">
      <Doughnut ref={ref} data={data} options={options} onClick={handleClick} />
    </div>
  )
}
