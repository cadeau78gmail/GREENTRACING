import { useEffect, useState } from 'react'
import { AlertTriangle, Flame, CheckCircle, Volume2, Bell, Clock } from 'lucide-react'
import TopBar from '../components/TopBar.jsx'
import Modal from '../components/Modal.jsx'
import { patchApi, useApiData } from '../lib/api.js'

const ICONS = { volume: Volume2, flame: Flame, 'alert-triangle': AlertTriangle, bell: Bell, 'check-circle': CheckCircle }

const STAT_TONE = {
  slate: 'bg-base-800 text-slate-300',
  ember: 'bg-ember-500/15 text-ember-500',
  'ember-soft': 'bg-ember-500/10 text-ember-400',
  moss: 'bg-moss-500/15 text-moss-400'
}

const SEVERITY_BADGE = {
  Critical: 'text-red-400 bg-red-500/10 border-red-500/20',
  High: 'text-ember-500 bg-ember-500/10 border-ember-500/20',
  Medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20'
}

const TABS = ['All', 'Resolved']

export default function Alerts() {
  const [tab, setTab] = useState('All')
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [alerts, setAlerts] = useState([])
  const { data, loading, error } = useApiData('/alerts', 1000)

  useEffect(() => {
    if (data?.alerts) setAlerts(data.alerts)
  }, [data])

  if (loading || !data) return <div><TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" /><div className="p-6 md:p-10 text-sm text-slate-500">Loading live alerts...</div></div>
  if (error) return <div><TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" /><div className="p-6 md:p-10 text-sm text-red-400">Couldn't reach the alert service.</div></div>

  const { alertStats } = data
  const filtered = tab === 'All' ? alerts : alerts.filter((a) => a.status === tab)

  const markAsResolved = async (alertId) => {
    try {
      const updated = await patchApi(`/alerts/${alertId}/resolve`, {})
      setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, status: updated.status } : alert)))
    } catch {
      // The backend remains the source of truth when a mutation fails.
    }
  }

  return (
    <div>
      <TopBar title="Canopy Dashboard" subtitle="AI Forest Monitoring · Real-time" />

      <div className="p-6 md:p-10 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif text-2xl text-slate-50">Threat Alerts</h3>
            <p className="text-sm text-slate-500 mt-1">Real-time threat detection feed from all sensor nodes</p>
          </div>
          <span className="flex items-center gap-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> LIVE FEED
          </span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {alertStats.map((s) => {
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

        <div className="flex bg-base-900 border border-base-700 rounded-lg p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 text-sm rounded-md font-medium transition-colors ${
                tab === t ? 'bg-base-700 text-slate-50' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filtered.map((alert) => {
            const Icon = ICONS[alert.icon]
            return (
              <div
                key={alert.id}
                className={`card p-5 flex items-center gap-4 ${
                  alert.status === 'Active' ? 'border-ember-500/25' : ''
                }`}
              >
                <div className="w-11 h-11 rounded-lg bg-base-800 flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-ember-500" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-semibold text-slate-100">{alert.title}</p>
                  <p className="text-sm text-slate-500 mt-0.5">{alert.location}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                    <Clock size={12} />
                    {alert.time}
                    <span className="text-slate-700">·</span>
                    <span className={alert.status === 'Active' ? 'text-ember-500 font-medium' : 'text-moss-400 font-medium'}>
                      {alert.status === 'Active' ? '● Active' : '✓ Resolved'}
                    </span>
                  </div>
                </div>
                <span className={`text-xs font-semibold rounded-full px-3 py-1 border shrink-0 ${SEVERITY_BADGE[alert.severity]}`}>
                  {alert.severity}
                </span>
                <button
                  type="button"
                  onClick={() => markAsResolved(alert.id)}
                  className="shrink-0 rounded-md border border-[#033923] bg-[#033923] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#022d1a] focus:outline-none focus:ring-2 focus:ring-[#033923]/30"
                >
                  Mark as resolved
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedAlert(alert)}
                  className="shrink-0 rounded-md border border-base-700 px-3 py-1.5 text-xs font-semibold text-slate-300 transition-colors hover:border-ember-500/60 hover:text-ember-400 focus:outline-none focus:ring-2 focus:ring-ember-500/40"
                >
                  Preview
                </button>
              </div>
            )
          })}
        </div>
      </div>

      {selectedAlert && (
        <Modal title="Activity preview" onClose={() => setSelectedAlert(null)}>
          <div className="space-y-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-ember-500">Detection overview</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-50">{selectedAlert.title}</h4>
            </div>
            <div className="space-y-3 text-sm">
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Threat type</span>
                <span className="text-right text-slate-100">{selectedAlert.title}</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Severity</span>
                <span className={SEVERITY_BADGE[selectedAlert.severity].split(' ')[0]}>{selectedAlert.severity}</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Detected</span>
                <span className="text-right text-slate-100">{selectedAlert.time}</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Detection source</span>
                <span className="text-right text-slate-100">Acoustic/Chemical Sensor</span>
              </p>
              <p className="flex justify-between gap-4 border-b border-base-700/50 pb-3">
                <span className="text-slate-500">Location</span>
                <span className="text-right text-slate-100">Node {selectedAlert.id}</span>
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
