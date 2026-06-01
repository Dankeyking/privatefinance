import { useEffect, useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import StandingOrders from './pages/StandingOrders.jsx'
import Analytics from './pages/Analytics.jsx'
import Budget from './pages/Budget.jsx'
import Categories from './pages/Categories.jsx'
import { loadData } from './data/dataSource.js'
import { downloadClaudeExport } from './lib/claudeExport.js'
import {
  getOverrides,
  setOverride,
  clearOverride,
  clearAllOverrides,
} from './lib/storage.js'

export default function App() {
  const [page, setPage] = useState('overview')
  const [data, setData] = useState(null)
  const [source, setSource] = useState('mock')
  const [overrides, setOverrides] = useState({})
  const [navOpen, setNavOpen] = useState(false) // mobile sidebar

  useEffect(() => {
    setOverrides(getOverrides())
    loadData().then(({ data, source }) => {
      setData(data)
      setSource(source)
    })
  }, [])

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
      {/* Mobile-Topbar mit Hamburger */}
      <header className="topbar">
        <button className="hamburger" onClick={() => setNavOpen(true)} aria-label="Menü öffnen">☰</button>
        <span className="topbar-brand">Private<span>Finance</span></span>
      </header>

      {navOpen && <div className="nav-overlay" onClick={() => setNavOpen(false)} />}

      <Sidebar
        page={page}
        onNavigate={navigate}
        source={source}
        onExport={handleExport}
        open={navOpen}
        onClose={() => setNavOpen(false)}
      />

      <main className="content">
        {page === 'overview' && <Overview data={data} overrides={overrides} />}
        {page === 'standing' && (
          <StandingOrders data={data} overrides={overrides} onSetCategory={handleSetCategory} />
        )}
        {page === 'analytics' && <Analytics data={data} overrides={overrides} />}
        {page === 'budget' && <Budget data={data} overrides={overrides} />}
        {page === 'categories' && (
          <Categories
            data={data}
            overrides={overrides}
            onResetAll={handleResetAll}
            onClearOne={handleClearOne}
          />
        )}
      </main>
    </div>
  )
}
