import { Outlet, NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Rocket,
  GitCompare,
  History,
  Activity,
  Bell,
  User
} from 'lucide-react'
import clsx from 'clsx'

const navigation = [
  { name: 'Dashboard', to: '/', icon: LayoutDashboard },
  { name: 'Launch Mission', to: '/launch', icon: Rocket },
  { name: 'Gap Analysis', to: '/analysis', icon: GitCompare },
  { name: 'Audit Trail', to: '/audit', icon: History },
]

export default function Layout() {
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
                <p className="text-xs text-slate-500">Regulatory Impact Platform</p>
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

            {/* Right side actions */}
            <div className="flex items-center gap-3">
              <button className="relative p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
              <div className="w-8 h-8 rounded-full bg-govpulse-100 flex items-center justify-center">
                <User className="w-4 h-4 text-govpulse-600" />
              </div>
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

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between text-sm text-slate-500">
            <p>GovPulse v1.0 - Regulatory Impact Assessment Platform</p>
            <p>Public Policy & Government Relations</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
