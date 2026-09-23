import { useState } from 'react'
import { Radio, Sun, Battery, Wifi } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import { sensorUnitStats, sensorRegistry } from '../data/mockData.js'

const ICONS = { radio: Radio, sun: Sun, battery: Battery, wifi: Wifi }

const STAT_TONE = {
  slate: 'bg-base-800 text-slate-300',
  amber: 'bg-amber-500/15 text-amber-400',
  moss: 'bg-moss-500/15 text-moss-400',
  blue: 'bg-sky-500/15 text-sky-400'
}

const STATUS_BADGE = {
  Active: 'text-moss-400 bg-moss-500/10',
  Alert: 'text-ember-500 bg-ember-500/10',
  Offline: 'text-slate-500 bg-slate-500/10'
}

const FILTERS = ['All', 'Active', 'Alert', 'Offline']

function Bar({ value, color }) {
  if (value == null) return <span className="text-slate-600">—</span>
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-1.5 rounded-full bg-base-700 overflow-hidden">
        <div className="theme-meter-fill h-full rounded-full" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-slate-400 w-8">{value}%</span>
    </div>
  )
}

export default function Sensors() {
  const [filter, setFilter] = useState('All')
  const filtered = filter === 'All' ? sensorRegistry : sensorRegistry.filter((s) => s.status === filter)

  return (
    <div>
      <TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" />

      <div className="p-6 md:p-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-serif text-2xl text-slate-50">Sensor Units</h3>
            <p className="text-sm text-slate-500 mt-1">Manage and monitor all deployed sensor hardware</p>
          </div>
          <div className="flex bg-base-900 border border-base-700 rounded-lg p-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
                  filter === f ? 'bg-base-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {sensorUnitStats.map((s) => {
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

        <div className="card p-5 overflow-x-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif text-xl text-slate-50">Sensor Registry</h3>
            <span className="text-sm text-slate-500">{filtered.length} sensors</span>
          </div>
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 tracking-wide border-b border-base-700/60">
                <th className="pb-3 font-medium">Sensor ID</th>
                <th className="pb-3 font-medium">Zone</th>
                <th className="pb-3 font-medium">Type</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium">Battery</th>
                <th className="pb-3 font-medium">Signal</th>
                <th className="pb-3 font-medium">Temp</th>
                <th className="pb-3 font-medium">Uptime</th>
                <th className="pb-3 font-medium">Last Ping</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-b border-base-700/40 last:border-0">
                  <td className="py-4 font-semibold text-slate-100">{s.id}</td>
                  <td className="py-4 text-slate-400">Node {s.id.replace('SN-', '')}</td>
                  <td className="py-4 text-slate-400">{s.type}</td>
                  <td className="py-4">
                    <span className={`text-xs font-medium rounded-full px-2.5 py-1 ${STATUS_BADGE[s.status]}`}>
                      ● {s.status}
                    </span>
                  </td>
                  <td className="py-4"><Bar value={s.battery} color="var(--color-success)" /></td>
                  <td className="py-4"><Bar value={s.signal} color="var(--color-accent)" /></td>
                  <td className="py-4 text-slate-400">{s.temp ?? '—'}</td>
                  <td className="py-4 text-slate-400">{s.uptime ?? '—'}</td>
                  <td className="py-4 text-slate-500">{s.lastPing}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
