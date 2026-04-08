import { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  FileCheck,
  ClipboardList,
  HelpCircle
} from 'lucide-react'
import clsx from 'clsx'
import HelpGuide from './HelpGuide'
import { BRAND_MONOGRAM, BRAND_NAME, BRAND_TAGLINE } from '../brand'

const navigation = [
  { name: 'Overview', to: '/', icon: LayoutDashboard },
  { name: 'New Scan', to: '/launch', icon: Search },
  { name: 'Scan Reports', to: '/reports', icon: ClipboardList },
  { name: 'Policy Details', to: '/analysis', icon: FileCheck },
]

export default function Layout() {
  const location = useLocation()
  const [isHelpOpen, setIsHelpOpen] = useState(false)

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  return (
    <div className="app-shell">
      {/* Top header */}
      <header className="masthead-shell sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 py-4">
            <div className="flex items-center justify-between gap-4">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl border border-[var(--line-strong)] bg-white/80 flex items-center justify-center text-[var(--accent)] relative overflow-hidden">
                <div className="absolute inset-x-0 top-0 h-1 bg-[var(--accent)]" />
                <span className="font-serif text-xl leading-none">{BRAND_MONOGRAM}</span>
              </div>
              <div>
                <p className="section-kicker mb-1">Policy Intelligence Console</p>
                <div className="flex items-end gap-3 flex-wrap">
                  <h1 className="font-serif text-3xl leading-none text-[var(--ink)]">{BRAND_NAME}</h1>
                  <p className="text-sm text-[var(--ink-soft)] pb-0.5">{BRAND_TAGLINE}</p>
                </div>
              </div>
            </div>

              {/* Help & Version */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsHelpOpen(true)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-strong)] bg-white/70 text-[var(--ink-soft)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                  title="Help Guide"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                <span className="status-stamp">v0.1.0</span>
              </div>
            </div>

            <div className="rule-divider" />

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                        : 'border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-white/50 hover:text-[var(--ink)]'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <nav className="md:hidden border-b border-[var(--line)] bg-[rgba(249,246,240,0.82)] px-2 py-2 overflow-x-auto scrollbar-thin">
        <div className="flex items-center gap-1">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]'
                    : 'border-transparent text-[var(--ink-soft)] hover:border-[var(--line)] hover:bg-white/50 hover:text-[var(--ink)]'
                )
              }
            >
              <item.icon className="w-3.5 h-3.5" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <Outlet />
      </main>

      {/* Help Guide Modal */}
      <HelpGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  )
}
