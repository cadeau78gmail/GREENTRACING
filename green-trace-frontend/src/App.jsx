import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import Overview from './pages/Overview.jsx'
import SensorMap from './pages/SensorMap.jsx'
import Alerts from './pages/Alerts.jsx'
import ForestZones from './pages/ForestZones.jsx'
import Sensors from './pages/Sensors.jsx'
import Reports from './pages/Reports.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <div className="flex h-screen bg-base-950">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Overview />} />
          <Route path="/sensor-map" element={<SensorMap />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/forest-zones" element={<ForestZones />} />
          <Route path="/sensors" element={<Sensors />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </div>
  )
}
