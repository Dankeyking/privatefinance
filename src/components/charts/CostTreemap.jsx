import './setup.js'
import { useMemo } from 'react'
import { Chart } from 'react-chartjs-2'
import { formatEUR } from '../../lib/normalize.js'
import { categoryColor } from '../../lib/categoryStore.js'
import { SAVINGS_CATEGORY } from '../../lib/categories.js'

// Treemap: jede Kachel = ein Posten, Größe = Monatsbetrag.
//
// Sparen ist mit drin, aber nicht als Kosten getarnt. Ohne Sparen fehlten hier
// über 1.000 € im Monat – mit Sparen in Kategoriefarben hätte die Treemap
// behauptet, das Geld sei ausgegeben. Deshalb zwei Blöcke („Kosten" und
// „Sparen", je mit Überschrift) und für die Sparkacheln eine eigene, nicht-rote
// Farbe mit diagonalen Streifen: wie im Balkendiagramm je Person ist Sparen
// sichtbar etwas anderes als eine Ausgabe. Die Streifen tragen den Unterschied
// auch dann, wenn Farben schlecht zu unterscheiden sind.
//
// items: [{ label, value, category, color, savings }]
const FONT = "-apple-system, 'Segoe UI', Roboto, sans-serif"
const BUCKET_COST = 'Kosten'
const BUCKET_SAV = 'Sparen'

// #rrggbb -> rgba(...)
function withAlpha(hex, alpha) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || '')
  if (!m) return hex
  const n = parseInt(m[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// Diagonale Streifen als Kachelfüllung. Einmal je Farbe bauen – Chart.js fragt
// die Füllung bei jedem Zeichnen neu ab.
const stripeCache = new Map()
function stripes(color) {
  if (stripeCache.has(color)) return stripeCache.get(color)
  let pattern = color
  try {
    const size = 9
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const g = canvas.getContext('2d')
    g.fillStyle = color
    g.fillRect(0, 0, size, size)
    g.strokeStyle = 'rgba(255, 255, 255, 0.34)'
    g.lineWidth = 2.5
    g.beginPath()
    // Drei Linien, damit das Muster über die Kachelkanten hinweg durchläuft.
    g.moveTo(-size / 2, size / 2)
    g.lineTo(size / 2, -size / 2)
    g.moveTo(0, size)
    g.lineTo(size, 0)
    g.moveTo(size / 2, size * 1.5)
    g.lineTo(size * 1.5, size / 2)
    g.stroke()
    pattern = g.createPattern(canvas, 'repeat') || color
  } catch { /* kein Canvas: einfarbig ist auch in Ordnung */ }
  stripeCache.set(color, pattern)
  return pattern
}

// Blockkachel (Überschrift „Kosten"/„Sparen") statt Einzelposten?
const isBucket = (raw) => raw?.l === 0
// Der ursprüngliche Posten – gruppiert steckt er in children, flach direkt drin.
const itemOf = (raw) => (raw?._data?.children ? raw._data.children[0] : raw?._data)

export default function CostTreemap({ items }) {
  const savColor = categoryColor(SAVINGS_CATEGORY)
  const dark = typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark'

  const prepared = useMemo(() => {
    const list = (items || []).filter((i) => i.value > 0)
    const total = (rows) => rows.reduce((s, r) => s + r.value, 0)
    const costs = list.filter((i) => !i.savings)
    const savings = list.filter((i) => i.savings)
    return {
      // tid = eindeutiger Schlüssel je Kachel, damit zwei Posten mit gleichem
      // Namen nicht zu einer Kachel verschmelzen.
      tree: list.map((i, idx) => ({ ...i, tid: `t${idx}`, bucket: i.savings ? BUCKET_SAV : BUCKET_COST })),
      costTotal: total(costs),
      savTotal: total(savings),
      // Zwei Blöcke nur, wenn es beides gibt – sonst wäre die Überschrift
      // bloß verschenkter Platz.
      grouped: costs.length > 0 && savings.length > 0,
    }
  }, [items])

  if (prepared.tree.length === 0) return <p className="muted">Noch keine Kosten erfasst.</p>

  const { tree, costTotal, savTotal, grouped } = prepared
  const savStripes = stripes(savColor)

  const dataset = {
    type: 'treemap',
    tree,
    key: 'value',
    spacing: 2,
    borderRadius: 5,
    backgroundColor: (ctx) => {
      if (ctx.type !== 'data') return 'transparent'
      if (isBucket(ctx.raw)) {
        return ctx.raw.g === BUCKET_SAV ? withAlpha(savColor, 0.2) : 'rgba(148, 163, 184, 0.16)'
      }
      const item = itemOf(ctx.raw)
      if (!item) return 'transparent'
      return item.savings ? savStripes : item.color
    },
    borderWidth: (ctx) => (ctx.type === 'data' && isBucket(ctx.raw) ? 1 : 0),
    borderColor: (ctx) => {
      if (ctx.type !== 'data' || !isBucket(ctx.raw)) return 'transparent'
      return ctx.raw.g === BUCKET_SAV ? withAlpha(savColor, 0.6) : 'rgba(148, 163, 184, 0.4)'
    },
    captions: {
      display: true,
      align: 'left',
      padding: 5,
      color: (ctx) => (ctx.raw?.g === BUCKET_SAV ? (dark ? '#4ade80' : savColor) : (dark ? '#94a3b8' : '#475569')),
      font: { size: 12, weight: '700', family: FONT },
      formatter: (ctx) => {
        const sum = ctx.raw?.g === BUCKET_SAV ? savTotal : costTotal
        return `${ctx.raw?.g} · ${formatEUR(sum)}`
      },
    },
    labels: {
      display: true,
      overflow: 'hidden',
      color: '#fff',
      font: { size: 11, weight: '600', family: FONT },
      formatter: (ctx) => {
        const item = itemOf(ctx.raw)
        if (!item) return ''
        // Schmale Kacheln (vor allem am Handy): lieber nur der Betrag als
        // gar nichts – der Name steht im Tooltip.
        if (ctx.raw.w < 92) return formatEUR(item.value)
        return [item.label, formatEUR(item.value)]
      },
    },
  }
  if (grouped) dataset.groups = ['bucket', 'tid']

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 500 },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#0f172a',
        padding: 10,
        cornerRadius: 8,
        displayColors: false,
        // Unter dem Zeiger liegen Blockkachel und Einzelposten; nur der Posten
        // ist interessant.
        filter: (ctx) => !isBucket(ctx.raw),
        callbacks: {
          title: (ctx) => itemOf(ctx[0]?.raw)?.label || '',
          label: (ctx) => {
            const item = itemOf(ctx.raw)
            if (!item) return ''
            if (item.savings) return `Sparen · ${formatEUR(item.value)}/Monat · Rücklage, keine Ausgabe`
            return `${item.category} · ${formatEUR(item.value)}/Monat`
          },
        },
      },
    },
  }

  return (
    <>
      <div className="chart-box treemap">
        <Chart type="treemap" data={{ datasets: [dataset] }} options={options} />
      </div>
      <p className="treemap-sum">
        {costTotal > 0 && <span>Kosten <strong>{formatEUR(costTotal)}</strong>/Monat</span>}
        {savTotal > 0 && (
          <span>
            <span className="tm-swatch" style={{ background: withAlpha(savColor, 0.95), backgroundImage: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.34) 0 2px, transparent 2px 5px)' }} />
            Sparen <strong>{formatEUR(savTotal)}</strong>/Monat
          </span>
        )}
        {costTotal > 0 && savTotal > 0 && (
          <span className="muted">zusammen {formatEUR(costTotal + savTotal)}/Monat</span>
        )}
      </p>
      {savTotal > 0 && (
        <p className="muted treemap-note">
          Sparen ist gestreift, weil es keine Ausgabe ist: das Geld liegt danach nur auf einem anderen Konto.
        </p>
      )}
    </>
  )
}
