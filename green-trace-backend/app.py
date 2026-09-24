"""
app.py
======
Green Trace backend API.

Serves exactly what green-trace-frontend/src/data/mockData.js exports,
computed live from the simulated sensor network + real AI detection engine
(YAMNet + Isolation Forest + threat fusion) in detection.py / simulator.py.

Frontend integration
---------------------
Each page currently does:

    import { overviewStats, shortcuts, ... } from '../data/mockData.js'

Swap that for:

    const [data, setData] = useState(null)
    useEffect(() => {
      fetch(`${API_BASE}/api/overview`).then(r => r.json()).then(setData)
    }, [])

...and destructure the same field names off `data`. No component markup
needs to change — the JSON keys match the mock exports 1:1.

Run locally
-----------
    pip install -r requirements.txt
    python app.py
    # -> http://localhost:5000/api/overview etc.

CORS is enabled for all origins by default so this works with `npm run dev`
(Vite on :5173) with zero config. Lock ORIGIN down before shipping to prod
(see CORS setup below).
"""

import logging
import os

from flask import Flask, jsonify, request
from flask_cors import CORS

from simulator import STATE

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("green_trace.app")

app = Flask(__name__)

# Allow the Vite dev server (and anywhere else) to call this API.
# For production, replace "*" with your deployed frontend's origin.
CORS(app, resources={r"/api/*": {"origins": os.environ.get("FRONTEND_ORIGIN", "*")}})


def _start_simulation_once():
    """Avoid starting two copies of the background thread under the
    Flask/Werkzeug debug reloader, which spawns a child process."""
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true" or not app.debug:
        STATE.start()


_start_simulation_once()


# ------------------------------------------------------------------
# Page endpoints — one per frontend page, same field names as mockData.js
# ------------------------------------------------------------------

@app.get("/api/overview")
def overview():
    return jsonify(STATE.get_overview())


@app.get("/api/sensor-map")
def sensor_map():
    return jsonify(STATE.get_sensor_map())


@app.get("/api/alerts")
def alerts():
    return jsonify(STATE.get_alerts())


@app.get("/api/forest-zones")
def forest_zones():
    return jsonify(STATE.get_forest_zones())


@app.get("/api/sensors")
def sensors():
    return jsonify(STATE.get_sensors())


@app.get("/api/reports")
def reports():
    return jsonify(STATE.get_reports())


@app.get("/api/settings")
def settings():
    return jsonify(STATE.get_settings())


@app.patch("/api/settings/notifications/<key>")
def toggle_notification(key):
    updated = STATE.toggle_notification(key)
    if updated is None:
        return jsonify({"error": f"unknown notification key '{key}'"}), 404
    return jsonify(updated)


@app.patch("/api/alerts/<int:alert_id>/resolve")
def resolve_alert(alert_id):
    updated = STATE.resolve_alert(alert_id)
    if updated is None:
        return jsonify({"error": f"unknown alert id '{alert_id}'"}), 404
    return jsonify(updated)


# ------------------------------------------------------------------
# Utility endpoints
# ------------------------------------------------------------------

@app.get("/api/health")
def health():
    return jsonify({"status": "ok"})


@app.post("/api/detect")
def manual_detect():
    """Trigger one detection cycle on demand — handy for demos, so you don't
    have to wait for the background loop to (maybe) raise an alert.
    Optional JSON body: {"scenario": "chainsaw" | "fire" | "footsteps" | "gunshot" | "normal"}
    """
    scenario = (request.get_json(silent=True) or {}).get("scenario", "normal")
    sensor_id = (request.get_json(silent=True) or {}).get("sensorId")
    return jsonify(STATE.force_detection(scenario=scenario, sensor_id=sensor_id))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=os.environ.get("FLASK_DEBUG") == "1")
