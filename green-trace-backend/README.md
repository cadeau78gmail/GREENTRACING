# Green Trace — Backend

Flask API that powers the `green-trace` frontend. It runs your real detection
engine (YAMNet audio classification + Isolation Forest CO2 anomaly detection
+ threat fusion) against a simulated sensor network, and serves the results
as JSON shaped **exactly** like `src/data/mockData.js`.

## Files

| File            | What it does |
|-----------------|--------------|
| `detection.py`  | The AI layer: simulated audio/CO2 sensors, YAMNet classification (with an automatic offline fallback), Isolation Forest anomaly scoring, and the fusion logic that turns raw sensor scores into a threat verdict. |
| `simulator.py`  | Owns all live state (sensors, zones, alerts, etc.) and runs a background thread that fires a detection cycle every 6–14s, updating sensors/alerts/zones as threats are found. |
| `app.py`        | Flask app. One endpoint per frontend page. **Run this file.** |

## Run it

```bash
python -m venv venv && source venv/bin/activate     # optional but recommended
pip install -r requirements.txt
python app.py
```

The API comes up on `http://localhost:5000`. First request that needs YAMNet
will try to download the model from `tfhub.dev` — if that's slow, blocked, or
you're offline, the API keeps working using a built-in offline classifier
fallback (same fusion logic, just without the real neural net). Nothing
crashes either way.

## Endpoints

Each one returns the same field names as the matching mockData.js export, so
wiring up the frontend is a straight swap:

| Endpoint | Replaces this mockData.js import |
|---|---|
| `GET /api/overview` | `overviewStats, shortcuts, threatActivity, liveThreatFeed, satelliteNodes, zoneDistribution` |
| `GET /api/sensor-map` | `sensorMapStats, nodeList, satelliteNodes` |
| `GET /api/alerts` | `alertStats, alerts` |
| `GET /api/forest-zones` | `forestZoneStats, forestZones` |
| `GET /api/sensors` | `sensorUnitStats, sensorRegistry` |
| `GET /api/reports` | `reportStats, threatsVsResolved, hectaresSavedMonthly, availableReports` |
| `GET /api/settings` | `notificationSettings` |
| `PATCH /api/settings/notifications/<key>` | toggles one setting (`critical`, `movement`, `offline`, `weekly`) |
| `POST /api/detect` | fires one detection cycle on demand — body `{"scenario": "chainsaw"}` (`normal`/`chainsaw`/`fire`/`footsteps`/`gunshot`) — handy for demos instead of waiting for the background loop |
| `GET /api/health` | liveness check |

## Wiring up the frontend (no component changes needed)

Every page currently does something like:

```js
import { overviewStats, shortcuts, threatActivity, liveThreatFeed, satelliteNodes, zoneDistribution } from '../data/mockData.js'
```

Replace that import with a fetch, keeping the same variable names, e.g. in `Overview.jsx`:

```jsx
import { useEffect, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000'

export default function Overview() {
  const [data, setData] = useState(null)

  useEffect(() => {
    let alive = true
    const load = () => fetch(`${API_BASE}/api/overview`)
      .then((r) => r.json())
      .then((d) => alive && setData(d))
    load()
    const id = setInterval(load, 10000) // poll for the "LIVE" feel
    return () => { alive = false; clearInterval(id) }
  }, [])

  if (!data) return null // or a loading skeleton
  const { overviewStats, shortcuts, threatActivity, liveThreatFeed, satelliteNodes, zoneDistribution } = data

  // ...rest of the component is unchanged
}
```

Repeat the same pattern (fetch the matching endpoint, destructure the same
names) in `SensorMap.jsx`, `Alerts.jsx`, `ForestZones.jsx`, `Sensors.jsx`,
`Reports.jsx`, and `Settings.jsx`. None of the JSX/markup needs to change —
only where the data comes from.

Add a `.env` in the frontend with:

```
VITE_API_BASE=http://localhost:5000
```

and swap it to your deployed backend URL in production.

## Notes on the simulation

- There's no physical hardware yet, so `detection.py` simulates the acoustic
  and CO2 sensor readings the way your notebook did. When real sensors are
  ready, replace `simulate_audio()` / `simulate_co2_sensor()` calls in
  `simulator.py`'s `tick()` with reads from your actual hardware/MQTT feed —
  the classification + fusion logic downstream doesn't need to change.
- State is in-memory (no database), matching the scope of the original
  notebook. If you need this to survive restarts or run across multiple
  server instances, swap the `SensorNetwork` internals for a real DB —
  every read/write already goes through that one class.
- CORS is wide open (`*`) by default for easy local dev. Set the
  `FRONTEND_ORIGIN` environment variable to your deployed frontend's URL
  before shipping to production.
