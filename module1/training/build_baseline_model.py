"""Build and serialize the baseline Module 1 model (free, offline, synthetic-data).

No dataset downloads or accounts are needed: a physically-motivated synthetic
generator produces training data, a HistGradientBoostingClassifier learns it, and
the artifacts + honest metadata are written to module1/models/.

Design rules (these fix the old baseline, which called steep, high-history districts
"danger" at ~4 mm of rain because the ISRO landslide count dominated the label):
  * Rainfall is the TRIGGER. Terrain / history / vegetation only modulate it.
  * Labels are sampled (Bernoulli) from a latent probability, so metrics are < 1.0.
  * Monotonic constraints: more rain, wetter soil, steeper slope, more history can
    never LOWER risk.

Run:  python -m module1.training.build_baseline_model
"""
import json
import pickle
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.metrics import average_precision_score, f1_score, roc_auc_score
from sklearn.model_selection import train_test_split

from module1.features.pipeline import FeaturePipeline

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

COLS = FeaturePipeline.CORE_FEATURE_COLUMNS
N = 12000
rng = np.random.default_rng(42)

# --- synthetic features (ranges match Indian landslide-prone terrain) -------------------
wet = rng.random(N) < 0.35  # 35% of samples are monsoon-intensity events
rf24 = np.where(wet, rng.exponential(55, N), rng.exponential(4, N))
rf72 = rf24 * rng.uniform(1.6, 3.2, N) + np.where(wet, rng.exponential(25, N), rng.exponential(3, N))
rf7d = rf72 * rng.uniform(1.3, 2.4, N) + rng.exponential(15, N)
max1h = rf24 * rng.uniform(0.15, 0.4, N)
exceed = (rf72 / 72.0) / 0.994
soil = np.clip(0.15 + 0.30 * (rf72 / 220.0) + rng.normal(0, 0.05, N), 0.08, 0.55)
elev = rng.uniform(100, 3800, N)
slope = np.clip(rng.gamma(4.0, 6.0, N), 1, 70)
aspect = rng.uniform(0, 360, N)
curv = rng.normal(0, 1.2, N)
twi = np.clip(rng.normal(9, 3, N), 3, 20)
flow = rng.exponential(150, N)
ndvi = rng.uniform(0.2, 0.9, N)
ndvi_ch = rng.normal(-0.02, 0.07, N)
hist = np.where(rng.random(N) < 0.5, rng.poisson(3, N), rng.poisson(18, N))  # ISRO-atlas-like counts

X = np.column_stack([rf24, rf72, rf7d, max1h, exceed, soil, elev, slope, aspect, curv,
                     twi, flow, ndvi, ndvi_ch, hist])

# --- latent landslide probability --------------------------------------------------------
rain = 0.030 * rf72 + 0.015 * rf24 + 0.004 * rf7d + 0.05 * max1h
susc = 0.05 * (slope - 20) + 0.045 * np.minimum(hist, 35) + 0.12 * (twi - 8)
moist = 6.0 * (soil - 0.28)
veg = -3.0 * ndvi_ch
z = -5.5 + rain + susc + moist + veg
p_true = 1.0 / (1.0 + np.exp(-z))
y = (rng.random(N) < p_true).astype(int)

X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.25, random_state=42, stratify=y)

mono = [1, 1, 1, 1, 1, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1]  # +1 = risk may only rise with the feature
model = HistGradientBoostingClassifier(max_iter=200, learning_rate=0.08, max_depth=6,
                                       monotonic_cst=mono, random_state=42)
model.fit(X_tr, y_tr)

proba = model.predict_proba(X_te)[:, 1]
metrics = {
    "roc_auc": round(float(roc_auc_score(y_te, proba)), 4),
    "pr_auc": round(float(average_precision_score(y_te, proba)), 4),
    "f1": round(float(f1_score(y_te, proba >= 0.5)), 4),
    "holdout_samples": int(len(y_te)),
    "positive_rate": round(float(y.mean()), 4),
}

with open(MODELS_DIR / "module1_model.pkl", "wb") as f:
    pickle.dump(model, f)

metadata = {
    "model_name": "hist_gradient_boosting_baseline",
    "version": "1.1.0",
    "trained_date": datetime.now(timezone.utc).isoformat(),
    "training_data": "synthetic (physically-motivated generator in build_baseline_model.py) - baseline for demo/offline use",
    "metrics": metrics,
    "features": COLS,
    "monotonic_constraints": dict(zip(COLS, mono)),
    "risk_thresholds": {"NORMAL": [0.0, 0.35], "WATCH": [0.35, 0.6], "WARNING": [0.6, 0.8], "DANGER": [0.8, 1.0]},
}
with open(MODELS_DIR / "model_metadata.json", "w", encoding="utf-8") as f:
    json.dump(metadata, f, indent=2)

print(f"Saved model to {MODELS_DIR}")
print("Holdout metrics:", metrics)

# --- behaviour sanity checks -------------------------------------------------------------
def pred(**kw):
    base = dict(rainfall_24h=4, rainfall_72h=7, rainfall_7d=34, max_rainfall_1h=1, soil_moisture=0.2,
                elevation=1500, slope=25, aspect=180, curvature=0, twi=9, flow_accumulation=100,
                ndvi=0.7, ndvi_change=-0.02, historical_density=10)
    base.update(kw)
    base["rainfall_exceedance"] = (base["rainfall_72h"] / 72.0) / 0.994
    return float(model.predict_proba([[base[c] for c in COLS]])[0, 1])

checks = {
    "dry, steep, high history (must be low)": pred(slope=45, historical_density=32),
    "moderate rain 100mm/72h, moderate slope": pred(rainfall_24h=50, rainfall_72h=100, rainfall_7d=150, max_rainfall_1h=12, soil_moisture=0.38, slope=30, historical_density=15),
    "extreme rain 250mm/72h, steep": pred(rainfall_24h=120, rainfall_72h=250, rainfall_7d=400, max_rainfall_1h=30, soil_moisture=0.45, slope=40, historical_density=20),
}
for k, v in checks.items():
    print(f"  {v:0.3f}  {k}")
assert checks["dry, steep, high history (must be low)"] < 0.35, "dry steep terrain must not be WATCH or higher"
assert checks["extreme rain 250mm/72h, steep"] > 0.8, "extreme rain on steep terrain must be DANGER"
