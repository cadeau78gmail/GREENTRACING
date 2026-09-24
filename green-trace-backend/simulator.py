"""
simulator.py
============
Runs a SCRIPTED 5-node sensor network so the demo tells a clear story
instead of pure randomness, and keeps an in-memory state store shaped
EXACTLY like green-trace-frontend's src/data/mockData.js.

The story, by design:
  - 5 sensors total. Full stop — every stat on every page counts real
    sensors/zones/threats, never a hardcoded "487"-style vanity number.
    - For the first 3 seconds, all 5 nodes read "Active" and there are no alerts.
    - SN-004 and SN-005 deterministically alternate charcoal-burning and
        chainsaw (illegal logging) alerts every 10 seconds.
    - SN-001, SN-002, and SN-003 remain Active with healthy batteries forever.
    - SN-004 is Active for 50 seconds, Low Battery for 50 seconds, Offline for
        50 seconds, then returns Active with a restored battery.

Swap `import { x } from './data/mockData.js'` for `fetch('/api/...')` and
the JSON you get back has the same field names, so no frontend components
need to change.
"""

import logging
import os
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

# Scripted phases, in seconds. The prototype intentionally moves quickly so
# every state is visible during a demo.
INITIAL_QUIET_SECONDS = 3
LOW_BATTERY_AT = 50
OFFLINE_AT = 100
RECOVERY_AT = 150
ALERT_ROTATION_SECONDS = 10
TICK_SECONDS = 1

DUTY_SENSOR_IDS = ["SN-004", "SN-005"]
BATTERY_DUTY_SENSOR_ID = "SN-004"
ALWAYS_ACTIVE_SENSOR_IDS = ["SN-001", "SN-002", "SN-003"]

# Short zone keys used on sensor/node rows -> full zone record keys used on
# the Forest Zones page. Mirrors the naming already used in mockData.js.
ZONE_KEYS = ["Congo Basin", "East Africa", "West Forest", "Southern"]
ZONE_FULL_NAME = {
    "Congo Basin": "Congo Basin",
    "East Africa": "East African Forest",
    "West Forest": "West African Forest",
    "Southern": "Southern Woodlands",
}

HECTARES_PER_SENSOR = 100

# charcoal_burning -> Critical, illegal_logging (chainsaw) -> High.
SCRIPTED_SEVERITY = {"charcoal_burning": "Critical", "illegal_logging": "High"}

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

        # Scripted state bookkeeping. The key changes when either the alert
        # rotation or Node 4 availability changes.
        self._scripted_alert_key = None
        self._duty_alert_ids = {sid: None for sid in DUTY_SENSOR_IDS}  # sensor_id -> active alert id

        # Real-hardware ingestion: sensor_id -> {"audio": {...}|None, "co2": {...}|None}
        self.live_readings = {}

    # ---------------------------------------------------------------
    # Seed data
    # ---------------------------------------------------------------

    def _seed_sensors(self):
        sensor_types = [
            "Acoustic + Chemical",
            "Acoustic",
            "Chemical",
            "Acoustic + Chemical",
            "Acoustic",
        ]
        coordinates = [(18, 55), (41, 27), (27, 68), (57, 66), (64, 39)]
        sensors = []
        for i in range(1, 6):  # exactly 5 sensors: SN-001 .. SN-005
            zone = ZONE_KEYS[(i - 1) % len(ZONE_KEYS)]
            sensors.append({
                "id": f"SN-{i:03d}",
                "zone": zone,
                "type": sensor_types[i - 1],
                "status": "Active",
                "battery": 100,
                "signal": 100,
                "temp_c": 25 + i,
                "uptime": 100.0,
                "last_ping_at": _now(),
                "x": coordinates[i - 1][0],
                "y": coordinates[i - 1][1],
            })
        return sensors

    def _seed_zones(self):
        base = [
            {"name": "Congo Basin", "location": "DRC / Republic of Congo",
             "threats": 0, "coverage": 94, "trend": "up"},
            {"name": "East African Forest", "location": "Kenya / Tanzania / Uganda",
             "threats": 0, "coverage": 88, "trend": "up"},
            {"name": "West African Forest", "location": "Ghana / Côte d'Ivoire",
             "threats": 0, "coverage": 79, "trend": "up"},
            {"name": "Southern Woodlands", "location": "Zambia / Zimbabwe / Mozambique",
             "threats": 0, "coverage": 91, "trend": "up"},
        ]
        # Each real sensor protects exactly 100 hectares.
        counts = Counter(ZONE_FULL_NAME[s["zone"]] for s in self.sensors)
        for z in base:
            z["sensors"] = counts.get(z["name"], 0)
            z["hectares"] = f"{z['sensors'] * HECTARES_PER_SENSOR:,}"
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

    def _is_quiet_period(self):
        return (_now() - self.start_time).total_seconds() < INITIAL_QUIET_SECONDS

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
            "Scripted simulation started: quiet=%ds, rotation=%ds, duty=%s",
            INITIAL_QUIET_SECONDS, ALERT_ROTATION_SECONDS, DUTY_SENSOR_IDS,
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
            now = _now()

            # The 3 fixed sensors are permanently healthy and deterministic.
            for sid in ALWAYS_ACTIVE_SENSOR_IDS:
                s = self._sensor(sid)
                s["status"] = "Active"
                s["last_ping_at"] = now
                s["battery"] = 100
                s["signal"] = 100

            elapsed = max(0, (now - self.start_time).total_seconds())
            node4 = self._sensor(BATTERY_DUTY_SENSOR_ID)
            node5 = self._sensor("SN-005")
            node4_phase = self._apply_battery_phase(node4, elapsed, now)
            node5["status"] = "Active"
            node5["battery"] = 100
            node5["signal"] = 100
            node5["last_ping_at"] = now

            if elapsed < INITIAL_QUIET_SECONDS:
                alert_key = ("quiet",)
            else:
                rotation = int((elapsed - INITIAL_QUIET_SECONDS) // ALERT_ROTATION_SECONDS)
                node4_available = node4_phase in {"active", "recovered"}
                alert_key = (rotation, node4_available)

            if alert_key == self._scripted_alert_key:
                return

            self._resolve_duty_alerts()
            self._scripted_alert_key = alert_key
            if alert_key == ("quiet",):
                return

            rotation = alert_key[0]
            if alert_key[1]:
                assignments = (
                    [("charcoal_burning", "SN-004"), ("illegal_logging", "SN-005")]
                    if rotation % 2 == 0
                    else [("illegal_logging", "SN-004"), ("charcoal_burning", "SN-005")]
                )
            else:
                solo_threat = "charcoal_burning" if rotation % 2 == 0 else "illegal_logging"
                assignments = [(solo_threat, "SN-005")]

            for threat_type, sensor_id in assignments:
                self._raise_scripted_alert(threat_type, sensor_id)

    @staticmethod
    def _apply_battery_phase(sensor, elapsed, now):
        if elapsed < LOW_BATTERY_AT:
            phase = "active"
            sensor["status"] = "Active"
            sensor["battery"] = 100
            sensor["signal"] = 100
        elif elapsed < OFFLINE_AT:
            phase = "low_battery"
            sensor["status"] = "Low Battery"
            sensor["battery"] = 10
            sensor["signal"] = 25
        elif elapsed < RECOVERY_AT:
            phase = "offline"
            sensor["status"] = "Offline"
            sensor["battery"] = 0
            sensor["signal"] = 0
        else:
            phase = "recovered"
            sensor["status"] = "Active"
            sensor["battery"] = 100
            sensor["signal"] = 100
        sensor["last_ping_at"] = now
        return phase

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
        against any sensor (defaults to the first available duty node). Independent of the
        scripted rotation — handy to show off a specific threat on demand."""
        with LOCK:
            if sensor_id:
                sensor = self._sensor(sensor_id)
            else:
                sensor = next(
                    (self._sensor(sid) for sid in DUTY_SENSOR_IDS
                     if self._sensor(sid)["status"] in {"Active", "Alert"}),
                    self._sensor(ALWAYS_ACTIVE_SENSOR_IDS[0]),
                )

            co2_scenario = "burning" if scenario == "fire" else "normal"
            threat_scores, co2_result = detection.run_detection_cycle(
                audio_scenario=scenario, co2_scenario=co2_scenario
            )

            triggered = [(name, data) for name, data in threat_scores.items() if data["alert"]]
            raised_alert = None
            if (
                triggered
                and sensor["id"] not in ALWAYS_ACTIVE_SENSOR_IDS
                and sensor["status"] in {"Active", "Alert"}
                and not self._is_quiet_period()
            ):
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

        if triggered and sensor["id"] not in ALWAYS_ACTIVE_SENSOR_IDS and not self._is_quiet_period():
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
        protected = sum(1 for s in self.sensors if s["status"] != "Offline") * HECTARES_PER_SENSOR
        return str(protected)

    def _online_sensor_count(self):
        return sum(1 for s in self.sensors if s["status"] != "Offline")

    def _recent_daily_activity(self, days=2):
        day_buckets = []
        for i in range(days):
            day = (_now() - timedelta(days=days - 1 - i)).date()
            day_buckets.append({"date": day, "detected": 0, "resolved": 0})

        for alert in self.alerts:
            created = alert["created_at"].date()
            for bucket in day_buckets:
                if bucket["date"] == created:
                    bucket["detected"] += 1
                    if alert["status"] == "Resolved":
                        bucket["resolved"] += 1
                    break

        return [
            {
                "month": bucket["date"].strftime("%a"),
                "detected": bucket["detected"],
                "resolved": bucket["resolved"],
            }
            for bucket in day_buckets
        ]

    def get_overview(self):
        with LOCK:
            active = self._online_sensor_count()
            offline = sum(1 for s in self.sensors if s["status"] == "Offline")
            low_battery = sum(1 for s in self.sensors if s["status"] == "Low Battery")
            active_alerts = [a for a in self.alerts if a["status"] == "Active"]
            total_threats = len(active_alerts)
            resolved = sum(1 for a in self.alerts if a["status"] == "Resolved")
            resolved_pct = round(100 * resolved / total_threats) if total_threats else 0

            overview_stats = [
                {"label": "Active Sensors", "value": str(active),
                 "change": "", "trend": "up", "icon": "radio"},
                {"label": "Threats Detected", "value": str(total_threats),
                 "change": "", "trend": "down" if total_threats else "up", "icon": "alert-triangle"},
                {"label": "Zones Protected", "value": str(active),
                 "change": "", "trend": "up", "icon": "shield-check"},
                {"label": "Hectares Monitored", "value": self._total_hectares(),
                 "change": "", "trend": "up", "icon": "bell"},
            ]
            shortcuts = [
                {"title": "Sensor Map", "subtitle": "View live sensor locations",
                 "icon": "map", "to": "/sensor-map", "tone": "blue"},
                {"title": "Alerts", "subtitle": f"{self._active_alert_count()} active threats",
                 "icon": "bell", "to": "/alerts", "tone": "ember"},
                {"title": "Forest Zones", "subtitle": f"{active} nodes protected",
                 "icon": "trees", "to": "/forest-zones", "tone": "moss"},
                {"title": "Reports", "subtitle": "Download analytics",
                 "icon": "globe", "to": "/reports", "tone": "violet"},
            ]
            return {
                "overviewStats": overview_stats,
                "shortcuts": shortcuts,
                "threatActivity": self._recent_daily_activity(2),
                "liveThreatFeed": self._live_feed(),
                "satelliteNodes": self._satellite_nodes(),
                "zoneDistribution": self._zone_distribution(),
                "meta": {
                    "activeSensors": active,
                    "offlineSensors": offline,
                    "lowBatterySensors": low_battery,
                    "resolvedPct": resolved_pct,
                    "totalThreats": total_threats,
                    "totalSensors": len(self.sensors),
                },
            }

    def _is_today(self, alert):
        return alert["created_at"].date() == _now().date()

    def _active_alert_count(self):
        return sum(1 for a in self.alerts if a["status"] == "Active")

    def _alert_sensor_available(self, alert):
        sensor_id = alert["location"].split()[0]
        return self._sensor(sensor_id)["status"] not in {"Low Battery", "Offline"}

    def _live_feed(self):
        return [
            {
                "id": a["id"], "icon": a["icon"], "title": a["title"],
                "location": a["location"], "severity": a["severity"], "time": _ago(a["created_at"]),
            }
            for a in self.alerts
            if self._alert_sensor_available(a)
        ][:4]

    def _satellite_nodes(self):
        status_map = {
            "Active": "active",
            "Alert": "alert",
            "Low Battery": "low-battery",
            "Offline": "offline",
        }
        return [
            {"id": s["id"].lower().replace("sn-", "n"), "x": s["x"], "y": s["y"],
             "status": status_map[s["status"]]}
            for s in self.sensors
        ]

    @staticmethod
    def _node_label(sensor_id):
        raw = str(sensor_id)
        if raw.startswith("SN-") or raw.startswith("SN"):
            return f"Node {int(raw.split('-')[-1])}"
        if raw.startswith("Node "):
            return f"Node {int(raw.split()[-1])}"
        return raw

    def _zone_distribution(self):
        colors = {
            "Node 1": "#e8622c",
            "Node 2": "#3fa868",
            "Node 3": "#d4a24c",
            "Node 4": "#4fb0a8",
            "Node 5": "#8b5cf6",
        }
        counts = Counter()
        for alert in self.alerts:
            if alert["status"] != "Active":
                continue
            sensor_id = alert["location"].split(" — ")[0]
            counts[sensor_id] += 1

        sensor_entries = []
        for sensor in self.sensors:
            sensor_id = sensor["id"]
            node_label = self._node_label(sensor_id)
            value = counts.get(sensor_id, 0)
            sensor_entries.append({
                "name": node_label,
                "value": value,
                "color": colors.get(node_label, "#94a3b8"),
            })

        total = sum(item["value"] for item in sensor_entries)
        if total == 0:
            return [{"name": f"Node {i}", "value": 0, "color": colors.get(f"Node {i}", "#94a3b8")} for i in range(1, 6)]

        return [
            {"name": item["name"], "value": round(100 * item["value"] / total), "color": item["color"]}
            for item in sensor_entries
        ]

    def get_sensor_map(self):
        with LOCK:
            active = sum(1 for s in self.sensors if s["status"] == "Active")
            alert_ = sum(1 for s in self.sensors if s["status"] == "Alert")
            low_battery = sum(1 for s in self.sensors if s["status"] == "Low Battery")
            offline = sum(1 for s in self.sensors if s["status"] == "Offline")
            sensor_map_stats = [
                {"label": "Total Nodes", "value": str(len(self.sensors)), "tone": "slate"},
                {"label": "Active", "value": str(active), "tone": "moss"},
                {"label": "On Alert", "value": str(alert_), "tone": "ember"},
                {"label": "Low Battery", "value": str(low_battery), "tone": "amber"},
                {"label": "Offline", "value": str(offline), "tone": "slate"},
            ]
            node_list = [
                {"id": self._node_label(s["id"]), "zone": s["zone"],
                 "status": s["status"].lower().replace(" ", "-"),
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
            active_alerts = [a for a in self.alerts if a["status"] == "Active" and self._alert_sensor_available(a)]
            critical = sum(1 for a in active_alerts if a["severity"] == "Critical")
            high = sum(1 for a in active_alerts if a["severity"] == "High")
            resolved = sum(1 for a in self.alerts if a["status"] == "Resolved")
            alert_stats = [
                {"label": "Total Today", "value": str(len(active_alerts)),
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
                for a in active_alerts
            ]
            return {"alertStats": alert_stats, "alerts": alerts}

    def get_forest_zones(self):
        with LOCK:
            online_count = self._online_sensor_count()
            total_threats = sum(1 for a in self.alerts if a["status"] == "Active")
            avg_coverage = round(100 * online_count / len(self.sensors)) if self.sensors else 0
            forest_zone_stats = [
                {"label": "Protected Zones", "value": str(online_count),
                 "icon": "shield-check", "tone": "moss"},
                {"label": "Total Hectares", "value": self._total_hectares(),
                 "icon": "trees", "tone": "moss"},
                {"label": "Active Threats", "value": str(total_threats),
                 "icon": "alert-triangle", "tone": "ember"},
                {"label": "Avg Coverage", "value": f"{avg_coverage}%",
                 "icon": "map-pin", "tone": "blue"},
            ]
            sensor_counts = Counter(alert["location"].split(" — ")[0] for alert in self.alerts if alert["status"] == "Active")
            zones = []
            for sensor in self.sensors:
                sid = sensor["id"]
                node_name = self._node_label(sid)
                threats = sensor_counts.get(sid, 0)
                active = sensor["status"] != "Offline"
                density = round(100 * threats / max(1, total_threats)) if total_threats else 0
                zones.append({
                    "name": node_name,
                    "node": node_name,
                    "location": sensor["zone"],
                    "risk": self._risk_from_threats(threats),
                    "trend": "up" if active else "down",
                    "hectares": str(HECTARES_PER_SENSOR if active else 0),
                    "sensors": 1,
                    "threats": threats,
                    "coverage": density,
                    "accuracy": density,
                })
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
                {"label": "Low Battery", "value": str(sum(1 for s in self.sensors if s["status"] == "Low Battery")),
                 "icon": "battery", "tone": "amber"},
                {"label": "Avg Battery", "value": f"{avg_battery}%",
                 "icon": "battery", "tone": "moss"},
                {"label": "Avg Signal", "value": f"{avg_signal}%",
                 "icon": "wifi", "tone": "blue"},
            ]
            registry = [self._sensor_public(s) for s in self.sensors]
            return {"sensorUnitStats": sensor_unit_stats, "sensorRegistry": registry}

    def get_reports(self):
        with LOCK:
            daily_activity = self._recent_daily_activity(2)
            today_day = daily_activity[-1]
            total_detected = today_day["detected"]
            total_resolved = today_day["resolved"]
            resolution_rate = round(100 * total_resolved / total_detected) if total_detected else 0
            active_alerts = sum(1 for a in self.alerts if a["status"] == "Active")
            report_stats = [
                {"label": "Threats Detected Today", "value": str(total_detected),
                 "change": "", "trend": "up", "icon": "globe"},
                {"label": "Resolution Rate", "value": f"{resolution_rate}%",
                 "change": "", "trend": "up", "icon": "trending-up"},
                {"label": "Hectares Saved Today", "value": str(self._online_sensor_count() * HECTARES_PER_SENSOR),
                 "change": "", "trend": "up", "icon": "trending-up"},
                {"label": "Active Alerts Today", "value": str(active_alerts),
                 "change": "", "trend": "up", "icon": "calendar"},
            ]
            return {
                "reportStats": report_stats,
                "threatsVsResolved": daily_activity,
                "hectaresSavedMonthly": [{"month": item["month"], "hectares": item["detected"] * 100} for item in daily_activity],
                "availableReports": self._available_reports_live(),
            }

    def _threats_vs_resolved_live(self):
        """Return recent day totals based on the live session window."""
        return self._recent_daily_activity(2)

    def _hectares_saved_live(self):
        """Use the currently protected hectare count as a real-time, live metric."""
        return [{"month": day["month"], "hectares": day["detected"] * 100} for day in self._recent_daily_activity(2)]

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

    def resolve_alert(self, alert_id):
        with LOCK:
            alert = next((item for item in self.alerts if item["id"] == alert_id), None)
            if alert is None:
                return None
            alert["status"] = "Resolved"
            for sensor_id, tracked_id in self._duty_alert_ids.items():
                if tracked_id == alert_id:
                    self._duty_alert_ids[sensor_id] = None
            return self._alert_public(alert)


# Singleton used by app.py
STATE = SensorNetwork()