import { Link } from 'react-router-dom'
import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { Map, Bell, TreePine, Globe, Volume2, Flame, AlertTriangle } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import StatCard from '../components/StatCard.jsx'
import SatelliteMap from '../components/SatelliteMap.jsx'
import Modal from '../components/Modal.jsx'
import { API_BASE, useApiData } from '../lib/api.js'

const SHORTCUT_ICONS = { map: Map, bell: Bell, trees: TreePine, globe: Globe }
const FEED_ICONS = { volume: Volume2, flame: Flame, 'alert-triangle': AlertTriangle, bell: Bell }

const SHORTCUT_TONE = {
  blue: 'bg-[#033923]/10 border-[#033923]/20 text-[#033923]',
  ember: 'bg-ember-500/10 border-ember-500/20 text-ember-500',
  moss: 'bg-moss-500/10 border-moss-500/20 text-moss-400',
  violet: 'bg-[#033923]/10 border-[#033923]/20 text-[#033923]'
}

const SEVERITY_STYLES = {
  Critical: 'text-red-400',
  High: 'text-ember-500',
  Medium: 'text-amber-400'
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-base-800 border border-base-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-400 mb-1">{label}</p>
      <p className="text-ember-500">Threats: <span className="font-semibold">{payload[0]?.value}</span></p>
      <p className="text-moss-400">Resolved: <span className="font-semibold">{payload[1]?.value}</span></p>
    </div>
  )
}

export default function Overview() {
  const [selectedThreat, setSelectedThreat] = useState(null)
  const { data, loading, error } = useApiData('/overview', 1000)

  if (loading) {
    return (
      <div>
        <TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" />
        <div className="p-6 md:p-10 text-slate-500 text-sm">Loading live sensor data…</div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div>
        <TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" />
        <div className="p-6 md:p-10 text-sm text-red-400">
          Couldn't reach the backend at {API_BASE}.
          Make sure <code>python app.py</code> is running.
        </div>
      </div>
    )
  }

  const { overviewStats, shortcuts, threatActivity, liveThreatFeed, satelliteNodes, zoneDistribution, meta } = data
  const threatsToday = meta?.totalThreats ?? 0
  const resolvedPct = meta?.resolvedPct ?? 0

  return (
    <div>
      <TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" />

      <div className="p-6 md:p-10 space-y-6">
        {/* Hero banner */}
        <div className="relative overflow-hidden rounded-xl p-8 bg-gradient-to-br from-ember-600 via-ember-500 to-ember-600">
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide text-white/80 mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-white" />
                SYSTEM ONLINE
              </div>
              <h3 className="font-serif text-3xl md:text-4xl text-white mb-2">Good morning, Forest Guardian</h3>
              <p className="text-white/85 text-sm md:text-base">
                Live status for 5 fixed sensor nodes. Counts below reflect this demo timeline.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/15 rounded-xl px-6 py-4 text-center min-w-[110px]">
                <p className="font-serif text-3xl text-white">{threatsToday}</p>
                <p className="text-xs text-white/80 mt-1">Threats today</p>
              </div>
              <div className="bg-white/15 rounded-xl px-6 py-4 text-center min-w-[110px]">
                <p className="font-serif text-3xl text-white">{resolvedPct}%</p>
                <p className="text-xs text-white/80 mt-1">Resolved</p>
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
            <StatCard
              key={s.label}
              {...s}
              label={s.label}
              tone={s.trend === 'down' ? 'ember' : 'slate'}
            />
          ))}
        </div>

        {/* Satellite overview */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-serif text-xl text-slate-50">Satellite Overview</h3>
              <p className="text-sm text-slate-500">Active sensor network — Africa</p>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-moss-400" /> Active</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Alert</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400" /> Offline</span>
            </div>
          </div>
          <SatelliteMap nodes={satelliteNodes} scanLabel="live" />
        </div>

        {/* Threat activity + zone distribution */}
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-5 lg:col-span-2">
            <h3 className="font-serif text-xl text-slate-50">Threat Activity</h3>
            <p className="text-sm text-slate-500 mb-4">Current-session activity recorded by the backend</p>
            <div className="h-64">
              {threatActivity.some((entry) => entry.detected > 0 || entry.resolved > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={threatActivity}>
                  <defs>
                    <linearGradient id="detected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#e8622c" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#e8622c" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="resolved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3fa868" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3fa868" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#262e28" />
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="detected" stroke="#e8622c" fill="url(#detected)" strokeWidth={2} />
                  <Area type="monotone" dataKey="resolved" stroke="#3fa868" fill="url(#resolved)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No threat activity recorded yet.
                </div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <h3 className="font-serif text-xl text-slate-50">Zone Distribution</h3>
            <p className="text-sm text-slate-500 mb-4">Threat density by region</p>
            <div className="h-40">
              {zoneDistribution.length > 0 ? (
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
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-center text-sm text-slate-500">
                  No zone threat data recorded yet.
                </div>
              )}
            </div>
            {zoneDistribution.length > 0 && (
              <div className="space-y-2 mt-2">
                {zoneDistribution.map((z) => (
                  <div key={z.name} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-slate-300">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />
                      {z.name}
                    </span>
                    <span className="font-semibold text-slate-100">{z.value}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live threat feed */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-serif text-xl text-slate-50">Live Threat Feed</h3>
            <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2.5 py-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE
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
              <p className="flex justify-between gap-4">
                <span className="text-slate-500">Location</span>
                <span className="text-right text-slate-100">{selectedThreat.location}</span>
              </p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}