"""
simulator.py
============
Runs a virtual sensor network in a background thread and keeps an in-memory
state store shaped EXACTLY like green-trace-frontend's src/data/mockData.js.

Swap `import { x } from './data/mockData.js'` for `fetch('/api/...')` and the
JSON you get back has the same field names, so no frontend components need
to change.

This is intentionally in-memory (no DB) to match the notebook's scope. If you
outgrow that, everything writes through `STATE` below — that's the one place
to swap in a real database.
"""

import logging
import random
import threading
import time
from datetime import datetime, timedelta

import detection

logger = logging.getLogger("green_trace.simulator")

LOCK = threading.RLock()

# Short zone keys used on sensor/node rows -> full zone record keys used on
# the Forest Zones page. Mirrors the naming already used in mockData.js.
ZONE_KEYS = ["Congo Basin", "East Africa", "West Forest", "Southern"]
ZONE_FULL_NAME = {
    "Congo Basin": "Congo Basin",
    "East Africa": "East African Forest",
    "West Forest": "West African Forest",
    "Southern": "Southern Woodlands",
}

TOTAL_SENSORS_HEADLINE = 5
TOTAL_ZONES_HEADLINE = 1
HECTARES_PER_ZONE = 100

SENSOR_TYPES = ["Acoustic", "Chemical", "Acoustic + Chemical"]

AUDIO_SCENARIOS_WEIGHTED = (
    ["normal"] * 70
    + ["chainsaw"] * 10
    + ["fire"] * 6
    + ["footsteps"] * 8
    + ["gunshot"] * 6
)

SEVERITY_ORDER = ["Medium", "High", "Critical"]


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


def _severity_from_score(fused_score):
    if fused_score >= 0.8:
        return "Critical"
    if fused_score >= 0.6:
        return "High"
    return "Medium"


class SensorNetwork:
    """Owns all mutable state and the background simulation loop."""

    def __init__(self):
        self.sensors = self._seed_sensors()
        self.zones = self._seed_zones()
        self.alerts = self._seed_alerts()
        self.threat_activity = self._seed_threat_activity()
        self.hectares_saved_monthly = self._seed_hectares_saved()
        self.available_reports = self._seed_reports()
        self.notification_settings = self._seed_notifications()
        self._next_alert_id = len(self.alerts) + 1
        self._started = False
        self._started_at = time.monotonic()
        self._last_rotation = -1

    # ---------------------------------------------------------------
    # Seed data (mirrors mockData.js shapes/values as the starting point)
    # ---------------------------------------------------------------

    def _seed_sensors(self):
        sensors = []
        positions = [(18, 55), (41, 27), (27, 68), (57, 66), (64, 39)]
        batteries = [92, 84, 88, 76, 81]
        for i in range(1, 6):
            zone = f"Zone {i:03d}"
            sensors.append({
                "id": f"SN-{i:03d}",
                "zone": zone,
                "type": ["Acoustic + Chemical", "Acoustic", "Acoustic + Chemical", "Chemical", "Acoustic"][i - 1],
                "status": "Active",
                "battery": batteries[i - 1],
                "signal": 95 - (i - 1) * 4,
                "temp_c": 25 + i - 1,
                "uptime": 100.0,
                "last_ping_at": _now(),
                "x": positions[i - 1][0],
                "y": positions[i - 1][1],
            })
        return sensors

    def _seed_zones(self):
        base = [
            {"name": f"Zone {i:03d}", "location": "Protected demo area",
             "node": f"SN-{i:03d}", "hectares": str(HECTARES_PER_ZONE), "sensors": 1,
             "threats": 0, "coverage": 95 - (i - 1) * 4, "trend": "up"}
            for i in range(1, 6)
        ]
        for z in base:
            z["risk"] = self._risk_from_threats(z["threats"])
        return base

    @staticmethod
    def _risk_from_threats(threats):
        if threats >= 15:
            return "high"
        if threats >= 8:
            return "medium"
        return "low"

    def _seed_alerts(self):
        seed = []
        alerts = []
        for i, (threat_type, location, severity, minutes_ago, status) in enumerate(seed, start=1):
            profile = detection.THREAT_PROFILES[threat_type]
            alerts.append({
                "id": i,
                "threat_type": threat_type,
                "icon": profile["icon"],
                "title": profile["label"],
                "location": location,
                "severity": severity,
                "status": status,
                "created_at": _now() - timedelta(minutes=minutes_ago),
            })
        return alerts

    def _seed_threat_activity(self):
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        rng = random.Random(7)
        data = []
        for m in months:
            detected = rng.randint(10, 30)
            resolved = max(1, detected - rng.randint(1, 4))
            data.append({"month": m, "detected": detected, "resolved": resolved})
        return data

    def _seed_hectares_saved(self):
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        rng = random.Random(11)
        return [{"month": m, "hectares": rng.randint(130, 560)} for m in months]

    def _seed_reports(self):
        return [
            {"title": "Monthly Threat Summary — April 2026", "date": "April 30, 2026",
             "size": "2.4 MB", "type": "PDF", "highlighted": False},
            {"title": "Quarterly Zone Analysis Q1 2026", "date": "March 31, 2026",
             "size": "4.1 MB", "type": "PDF", "highlighted": True},
            {"title": "Sensor Network Health Report — March", "date": "March 31, 2026",
             "size": "1.8 MB", "type": "PDF", "highlighted": False},
            {"title": "Annual Deforestation Impact Report 2025", "date": "December 31, 2025",
             "size": "8.9 MB", "type": "PDF", "highlighted": False},
        ]

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

    # ---------------------------------------------------------------
    # Background simulation loop
    # ---------------------------------------------------------------

    def start(self):
        if self._started:
            return
        self._started = True
        thread = threading.Thread(target=self._loop, daemon=True)
        thread.start()
        logger.info("Sensor network simulation started")

    def _loop(self):
        while True:
            try:
                self.tick()
            except Exception:  # noqa: BLE001 - never let the loop die
                logger.exception("Detection cycle failed")
            time.sleep(0.25)

    def tick(self):
        """Advance the scripted three-second story."""
        with LOCK:
            elapsed = time.monotonic() - self._started_at
            if elapsed < 3:
                return
            rotation = int((elapsed - 3) // 3)
            if rotation != self._last_rotation:
                self._last_rotation = rotation
                for sensor in self.sensors:
                    sensor["status"] = "Active"
                    sensor["last_ping_at"] = _now()
                self.sensors[0]["status"] = "Alert"
                self.sensors[1]["status"] = "Alert"
                self._raise_alert("charcoal_burning" if rotation % 2 == 0 else "illegal_logging", self.sensors[0], "Critical")
                self._raise_alert("illegal_logging" if rotation % 2 == 0 else "charcoal_burning", self.sensors[1], "High")

            within_rotation = (elapsed - 3) % 3
            power_node = self.sensors[0] if rotation % 2 == 0 else self.sensors[1]
            if 1.5 <= within_rotation < 2.5:
                power_node["status"] = "Offline"
                power_node["battery"] = 0
            elif power_node["status"] == "Offline":
                power_node["status"] = "Alert"
                power_node["battery"] = 86
                power_node["last_ping_at"] = _now()

    def _raise_alert(self, threat_type, sensor, severity):
        profile = detection.THREAT_PROFILES[threat_type]
        alert = {
            "id": self._next_alert_id,
            "threat_type": threat_type,
            "icon": profile["icon"],
            "title": profile["label"],
            "location": f"{sensor['id']} — {sensor['zone']}",
            "severity": severity,
            "status": "Active",
            "created_at": _now(),
        }
        self._next_alert_id += 1
        self.alerts.insert(0, alert)
        self.alerts = self.alerts[:60]  # cap history

    def _live_zones(self):
        online_ids = {sensor["id"] for sensor in self.sensors if sensor["status"] != "Offline"}
        alert_ids = {sensor["id"] for sensor in self.sensors if sensor["status"] == "Alert"}
        return [
            {
                **zone,
                "threats": 1 if zone["node"] in alert_ids else 0,
                "risk": "medium" if zone["node"] in alert_ids else "low",
                "trend": "down" if zone["node"] in alert_ids else "up",
            }
            for zone in self.zones
            if zone["node"] in online_ids
        ]

    # ---------------------------------------------------------------
    # Serializers — each one matches a mockData.js export shape exactly
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

    def get_overview(self):
        with LOCK:
            active = sum(1 for s in self.sensors if s["status"] == "Active")
            protected = sum(1 for s in self.sensors if s["status"] != "Offline")
            monitored_hectares = sum(int(zone["hectares"]) for zone in self._live_zones())
            total_threats = self._current_threat_count()
            resolved = sum(1 for a in self.alerts if a["status"] == "Resolved" and self._is_today(a))
            resolved_pct = round(100 * resolved / total_threats) if total_threats else 0

            overview_stats = [
                {"label": "Active Sensors", "value": str(active),
                 "change": "", "trend": "up", "icon": "radio"},
                {"label": "Threats Detected", "value": str(total_threats),
                 "change": "", "trend": "down", "icon": "alert-triangle"},
                {"label": "Zones Protected", "value": str(protected),
                 "change": "", "trend": "up", "icon": "shield-check"},
                {"label": "Hectares Monitored", "value": f"{monitored_hectares:,}",
                 "change": "", "trend": "up", "icon": "bell"},
            ]
            shortcuts = [
                {"title": "Sensor Map", "subtitle": "View live sensor locations",
                 "icon": "map", "to": "/sensor-map", "tone": "blue"},
                {"title": "Alerts", "subtitle": f"{self._active_alert_count()} active threats",
                 "icon": "bell", "to": "/alerts", "tone": "ember"},
                {"title": "Forest Zones", "subtitle": f"{protected} zones protected",
                 "icon": "trees", "to": "/forest-zones", "tone": "moss"},
                {"title": "Reports", "subtitle": "Download analytics",
                 "icon": "globe", "to": "/reports", "tone": "violet"},
            ]
            return {
                "overviewStats": overview_stats,
                "shortcuts": shortcuts,
                "threatActivity": [{"month": "Now", "detected": total_threats, "resolved": resolved}],
                "liveThreatFeed": self._live_feed(),
                "satelliteNodes": self._satellite_nodes(),
                "zoneDistribution": self._zone_distribution(),
                "meta": {
                    "activeSensors": active,
                    "offlineSensors": sum(1 for s in self.sensors if s["status"] == "Offline"),
                    "protectedZones": protected,
                    "currentThreats": total_threats,
                    "resolvedPct": resolved_pct,
                },
            }

    def _is_today(self, alert):
        return alert["created_at"].date() == _now().date()

    def _active_alert_count(self):
        return self._current_threat_count()

    def _current_threat_count(self):
        return sum(1 for sensor in self.sensors if sensor["status"] == "Alert")

    @staticmethod
    def _alert_node_id(alert):
        return alert["location"].split(" — ", 1)[0]

    def _live_feed(self):
        current_nodes = {sensor["id"] for sensor in self.sensors if sensor["status"] == "Alert"}
        latest_by_node = {}
        for alert in self.alerts:
            node_id = self._alert_node_id(alert)
            if node_id in current_nodes and node_id not in latest_by_node:
                latest_by_node[node_id] = alert
        return [
            {
                "id": a["id"],
                "icon": a["icon"],
                "title": a["title"],
                "location": a["location"],
                "severity": a["severity"],
                "time": _ago(a["created_at"]),
            }
            for a in latest_by_node.values()
        ]

    def _satellite_nodes(self):
        status_map = {"Active": "active", "Alert": "alert", "Offline": "offline"}
        return [
            {"id": s["id"], "x": s["x"], "y": s["y"],
             "status": status_map[s["status"]]}
            for s in self.sensors
        ]

    def _zone_distribution(self):
        colors = ["#033923", "#3fa868", "#d4a24c", "#4fb0a8", "#6b8e23"]
        return [
            {"name": zone["name"], "value": zone["coverage"], "color": colors[index]}
            for index, zone in enumerate(self._live_zones())
        ]

    def get_sensor_map(self):
        with LOCK:
            active = sum(1 for s in self.sensors if s["status"] == "Active")
            alert_ = sum(1 for s in self.sensors if s["status"] == "Alert")
            offline = sum(1 for s in self.sensors if s["status"] == "Offline")
            sensor_map_stats = [
                {"label": "Total Nodes", "value": str(len(self.sensors)), "tone": "slate"},
                {"label": "Neutral", "value": str(active), "tone": "moss"},
                {"label": "On Alert", "value": str(alert_), "tone": "ember"},
                {"label": "Offline", "value": str(offline), "tone": "slate"},
            ]
            node_list = [
                {"id": s["id"], "zone": s["zone"],
                 "status": s["status"].lower(), "coverage": s["signal"] if s["status"] != "Offline" else 5}
                for s in self.sensors
            ]
            return {
                "sensorMapStats": sensor_map_stats,
                "nodeList": node_list,
                "satelliteNodes": self._satellite_nodes(),
            }

    def get_alerts(self):
        with LOCK:
            current_nodes = {sensor["id"] for sensor in self.sensors if sensor["status"] == "Alert"}
            current_alerts = {}
            for alert in self.alerts:
                node_id = self._alert_node_id(alert)
                if node_id in current_nodes and node_id not in current_alerts:
                    current_alerts[node_id] = alert
            today_alerts = list(current_alerts.values())
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
                    "id": a["id"],
                    "icon": a["icon"],
                    "title": a["title"],
                    "location": a["location"],
                    "severity": a["severity"],
                    "time": _ago(a["created_at"]),
                    "status": a["status"],
                }
                for a in today_alerts
            ]
            return {"alertStats": alert_stats, "alerts": alerts}

    def get_forest_zones(self):
        with LOCK:
            total_threats = self._current_threat_count()
            zones = self._live_zones()
            protected = len(zones)
            avg_coverage = round(sum(z["coverage"] for z in zones) / len(zones)) if zones else 0
            forest_zone_stats = [
                {"label": "Protected Zones", "value": str(protected),
                 "icon": "shield-check", "tone": "moss"},
                {"label": "Total Hectares", "value": f"{sum(int(zone['hectares']) for zone in zones):,}",
                 "icon": "trees", "tone": "moss"},
                {"label": "Active Threats", "value": str(total_threats),
                 "icon": "alert-triangle", "tone": "ember"},
                {"label": "Avg Coverage", "value": f"{avg_coverage}%",
                 "icon": "map-pin", "tone": "blue"},
            ]
            public_zones = [
                {
                    "name": z["name"], "location": z["location"], "risk": z["risk"],
                    "node": z["node"],
                    "trend": z["trend"], "hectares": z["hectares"], "sensors": z["sensors"],
                    "threats": z["threats"], "coverage": z["coverage"],
                }
                for z in zones
            ]
            return {"forestZoneStats": forest_zone_stats, "forestZones": public_zones}

    def get_sensors(self):
        with LOCK:
            active_sensors = [s for s in self.sensors if s["status"] != "Offline"]
            avg_battery = round(sum(s["battery"] for s in self.sensors) / len(self.sensors))
            avg_signal = round(sum(s["signal"] for s in active_sensors) / len(active_sensors)) if active_sensors else 0
            sensor_unit_stats = [
                {"label": "Total Sensors", "value": str(len(self.sensors)),
                 "icon": "radio", "tone": "slate"},
                {"label": "Active Sensors", "value": str(len(active_sensors)),
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
            total_detected = sum(m["detected"] for m in self.threat_activity)
            total_resolved = sum(m["resolved"] for m in self.threat_activity)
            resolution_rate = round(100 * total_resolved / total_detected) if total_detected else 0
            latest_month = self.threat_activity[-1] if self.threat_activity else {}
            previous_month = self.threat_activity[-2] if len(self.threat_activity) > 1 else {}
            latest_hectares = self.hectares_saved_monthly[-1] if self.hectares_saved_monthly else {}
            previous_hectares = self.hectares_saved_monthly[-2] if len(self.hectares_saved_monthly) > 1 else {}

            def percentage_change(current, previous):
                if not previous:
                    return 0
                return round((current - previous) * 100 / previous)

            def format_change(value):
                return f"{value:+d}%"

            def trend_for(value):
                if value > 0:
                    return "up"
                if value < 0:
                    return "down"
                return "flat"

            latest_resolution_rate = round(
                100 * latest_month.get("resolved", 0) / latest_month.get("detected", 1)
            )
            previous_resolution_rate = round(
                100 * previous_month.get("resolved", 0) / previous_month.get("detected", 1)
            )
            alert_ages = [
                max(0, int((_now() - alert["created_at"]).total_seconds()))
                for alert in self.alerts
            ]
            average_response_seconds = round(sum(alert_ages) / len(alert_ages)) if alert_ages else 0
            detected_change = percentage_change(
                latest_month.get("detected", 0), previous_month.get("detected", 0)
            )
            resolution_change = latest_resolution_rate - previous_resolution_rate
            hectares_change = percentage_change(
                latest_hectares.get("hectares", 0), previous_hectares.get("hectares", 0)
            )
            report_stats = [
                {"label": "Threats Detected YTD", "value": str(total_detected),
                 "change": format_change(detected_change), "trend": trend_for(detected_change), "icon": "globe"},
                {"label": "Resolution Rate", "value": f"{resolution_rate}%",
                 "change": format_change(resolution_change), "trend": trend_for(resolution_change),
                 "icon": "trending-up"},
                {"label": "Hectares Saved", "value": f"{sum(m['hectares'] for m in self.hectares_saved_monthly):,}",
                 "change": format_change(hectares_change), "trend": trend_for(hectares_change),
                 "icon": "trending-up"},
                {"label": "Avg Alert Age", "value": f"{average_response_seconds}s", "icon": "calendar"},
            ]
            return {
                "reportStats": report_stats,
                "threatsVsResolved": self.threat_activity,
                "hectaresSavedMonthly": self.hectares_saved_monthly,
                "availableReports": self.available_reports,
            }

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
            for alert in self.alerts:
                if alert["id"] == alert_id:
                    alert["status"] = "Resolved"
                    return alert
            return None


# Singleton used by app.py
STATE = SensorNetwork()
