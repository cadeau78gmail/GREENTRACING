import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Map, Bell, TreePine, Globe, Volume2, Flame, AlertTriangle } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import StatCard from '../components/StatCard.jsx'
import SatelliteMap from '../components/SatelliteMap.jsx'
import Modal from '../components/Modal.jsx'
import { overviewStats, shortcuts, threatActivity, liveThreatFeed, satelliteNodes, zoneDistribution } from '../data/mockData.js'
import { useTheme } from '../theme/ThemeContext.jsx'

const SHORTCUT_ICONS = { map: Map, bell: Bell, trees: TreePine, globe: Globe }
const FEED_ICONS = { volume: Volume2, flame: Flame, 'alert-triangle': AlertTriangle, bell: Bell }

const SHORTCUT_TONE = {
  blue: 'bg-[#033923]/10 border-[#033923]/20 text-[#033923]',
  ember: 'bg-ember-500/10 border-ember-500/20 text-ember-500',
  moss: 'bg-[#eaf5ee] border-[#cfe4d6] text-[#1d5d45]',
  violet: 'bg-violet-500/10 border-violet-500/20 text-violet-400'
}

const SEVERITY_STYLES = {
  Critical: 'text-red-400',
  High: 'text-ember-500',
  Medium: 'text-amber-400'
}

const ZONE_NODE_LABELS = ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4']

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      className="rounded-lg px-3 py-2 text-xs shadow-card"
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid rgba(15, 23, 42, 0.14)',
        color: '#0f172a'
      }}
    >
      <p style={{ color: '#334155', opacity: 0.9, marginBottom: 4 }}>{label}</p>
      <p style={{ color: '#0f172a' }}>Threats: <span style={{ color: '#0f172a', fontWeight: 700 }}>{payload[0]?.value}</span></p>
      <p style={{ color: '#0f172a' }}>Resolved: <span style={{ color: '#0f172a', fontWeight: 700 }}>{payload[1]?.value}</span></p>
    </div>
  )
}

export default function Overview() {
  const [selectedThreat, setSelectedThreat] = useState(null)
  const { theme } = useTheme()

  const heroStyle = {
    background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accentDark || theme.colors.accent} 100%)`,
    boxShadow: `0 18px 40px -32px ${theme.colors.accent}`
  }

  return (
    <div>
      <TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" />

      <div className="p-6 md:p-10 space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-2xl p-8 shadow-card" style={heroStyle}>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold tracking-wide text-white/80">
                <span className="h-1.5 w-1.5 rounded-full bg-white" />
                SYSTEM ONLINE
              </div>
              <h3 className="mb-2 font-serif text-3xl text-white md:text-4xl">Good morning, Forest Guardian</h3>
              <p className="text-sm text-white/85 md:text-base">
                All systems are operational. 487 sensors active across 4 regions.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="min-w-[110px] rounded-xl bg-white/15 px-6 py-4 text-center">
                <p className="font-serif text-3xl text-white">23</p>
                <p className="mt-1 text-xs text-white/80">Threats today</p>
              </div>
              <div className="min-w-[110px] rounded-xl bg-white/15 px-6 py-4 text-center">
                <p className="font-serif text-3xl text-white">91%</p>
                <p className="mt-1 text-xs text-white/80">Resolved</p>
              </div>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {shortcuts.map((s) => {
            const Icon = SHORTCUT_ICONS[s.icon]
            return (
              <Link
                key={s.title}
                to={s.to}
                className={`card p-4 flex items-center gap-3 hover:border-base-600 transition-colors ${SHORTCUT_TONE[s.tone]}`}
              >
                <div className="w-9 h-9 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
                  <Icon size={17} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-100 truncate">{s.title}</p>
                  <p className="text-xs text-slate-500 truncate">{s.subtitle}</p>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewStats.map((s) => (
            <StatCard key={s.label} {...s} tone={s.trend === 'down' ? 'ember' : 'slate'} />
          ))}
        </div>

        {/* Sensors overview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-xl text-slate-50">Sensors Overview</h3>
              <p className="text-sm text-slate-500">Active sensor network</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Active</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Alert</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 ring-2 ring-black/40" /> Offline</span>
            </div>
          </div>
          <SatelliteMap nodes={satelliteNodes} coverage="87.3%" scanLabel="12s ago" />
        </div>

        {/* Threat activity + zone distribution */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-serif text-xl text-slate-50">Threat Activity</h3>
            <p className="text-sm text-slate-500 mb-4">Monthly overview across all zones</p>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={threatActivity}>
                  <defs>
                    <linearGradient id="detected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-success)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="var(--color-success)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ stroke: 'var(--color-accent)', strokeWidth: 1 }}
                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(148,163,184,0.35)', borderRadius: 10, color: '#ffffff' }}
                    labelStyle={{ color: '#ffffff' }}
                    itemStyle={{ color: '#ffffff' }}
                  />
                  <Area type="monotone" dataKey="detected" stroke="var(--color-accent)" fill="url(#detected)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" stroke="var(--color-success)" fill="url(#resolved)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-serif text-xl text-slate-50">Zone Distribution</h3>
            <p className="text-sm text-slate-500 mb-4">Threat density by zone</p>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={zoneDistribution}
                    dataKey="value"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {zoneDistribution.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={entry.name === 'Congo Basin' ? 'var(--color-accent)' : entry.name === 'East Africa' ? 'var(--color-success)' : entry.color}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-2">
              {zoneDistribution.map((z, index) => (
                <div key={z.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-300">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: z.name === 'Congo Basin' ? 'var(--color-accent)' : z.name === 'East Africa' ? 'var(--color-success)' : z.color }}
                    />
                    {ZONE_NODE_LABELS[index]}
                  </span>
                  <span className="font-semibold text-slate-100">{z.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live threat feed */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif text-xl text-slate-50">Live Threat Feed</h3>
            <span className="flex items-center gap-1.5 text-xs font-medium text-moss-400 bg-moss-500/10 border border-moss-500/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-moss-400 animate-pulse" /> LIVE
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-4">Most recent detections across all zones</p>
          <div className="space-y-3">
            {liveThreatFeed.map((item) => {
              const Icon = FEED_ICONS[item.icon]
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-base-700/60 hover:border-ember-500/30 transition-colors">
                  <div className="w-9 h-9 rounded-lg bg-base-800 flex items-center justify-center shrink-0">
                    <Icon size={16} className="text-slate-300" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-100 truncate">{item.title}</p>
                    <p className={`text-xs mt-0.5 ${SEVERITY_STYLES[item.severity]}`}>
                      <span>{item.severity}</span> <span className="text-slate-600">·</span>{' '}
                      <span className="text-slate-500">{item.time}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedThreat(item)}
                    className="shrink-0 rounded-md border border-base-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-ember-500/60 hover:text-ember-400 focus:outline-none focus:ring-2 focus:ring-ember-500/40"
                  >
                    Preview
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {selectedThreat && (
        <Modal title="Activity preview" onClose={() => setSelectedThreat(null)}>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ember-500">Detection overview</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-50">{selectedThreat.title}</h4>
            </div>
            <div className="space-y-3 text-sm">
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Threat type</span>
                <span className="text-right text-slate-100">{selectedThreat.title}</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Severity</span>
                <span className={SEVERITY_STYLES[selectedThreat.severity]}>{selectedThreat.severity}</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Detected</span>
                <span className="text-right text-slate-100">{selectedThreat.time}</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Detection source</span>
                <span className="text-right text-slate-100">Acoustic/Chemical Sensor</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Location</span>
                <span className="text-right text-slate-100">Node {selectedThreat.id}</span>
              </p>
              <p className="flex justify-between gap-4">
                <span className="text-slate-500">Accuracy</span>
                <span className="text-slate-100">94%</span>
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
