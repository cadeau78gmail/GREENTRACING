import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Bell,
  BellOff,
  ChevronRight,
  Globe,
  Moon,
  Palette,
  Radio,
  Search,
  ShieldCheck,
  Sun,
  Type
} from 'lucide-react'
import Modal from '../components/Modal.jsx'
import { patchApi, useApiData } from '../lib/api.js'
import { useTheme } from '../theme/ThemeContext.jsx'
import defaultTheme from '../theme/defaultTheme.js'
import { sampleThemes } from '../theme/sampleThemes.js'

const gradientPresets = [
  buildGradientTheme('Indigo Glow', '#4f46e5', '#8b5cf6'),
  buildGradientTheme('Sunset Fade', '#f97316', '#ec4899'),
  buildGradientTheme('Ocean Drift', '#0ea5e9', '#14b8a6'),
  buildGradientTheme('Forest Mist', '#15803d', '#0ea5e9')
]

const availableThemes = [
  { id: 'default', name: 'Green Trace', theme: defaultTheme },
  ...Object.entries(sampleThemes).map(([id, theme]) => ({ id, name: theme.name || id, theme })),
  ...gradientPresets.map((theme, index) => ({ id: `gradient-${index}`, name: theme.name, theme }))
]

const fontOptions = [
  { name: 'Inter', category: 'Sans-serif', family: "'Inter', sans-serif" },
  { name: 'DM Sans', category: 'Sans-serif', family: "'DM Sans', sans-serif" },
  { name: 'Manrope', category: 'Sans-serif', family: "'Manrope', sans-serif" },
  { name: 'Poppins', category: 'Sans-serif', family: "'Poppins', sans-serif" },
  { name: 'Outfit', category: 'Sans-serif', family: "'Outfit', sans-serif" },
  { name: 'Bricolage Grotesque', category: 'Sans-serif', family: "'Bricolage Grotesque', sans-serif" },
  { name: 'Work Sans', category: 'Sans-serif', family: "'Work Sans', sans-serif" },
  { name: 'Source Sans 3', category: 'Sans-serif', family: "'Source Sans 3', sans-serif" },
  { name: 'Plus Jakarta Sans', category: 'Sans-serif', family: "'Plus Jakarta Sans', sans-serif" },
  { name: 'IBM Plex Sans', category: 'Sans-serif', family: "'IBM Plex Sans', sans-serif" },
  { name: 'Nunito Sans', category: 'Sans-serif', family: "'Nunito Sans', sans-serif" },
  { name: 'Urbanist', category: 'Sans-serif', family: "'Urbanist', sans-serif" },
  { name: 'Archivo', category: 'Sans-serif', family: "'Archivo', sans-serif" },
  { name: 'Sora', category: 'Sans-serif', family: "'Sora', sans-serif" },
  { name: 'Roboto', category: 'Sans-serif', family: "'Roboto', sans-serif" },
  { name: 'Montserrat', category: 'Sans-serif', family: "'Montserrat', sans-serif" },
  { name: 'Lato', category: 'Sans-serif', family: "'Lato', sans-serif" },
  { name: 'Open Sans', category: 'Sans-serif', family: "'Open Sans', sans-serif" },
  { name: 'Raleway', category: 'Sans-serif', family: "'Raleway', sans-serif" },
  { name: 'Space Grotesk', category: 'Sans-serif', family: "'Space Grotesk', sans-serif" },
  { name: 'Quicksand', category: 'Sans-serif', family: "'Quicksand', sans-serif" },
  { name: 'Merriweather', category: 'Serif', family: "'Merriweather', serif" },
  { name: 'Lora', category: 'Serif', family: "'Lora', serif" },
  { name: 'Fraunces', category: 'Serif', family: "'Fraunces', serif" },
  { name: 'Libre Baskerville', category: 'Serif', family: "'Libre Baskerville', serif" },
  { name: 'Playfair Display', category: 'Serif', family: "'Playfair Display', serif" },
  { name: 'Cormorant Garamond', category: 'Serif', family: "'Cormorant Garamond', serif" },
  { name: 'Bitter', category: 'Serif', family: "'Bitter', serif" },
  { name: 'Source Serif 4', category: 'Serif', family: "'Source Serif 4', serif" },
  { name: 'Bodoni Moda', category: 'Serif', family: "'Bodoni Moda', serif" },
  { name: 'Cormorant', category: 'Serif', family: "'Cormorant', serif" },
  { name: 'Georgia', category: 'Serif', family: "'Georgia', serif" },
  { name: 'Times New Roman', category: 'Serif', family: "'Times New Roman', serif" },
  { name: 'JetBrains Mono', category: 'Monospace', family: "'JetBrains Mono', monospace" },
  { name: 'Fira Code', category: 'Monospace', family: "'Fira Code', monospace" },
  { name: 'Source Code Pro', category: 'Monospace', family: "'Source Code Pro', monospace" },
  { name: 'IBM Plex Mono', category: 'Monospace', family: "'IBM Plex Mono', monospace" },
  { name: 'Hack', category: 'Monospace', family: "'Hack', monospace" },
  { name: 'Courier New', category: 'Monospace', family: "'Courier New', monospace" }
]

function getPrimaryFontName(fontStack) {
  return fontStack.split(',')[0].trim().replace(/^['"]|['"]$/g, '')
}

function getThemeName(activeTheme) {
  return availableThemes.find(({ theme }) => theme.colors.accent === activeTheme.colors.accent)?.name || 'Custom'
}

function getFontOption(fontStack) {
  const fontName = getPrimaryFontName(fontStack)
  return fontOptions.find(({ name }) => name === fontName)
}

function hexToRgb(hex) {
  const safeHex = hex.replace('#', '')
  const normalized = safeHex.length === 3
    ? safeHex.split('').map((char) => char + char).join('')
    : safeHex

  const value = Number.parseInt(normalized, 16)
  return {
    r: (value >> 16) & 255,
    g: (value >> 8) & 255,
    b: value & 255
  }
}

function rgbToHex({ r, g, b }) {
  return `#${[r, g, b]
    .map((channel) => Math.max(0, Math.min(255, channel)).toString(16).padStart(2, '0'))
    .join('')}`
}

function normalizeHexColor(value, fallback = '#000000') {
  const trimmed = (value || '').trim()
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`
  const normalized = /^#[0-9A-Fa-f]{6}$/.test(withHash) ? withHash : fallback
  return normalized.toUpperCase()
}

function mixColors(hexA, hexB, amount = 0.5) {
  const a = hexToRgb(hexA)
  const b = hexToRgb(hexB)

  const mixed = {
    r: Math.round(a.r + (b.r - a.r) * amount),
    g: Math.round(a.g + (b.g - a.g) * amount),
    b: Math.round(a.b + (b.b - a.b) * amount)
  }

  return rgbToHex(mixed)
}

function buildGradientTheme(name, fromHex, toHex) {
  return {
    name,
    colors: {
      accent: fromHex,
      accentDark: toHex,
      accentLight: mixColors(fromHex, toHex, 0.5),
      success: mixColors(fromHex, toHex, 0.35),
      successLight: mixColors(toHex, fromHex, 0.5),
      bg: '#f9f7ff',
      surface: '#ffffff',
      surfaceAlt: '#f3f0ff',
      border: '#eae1ff'
    },
    fonts: {
      display: "'Space Grotesk', system-ui, sans-serif",
      body: "'Inter', system-ui, sans-serif"
    }
  }
}

function SettingRow({ icon: Icon, label, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-4 border-b border-base-700/60 py-4 text-left transition-colors last:border-b-0 hover:bg-base-800/50"
    >
      <Icon size={18} className="shrink-0 text-slate-400" />
      <span className="min-w-0 flex-1 text-sm font-semibold text-slate-100">{label}</span>
      <span className="flex items-center gap-2 text-sm text-slate-500">
        {value}
        <ChevronRight size={16} />
      </span>
    </button>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const location = useLocation()
  const notificationsRef = useRef(null)
  const { theme: activeTheme, setTheme: setActiveTheme, mode, setMode } = useTheme()
  const [notifications, setNotifications] = useState([])
  const { data, loading, error } = useApiData('/settings', 10000)
  const [scanFrequency, setScanFrequency] = useState('Every 30s')
  const [sensitivity, setSensitivity] = useState('Balanced')
  const [region, setRegion] = useState('Congo Basin')
  const [openModal, setOpenModal] = useState(null)
  const [themeSearch, setThemeSearch] = useState('')
  const [fontSearch, setFontSearch] = useState('')
  const [customGradient, setCustomGradient] = useState({ from: '#4F46E5', to: '#8B5CF6' })

  useEffect(() => {
    if (data?.notificationSettings) setNotifications(data.notificationSettings)
  }, [data])

  useEffect(() => {
    if (location.hash === '#notifications' && notificationsRef.current) {
      notificationsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [location.hash])

  const filteredThemes = useMemo(() => {
    const query = themeSearch.trim().toLowerCase()

    if (!query) return availableThemes

    return availableThemes.filter(({ name, theme }) => {
      const haystack = [
        name,
        theme.colors.accent,
        theme.colors.accentLight,
        theme.colors.success,
        theme.colors.successLight,
        theme.colors.bg,
        theme.colors.surface,
        theme.colors.surfaceAlt
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(query) || name.toLowerCase().includes(query)
    })
  }, [themeSearch])

  const filteredFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase()

    if (!query) return fontOptions

    return fontOptions.filter(({ name, category, family }) => {
      const haystack = `${name} ${category} ${family}`.toLowerCase()
      return haystack.includes(query)
    })
  }, [fontSearch])

  useEffect(() => {
    const link = document.createElement('link')
    link.id = 'font-preview-link'
    link.rel = 'stylesheet'
    link.href = `https://fonts.googleapis.com/css2?${fontOptions
      .map(({ name }) => `family=${encodeURIComponent(name).replace(/%20/g, '+')}`)
      .join('&')}&display=swap`
    document.head.appendChild(link)

    return () => link.remove()
  }, [])

  const toggleNotification = async (key) => {
    try {
      const updated = await patchApi(`/settings/notifications/${key}`, {})
      setNotifications((prev) => prev.map((notification) => notification.key === key ? updated : notification))
    } catch {
      // Keep the backend value visible when a settings update fails.
    }
  }

  const closeModal = () => setOpenModal(null)
  const currentFont = getFontOption(activeTheme.fonts.display)
  const currentFontName = currentFont?.name || getPrimaryFontName(activeTheme.fonts.display)
  const ModeIcon = mode === 'light' ? Sun : Moon

  if (loading) {
    return <div className="p-6 md:p-10 text-sm text-slate-500">Loading settings from the backend...</div>
  }

  if (error || !data) {
    return <div className="p-6 md:p-10 text-sm text-red-400">Couldn't reach the settings service.</div>
  }

  const selectFont = (font) => {
    setActiveTheme({
      ...activeTheme,
      fonts: { ...activeTheme.fonts, display: font.family }
    })
    closeModal()
  }

  return (
    <div>
      <header className="flex items-center gap-4 border-b border-base-700/60 px-6 py-6 md:px-10">
        <button
          onClick={() => navigate(-1)}
          className="dark-icon-button flex h-9 w-9 items-center justify-center rounded-full border border-base-700 text-slate-300 transition-colors hover:text-white"
          aria-label="Go back"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="font-serif text-2xl text-slate-50 md:text-3xl">Settings</h2>
          <p className="mt-1 text-sm text-slate-500">Configure your monitoring experience</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 p-6 md:p-10">
        <div>
          <h1 className="font-serif text-2xl text-slate-50">Preferences</h1>
          <p className="mt-1 text-sm text-slate-500">Configure how Green Trace looks and behaves</p>
        </div>

        <section className="card p-6">
          <h3 className="font-serif text-xl text-slate-50">Appearance</h3>
          <p className="mb-2 text-sm text-slate-500">Customize how Green Trace looks on your device</p>
          <div className="divide-y divide-base-700/60">
            <SettingRow
              icon={ModeIcon}
              label="Mode"
              value={mode === 'light' ? 'Light' : 'Dark'}
              onClick={() => setOpenModal('mode')}
            />
            <SettingRow
              icon={Palette}
              label="Brand Theme"
              value={
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 rounded-full" style={{ backgroundColor: activeTheme.colors.accent }} />
                  {getThemeName(activeTheme)}
                </span>
              }
              onClick={() => setOpenModal('brand')}
            />
            <SettingRow icon={Type} label="Font" value={currentFontName} onClick={() => setOpenModal('font')} />
          </div>
        </section>

        <section id="notifications" ref={notificationsRef} className="card p-6 scroll-mt-24">
          <h3 className="font-serif text-xl text-slate-50">Notifications</h3>
          <p className="mb-5 text-sm text-slate-500">Manage alert preferences for threat detection</p>
          <div className="divide-y divide-base-700/60">
            {notifications.map((notification) => (
              <div key={notification.key} className="flex w-full items-center gap-3 py-4 first:pt-0 last:pb-0">
                <div className="flex shrink-0 items-center">
                  {notification.enabled ? (
                    <Bell size={18} className="text-slate-400" />
                  ) : (
                    <BellOff size={18} className="text-slate-600" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-100">{notification.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{notification.subtitle}</p>
                </div>

                <button
                  role="switch"
                  aria-checked={notification.enabled}
                  onClick={() => toggleNotification(notification.key)}
                  className={`relative ml-auto h-8 w-16 shrink-0 rounded-full transition-all duration-200 ease-out ${
                    notification.enabled ? 'bg-[#0c6d46]' : 'bg-[#d7d7d3]'
                  }`}
                >
                  <span
                    className={`absolute top-1/2 h-7 w-7 -translate-y-1/2 rounded-full bg-white shadow-[0_2px_8px_rgba(0,0,0,0.12)] transition-all duration-200 ease-out ${
                      notification.enabled ? 'left-0.5' : 'right-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="card p-6">
          <h3 className="font-serif text-xl text-slate-50">Monitoring</h3>
          <p className="mb-5 text-sm text-slate-500">Configure sensor network behavior</p>
          <div className="divide-y divide-base-700/60">
            <div className="flex items-center gap-3 py-4 first:pt-0">
              <Radio size={18} className="shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">Scan Frequency</p>
                <p className="mt-0.5 text-xs text-slate-500">How often sensors transmit data</p>
              </div>
              <select value={scanFrequency} onChange={(event) => setScanFrequency(event.target.value)} className="shrink-0 rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-sm text-slate-200">
                <option>Every 10s</option>
                <option>Every 30s</option>
                <option>Every 60s</option>
              </select>
            </div>
            <div className="flex items-center gap-3 py-4">
              <ShieldCheck size={18} className="shrink-0 text-slate-400" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-100">Sensitivity Level</p>
                <p className="mt-0.5 text-xs text-slate-500">AI detection threshold</p>
              </div>
              <select value={sensitivity} onChange={(event) => setSensitivity(event.target.value)} className="shrink-0 rounded-lg border border-base-700 bg-base-800 px-3 py-2 text-sm text-slate-200">
                <option>Conservative</option>
                <option>Balanced</option>
                <option>Aggressive</option>
              </select>
            </div>
          </div>
        </section>

        <div className="pb-8 pt-2 text-center text-xs text-slate-600">
          <p>Green Trace v1.0 — AI Forest Canopy Monitoring</p>
          <p className="mt-1">Sensing the Unseen · Protecting the Green</p>
        </div>
      </div>

      {openModal === 'mode' && (
        <Modal title="Choose display mode" onClose={closeModal}>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'dark', label: 'Dark', icon: Moon }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setMode(id)
                  closeModal()
                }}
                className={`flex flex-col items-center gap-3 rounded-xl border py-10 transition-colors ${
                  mode === id ? 'border-ember-500 bg-ember-500/5' : 'border-base-700 hover:border-base-600'
                }`}
              >
                <Icon size={25} className={mode === id ? 'text-ember-500' : 'text-slate-400'} />
                <span className="font-semibold text-slate-200">{label}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}

      {openModal === 'brand' && (
        <Modal title="Choose brand theme" onClose={closeModal} className="max-w-5xl">
          <div className="mb-4">
            <label className="relative block">
              <span className="sr-only">Search themes or colors</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={themeSearch}
                onChange={(event) => setThemeSearch(event.target.value)}
                placeholder="Search themes or colors"
                className="w-full rounded-lg border border-base-700 bg-base-800 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-ember-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="mb-5 rounded-xl border border-base-700 bg-base-800/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-200">Custom gradient</h4>
              <button
                type="button"
                onClick={() => {
                  const from = normalizeHexColor(customGradient.from, '#4F46E5')
                  const to = normalizeHexColor(customGradient.to, '#8B5CF6')
                  const nextTheme = buildGradientTheme('Custom gradient', from, to)
                  setActiveTheme(nextTheme)
                  closeModal()
                }}
                className="rounded-lg border border-[#033923] bg-[#033923] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              >
                Apply
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <label className="flex flex-1 flex-col gap-2 rounded-lg border border-base-700 bg-base-900/40 px-3 py-2 text-sm text-slate-200">
                <span className="text-slate-400">Add the hex code color of your preference</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={normalizeHexColor(customGradient.from, '#4F46E5')}
                    onChange={(event) => setCustomGradient((prev) => ({ ...prev, from: event.target.value.toUpperCase() }))}
                    className="h-8 w-10 cursor-pointer border-0 bg-transparent p-0"
                  />
                  <input
                    type="text"
                    value={customGradient.from}
                    onChange={(event) => setCustomGradient((prev) => ({ ...prev, from: event.target.value.toUpperCase() }))}
                    placeholder="#RRGGBB"
                    className="w-full rounded border border-base-700 bg-base-800 px-2 py-1.5 text-xs font-mono uppercase text-slate-100 outline-none focus:border-ember-500"
                  />
                </div>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredThemes.length > 0 ? (
              filteredThemes.map(({ id, name, theme }) => {
                const isActive = theme.colors.accent === activeTheme.colors.accent

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setActiveTheme(theme)
                      closeModal()
                    }}
                    className={`flex flex-col items-center gap-3 rounded-xl border p-4 text-center transition-colors ${
                      isActive ? 'border-ember-500 bg-ember-500/5' : 'border-base-700 hover:border-base-600'
                    }`}
                  >
                    <span
                      className="h-12 w-12 rounded-full border border-white/10"
                      style={{
                        background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accentDark || theme.colors.accent} 100%)`
                      }}
                    />
                    <span className="text-sm font-semibold text-slate-200">{name}</span>
                  </button>
                )
              })
            ) : (
              <div className="col-span-full rounded-xl border border-dashed border-base-700 px-4 py-8 text-center text-sm text-slate-400">
                No themes match your search.
              </div>
            )}
          </div>
        </Modal>
      )}

      {openModal === 'font' && (
        <Modal title="Choose display font" onClose={closeModal}>
          <div className="mb-4">
            <label className="relative block">
              <span className="sr-only">Search fonts</span>
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={fontSearch}
                onChange={(event) => setFontSearch(event.target.value)}
                placeholder="Search fonts"
                className="w-full rounded-lg border border-base-700 bg-base-800 py-2.5 pl-9 pr-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-ember-500 focus:outline-none"
              />
            </label>
          </div>

          <div className="space-y-2">
            {filteredFonts.length > 0 ? (
              filteredFonts.map((font) => {
                const isActive = currentFontName === font.name

                return (
                  <button
                    key={font.name}
                    type="button"
                    onClick={() => selectFont(font)}
                    className={`flex w-full items-center justify-between rounded-lg border px-4 py-3 text-left transition-colors ${
                      isActive ? 'border-ember-500 bg-ember-500/5' : 'border-transparent hover:border-base-700 hover:bg-base-800'
                    }`}
                  >
                    <span className="text-lg text-slate-100" style={{ fontFamily: font.family }}>{font.name}</span>
                    <span className="text-xs text-slate-500">{font.category}</span>
                  </button>
                )
              })
            ) : (
              <div className="rounded-lg border border-dashed border-base-700 px-4 py-6 text-center text-sm text-slate-400">
                No fonts match your search.
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}