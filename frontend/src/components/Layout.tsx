import { useEffect, useState } from 'react'
import { Outlet, NavLink, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Search,
  FileCheck,
  Activity,
  ClipboardList,
  HelpCircle
} from 'lucide-react'
import clsx from 'clsx'
import HelpGuide from './HelpGuide'

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
    <div className="min-h-screen bg-slate-50">
      {/* Top header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-govpulse-500 to-govpulse-700 flex items-center justify-center">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">GovPulse</h1>
                <p className="text-xs text-slate-500">Policy Monitoring Platform</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.to}
                  className={({ isActive }) =>
                    clsx(
                      'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-govpulse-50 text-govpulse-700'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    )
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.name}
                </NavLink>
              ))}
            </nav>

            {/* Help & Version */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsHelpOpen(true)}
                className="p-2 text-slate-500 hover:text-govpulse-600 hover:bg-govpulse-50 rounded-lg transition-colors"
                title="Help Guide"
              >
                <HelpCircle className="w-5 h-5" />
              </button>
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded">v0.1.0</span>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <nav className="md:hidden bg-white border-b border-slate-200 px-4 py-2 overflow-x-auto">
        <div className="flex items-center gap-2">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                  isActive
                    ? 'bg-govpulse-50 text-govpulse-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                )
              }
            >
              <item.icon className="w-4 h-4" />
              {item.name}
            </NavLink>
          ))}
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Help Guide Modal */}
      <HelpGuide isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
    </div>
  )
}
