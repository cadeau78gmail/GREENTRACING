"""
detection.py
============
The "AI brain" of Green Trace, lifted from the original research notebook and
made service-safe:

  - simulate_audio()      -> fake microphone data for a given scenario
  - simulate_co2_sensor()  -> fake CO2 readings for a given scenario
  - classify_audio()      -> YAMNet sound classification (with an offline
                              fallback so the server never crashes if the
                              model can't be downloaded / TF isn't happy)
  - co2_anomaly_score()   -> Isolation Forest anomaly score for a CO2 reading
  - fuse_sensor_data()    -> combines audio + CO2 into per-threat scores

Nothing here talks to Flask or holds request state — this module is pure
"given sensor input, return an AI verdict". simulator.py wraps this in a
running sensor network and app.py exposes it over HTTP.
"""

import csv
import io
import logging
import os
import tempfile
import urllib.request
import warnings

import numpy as np

warnings.filterwarnings("ignore")
logger = logging.getLogger("green_trace.detection")

# ============================================================
# THREAT PROFILES — which sensors matter for each threat type
# ============================================================

THREAT_PROFILES = {
    "illegal_logging": {
        "audio_classes": ["Chainsaw", "Sawing", "Wood", "Cutting"],
        "co2_weight": 0.1,
        "audio_weight": 0.9,
        "threshold": 0.45,
        "icon": "volume",
        "label": "Chainsaw activity detected",
    },
    "charcoal_burning": {
        "audio_classes": ["Fire", "Crackle", "Burning", "Smoke"],
        "co2_weight": 0.6,
        "audio_weight": 0.4,
        "threshold": 0.45,
        "icon": "flame",
        "label": "Chemical signatures of charcoal burning",
    },
    "animal_poaching": {
        "audio_classes": ["Footsteps", "Gunshot", "Human voice", "Speech", "Walk", "Run"],
        "co2_weight": 0.0,
        "audio_weight": 1.0,
        "threshold": 0.35,
        "icon": "alert-triangle",
        "label": "Unusual human movement pattern",
    },
}

# ============================================================
# SIMULATED SENSORS (stand-ins for real microphones / CO2 units
# until physical hardware is wired in)
# ============================================================


def simulate_co2_sensor(scenario="normal", duration=50):
    """Simulate a run of CO2 readings (ppm) for a scenario."""
    if scenario == "normal":
        readings = 400 + np.random.normal(0, 5, duration)
    elif scenario == "burning":
        readings = 750 + np.random.normal(0, 20, duration)
    elif scenario == "mixed":
        readings = 400 + np.random.normal(0, 5, duration)
        readings[25:] = 750 + np.random.normal(0, 20, duration - 25)
    else:
        readings = 400 + np.random.normal(0, 5, duration)
    return np.arange(duration), readings


def simulate_audio(scenario="normal", duration=3, sr=22050):
    """Simulate a raw audio waveform for a scenario (no real mic needed yet)."""
    t = np.linspace(0, duration, int(sr * duration))

    if scenario == "chainsaw":
        audio = 0.4 * np.sin(2 * np.pi * 100 * t)
        audio += 0.3 * np.sin(2 * np.pi * 300 * t)
        audio += 0.2 * np.random.normal(0, 1, len(t))
        burst = np.where((t % 0.5) < 0.3, 1.0, 0.3)
        audio *= burst

    elif scenario == "fire":
        audio = 0.05 * np.random.normal(0, 1, len(t))
        pop_times = np.random.choice(len(t), size=200, replace=False)
        audio[pop_times] += np.random.uniform(0.3, 0.8, 200)

    elif scenario == "footsteps":
        audio = 0.02 * np.random.normal(0, 1, len(t))
        step_interval = int(sr * 0.6)
        for i in range(0, len(t), step_interval):
            if i + 1000 < len(t):
                step = np.sin(2 * np.pi * 40 * t[:1000]) * np.exp(-t[:1000] * 10)
                audio[i:i + 1000] += 0.5 * step

    elif scenario == "gunshot":
        audio = 0.03 * np.random.normal(0, 1, len(t))
        n_shots = np.random.randint(1, 3)
        for _ in range(n_shots):
            idx = np.random.randint(0, len(t) - 2000)
            crack = np.exp(-np.linspace(0, 12, 2000)) * np.sin(2 * np.pi * 900 * t[:2000])
            audio[idx:idx + 2000] += 1.2 * crack

    else:  # "normal" — birds + wind
        audio = 0.1 * np.random.normal(0, 1, len(t))
        for freq in [800, 1200, 1800]:
            audio += 0.05 * np.sin(2 * np.pi * freq * t) * np.random.uniform(0.5, 1)

    audio = audio / (np.max(np.abs(audio)) + 1e-9)
    return audio, sr


# Offline fallback so a slow/broken YAMNet download never takes the API down.
FALLBACK_CLASS_SCORES = {
    "normal": {"Bird": 0.72, "Wind noise": 0.58, "Silence": 0.4},
    "chainsaw": {"Chainsaw": 0.93, "Sawing": 0.81, "Wood": 0.42},
    "fire": {"Fire": 0.87, "Crackle": 0.7, "Smoke detector, smoke alarm": 0.3},
    "footsteps": {"Walk, footsteps": 0.82, "Rustle": 0.5},
    "gunshot": {"Gunshot, gunfire": 0.9, "Explosion": 0.55},
}

# ============================================================
# YAMNET (lazy-loaded singleton; falls back gracefully)
# ============================================================

_yamnet_state = {"loaded": False, "model": None, "class_names": None}

CLASS_MAP_URL = (
    "https://raw.githubusercontent.com/tensorflow/models/master/research/"
    "audioset/yamnet/yamnet_class_map.csv"
)


def get_yamnet():
    """Load YAMNet + its class map once, lazily. Returns (model, class_names)
    or (None, None) if unavailable — callers must handle the fallback."""
    if _yamnet_state["loaded"]:
        return _yamnet_state["model"], _yamnet_state["class_names"]

    _yamnet_state["loaded"] = True  # only ever try once per process
    try:
        import tensorflow_hub as hub

        logger.info("Loading YAMNet model (first call only)...")
        model = hub.load("https://tfhub.dev/google/yamnet/1")

        response = urllib.request.urlopen(CLASS_MAP_URL, timeout=10)
        lines = response.read().decode("utf-8").splitlines()
        reader = csv.DictReader(lines)
        class_names = [row["display_name"] for row in reader]

        _yamnet_state["model"] = model
        _yamnet_state["class_names"] = class_names
        logger.info("YAMNet ready (%d sound classes)", len(class_names))
    except Exception as exc:  # noqa: BLE001 - any failure -> fallback mode
        logger.warning("YAMNet unavailable (%s) — using offline fallback classifier", exc)
        _yamnet_state["model"] = None
        _yamnet_state["class_names"] = None

    return _yamnet_state["model"], _yamnet_state["class_names"]


def _yamnet_predict(wav_path, model, class_names, top_n=5):
    import librosa
    import tensorflow as tf

    audio, _ = librosa.load(wav_path, sr=16000, mono=True)
    scores, _embeddings, _spectrogram = model(audio)
    mean_scores = tf.reduce_mean(scores, axis=0).numpy()
    top_indices = np.argsort(mean_scores)[::-1][:top_n]
    return {class_names[i]: float(mean_scores[i]) for i in top_indices}


def classify_audio(scenario):
    """Return {sound_class: score} for a scenario, real YAMNet if available,
    otherwise a realistic offline fallback for the same scenario."""
    model, class_names = get_yamnet()
    if model is not None:
        try:
            audio, sr = simulate_audio(scenario)
            import soundfile as sf

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                sf.write(f.name, audio, sr)
                tmp_path = f.name
            try:
                return _yamnet_predict(tmp_path, model, class_names)
            finally:
                os.remove(tmp_path)
        except Exception as exc:  # noqa: BLE001
            logger.warning("YAMNet inference failed (%s), falling back", exc)

    return FALLBACK_CLASS_SCORES.get(scenario, FALLBACK_CLASS_SCORES["normal"])


# ============================================================
# ISOLATION FOREST — CO2 ANOMALY DETECTION
# ============================================================

_iso_forest = None


def _get_iso_forest():
    global _iso_forest
    if _iso_forest is None:
        from sklearn.ensemble import IsolationForest

        rng = np.random.default_rng(42)
        normal_readings = 400 + rng.normal(0, 5, 1000)
        _iso_forest = IsolationForest(contamination=0.05, random_state=42)
        _iso_forest.fit(normal_readings.reshape(-1, 1))
    return _iso_forest


def co2_anomaly_score(reading):
    """Score a single CO2 reading (ppm) for anomalousness."""
    forest = _get_iso_forest()
    prediction = forest.predict([[reading]])
    raw_score = forest.decision_function([[reading]])[0]
    confidence = float(np.clip(-raw_score * 2, 0, 1))
    is_anomaly = prediction[0] == -1

    if reading < 450:
        status = "Normal"
    elif reading < 600:
        status = "Elevated"
    else:
        status = "Burning Detected"

    return {
        "reading": round(float(reading), 1),
        "is_anomaly": bool(is_anomaly),
        "confidence": round(confidence, 3),
        "status": status,
    }


# ============================================================
# FUSION LAYER
# ============================================================


def extract_audio_threat_score(yamnet_results, threat_name):
    profile = THREAT_PROFILES[threat_name]
    scores = [
        score
        for yamnet_class, score in yamnet_results.items()
        for threat_class in profile["audio_classes"]
        if threat_class.lower() in yamnet_class.lower()
    ]
    return max(scores) if scores else 0.0


def fuse_sensor_data(yamnet_results, co2_result):
    """Combine audio + CO2 readings into a fused score per threat type."""
    co2_score = co2_result["confidence"] if co2_result["is_anomaly"] else 0.0
    threat_scores = {}

    for threat_name, profile in THREAT_PROFILES.items():
        audio_score = extract_audio_threat_score(yamnet_results, threat_name)
        fused_score = profile["audio_weight"] * audio_score + profile["co2_weight"] * co2_score
        threat_scores[threat_name] = {
            "fused_score": round(fused_score, 3),
            "audio_score": round(audio_score, 3),
            "co2_score": round(co2_score, 3),
            "threshold": profile["threshold"],
            "alert": fused_score >= profile["threshold"],
            "icon": profile["icon"],
            "label": profile["label"],
        }

    return threat_scores


def run_detection_cycle(audio_scenario="normal", co2_scenario="normal"):
    """One full sensing cycle: simulate audio + CO2, classify, fuse.
    Returns the fused threat_scores dict plus the raw co2 reading used."""
    yamnet_results = classify_audio(audio_scenario)
    _, co2_series = simulate_co2_sensor(co2_scenario, duration=1)
    co2_reading = float(co2_series[0])
    co2_result = co2_anomaly_score(co2_reading)
    threat_scores = fuse_sensor_data(yamnet_results, co2_result)
    return threat_scores, co2_result
