import { ShieldCheck, TreePine, AlertTriangle, MapPin, TrendingUp, TrendingDown } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import { useApiData } from '../lib/api.js'
import { useTheme } from '../theme/ThemeContext.jsx'

const ICONS = { 'shield-check': ShieldCheck, trees: TreePine, 'alert-triangle': AlertTriangle, 'map-pin': MapPin }

const STAT_TONE = {
  moss: 'bg-moss-500/15 text-moss-400',
  ember: 'bg-ember-500/15 text-ember-500',
  blue: 'bg-[#033923]/15 text-[#033923]'
}

const RISK_BADGE = {
  low: 'text-moss-400 bg-moss-500/10 border-moss-500/20',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  high: 'text-red-400 bg-red-500/10 border-red-500/20'
}

export default function ForestZones() {
  const { theme } = useTheme()
  const { data, loading, error } = useApiData('/forest-zones', 1000)
  if (loading || !data) return <div><TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" /><div className="p-6 md:p-10 text-sm text-slate-500">Loading live zones...</div></div>
  if (error) return <div><TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" /><div className="p-6 md:p-10 text-sm text-red-400">Couldn't reach the zones service.</div></div>

  const { forestZoneStats, forestZones } = data

  return (
    <div>
      <TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" />

      <div className="p-6 md:p-10 space-y-6">
        <div>
          <h3 className="font-serif text-2xl text-slate-50">Forest Zones</h3>
          <p className="text-sm text-slate-500 mt-1">Monitor and manage all protected zones across the forest</p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {forestZoneStats.map((s) => {
            const Icon = ICONS[s.icon]
            return (
              <div
                key={s.label}
                className="card p-5 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-[#b8d0c1] hover:bg-[#f4faf5] hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]"
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-6 ${STAT_TONE[s.tone]}`}>
                  <Icon size={17} />
                </div>
                <p className="font-serif text-3xl text-slate-50">{s.value}</p>
                <p className="text-sm text-slate-500 mt-2">{s.label}</p>
              </div>
            )
          })}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {forestZones.map((zone) => (
            <div key={zone.name} className="card overflow-hidden transition-all duration-200 ease-out hover:-translate-y-1 hover:border-[#b8d0c1] hover:bg-[#f4faf5] hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
              <div className="relative h-28 p-4 flex items-start justify-between" style={{ backgroundColor: theme.colors.accent }}>
                <p className="font-serif text-lg text-white drop-shadow">{zone.name}</p>
                <span className={`text-xs font-semibold rounded-full px-2.5 py-1 border ${RISK_BADGE[zone.risk]}`}>
                  {zone.risk} risk
                </span>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-serif text-xl text-slate-50">{zone.node || zone.name}</p>
                    <p className="text-sm text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin size={12} /> {zone.location || 'Forest node'}
                    </p>
                  </div>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${zone.trend === 'up' ? 'bg-moss-500/15 text-moss-400' : 'bg-red-500/15 text-red-400'}`}>
                    {zone.trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-base-800 rounded-lg p-3 text-center">
                    <p className="font-serif text-lg text-slate-50">{zone.hectares}</p>
                    <p className="text-xs text-slate-500 mt-1">Hectares</p>
                  </div>
                  <div className="bg-base-800 rounded-lg p-3 text-center">
                    <p className="font-serif text-lg text-slate-50">{zone.accuracy ?? zone.coverage}%</p>
                    <p className="text-xs text-slate-500 mt-1">Threat density</p>
                  </div>
                  <div className="bg-base-800 rounded-lg p-3 text-center">
                    <p className="font-serif text-lg text-slate-50">{zone.threats}</p>
                    <p className="text-xs text-slate-500 mt-1">Threats</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm mb-1.5">
                  <span className="text-slate-500">Threat Density</span>
                  <span className="font-semibold text-slate-200">{zone.coverage}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-base-700 overflow-hidden mb-4">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-ember-500 to-moss-400"
                    style={{ width: `${zone.coverage}%` }}
                  />
                </div>

              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
