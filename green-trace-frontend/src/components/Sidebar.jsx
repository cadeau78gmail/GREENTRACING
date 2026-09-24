import { NavLink } from 'react-router-dom'
import {
  LayoutGrid,
  Map,
  Bell,
  TreePine,
  Radio,
  Globe,
  Settings,
  ChevronLeft
} from 'lucide-react'
import { useState } from 'react'
import { useTheme } from '../theme/ThemeContext.jsx'

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutGrid },
  { to: '/sensor-map', label: 'Sensor Map', icon: Map },
  { to: '/alerts', label: 'Alerts', icon: Bell },
  { to: '/forest-zones', label: 'Forest Zones', icon: TreePine },
  { to: '/sensors', label: 'Sensors', icon: Radio },
  { to: '/reports', label: 'Reports', icon: Globe }
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const { theme } = useTheme()

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-base-900 border-r border-base-700/60 transition-all duration-200 ${
        collapsed ? 'w-20' : 'w-60'
      }`}
    >
      <div className={`flex items-center border-b border-base-700/60 py-6 ${collapsed ? 'justify-center px-4' : 'px-5'}`}>
        <div className="w-32 h-32 md:w-36 md:h-36 flex items-center justify-center shrink-0 overflow-hidden mx-auto">
          <img src="/logoooo.png" alt="Green Trace IQ logo" className="h-full w-full object-contain" />
        </div>
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="dark-icon-button ml-auto w-8 h-8 rounded-full border border-base-700 flex items-center justify-center text-slate-400 hover:text-slate-900 hover:border-base-600 transition-colors shrink-0"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft size={16} className={`transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto nav-scroll px-4 py-6">
        <ul className="space-y-1.5">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                    `flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-3'} py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    isActive
                      ? 'text-white shadow-glow'
                      : 'text-slate-400 hover:text-slate-900 hover:bg-base-800'
                  }`
                }
                style={({ isActive }) => (isActive ? { backgroundColor: theme.colors.accent } : undefined)}
                title={collapsed ? label : undefined}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="px-4 py-4 border-t border-base-700/60">
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 ${collapsed ? 'justify-center' : 'px-3'} py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive ? 'text-slate-900 bg-base-800' : 'text-slate-400 hover:text-slate-900 hover:bg-base-800'
            }`
          }
          title={collapsed ? 'Settings' : undefined}
        >
          <Settings size={18} className="shrink-0" />
          {!collapsed && <span>Settings</span>}
        </NavLink>
      </div>
    </aside>
  )
}
