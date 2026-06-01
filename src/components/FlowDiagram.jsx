import { useMemo } from 'react'
import { toMonthly, formatEUR } from '../lib/normalize.js'
import { categoryColor } from '../lib/categories.js'

// Leichtes Fluss-Diagramm (SVG): Konten links -> Kategorien rechts.
// Linienstärke ∝ monatlicher Betrag. Zeigt, wer was von welchem Konto zahlt.
export default function FlowDiagram({ accounts, standingOrders, getCategory }) {
  const { edges, leftNodes, rightNodes, maxEdge } = useMemo(() => {
    const accMap = Object.fromEntries(accounts.map((a) => [a.id, a]))
    const edgeMap = {}
    const catTotals = {}
    const accTotals = {}

    standingOrders.forEach((so) => {
      const cat = getCategory ? getCategory(so) : so.category
      const monthly = toMonthly(so.amount, so.rhythm)
      const key = `${so.accountId}|${cat}`
      edgeMap[key] = (edgeMap[key] || 0) + monthly
      catTotals[cat] = (catTotals[cat] || 0) + monthly
      accTotals[so.accountId] = (accTotals[so.accountId] || 0) + monthly
    })

    const leftNodes = accounts
      .filter((a) => accTotals[a.id])
      .map((a) => ({ id: a.id, label: a.name, type: a.type, total: accTotals[a.id] }))
    const rightNodes = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, total]) => ({ id: cat, label: cat, total }))

    const edges = Object.entries(edgeMap).map(([k, v]) => {
      const [accId, cat] = k.split('|')
      return { accId, cat, value: v }
    })
    const maxEdge = Math.max(1, ...edges.map((e) => e.value))
    return { edges, leftNodes, rightNodes, maxEdge }
  }, [accounts, standingOrders, getCategory])

  const W = 720
  const rowH = 64
  const H = Math.max(leftNodes.length, rightNodes.length) * rowH + 20
  const leftX = 150
  const rightX = W - 150

  const yFor = (nodes, i) => 30 + i * ((H - 40) / Math.max(1, nodes.length - 1 || 1)) * (nodes.length > 1 ? 1 : 0) + (nodes.length === 1 ? (H - 40) / 2 : 0)

  const leftY = (id) => {
    const i = leftNodes.findIndex((n) => n.id === id)
    return yFor(leftNodes, i)
  }
  const rightY = (cat) => {
    const i = rightNodes.findIndex((n) => n.id === cat)
    return yFor(rightNodes, i)
  }

  return (
    <div className="flow">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Geldfluss-Diagramm">
        {/* Kanten */}
        {edges.map((e, idx) => {
          const y1 = leftY(e.accId)
          const y2 = rightY(e.cat)
          const sw = 1.5 + (e.value / maxEdge) * 12
          const mx = (leftX + rightX) / 2
          return (
            <path
              key={idx}
              d={`M ${leftX} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${rightX} ${y2}`}
              fill="none"
              stroke={categoryColor(e.cat)}
              strokeWidth={sw}
              strokeOpacity="0.45"
              strokeLinecap="round"
            />
          )
        })}

        {/* Konto-Knoten links */}
        {leftNodes.map((n) => (
          <g key={n.id}>
            <circle cx={leftX} cy={leftY(n.id)} r="7" fill={n.type === 'joint' ? '#3b82f6' : '#94a3b8'} />
            <text x={leftX - 14} y={leftY(n.id) - 4} textAnchor="end" fontSize="13" fontWeight="600" fill="#0f172a">
              {n.label}
            </text>
            <text x={leftX - 14} y={leftY(n.id) + 12} textAnchor="end" fontSize="11" fill="#64748b">
              {formatEUR(n.total)}/Mt
            </text>
          </g>
        ))}

        {/* Kategorie-Knoten rechts */}
        {rightNodes.map((n) => (
          <g key={n.id}>
            <circle cx={rightX} cy={rightY(n.id)} r="7" fill={categoryColor(n.id)} />
            <text x={rightX + 14} y={rightY(n.id) - 4} textAnchor="start" fontSize="13" fontWeight="600" fill="#0f172a">
              {n.label}
            </text>
            <text x={rightX + 14} y={rightY(n.id) + 12} textAnchor="start" fontSize="11" fill="#64748b">
              {formatEUR(n.total)}/Mt
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}
