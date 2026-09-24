import { Bell, Moon, Sun } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../theme/ThemeContext.jsx'

export default function TopBar({ title, subtitle }) {
  const navigate = useNavigate()
  const { mode, setMode } = useTheme()

  return (
    <header className="flex items-center justify-between px-6 md:px-10 py-7">
      <div>
        <h2 className="font-serif text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900">{title}</h2>
        {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3 md:gap-4">
        <span className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-moss-400 bg-moss-500/10 border border-moss-500/20 rounded-full px-3 py-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-moss-400 animate-pulse" />
          LIVE
        </span>
        <button
          type="button"
          className="dark-icon-button relative w-9 h-9 rounded-full bg-base-900 shadow-card flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          aria-label="Open notifications settings"
          onClick={() => navigate('/settings#notifications')}
        >
          <Bell size={16} />
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-[10px] leading-4 text-center text-white font-semibold">
            3
          </span>
        </button>
        <button
          type="button"
          className="dark-icon-button w-9 h-9 rounded-full bg-base-900 shadow-card flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
          onClick={() => setMode(mode === 'light' ? 'dark' : 'light')}
          aria-label={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}
        >
          <Sun size={16} className={mode === 'dark' ? 'hidden' : undefined} />
          {mode === 'dark' && <Moon size={16} />}
        </button>
      </div>
    </header>
  )
}
