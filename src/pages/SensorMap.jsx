import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import SatelliteMap from '../components/SatelliteMap.jsx'
import { sensorMapStats, nodeList, satelliteNodes } from '../data/mockData.js'

const FILTERS = ['All', 'Active', 'Alert', 'Offline']

const STAT_TONE = {
  moss: 'text-moss-400',
  ember: 'text-ember-500',
  slate: 'text-slate-100'
}

const STATUS_DOT = {
  active: 'bg-green-500 animate-pulse',
  alert: 'bg-red-500',
  offline: 'bg-slate-400 ring-2 ring-black/40'
}

export default function SensorMap() {
  const [filter, setFilter] = useState('All')

  const filteredNodes =
    filter === 'All' ? nodeList : nodeList.filter((n) => n.status === filter.toLowerCase())

  return (
    <div>
      <TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" />

      <div className="p-6 md:p-10 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="font-serif text-2xl text-slate-50">Sensor Network Map</h3>
            <p className="text-sm text-slate-500 mt-1">Live view of all deployed nodes across the forest</p>
          </div>
          <div className="flex items-center gap-2">
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
            <button className="flex items-center gap-2 text-sm font-medium text-slate-300 border border-base-700 rounded-lg px-3 py-2 hover:border-base-600 transition-colors">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {sensorMapStats.map((s) => (
            <div key={s.label} className="card p-5">
              <p className="text-sm text-slate-500 mb-2">{s.label}</p>
              <p className={`font-serif text-3xl ${STAT_TONE[s.tone]}`}>{s.value}</p>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-xl text-slate-50">Coverage Map</h3>
              <div className="flex items-center gap-4 text-xs text-slate-400">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Active</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" /> Alert</span>
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-400 ring-2 ring-black/40" /> Offline</span>
              </div>
            </div>
            <SatelliteMap nodes={satelliteNodes} coverage="87.3%" scanLabel="12s ago" height="h-96" />
          </div>

          <div className="card p-5">
            <div className="mb-4">
              <h3 className="font-serif text-xl text-slate-50">Node List</h3>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500">Sensor Connectivity</p>
            </div>
            <div className="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
              <span>Node</span>
              <span>Connection</span>
            </div>
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {filteredNodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  className="w-full text-left flex items-center gap-3 p-3 rounded-lg border border-base-700/60 hover:border-base-600 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/40"
                >
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_DOT[node.status]}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-100 truncate">{node.id}</p>
                  </div>
                  <span className="text-sm font-semibold text-slate-300 shrink-0">{node.coverage}%</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
