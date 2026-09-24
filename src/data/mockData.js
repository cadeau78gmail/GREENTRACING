// Centralized mock data. Swap any of this out for real API calls later —
// every page reads from here, so this is the one place to wire up a backend.

export const overviewStats = [
  { label: 'Active Sensors', value: '102', change: '+12%', trend: 'up', icon: 'radio' },
  { label: 'Threats Detected', value: '23', change: '-8%', trend: 'down', icon: 'alert-triangle' },
  { label: 'Zones Protected', value: '142', change: '+5%', trend: 'up', icon: 'shield-check' },
  { label: 'Hectares Monitored', value: '500', change: '', trend: 'up', icon: 'bell' }
]

export const shortcuts = [
  { title: 'Sensor Map', subtitle: 'View live sensor locations', icon: 'map', to: '/sensor-map', tone: 'blue' },
  { title: 'Alerts', subtitle: '3 active threats', icon: 'bell', to: '/alerts', tone: 'ember' },
  { title: 'Forest Zones', subtitle: '142 zones protected', icon: 'trees', to: '/forest-zones', tone: 'moss' },
  { title: 'Reports', subtitle: 'Download analytics', icon: 'globe', to: '/reports', tone: 'moss' }
]

export const threatActivity = [
  { month: 'Jan', detected: 15, resolved: 13 },
  { month: 'Feb', detected: 21, resolved: 18 },
  { month: 'Mar', detected: 10, resolved: 9 },
  { month: 'Apr', detected: 24, resolved: 20 },
  { month: 'May', detected: 16, resolved: 14 },
  { month: 'Jun', detected: 30, resolved: 27 },
  { month: 'Jul', detected: 19, resolved: 17 },
  { month: 'Aug', detected: 12, resolved: 11 },
  { month: 'Sep', detected: 27, resolved: 25 },
  { month: 'Oct', detected: 22, resolved: 19 },
  { month: 'Nov', detected: 11, resolved: 10 },
  { month: 'Dec', detected: 19, resolved: 17 }
]

export const zoneDistribution = [
  { name: 'Zone 1', value: 38, color: '#e8622c' },
  { name: 'Zone 2', value: 25, color: '#3fa868' },
  { name: 'Zone 3', value: 20, color: '#d4a24c' },
  { name: 'Zone 4', value: 17, color: '#4fb0a8' }
]

export const liveThreatFeed = [
  { id: 1, icon: 'volume', title: 'Possible illegal logging detected', location: 'Zone 1 · Node 1', severity: 'High', time: '2 min ago' },
  { id: 2, icon: 'flame', title: 'Possible charcoal burning detected', location: 'Zone 2 · Node 2', severity: 'Critical', time: '8 min ago' },
  { id: 3, icon: 'alert-triangle', title: 'Possible poaching activity detected', location: 'Zone 3 · Node 3', severity: 'Medium', time: '15 min ago' },
  { id: 4, icon: 'bell', title: 'Possible illegal logging detected', location: 'Zone 4 · Node 4', severity: 'High', time: '32 min ago' }
]

export const satelliteNodes = [
  { id: 'n1', x: 18, y: 55, status: 'alert' },
  { id: 'n2', x: 41, y: 27, status: 'alert' },
  { id: 'n3', x: 27, y: 68, status: 'active' },
  { id: 'n4', x: 57, y: 66, status: 'active' },
  { id: 'n5', x: 64, y: 39, status: 'active' },
  { id: 'n6', x: 48, y: 85, status: 'offline' },
  { id: 'n7', x: 82, y: 62, status: 'active' }
]

export const sensorMapStats = [
  { label: 'Total Nodes', value: '487', tone: 'slate' },
  { label: 'Active', value: '451', tone: 'moss' },
  { label: 'On Alert', value: '29', tone: 'ember' },
  { label: 'Offline', value: '7', tone: 'slate' }
]

export const nodeList = [
  { id: 'Zone 1', zone: 'Node 1', status: 'alert', coverage: 92 },
  { id: 'Zone 2', zone: 'Node 2', status: 'alert', coverage: 78 },
  { id: 'Zone 3', zone: 'Node 3', status: 'active', coverage: 85 },
  { id: 'Zone 4', zone: 'Node 4', status: 'active', coverage: 61 },
  { id: 'Zone 5', zone: 'Node 5', status: 'active', coverage: 54 },
  { id: 'Zone 6', zone: 'Node 6', status: 'offline', coverage: 5 }
]

export const alertStats = [
  { label: 'Total Today', value: '23', icon: 'alert-triangle', tone: 'slate' },
  { label: 'Critical', value: '5', icon: 'flame', tone: 'ember' },
  { label: 'High Priority', value: '11', icon: 'alert-triangle', tone: 'ember-soft' },
  { label: 'Resolved', value: '18', icon: 'check-circle', tone: 'moss' }
]

export const alerts = [
  { id: 8, icon: 'alert-triangle', title: 'Possible sensor connectivity issue', location: 'Zone 1 · Node 1', severity: 'High', time: '2 min ago', status: 'Active' },
  { id: 9, icon: 'volume', title: 'Possible signal instability detected', location: 'Zone 2 · Node 2', severity: 'High', time: '4 min ago', status: 'Active' },
  { id: 1, icon: 'volume', title: 'Possible illegal logging detected', location: 'Zone 3 · Node 3', severity: 'High', time: '2 min ago', status: 'Active' },
  { id: 2, icon: 'flame', title: 'Possible charcoal burning detected', location: 'Zone 4 · Node 4', severity: 'Critical', time: '8 min ago', status: 'Active' },
  { id: 3, icon: 'alert-triangle', title: 'Possible poaching activity detected', location: 'Zone 5 · Node 5', severity: 'Medium', time: '15 min ago', status: 'Active' },
  { id: 4, icon: 'bell', title: 'Possible illegal logging detected', location: 'Zone 1 · Node 1', severity: 'High', time: '32 min ago', status: 'Resolved' },
  { id: 5, icon: 'flame', title: 'Possible fire or burning activity detected', location: 'Zone 2 · Node 2', severity: 'Critical', time: '1 hr ago', status: 'Resolved' },
  { id: 6, icon: 'volume', title: 'Possible machinery noise detected', location: 'Zone 3 · Node 3', severity: 'High', time: '2 hrs ago', status: 'Resolved' },
  { id: 7, icon: 'alert-triangle', title: 'Possible boundary activity detected', location: 'Zone 4 · Node 4', severity: 'Medium', time: '3 hrs ago', status: 'Resolved' }
]

export const forestZoneStats = [
  { label: 'Protected Zones', value: '142', icon: 'shield-check', tone: 'moss' },
  { label: 'Total Hectares', value: '500', icon: 'trees', tone: 'moss' },
  { label: 'Active Threats', value: '44', icon: 'alert-triangle', tone: 'ember' },
  { label: 'Avg Coverage', value: '88%', icon: 'map-pin', tone: 'blue' }
]

export const forestZones = [
  { name: 'Zone 1', node: 'Node 1', location: 'Forest monitoring area 1', risk: 'medium', trend: 'up', hectares: '200', sensors: 2, threats: 12, coverage: 94, accuracy: 94 },
  { name: 'Zone 2', node: 'Node 2', location: 'Forest monitoring area 2', risk: 'low', trend: 'up', hectares: '100', sensors: 1, threats: 5, coverage: 88, accuracy: 88 },
  { name: 'Zone 3', node: 'Node 3', location: 'Forest monitoring area 3', risk: 'high', trend: 'down', hectares: '100', sensors: 1, threats: 19, coverage: 79, accuracy: 79 },
  { name: 'Zone 4', node: 'Node 4', location: 'Forest monitoring area 4', risk: 'medium', trend: 'up', hectares: '100', sensors: 1, threats: 8, coverage: 91, accuracy: 91 }
]

export const sensorUnitStats = [
  { label: 'Total Sensors', value: '487', icon: 'radio', tone: 'slate' },
  { label: 'Solar Powered', value: '487', icon: 'sun', tone: 'amber' },
  { label: 'Avg Battery', value: '74%', icon: 'battery', tone: 'moss' },
  { label: 'Avg Signal', value: '81%', icon: 'wifi', tone: 'blue' }
]

export const sensorRegistry = [
  { id: 'SN-001', zone: 'Congo Basin', type: 'Acoustic + Chemical', status: 'Active', battery: 92, signal: 95, temp: '26°C', uptime: '99.8%', lastPing: '8s ago' },
  { id: 'SN-002', zone: 'Congo Basin', type: 'Acoustic', status: 'Alert', battery: 78, signal: 72, temp: '28°C', uptime: '97.1%', lastPing: '12s ago' },
  { id: 'SN-003', zone: 'East Africa', type: 'Acoustic + Chemical', status: 'Active', battery: 85, signal: 88, temp: '24°C', uptime: '99.2%', lastPing: '5s ago' },
  { id: 'SN-004', zone: 'West Forest', type: 'Chemical', status: 'Active', battery: 61, signal: 55, temp: '30°C', uptime: '95.6%', lastPing: '20s ago' },
  { id: 'SN-005', zone: 'Southern', type: 'Acoustic', status: 'Offline', battery: 5, signal: null, temp: null, uptime: null, lastPing: '3h ago' },
  { id: 'SN-006', zone: 'East Africa', type: 'Acoustic + Chemical', status: 'Alert', battery: 70, signal: 68, temp: '27°C', uptime: '96.3%', lastPing: '15s ago' },
  { id: 'SN-007', zone: 'West Forest', type: 'Acoustic', status: 'Active', battery: 98, signal: 99, temp: '25°C', uptime: '100%', lastPing: '3s ago' },
  { id: 'SN-008', zone: 'Southern', type: 'Chemical', status: 'Active', battery: 55, signal: 61, temp: '29°C', uptime: '94.7%', lastPing: '18s ago' }
]

export const reportStats = [
  { label: 'Threats Detected YTD', value: '222', change: '+12%', trend: 'up', icon: 'globe' },
  { label: 'Resolution Rate', value: '91%', change: '+3%', trend: 'up', icon: 'trending-up' },
  { label: 'Hectares Saved', value: '4,680', change: '+18%', trend: 'up', icon: 'trending-up' },
  { label: 'Avg Response Time', value: '28s', change: '-5s', trend: 'up', icon: 'calendar' }
]

export const threatsVsResolved = threatActivity

export const hectaresSavedMonthly = [
  { month: 'Jan', hectares: 380 },
  { month: 'Feb', hectares: 320 },
  { month: 'Mar', hectares: 540 },
  { month: 'Apr', hectares: 260 },
  { month: 'May', hectares: 440 },
  { month: 'Jun', hectares: 130 },
  { month: 'Jul', hectares: 400 },
  { month: 'Aug', hectares: 470 },
  { month: 'Sep', hectares: 350 },
  { month: 'Oct', hectares: 560 },
  { month: 'Nov', hectares: 480 },
  { month: 'Dec', hectares: 390 }
]

export const availableReports = [
  {
    title: 'Monthly Threat Summary — April 2026',
    date: 'April 30, 2026',
    size: '2.4 MB',
    type: 'PDF',
    viewUrl: '/reports/monthly-threat-summary.html',
    downloadUrl: '/reports/monthly-threat-summary.html',
    summary: 'Forest activity remained stable across the monitored zones, with elevated pressure in the northern corridor and rapid intervention in the central basin. Recovery efforts were most effective in high-risk areas where sensor alerts were verified within the first 30 minutes.',
    bullets: [
      'Expanded field deployment in the west and south corridors.',
      'Prioritized hotspot monitoring near active logging routes.',
      'Reduced average response time to 28 seconds.'
    ],
    stats: [
      { label: 'THREATS DETECTED', value: '30' },
      { label: 'RESOLVED', value: '27' },
      { label: 'HECTARES SAVED', value: '1,260' }
    ]
  },
  {
    title: 'Quarterly Zone Analysis Q1 2026',
    date: 'March 31, 2026',
    size: '4.1 MB',
    type: 'PDF',
    viewUrl: '/reports/quarterly-zone-analysis.html',
    downloadUrl: '/reports/quarterly-zone-analysis.html',
    summary: 'This quarterly review compares risk, intervention quality, and recovery progress across the monitored forest zones. Overall, the strongest gains were made in areas with consistent network uptime and rapid response coordination.',
    bullets: [
      'Zone 001 recorded a 92% intervention rate.',
      'Resolution performance improved across downstream corridors.',
      'Recovery remained strongest in areas with high sensor coverage.'
    ],
    stats: [
      { label: 'HIGH RISK ZONES', value: '4' },
      { label: 'INTERVENTION RATE', value: '91%' },
      { label: 'RECOVERY INDEX', value: '8.4' }
    ]
  },
  {
    title: 'Sensor Network Health Report — March',
    date: 'March 31, 2026',
    size: '1.8 MB',
    type: 'PDF',
    viewUrl: '/reports/sensor-network-health.html',
    downloadUrl: '/reports/sensor-network-health.html',
    summary: 'The sensor network was mostly stable during March, with strong signal quality reported across the east and central forest regions. Three nodes were temporarily offline but restored within the same operational cycle.',
    bullets: [
      'Network uptime remained above 97%.',
      'Battery health stayed stable across active nodes.',
      'Only three temporary outages were reported.'
    ],
    stats: [
      { label: 'NETWORK UPTIME', value: '97.4%' },
      { label: 'ACTIVE SENSORS', value: '128' },
      { label: 'OFFLINE NODES', value: '3' }
    ]
  },
  {
    title: 'Annual Deforestation Impact Report 2025',
    date: 'December 31, 2025',
    size: '8.9 MB',
    type: 'PDF',
    viewUrl: '/reports/annual-deforestation-impact.html',
    downloadUrl: '/reports/annual-deforestation-impact.html',
    summary: '2025 showed a substantial reduction in forest loss in zones where monitoring and intervention workflows were deployed consistently. The strongest gains were seen where human activity alerts were evaluated within the first hour of detection.',
    bullets: [
      'Forest loss declined by 4.8% year-over-year.',
      'Protected area coverage increased in the central range.',
      'Monitoring expansion improved early response capacity.'
    ],
    stats: [
      { label: 'FOREST LOSS', value: '-4.8%' },
      { label: 'PROTECTED AREA', value: '12,410 ha' },
      { label: 'INTERVENTIONS', value: '219' }
    ]
  }
]

export const notificationSettings = [
  { key: 'critical', title: 'Critical threat alerts', subtitle: 'Charcoal burning, active logging', enabled: true },
  { key: 'movement', title: 'Unusual movement alerts', subtitle: 'Human or wildlife anomalies', enabled: true },
  { key: 'offline', title: 'Sensor offline alerts', subtitle: 'When nodes lose connectivity', enabled: false },
  { key: 'weekly', title: 'Weekly summary reports', subtitle: 'Digest of all zone activities', enabled: true }
]
