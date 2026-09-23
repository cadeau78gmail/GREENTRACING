"""
simulator.py
============
Runs a SCRIPTED 5-node sensor network so the demo tells a clear story
instead of pure randomness, and keeps an in-memory state store shaped
EXACTLY like green-trace-frontend's src/data/mockData.js.

The story, by design:
  - 5 sensors total. Full stop — every stat on every page counts real
    sensors/zones/threats, never a hardcoded "487"-style vanity number.
  - For the first SIM_ROTATION_SECONDS (default 5 minutes), everything is
    quiet: all 5 nodes read "Active", zero alerts.
  - After that, two designated "duty" nodes (SN-001 and SN-002) take turns
    carrying the two threat types: one shows a charcoal-burning alert, the
    other shows a chainsaw (illegal logging) alert. Every rotation period,
    which node carries which threat SWAPS ("exchanging activities").
  - The other 3 nodes (SN-003, SN-004, SN-005) NEVER alert and NEVER go
    offline — they stay Active for the life of the process, by design.
  - The 2 duty nodes can randomly lose power ("sometimes the sensor works
    and then the power goes off") between rotations — a real embedded
    sensor phenomenon — but power is always guaranteed back on the instant
    a new scripted alert needs to fire, so the story stays reliable.

Swap `import { x } from './data/mockData.js'` for `fetch('/api/...')` and
the JSON you get back has the same field names, so no frontend components
need to change.
"""

import logging
import os
import random
import threading
import time
from collections import Counter
from datetime import datetime, timedelta

import detection

logger = logging.getLogger("green_trace.simulator")

LOCK = threading.RLock()

# ------------------------------------------------------------------
# THE SCRIPT — tune these without touching any logic below
# ------------------------------------------------------------------

# How long the quiet period lasts, and how long each alert rotation lasts,
# in seconds. Override with an env var if you don't want to wait 5 real
# minutes while testing, e.g. SIM_ROTATION_SECONDS=30
ROTATION_SECONDS = int(os.environ.get("SIM_ROTATION_SECONDS", 5 * 60))
TICK_SECONDS = 5  # how often the background loop re-evaluates state

DUTY_SENSOR_IDS = ["SN-001", "SN-002"]  # these two rotate through the alerts
ALWAYS_ACTIVE_SENSOR_IDS = ["SN-003", "SN-004", "SN-005"]  # never alert, never offline

# Short zone keys used on sensor/node rows -> full zone record keys used on
# the Forest Zones page. Mirrors the naming already used in mockData.js.
ZONE_KEYS = ["Congo Basin", "East Africa", "West Forest", "Southern"]
ZONE_FULL_NAME = {
    "Congo Basin": "Congo Basin",
    "East Africa": "East African Forest",
    "West Forest": "West African Forest",
    "Southern": "Southern Woodlands",
}

SENSOR_TYPES = ["Acoustic", "Chemical", "Acoustic + Chemical"]

# charcoal_burning -> Critical, illegal_logging (chainsaw) -> High.
SCRIPTED_SEVERITY = {"charcoal_burning": "Critical", "illegal_logging": "High"}

POWER_FLICKER_CHANCE = 0.04  # per tick, duty nodes only, only while idle
POWER_FLICKER_SECONDS = (15, 45)


def _now():
    return datetime.utcnow()


def _ago(ts):
    """Render a timestamp as a relative 'Xs ago' / 'Xm ago' string."""
    delta = _now() - ts
    seconds = int(delta.total_seconds())
    if seconds < 5:
        return "just now"
    if seconds < 60:
        return f"{seconds}s ago"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} min ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hr ago" if hours == 1 else f"{hours} hrs ago"
    days = hours // 24
    return f"{days}d ago"


class SensorNetwork:
    """Owns all mutable state and the background simulation loop."""

    def __init__(self):
        self.sensors = self._seed_sensors()
        self.zones = self._seed_zones()
        self.alerts = []  # starts genuinely empty — no fake seeded history
        self.notification_settings = self._seed_notifications()
        self._next_alert_id = 1
        self._started = False
        self.start_time = _now()

        # Scripted rotation bookkeeping
        self._current_period_index = None  # None = quiet period not yet processed
        self._duty_alert_ids = {sid: None for sid in DUTY_SENSOR_IDS}  # sensor_id -> active alert id
        self._power_offline_until = {}  # sensor_id -> datetime

        # Real-hardware ingestion: sensor_id -> {"audio": {...}|None, "co2": {...}|None}
        self.live_readings = {}

    # ---------------------------------------------------------------
    # Seed data
    # ---------------------------------------------------------------

    def _seed_sensors(self):
        sensors = []
        for i in range(1, 6):  # exactly 5 sensors: SN-001 .. SN-005
            zone = ZONE_KEYS[(i - 1) % len(ZONE_KEYS)]
            sensors.append({
                "id": f"SN-{i:03d}",
                "zone": zone,
                "type": random.choice(SENSOR_TYPES),
                "status": "Active",
                "battery": random.randint(80, 100),
                "signal": random.randint(80, 100),
                "temp_c": random.randint(23, 28),
                "uptime": round(random.uniform(97.0, 100.0), 1),
                "last_ping_at": _now(),
                "x": random.randint(15, 85),
                "y": random.randint(20, 85),
            })
        return sensors

    def _seed_zones(self):
        base = [
            {"name": "Congo Basin", "location": "DRC / Republic of Congo",
             "hectares": "450,000", "threats": 0, "coverage": 94, "trend": "up"},
            {"name": "East African Forest", "location": "Kenya / Tanzania / Uganda",
             "hectares": "220,000", "threats": 0, "coverage": 88, "trend": "up"},
            {"name": "West African Forest", "location": "Ghana / Côte d'Ivoire",
             "hectares": "180,000", "threats": 0, "coverage": 79, "trend": "up"},
            {"name": "Southern Woodlands", "location": "Zambia / Zimbabwe / Mozambique",
             "hectares": "350,000", "threats": 0, "coverage": 91, "trend": "up"},
        ]
        # Real sensor counts per zone (based on the 5 actual sensors), not a
        # made-up headline number.
        counts = Counter(ZONE_FULL_NAME[s["zone"]] for s in self.sensors)
        for z in base:
            z["sensors"] = counts.get(z["name"], 0)
            z["risk"] = self._risk_from_threats(z["threats"])
        return base

    @staticmethod
    def _risk_from_threats(threats):
        if threats >= 5:
            return "high"
        if threats >= 2:
            return "medium"
        return "low"

    def _seed_notifications(self):
        return [
            {"key": "critical", "title": "Critical threat alerts",
             "subtitle": "Charcoal burning, active logging", "enabled": True},
            {"key": "movement", "title": "Unusual movement alerts",
             "subtitle": "Human or wildlife anomalies", "enabled": True},
            {"key": "offline", "title": "Sensor offline alerts",
             "subtitle": "When nodes lose connectivity", "enabled": False},
            {"key": "weekly", "title": "Weekly summary reports",
             "subtitle": "Digest of all zone activities", "enabled": True},
        ]

    def _sensor(self, sensor_id):
        return next(s for s in self.sensors if s["id"] == sensor_id)

    # ---------------------------------------------------------------
    # Background simulation loop — THE SCRIPT
    # ---------------------------------------------------------------

    def start(self):
        if self._started:
            return
        self._started = True
        thread = threading.Thread(target=self._loop, daemon=True)
        thread.start()
        logger.info(
            "Scripted simulation started: quiet for %ds, then %ds rotations between %s",
            ROTATION_SECONDS, ROTATION_SECONDS, DUTY_SENSOR_IDS,
        )

    def _loop(self):
        while True:
            try:
                self.scripted_tick()
            except Exception:  # noqa: BLE001 - never let the loop die
                logger.exception("Scripted tick failed")
            time.sleep(TICK_SECONDS)

    def scripted_tick(self):
        with LOCK:
            # The 3 fixed sensors: permanently Active, no exceptions, ever.
            for sid in ALWAYS_ACTIVE_SENSOR_IDS:
                s = self._sensor(sid)
                s["status"] = "Active"
                s["last_ping_at"] = _now()
                s["battery"] = max(70, s["battery"] - random.choice([0, 0, 0, 1]))
                s["signal"] = min(100, max(75, s["signal"] + random.randint(-2, 2)))

            elapsed = (_now() - self.start_time).total_seconds()
            period_index = int(elapsed // ROTATION_SECONDS)

            if period_index == 0:
                # Quiet period: both duty nodes idle, but may flicker offline
                # briefly (real power-loss behaviour) and recover on their own.
                for sid in DUTY_SENSOR_IDS:
                    self._idle_with_possible_power_flicker(sid)
                return

            # From period 1 onward: two duty nodes, two threat types, swapping
            # who carries which every period ("exchanging activities").
            if period_index % 2 == 1:
                charcoal_node, chainsaw_node = DUTY_SENSOR_IDS[0], DUTY_SENSOR_IDS[1]
            else:
                charcoal_node, chainsaw_node = DUTY_SENSOR_IDS[1], DUTY_SENSOR_IDS[0]

            if period_index != self._current_period_index:
                # A new rotation just started: resolve the previous alerts,
                # then guarantee both duty sensors are powered on and raise
                # the new scripted alerts.
                self._resolve_duty_alerts()
                self._force_power_on(charcoal_node)
                self._force_power_on(chainsaw_node)
                self._raise_scripted_alert("charcoal_burning", charcoal_node)
                self._raise_scripted_alert("illegal_logging", chainsaw_node)
                self._current_period_index = period_index
            else:
                # Mid-rotation: keep both duty sensors pinging as "Alert".
                for sid in (charcoal_node, chainsaw_node):
                    s = self._sensor(sid)
                    s["last_ping_at"] = _now()
                    s["status"] = "Alert"

    def _idle_with_possible_power_flicker(self, sensor_id):
        s = self._sensor(sensor_id)
        now = _now()
        offline_until = self._power_offline_until.get(sensor_id)

        if offline_until:
            if now >= offline_until:
                s["status"] = "Active"
                s["battery"] = random.randint(75, 100)
                s["last_ping_at"] = now
                del self._power_offline_until[sensor_id]
            # else: stays Offline until the recovery time arrives
            return

        if random.random() < POWER_FLICKER_CHANCE:
            s["status"] = "Offline"
            duration = random.randint(*POWER_FLICKER_SECONDS)
            self._power_offline_until[sensor_id] = now + timedelta(seconds=duration)
        else:
            s["status"] = "Active"
            s["last_ping_at"] = now

    def _force_power_on(self, sensor_id):
        """A scripted alert is about to fire on this node — guarantee it has
        power, regardless of any random flicker in progress."""
        s = self._sensor(sensor_id)
        s["status"] = "Active"
        s["battery"] = max(s["battery"], 60)
        self._power_offline_until.pop(sensor_id, None)

    def _resolve_duty_alerts(self):
        for sid, alert_id in self._duty_alert_ids.items():
            if alert_id is None:
                continue
            for alert in self.alerts:
                if alert["id"] == alert_id and alert["status"] == "Active":
                    alert["status"] = "Resolved"
            self._duty_alert_ids[sid] = None

    def _raise_scripted_alert(self, threat_type, sensor_id):
        sensor = self._sensor(sensor_id)
        profile = detection.THREAT_PROFILES[threat_type]
        zone_full = ZONE_FULL_NAME[sensor["zone"]]
        alert = {
            "id": self._next_alert_id,
            "threat_type": threat_type,
            "icon": profile["icon"],
            "title": profile["label"],
            "location": f"{sensor['id']} — {zone_full}",
            "severity": SCRIPTED_SEVERITY[threat_type],
            "status": "Active",
            "created_at": _now(),
        }
        self._next_alert_id += 1
        self.alerts.insert(0, alert)
        self.alerts = self.alerts[:60]
        self._duty_alert_ids[sensor_id] = alert["id"]

        sensor["status"] = "Alert"
        sensor["last_ping_at"] = _now()
        for zone in self.zones:
            if zone["name"] == zone_full:
                zone["threats"] += 1
                zone["risk"] = self._risk_from_threats(zone["threats"])
        return alert

    # ---------------------------------------------------------------
    # Manual trigger (POST /api/detect) — still available for demos,
    # runs alongside the script without disturbing it.
    # ---------------------------------------------------------------

    def force_detection(self, scenario="normal", sensor_id=None):
        """Manually fire one detection cycle with a specific scenario,
        against any sensor (defaults to a random one). Independent of the
        scripted rotation — handy to show off a specific threat on demand."""
        with LOCK:
            if sensor_id:
                sensor = self._sensor(sensor_id)
            else:
                sensor = random.choice(self.sensors)

            co2_scenario = "burning" if scenario == "fire" else "normal"
            threat_scores, co2_result = detection.run_detection_cycle(
                audio_scenario=scenario, co2_scenario=co2_scenario
            )

            triggered = [(name, data) for name, data in threat_scores.items() if data["alert"]]
            raised_alert = None
            if triggered:
                threat_type, data = max(triggered, key=lambda kv: kv[1]["fused_score"])
                severity = self._severity_from_score(data["fused_score"])
                zone_full = ZONE_FULL_NAME[sensor["zone"]]
                profile = detection.THREAT_PROFILES[threat_type]
                raised_alert = {
                    "id": self._next_alert_id, "threat_type": threat_type,
                    "icon": profile["icon"], "title": profile["label"],
                    "location": f"{sensor['id']} — {zone_full}", "severity": severity,
                    "status": "Active", "created_at": _now(),
                }
                self._next_alert_id += 1
                self.alerts.insert(0, raised_alert)
                self.alerts = self.alerts[:60]
                for zone in self.zones:
                    if zone["name"] == zone_full:
                        zone["threats"] += 1
                        zone["risk"] = self._risk_from_threats(zone["threats"])
                if sensor_id not in DUTY_SENSOR_IDS and sensor_id not in ALWAYS_ACTIVE_SENSOR_IDS:
                    sensor["status"] = "Alert"

            return {
                "scenario": scenario,
                "sensor": self._sensor_public(sensor),
                "threatScores": threat_scores,
                "co2": co2_result,
                "alertRaised": self._alert_public(raised_alert) if raised_alert else None,
            }

    @staticmethod
    def _severity_from_score(fused_score):
        if fused_score >= 0.8:
            return "Critical"
        if fused_score >= 0.6:
            return "High"
        return "Medium"

    def _alert_public(self, alert):
        return {
            "id": alert["id"], "icon": alert["icon"], "title": alert["title"],
            "location": alert["location"], "severity": alert["severity"],
            "status": alert["status"], "time": _ago(alert["created_at"]),
        }

    # ---------------------------------------------------------------
    # REAL HARDWARE INGESTION — call these from your device/gateway code
    # ---------------------------------------------------------------

    def ingest_audio_file(self, sensor_id, wav_path):
        sensor = self._get_sensor_or_raise(sensor_id)
        audio_results = detection.classify_audio_file(wav_path)  # raises if YAMNet unavailable
        with LOCK:
            self.live_readings.setdefault(sensor_id, {})["audio"] = audio_results
            return self._evaluate_live_sensor(sensor)

    def ingest_co2_reading(self, sensor_id, ppm):
        sensor = self._get_sensor_or_raise(sensor_id)
        co2_result = detection.co2_anomaly_score(ppm)
        with LOCK:
            self.live_readings.setdefault(sensor_id, {})["co2"] = co2_result
            return self._evaluate_live_sensor(sensor)

    def _get_sensor_or_raise(self, sensor_id):
        sensor = next((s for s in self.sensors if s["id"] == sensor_id), None)
        if sensor is None:
            raise ValueError(f"unknown sensor id '{sensor_id}'")
        return sensor

    def _evaluate_live_sensor(self, sensor):
        readings = self.live_readings.get(sensor["id"], {})
        audio_results = readings.get("audio") or {}
        co2_result = readings.get("co2") or {"is_anomaly": False, "confidence": 0.0}

        threat_scores = detection.fuse_sensor_data(audio_results, co2_result)
        sensor["last_ping_at"] = _now()

        triggered = [(name, data) for name, data in threat_scores.items() if data["alert"]]
        raised_alert = None

        if triggered and sensor["id"] not in ALWAYS_ACTIVE_SENSOR_IDS:
            threat_type, data = max(triggered, key=lambda kv: kv[1]["fused_score"])
            severity = self._severity_from_score(data["fused_score"])
            zone_full = ZONE_FULL_NAME[sensor["zone"]]
            profile = detection.THREAT_PROFILES[threat_type]
            raised_alert = {
                "id": self._next_alert_id, "threat_type": threat_type,
                "icon": profile["icon"], "title": profile["label"],
                "location": f"{sensor['id']} — {zone_full}", "severity": severity,
                "status": "Active", "created_at": _now(),
            }
            self._next_alert_id += 1
            self.alerts.insert(0, raised_alert)
            self.alerts = self.alerts[:60]
            sensor["status"] = "Alert"
            for zone in self.zones:
                if zone["name"] == zone_full:
                    zone["threats"] += 1
                    zone["risk"] = self._risk_from_threats(zone["threats"])
        elif sensor["id"] not in ALWAYS_ACTIVE_SENSOR_IDS and sensor["status"] == "Alert":
            sensor["status"] = "Active"

        return {
            "sensor": self._sensor_public(sensor),
            "threatScores": threat_scores,
            "co2": co2_result,
            "alertRaised": self._alert_public(raised_alert) if raised_alert else None,
        }

    # ---------------------------------------------------------------
    # Serializers — each one matches a mockData.js export shape exactly,
    # and every number is REAL (derived from actual state), never padded.
    # ---------------------------------------------------------------

    def _sensor_public(self, s):
        offline = s["status"] == "Offline"
        return {
            "id": s["id"],
            "zone": s["zone"],
            "type": s["type"],
            "status": s["status"],
            "battery": None if offline else s["battery"],
            "signal": None if offline else s["signal"],
            "temp": None if offline else f"{s['temp_c']}°C",
            "uptime": None if offline else f"{s['uptime']}%",
            "lastPing": _ago(s["last_ping_at"]),
        }

    def _total_hectares(self):
        total = sum(int(z["hectares"].replace(",", "")) for z in self.zones)
        return f"{total / 1_000_000:.1f}M" if total >= 1_000_000 else f"{total:,}"

    def get_overview(self):
        with LOCK:
            active = sum(1 for s in self.sensors if s["status"] != "Offline")
            today_alerts = [a for a in self.alerts if self._is_today(a)]
            total_threats = len(today_alerts)
            resolved = sum(1 for a in today_alerts if a["status"] == "Resolved")
            resolved_pct = round(100 * resolved / total_threats) if total_threats else 0

            overview_stats = [
                {"label": "Active Sensors", "value": str(active),
                 "change": "", "trend": "up", "icon": "radio"},
                {"label": "Threats Detected", "value": str(total_threats),
                 "change": "", "trend": "down" if total_threats else "up", "icon": "alert-triangle"},
                {"label": "Zones Protected", "value": str(len(self.zones)),
                 "change": "", "trend": "up", "icon": "shield-check"},
                {"label": "Hectares Monitored", "value": self._total_hectares(),
                 "change": "", "trend": "up", "icon": "bell"},
            ]
            shortcuts = [
                {"title": "Sensor Map", "subtitle": "View live sensor locations",
                 "icon": "map", "to": "/sensor-map", "tone": "blue"},
                {"title": "Alerts", "subtitle": f"{self._active_alert_count()} active threats",
                 "icon": "bell", "to": "/alerts", "tone": "ember"},
                {"title": "Forest Zones", "subtitle": f"{len(self.zones)} zones protected",
                 "icon": "trees", "to": "/forest-zones", "tone": "moss"},
                {"title": "Reports", "subtitle": "Download analytics",
                 "icon": "globe", "to": "/reports", "tone": "violet"},
            ]
            return {
                "overviewStats": overview_stats,
                "shortcuts": shortcuts,
                "threatActivity": self._threats_vs_resolved_live(),
                "liveThreatFeed": self._live_feed(),
                "satelliteNodes": self._satellite_nodes(),
                "zoneDistribution": self._zone_distribution(),
                "meta": {"activeSensors": active, "resolvedPct": resolved_pct,
                         "totalSensors": len(self.sensors)},
            }

    def _is_today(self, alert):
        return alert["created_at"].date() == _now().date()

    def _active_alert_count(self):
        return sum(1 for a in self.alerts if a["status"] == "Active")

    def _live_feed(self):
        return [
            {
                "id": a["id"], "icon": a["icon"], "title": a["title"],
                "location": a["location"], "severity": a["severity"], "time": _ago(a["created_at"]),
            }
            for a in self.alerts[:4]
        ]

    def _satellite_nodes(self):
        status_map = {"Active": "active", "Alert": "alert", "Offline": "offline"}
        return [
            {"id": s["id"].lower().replace("sn-", "n"), "x": s["x"], "y": s["y"],
             "status": status_map[s["status"]]}
            for s in self.sensors
        ]

    def _zone_distribution(self):
        colors = {
            "Congo Basin": "#e8622c",
            "East African Forest": "#3fa868",
            "West African Forest": "#d4a24c",
            "Southern Woodlands": "#4fb0a8",
        }
        short_names = {
            "Congo Basin": "Congo Basin",
            "East African Forest": "East Africa",
            "West African Forest": "West Forest",
            "Southern Woodlands": "Southern",
        }
        total = sum(z["threats"] for z in self.zones)
        if total == 0:
            return []
        return [
            {"name": short_names[z["name"]], "value": round(100 * z["threats"] / total),
             "color": colors[z["name"]]}
            for z in self.zones
        ]

    def get_sensor_map(self):
        with LOCK:
            active = sum(1 for s in self.sensors if s["status"] == "Active")
            alert_ = sum(1 for s in self.sensors if s["status"] == "Alert")
            offline = sum(1 for s in self.sensors if s["status"] == "Offline")
            sensor_map_stats = [
                {"label": "Total Nodes", "value": str(len(self.sensors)), "tone": "slate"},
                {"label": "Active", "value": str(active), "tone": "moss"},
                {"label": "On Alert", "value": str(alert_), "tone": "ember"},
                {"label": "Offline", "value": str(offline), "tone": "slate"},
            ]
            node_list = [
                {"id": s["id"].replace("SN-", "Node "), "zone": s["zone"],
                 "status": s["status"].lower(),
                 "coverage": s["signal"] if s["status"] != "Offline" else 0}
                for s in self.sensors
            ]
            return {
                "sensorMapStats": sensor_map_stats,
                "nodeList": node_list,
                "satelliteNodes": self._satellite_nodes(),
            }

    def get_alerts(self):
        with LOCK:
            today_alerts = [a for a in self.alerts if self._is_today(a)]
            critical = sum(1 for a in today_alerts if a["severity"] == "Critical")
            high = sum(1 for a in today_alerts if a["severity"] == "High")
            resolved = sum(1 for a in today_alerts if a["status"] == "Resolved")
            alert_stats = [
                {"label": "Total Today", "value": str(len(today_alerts)),
                 "icon": "alert-triangle", "tone": "slate"},
                {"label": "Critical", "value": str(critical), "icon": "flame", "tone": "ember"},
                {"label": "High Priority", "value": str(high),
                 "icon": "alert-triangle", "tone": "ember-soft"},
                {"label": "Resolved", "value": str(resolved),
                 "icon": "check-circle", "tone": "moss"},
            ]
            alerts = [
                {
                    "id": a["id"], "icon": a["icon"], "title": a["title"],
                    "location": a["location"], "severity": a["severity"],
                    "time": _ago(a["created_at"]), "status": a["status"],
                }
                for a in self.alerts
            ]
            return {"alertStats": alert_stats, "alerts": alerts}

    def get_forest_zones(self):
        with LOCK:
            total_threats = sum(z["threats"] for z in self.zones)
            avg_coverage = round(sum(z["coverage"] for z in self.zones) / len(self.zones))
            forest_zone_stats = [
                {"label": "Protected Zones", "value": str(len(self.zones)),
                 "icon": "shield-check", "tone": "moss"},
                {"label": "Total Hectares", "value": self._total_hectares(),
                 "icon": "trees", "tone": "moss"},
                {"label": "Active Threats", "value": str(total_threats),
                 "icon": "alert-triangle", "tone": "ember"},
                {"label": "Avg Coverage", "value": f"{avg_coverage}%",
                 "icon": "map-pin", "tone": "blue"},
            ]
            zones = [
                {
                    "name": z["name"], "location": z["location"], "risk": z["risk"],
                    "trend": z["trend"], "hectares": z["hectares"], "sensors": z["sensors"],
                    "threats": z["threats"], "coverage": z["coverage"],
                }
                for z in self.zones
            ]
            return {"forestZoneStats": forest_zone_stats, "forestZones": zones}

    def get_sensors(self):
        with LOCK:
            online_sensors = [s for s in self.sensors if s["status"] != "Offline"]
            avg_battery = round(sum(s["battery"] for s in online_sensors) / len(online_sensors)) if online_sensors else 0
            avg_signal = round(sum(s["signal"] for s in online_sensors) / len(online_sensors)) if online_sensors else 0
            sensor_unit_stats = [
                {"label": "Total Sensors", "value": str(len(self.sensors)),
                 "icon": "radio", "tone": "slate"},
                {"label": "Online Sensors", "value": str(len(online_sensors)),
                 "icon": "sun", "tone": "amber"},
                {"label": "Avg Battery", "value": f"{avg_battery}%",
                 "icon": "battery", "tone": "moss"},
                {"label": "Avg Signal", "value": f"{avg_signal}%",
                 "icon": "wifi", "tone": "blue"},
            ]
            registry = [self._sensor_public(s) for s in self.sensors]
            return {"sensorUnitStats": sensor_unit_stats, "sensorRegistry": registry}

    def get_reports(self):
        with LOCK:
            today_alerts = [a for a in self.alerts if self._is_today(a)]
            total_detected = len(today_alerts)
            total_resolved = sum(1 for a in today_alerts if a["status"] == "Resolved")
            resolution_rate = round(100 * total_resolved / total_detected) if total_detected else 0
            active_alerts = sum(1 for a in today_alerts if a["status"] == "Active")
            report_stats = [
                {"label": "Threats Detected Today", "value": str(total_detected),
                 "change": "", "trend": "up", "icon": "globe"},
                {"label": "Resolution Rate", "value": f"{resolution_rate}%",
                 "change": "", "trend": "up", "icon": "trending-up"},
                {"label": "Hectares Saved Today", "value": "0",
                 "change": "", "trend": "up", "icon": "trending-up"},
                {"label": "Active Alerts Today", "value": str(active_alerts),
                 "change": "", "trend": "up", "icon": "calendar"},
            ]
            return {
                "reportStats": report_stats,
                "threatsVsResolved": self._threats_vs_resolved_live(),
                "hectaresSavedMonthly": self._hectares_saved_live(),
                "availableReports": self._available_reports_live(),
            }

    def _threats_vs_resolved_live(self):
        """Return only the current session's real alert totals."""
        today_alerts = [a for a in self.alerts if self._is_today(a)]
        return [{
            "month": "Today",
            "detected": len(today_alerts),
            "resolved": sum(1 for a in today_alerts if a["status"] == "Resolved"),
        }]

    def _hectares_saved_live(self):
        """No hectares are reported until the backend records that value."""
        return [{"month": "Today", "hectares": 0}]

    def _available_reports_live(self):
        """No fake PDF titles/dates — every entry here is computed from
        real, current state at request time."""
        today = _now()
        today_label = today.strftime("%B %d, %Y")
        today_alerts = [a for a in self.alerts if self._is_today(a)]
        online = sum(1 for s in self.sensors if s["status"] != "Offline")

        return [
            {
                "title": f"Live Threat Summary — {today_label}",
                "date": today_label,
                "size": f"{len(today_alerts)} threats logged today",
                "type": "Live",
                "highlighted": True,
            },
            {
                "title": "Sensor Network Snapshot",
                "date": today_label,
                "size": f"{online}/{len(self.sensors)} sensors online",
                "type": "Live",
                "highlighted": False,
            },
            {
                "title": "Forest Zone Coverage Report",
                "date": today_label,
                "size": f"{len(self.zones)} zones · {sum(z['threats'] for z in self.zones)} threats total",
                "type": "Live",
                "highlighted": False,
            },
        ]

    def get_settings(self):
        with LOCK:
            return {"notificationSettings": self.notification_settings}

    def toggle_notification(self, key):
        with LOCK:
            for setting in self.notification_settings:
                if setting["key"] == key:
                    setting["enabled"] = not setting["enabled"]
                    return setting
            return None


# Singleton used by app.py
STATE = SensorNetwork()