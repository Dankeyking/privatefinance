import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import StandingOrders from './pages/StandingOrders.jsx'
import Analytics from './pages/Analytics.jsx'
import Accounts from './pages/Accounts.jsx'
import Import from './pages/Import.jsx'
import Categories from './pages/Categories.jsx'
import Settings from './pages/Settings.jsx'
import { loadData } from './data/dataSource.js'
import { mergeData } from './lib/merge.js'
import { downloadClaudeExport } from './lib/claudeExport.js'
import { ChartJS } from './components/charts/setup.js'
import {
  getOverrides,
  setOverride,
  clearOverride,
  clearAllOverrides,
  getManualData,
  saveManualData,
  clearManualData,
} from './lib/storage.js'

// Design (hell/dunkel): gespeicherte Wahl > Systemeinstellung.
const THEME_KEY = 'pf_theme'
function initialTheme() {
  try {
    const saved = localStorage.getItem(THEME_KEY)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* ignore */ }
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ? 'dark' : 'light'
}

export default function App() {
  const [page, setPage] = useState('overview')
  const [baseData, setBaseData] = useState(null)
  const [source, setSource] = useState('mock')
  const [overrides, setOverrides] = useState({})
  const [manual, setManual] = useState({})
  const [navOpen, setNavOpen] = useState(false)
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try { localStorage.setItem(THEME_KEY, theme) } catch { /* ignore */ }
    // Chart.js-Grundfarben ans Theme anpassen; Charts werden über key={theme} neu aufgebaut.
    ChartJS.defaults.color = theme === 'dark' ? '#94a3b8' : '#64748b'
    ChartJS.defaults.borderColor = theme === 'dark' ? 'rgba(148, 163, 184, 0.15)' : 'rgba(15, 23, 42, 0.08)'
  }, [theme])

  useEffect(() => {
    setOverrides(getOverrides())
    setManual(getManualData())
    loadData().then(({ data, source }) => {
      setBaseData(data)
      setSource(source)
    })
  }, [])

  const data = useMemo(() => mergeData(baseData, manual), [baseData, manual])
  const hasManual = Boolean(
    manual && (manual.standingOrders || manual.accounts || manual.incomes),
  )

  function handleSetCategory(itemId, categoryId) {
    setOverrides(setOverride(itemId, categoryId))
  }
  function handleClearOne(itemId) {
    setOverrides(clearOverride(itemId))
  }
  function handleResetAll() {
    setOverrides(clearAllOverrides())
  }
  function handleExport() {
    if (data) downloadClaudeExport(data, overrides)
  }
  function handleSaveManual(next) {
    setManual(saveManualData(next))
  }
  function handleSaveOrders(orders) {
    setManual(saveManualData({ ...manual, standingOrders: orders }))
  }
  function handleSaveAccounts(accounts) {
    setManual(saveManualData({ ...manual, accounts }))
  }
  function handleResetManual() {
    setManual(clearManualData())
  }
  function navigate(p) {
    setPage(p)
    setNavOpen(false)
  }

  if (!data) {
    return (
      <div className="app">
        <div className="content"><p className="muted">Lade Daten …</p></div>
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <button className="hamburger" onClick={() => setNavOpen(true)} aria-label="Menü öffnen">☰</button>
        <span className="topbar-brand">Private<span>Finance</span></span>
      </header>

      {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}

      <Sidebar
        page={page}
        onNavigate={navigate}
        source={source}
        hasManual={hasManual}
        onExport={handleExport}
        open={navOpen}
        onClose={() => setNavOpen(false)}
        theme={theme}
        onToggleTheme={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
      />

      <main className="content" key={theme}>
        {page === 'overview' && <Overview data={data} onNavigate={navigate} />}
        {page === 'recurring' && (
          <StandingOrders data={data} onSaveOrders={handleSaveOrders} />
        )}
        {page === 'analytics' && <Analytics data={data} overrides={overrides} />}
        {page === 'accounts' && <Accounts data={data} onSaveAccounts={handleSaveAccounts} />}
        {page === 'import' && <Import data={data} onSaveOrders={handleSaveOrders} onNavigate={navigate} />}
        {page === 'categories' && (
          <Categories
            data={data}
            overrides={overrides}
            onResetAll={handleResetAll}
            onClearOne={handleClearOne}
          />
        )}
        {page === 'settings' && (
          <Settings
            data={data}
            manual={manual}
            onSave={handleSaveManual}
            onReset={handleResetManual}
          />
        )}
      </main>
    </div>
  )
}
