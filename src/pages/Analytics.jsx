import { useMemo, useState } from 'react'
import IncomeExpenseBar from '../components/charts/IncomeExpenseBar.jsx'
import CategoryDonut from '../components/charts/CategoryDonut.jsx'
import CostTreemap from '../components/charts/CostTreemap.jsx'
import DragCard from '../components/DragCard.jsx'
import FilterBar from '../components/FilterBar.jsx'
import { applyFilter, normalizeFilter } from '../lib/viewFilter.js'
import { categoryColor, categoryLabel } from '../lib/categoryStore.js'
import { formatEUR, formatDate, RHYTHM_LABELS } from '../lib/normalize.js'
import { effectiveCategoryOf, isOrderActive, monthsRemaining } from '../lib/selectors.js'
import { monthlyByCategory, personSummary, monthlyByAccount, isSavings, monthlyOf } from '../lib/recurring.js'
import { useDragOrder } from '../lib/layout.js'

const DEFAULT_ORDER = ['donut', 'personBar', 'treemap', 'abo', 'ending', 'byAccount']

const splitPersonLabel = (o) => {
  const m = o.split?.mode
  if (m === 'single') return o.split.person
  if (m === 'even') return 'geteilt'
  return 'anteilig'
}

export default function Analytics({
  data, overrides, onNavigate, filter, onFilterChange, prefs, onSavePreference,
}) {
  // Ein Schalter fuer die ganze Seite, nicht fuer ein Diagramm. Er stand
  // frueher in der Kopfzeile des Donuts und wirkte auch nur dort - Treemap,
  // Personenbalken und „Kosten je Konto" zeigten Sparen unabhaengig davon
  // weiter an. Jetzt entscheidet er ueberall dasselbe: zaehlt Sparen mit oder
  // nicht.
  const [includeSavings, setIncludeSavings] = useState(false)
  const [selCat, setSelCat] = useState(null) // Kategorie-Drilldown unterm Donut

  // Dieselbe Filterleiste wie auf der Übersicht: Alle Auswertungen zeigen
  // denselben Ausschnitt, statt dass jede Seite eigene Regeln hat.
  const view = useMemo(() => applyFilter(data, filter, overrides), [data, filter, overrides])
  // Ist eine Person gewaehlt, rechnet die Seite in deren Anteilen - genau wie
  // die Uebersicht. Vorher tat das hier nur das Balkendiagramm je Person,
  // alles andere zeigte die vollen Betraege: ein Filter auf eine Person liess
  // die Treemap-Summe unveraendert bei der vollen Haushaltssumme stehen, weil
  // ein geteilter Posten fuer jede Person als „beteiligt" gilt. Derselbe
  // Filter nannte damit auf zwei Seiten zwei Zahlen.
  const onePerson = normalizeFilter(filter).person === 'all' ? null : normalizeFilter(filter).person
  const accById = useMemo(() => Object.fromEntries((view.accounts || []).map((a) => [a.id, a])), [view.accounts])
  const { order, api, reset, isCustom } = useDragOrder('analytics', DEFAULT_ORDER, prefs, onSavePreference)

  const catTotals = useMemo(
    () => monthlyByCategory(view, overrides, { excludeSavings: !includeSavings, person: onePerson }),
    [view, overrides, includeSavings, onePerson],
  )
  const donut = useMemo(() => {
    const entries = Object.entries(catTotals).sort((a, b) => b[1] - a[1])
    return {
      ids: entries.map((e) => e[0]),
      labels: entries.map((e) => categoryLabel(e[0])),
      values: entries.map((e) => Number(e[1].toFixed(2))),
      colors: entries.map((e) => categoryColor(e[0])),
    }
  }, [catTotals])

  // Posten der angeklickten Donut-Kategorie (Drilldown).
  const drill = useMemo(() => {
    if (!selCat) return null
    const rows = (view.standingOrders || [])
      .filter((o) => isOrderActive(o) && effectiveCategoryOf(o, overrides) === selCat)
      .map((o) => ({ id: o.id, recipient: o.recipient || '—', monthly: monthlyOf(o, view, onePerson) }))
      .filter((r) => r.monthly > 0)
      .sort((a, b) => b.monthly - a.monthly)
    return { rows, total: rows.reduce((s, r) => s + r.monthly, 0) }
  }, [selCat, view, overrides, onePerson])

  // Art und Kategorie beschreiben Kosten, keine Einnahmen - incomeMatches()
  // laesst sie darum unangetastet. Im Balkendiagramm stand dadurch bei
  // „Abos" das volle Monatseinkommen neben ein paar Euro Abokosten, als
  // waere der Filter nur halb angekommen. Bei so einem Filter bleibt der
  // Einnahmen-Balken deshalb weg.
  const kostenFilter = filter?.kind && filter.kind !== 'all' ? true : filter?.category && filter.category !== 'all'
  const persons = useMemo(() => personSummary(view), [view])
  const personBars = {
    labels: persons.map((p) => p.person),
    income: persons.map((p) => Number(p.income.toFixed(2))),
    // Sparen stand vorher im Ausgaben-Balken. Geld, das aufs Sparkonto
    // geht, ist aber keine Ausgabe - so sah es aus, als bliebe nichts
    // uebrig. Jetzt ein eigener Balken.
    expenses: persons.map((p) => Number(p.costs.toFixed(2))),
    savings: includeSavings ? persons.map((p) => Number(p.savings.toFixed(2))) : [],
  }

  const byAccount = useMemo(
    () => monthlyByAccount(view, onePerson)
      // `total` schliesst Sparen ein. Ist der Schalter aus, muss es auch aus
      // der Balkenlaenge und aus der Zahl rechts verschwinden - sonst stimmte
      // die Summe nicht mehr mit dem ueberein, was der Balken zeigt.
      .map((a) => (includeSavings ? a : { ...a, savings: 0, total: a.total - a.savings }))
      .filter((a) => a.total > 0)
      .sort((a, b) => b.total - a.total),
    [view, includeSavings, onePerson],
  )
  const maxAcc = Math.max(1, ...byAccount.map((a) => a.total))
  const hasSavings = byAccount.some((a) => a.savings > 0)

  // Treemap: alle aktiven Posten, Kachelgröße = Monatsbetrag. Sparen ist mit
  // drin (vorher fehlten dadurch über 1.000 €/Monat im Bild), wird aber als
  // Sparen markiert – die Treemap setzt es sichtbar von Kosten ab.
  const treemapItems = useMemo(() => {
    return (view.standingOrders || [])
      .filter((o) => isOrderActive(o))
      .map((o) => {
        const cat = effectiveCategoryOf(o, overrides)
        return {
          label: o.recipient || '—',
          value: Number(monthlyOf(o, view, onePerson).toFixed(2)),
          category: categoryLabel(cat),
          color: categoryColor(cat),
          savings: isSavings(o, overrides),
        }
      })
      .filter((x) => x.value > 0)
      .filter((x) => includeSavings || !x.savings)
  }, [view, overrides, includeSavings, onePerson])

  // Abo-Radar: aktive Abos nach Jahresbetrag.
  const abos = useMemo(() => {
    const rows = (view.standingOrders || [])
      .filter((o) => o.kind === 'subscription' && isOrderActive(o))
      .map((o) => {
        const cat = effectiveCategoryOf(o, overrides)
        const monthly = monthlyOf(o, view, onePerson)
        return {
          id: o.id, recipient: o.recipient || '—', monthly, yearly: monthly * 12,
          categoryLabel: categoryLabel(cat), color: categoryColor(cat), rhythm: o.rhythm,
          person: splitPersonLabel(o), account: accById[o.accountId]?.name || '',
          endDate: o.endDate || '',
        }
      })
      .filter((r) => r.monthly > 0)
      .sort((a, b) => b.yearly - a.yearly)
    return { rows, totalYear: rows.reduce((s, r) => s + r.yearly, 0), max: Math.max(1, ...rows.map((r) => r.yearly)) }
  }, [view, overrides, accById, onePerson])

  // Auslaufende Posten: alles mit Enddatum – zeigt, wann Budget frei wird.
  const ending = useMemo(() => {
    const rows = (view.standingOrders || [])
      .filter((o) => o.endDate)
      .map((o) => ({
        id: o.id, recipient: o.recipient || '—',
        monthly: monthlyOf(o, view, onePerson),
        endDate: o.endDate, active: isOrderActive(o), left: monthsRemaining(o),
        account: accById[o.accountId]?.name || '',
      }))
      .sort((a, b) => (a.endDate < b.endDate ? -1 : 1))
    const freed = rows.filter((r) => r.active).reduce((s, r) => s + r.monthly, 0)
    return { rows, freed }
  }, [view, accById, onePerson])

  const sections = {
    donut: (
      <div className="card">
        <h2>
          Kosten nach Kategorie <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>(pro Monat)</span>
        </h2>
        <CategoryDonut
          labels={donut.labels}
          values={donut.values}
          colors={donut.colors}
          onSelect={(i) => setSelCat((cur) => (donut.ids[i] === cur ? null : donut.ids[i]))}
        />
        {drill && (
          <div className="donut-drill">
            <div className="editor-head">
              <strong style={{ fontSize: 14 }}>
                <span className="acct-dot" style={{ background: categoryColor(selCat) }} />
                {categoryLabel(selCat)} · {formatEUR(drill.total)}/Monat
              </strong>
              <button className="btn-del" onClick={() => setSelCat(null)} title="Drilldown schließen">✕</button>
            </div>
            {drill.rows.map((r) => (
              <div className="drill-row" key={r.id}>
                <span>{r.recipient}</span>
                <span className="flow-amount">{formatEUR(r.monthly)}</span>
              </div>
            ))}
            <button className="link-btn" style={{ marginTop: 10 }}
              onClick={() => onNavigate?.('recurring', { category: selCat })}>
              In „Kosten &amp; Abos" öffnen →
            </button>
          </div>
        )}
        {!drill && <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>Tipp: Klicke ein Segment für die Einzelposten.</p>}
      </div>
    ),
    personBar: (
      <div className="card">
        <h2>
          {kostenFilter ? 'Ausgaben je Person' : 'Einkommen, Ausgaben und Sparen je Person'}
        </h2>
        <IncomeExpenseBar
          labels={personBars.labels}
          income={personBars.income}
          expenses={personBars.expenses}
          savings={personBars.savings}
          showIncome={!kostenFilter}
        />
        {kostenFilter && (
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Einnahmen bleiben hier weg: „Art" und „Kategorie" beschreiben Kosten, nicht Einnahmen –
            der volle Monatslohn neben gefilterten Kosten wäre ein schiefer Vergleich.
          </p>
        )}
      </div>
    ),
    treemap: (
      <div className="card">
        <h2>Kosten-Treemap <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
          (Kachelgröße = Monatsbetrag, Farbe = Kategorie{includeSavings ? ', Sparen gestreift' : ''})</span></h2>
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
              <div className="abo-row clickable" key={r.id} title="Klicken: in Kosten & Abos öffnen"
                onClick={() => onNavigate?.('recurring', { search: r.recipient })}>
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
              <div className="abo-row clickable" key={r.id} title="Klicken: in Kosten & Abos öffnen"
                onClick={() => onNavigate?.('recurring', { search: r.recipient })}>
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
        <h2>Kosten je Konto <span className="muted" style={{ fontWeight: 400, fontSize: 13 }}>
          (pro Monat{includeSavings ? ', inkl. Sparen' : ', ohne Sparen'})</span></h2>
        <div className="hbars">
          {byAccount.map(({ account, fixed, subscription, savings, total }) => (
            <div className="hbar-row clickable" key={account.id} title="Klicken: Posten dieses Kontos anzeigen"
              onClick={() => onNavigate?.('recurring', { accountId: account.id })}>
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

      <FilterBar data={data} value={filter} onChange={onFilterChange} />

      {onePerson && (
        <p className="muted" style={{ fontSize: 13, margin: '-8px 0 14px' }}>
          Alle Zahlen sind <strong>{onePerson}s Anteil</strong> – ein geteilter Posten zählt anteilig,
          nicht mit dem vollen Betrag.
        </p>
      )}

      {/* Steht bewusst hier und nicht in einer Karte: er gilt fuer jedes
          Diagramm auf dieser Seite, genau wie die Filterleiste darueber. */}
      <label className="seiten-schalter">
        <input type="checkbox" checked={includeSavings} onChange={(e) => setIncludeSavings(e.target.checked)} />
        Sparen einbeziehen <span className="muted">– gilt für alle Diagramme dieser Seite</span>
      </label>

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
