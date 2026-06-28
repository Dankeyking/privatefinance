import { useEffect, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import StandingOrders from './pages/StandingOrders.jsx'
import Analytics from './pages/Analytics.jsx'
import Categories from './pages/Categories.jsx'
import Settings from './pages/Settings.jsx'
import { loadData } from './data/dataSource.js'
import { mergeData } from './lib/merge.js'
import { downloadClaudeExport } from './lib/claudeExport.js'
import {
  getOverrides,
  setOverride,
  clearOverride,
  clearAllOverrides,
  getManualData,
  saveManualData,
  clearManualData,
} from './lib/storage.js'

export default function App() {
  const [page, setPage] = useState('overview')
  const [baseData, setBaseData] = useState(null)
  const [source, setSource] = useState('mock')
  const [overrides, setOverrides] = useState({})
  const [manual, setManual] = useState({})
  const [navOpen, setNavOpen] = useState(false)

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
      />

      <main className="content">
        {page === 'overview' && <Overview data={data} overrides={overrides} />}
        {page === 'recurring' && (
          <StandingOrders data={data} overrides={overrides} onSetCategory={handleSetCategory} />
        )}
        {page === 'analytics' && <Analytics data={data} overrides={overrides} />}
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
