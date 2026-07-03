import { useMemo, useState } from 'react'
import IncomeExpenseBar from '../components/charts/IncomeExpenseBar.jsx'
import CategoryDonut from '../components/charts/CategoryDonut.jsx'
import CostTreemap from '../components/charts/CostTreemap.jsx'
import DragCard from '../components/DragCard.jsx'
import { categoryColor, categoryLabel } from '../lib/categoryStore.js'
import { formatEUR, formatDate, toMonthly, RHYTHM_LABELS } from '../lib/normalize.js'
import { effectiveCategoryOf, isOrderActive, monthsRemaining } from '../lib/selectors.js'
import { monthlyByCategory, personSummary, monthlyByAccount, isSavings } from '../lib/recurring.js'
import { useDragOrder } from '../lib/layout.js'

const DEFAULT_ORDER = ['donut', 'personBar', 'treemap', 'abo', 'ending', 'byAccount']

const splitPersonLabel = (o) => {
  const m = o.split?.mode
  if (m === 'single') return o.split.person
  if (m === 'even') return 'geteilt'
  return 'anteilig'
}

export default function Analytics({ data, overrides }) {
  const [includeSavings, setIncludeSavings] = useState(false)
  const accById = useMemo(() => Object.fromEntries((data.accounts || []).map((a) => [a.id, a])), [data.accounts])
  const { order, api, reset, isCustom } = useDragOrder('analytics', DEFAULT_ORDER)

  const catTotals = useMemo(
    () => monthlyByCategory(data, overrides, { excludeSavings: !includeSavings }),
    [data, overrides, includeSavings],
  )
  const donut = useMemo(() => {
    const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
    return {
      labels: entries.map((e) => categoryLabel(e[0])),
      values: entries.map((e) => Number(e[1].toFixed(2))),
      colors: entries.map((e) => categoryColor(e[0])),
    }
  }, [catTotals])

  const persons = useMemo(() => personSummary(data), [data])
  const personBars = {
    labels: persons.map((p) => p.person),
    income: persons.map((p) => Number(p.income.toFixed(2))),
    expenses: persons.map((p) => Number((p.costs + p.savings).toFixed(2))),
  }

  const byAccount = useMemo(
    () => monthlyByAccount(data).filter((a) => a.total > 0).sort((a, b) => b.total - a.total),
    [data],
  )
  const maxAcc = Math.max(1, ...byAccount.map((a) => a.total))
  const hasSavings = byAccount.some((a) => a.savings > 0)

  // Treemap: alle aktiven Kosten (ohne Sparen), Kachelgröße = Monatsbetrag.
  const treemapItems = useMemo(() => {
    return (data.standingOrders || [])
      .filter((o) => isOrderActive(o) && !isSavings(o, overrides))
      .map((o) => {
        const cat = effectiveCategoryOf(o, overrides)
        return { label: o.recipient || '—', value: Number(toMonthly(o.amount, o.rhythm).toFixed(2)), category: categoryLabel(cat), color: categoryColor(cat) }
      })
      .filter((x) => x.value > 0)
  }, [data.standingOrders, overrides])

  // Abo-Radar: aktive Abos nach Jahresbetrag.
  const abos = useMemo(() => {
    const rows = (data.standingOrders || [])
      .filter((o) => o.kind === 'subscription' && isOrderActive(o))
      .map((o) => {
        const cat = effectiveCategoryOf(o, overrides)
        const monthly = toMonthly(o.amount, o.rhythm)
        return {
          id: o.id, recipient: o.recipient || '—', monthly, yearly: monthly * 12,
          categoryLabel: categoryLabel(cat), color: categoryColor(cat), rhythm: o.rhythm,
          person: splitPersonLabel(o), account: accById[o.accountId]?.name || '',
          endDate: o.endDate || '',
        }
      })
      .sort((a, b) => b.yearly - a.yearly)
    return { rows, totalYear: rows.reduce((s, r) => s + r.yearly, 0), max: Math.max(1, ...rows.map((r) => r.yearly)) }
  }, [data.standingOrders, overrides, accById])

  // Auslaufende Posten: alles mit Enddatum – zeigt, wann Budget frei wird.
  const ending = useMemo(() => {
    const rows = (data.standingOrders || [])
      .filter((o) => o.endDate)
      .map((o) => ({
        id: o.id, recipient: o.recipient || '—',
        monthly: toMonthly(o.amount, o.rhythm),
        endDate: o.endDate, active: isOrderActive(o), left: monthsRemaining(o),
        account: accById[o.accountId]?.name || '',
      }))
      .sort((a, b) => (a.endDate < b.endDate ? -1 : 1))
    const freed = rows.filter((r) => r.active).reduce((s, r) => s + r.monthly, 0)
    return { rows, freed }
  }, [data.standingOrders, accById])

  const sections = {
    donut: (
      <div className="card">
        <div className="editor-head">
          <h2 style={{ margin: 0 }}>
            Kosten nach Kategorie <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(pro Monat)</span>
          </h2>
          <label className="muted" style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
            <input type="checkbox" checked={includeSavings} onChange={(e) => setIncludeSavings(e.target.checked)} />
            Sparen einbeziehen
          </label>
        </div>
        <CategoryDonut labels={donut.labels} values={donut.values} colors={donut.colors} />
      </div>
    ),
    personBar: (
      <div className="card">
        <h2>Einkommen vs. Ausgaben je Person</h2>
        <IncomeExpenseBar labels={personBars.labels} income={personBars.income} expenses={personBars.expenses} />
      </div>
    ),
    treemap: (
      <div className="card">
        <h2>Kosten-Treemap <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(Kachelgröße = Monatsbetrag, Farbe = Kategorie)</span></h2>
        <CostTreemap items={treemapItems} />
      </div>
    ),
    abo: (
      <div className="card">
        <div className="editor-head" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Abo-Radar</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            {abos.rows.length} Abos · {formatEUR(abos.totalYear)}/Jahr · {formatEUR(abos.totalYear / 12)}/Monat
          </span>
        </div>
        {abos.rows.length === 0 ? (
          <p className="muted">Keine Abos erfasst.</p>
        ) : (
          <div>
            {abos.rows.map((r) => (
              <div className="abo-row" key={r.id}>
                <div className="abo-main">
                  <div className="abo-name">
                    <span className="acct-dot" style={{ background: r.color }} />
                    {r.recipient}
                  </div>
                  <div className="abo-meta">
                    {r.categoryLabel} · {r.person} · {RHYTHM_LABELS[r.rhythm] || r.rhythm}
                    {r.account ? ` · ${r.account}` : ''}
                    {r.endDate ? ` · endet ${formatDate(r.endDate)}` : ''}
                  </div>
                  <div className="abo-track"><div className="abo-fill" style={{ width: `${(r.yearly / abos.max) * 100}%`, background: r.color }} /></div>
                </div>
                <div className="abo-fig">
                  <div className="abo-year">{formatEUR(r.yearly)}<span className="abo-month"> /Jahr</span></div>
                  <div className="abo-month">{formatEUR(r.monthly)}/Monat</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    ending: (
      <div className="card">
        <div className="editor-head" style={{ marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Auslaufende Posten</h2>
          {ending.freed > 0 && (
            <span className="muted" style={{ fontSize: 13 }}>
              wird frei: <strong className="amount pos">{formatEUR(ending.freed)}/Monat</strong>
            </span>
          )}
        </div>
        {ending.rows.length === 0 ? (
          <p className="muted">
            Kein Posten hat ein Enddatum. Tipp: Trage bei Ratenkäufen (z. B. Kühlschrank) oder
            gekündigten Verträgen unter „Kosten &amp; Abos" in der Spalte <strong>Ende</strong> die
            letzte Zahlung ein – dann siehst du hier, wann wie viel Budget frei wird.
          </p>
        ) : (
          <div>
            {ending.rows.map((r) => (
              <div className="abo-row" key={r.id}>
                <div className="abo-main">
                  <div className="abo-name">
                    {r.recipient}
                    {!r.active && <span className="pill ended">beendet</span>}
                  </div>
                  <div className="abo-meta">
                    {r.active ? `endet ${formatDate(r.endDate)} · noch ${r.left} Mon.` : `endete ${formatDate(r.endDate)}`}
                    {r.account ? ` · ${r.account}` : ''}
                  </div>
                </div>
                <div className="abo-fig">
                  <div className="abo-year">{formatEUR(r.monthly)}<span className="abo-month"> /Monat</span></div>
                  {r.active && <div className="abo-month">≈ {formatEUR(r.monthly * r.left)} bis Ende</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    byAccount: (
      <div className="card">
        <h2>Kosten je Konto <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(pro Monat, inkl. Sparen)</span></h2>
        <div className="hbars">
          {byAccount.map(({ account, fixed, subscription, savings, total }) => (
            <div className="hbar-row" key={account.id}>
              <div className="hbar-label">{account.name}</div>
              <div className="hbar-track">
                <div className="hbar-fill fix" style={{ width: `${(fixed / maxAcc) * 100}%` }} title={`Fixkosten ${formatEUR(fixed)}`} />
                <div className="hbar-fill sub" style={{ width: `${(subscription / maxAcc) * 100}%` }} title={`Abos ${formatEUR(subscription)}`} />
                <div className="hbar-fill sav" style={{ width: `${(savings / maxAcc) * 100}%` }} title={`Sparen ${formatEUR(savings)}`} />
              </div>
              <div className="hbar-value num">{formatEUR(total)}</div>
            </div>
          ))}
          {byAccount.length === 0 && <p className="muted">Noch keine Kosten erfasst.</p>}
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          <span className="legend-dot fix" /> Fixkosten &nbsp; <span className="legend-dot sub" /> Abos
          {hasSavings && <>&nbsp; <span className="legend-dot sav" /> Sparen</>}
        </p>
      </div>
    ),
  }
  const fullWidth = { donut: false, personBar: false, treemap: true, abo: true, ending: true, byAccount: true }

  return (
    <div>
      <div className="page-header">
        <div className="editor-head">
          <div>
            <h1>Analyse</h1>
            <p>Monatliche Kosten nach Kategorie, je Person und je Konto – plus Kosten-Treemap und Abo-Radar.</p>
          </div>
          {isCustom && <button className="btn" onClick={reset}>Layout zurücksetzen</button>}
        </div>
      </div>

      <div className="drag-grid">
        {order.map((id) => (
          <DragCard key={id} id={id} api={api} full={fullWidth[id]}>
            {sections[id]}
          </DragCard>
        ))}
      </div>
    </div>
  )
}
