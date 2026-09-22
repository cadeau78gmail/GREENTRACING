import {
  Radio,
  AlertTriangle,
  ShieldCheck,
  Bell,
  Flame,
  CheckCircle,
  TreePine,
  MapPin,
  Sun,
  Battery,
  Wifi,
  Globe,
  TrendingUp,
  Calendar,
  Volume2
} from 'lucide-react'

const ICONS = {
  radio: Radio,
  'alert-triangle': AlertTriangle,
  'shield-check': ShieldCheck,
  bell: Bell,
  flame: Flame,
  'check-circle': CheckCircle,
  trees: TreePine,
  'map-pin': MapPin,
  sun: Sun,
  battery: Battery,
  wifi: Wifi,
  globe: Globe,
  'trending-up': TrendingUp,
  calendar: Calendar,
  volume: Volume2
}

const TONE_STYLES = {
  slate: 'bg-base-800 text-slate-400',
  ember: 'bg-ember-500/15 text-ember-500',
  'ember-soft': 'bg-ember-500/10 text-ember-400',
  moss: 'bg-moss-500/15 text-moss-400',
  blue: 'bg-sky-500/15 text-sky-400',
  amber: 'bg-amber-500/15 text-amber-400',
  violet: 'bg-violet-500/15 text-violet-400'
}

export default function StatCard({ icon, label, value, change, trend, tone = 'slate' }) {
  const Icon = ICONS[icon] || Radio
  const changeColor =
    trend === 'up' ? 'text-moss-400 bg-moss-500/10' : trend === 'down' ? 'text-red-400 bg-red-500/10' : 'text-slate-400'

  return (
    <div className="card p-6 transition-all duration-200 ease-out hover:-translate-y-1 hover:border-[#b8d0c1] hover:bg-[#f4faf5] hover:shadow-[0_10px_22px_rgba(15,23,42,0.06)]">
      <div className="flex items-start justify-between mb-8">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${TONE_STYLES[tone] || TONE_STYLES.slate}`}>
          <Icon size={17} />
        </div>
        {change && (
          <span className={`text-xs font-semibold rounded-full px-2 py-0.5 ${changeColor}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''} {change}
          </span>
        )}
      </div>
      <p className="font-sans text-4xl font-extrabold tracking-tight text-slate-900 leading-none">{value}</p>
      <p className="text-sm text-slate-500 mt-2">{label}</p>
    </div>
  )
}
