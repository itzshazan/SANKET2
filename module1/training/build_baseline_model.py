"""Build and serialize baseline Module 1 model artifacts."""
import pickle
import numpy as np
from pathlib import Path
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.preprocessing import StandardScaler

MODELS_DIR = Path(__file__).resolve().parent.parent / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

# Generate synthetic representative training matrix matching CORE_FEATURE_COLUMNS (15 features)
np.random.seed(42)
n_samples = 600

# Features:
# 0: rainfall_24h, 1: rainfall_72h, 2: rainfall_7d, 3: max_rainfall_1h, 4: rainfall_exceedance
# 5: soil_moisture, 6: elevation, 7: slope, 8: aspect, 9: curvature
# 10: twi, 11: flow_accumulation, 12: ndvi, 13: ndvi_change, 14: historical_density

rf24 = np.random.exponential(35, n_samples)
rf72 = rf24 * 2.2 + np.random.exponential(20, n_samples)
rf7d = rf72 * 1.6 + np.random.exponential(40, n_samples)
max1h = rf24 * 0.3
exceed = (rf72 / 72.0) / 0.994
soil = np.clip(0.18 + 0.30 * (rf72 / 200.0) + np.random.normal(0, 0.05, n_samples), 0.1, 0.55)
elev = np.random.uniform(200, 3500, n_samples)
slope = np.random.uniform(5, 65, n_samples)
aspect = np.random.uniform(0, 360, n_samples)
curv = np.random.normal(0, 1.2, n_samples)
twi = np.random.uniform(4, 18, n_samples)
flow = np.random.exponential(150, n_samples)
ndvi = np.random.uniform(0.2, 0.85, n_samples)
ndvi_ch = np.random.normal(-0.02, 0.08, n_samples)
hist_dens = np.random.poisson(2, n_samples)

X = np.column_stack([
    rf24, rf72, rf7d, max1h, exceed,
    soil, elev, slope, aspect, curv,
    twi, flow, ndvi, ndvi_ch, hist_dens
])

# Landslide probability formula: higher rain + steep slope + saturated soil + past events
z = -3.5 + 0.015 * rf72 + 0.05 * slope + 4.0 * soil + 0.25 * hist_dens + (exceed > 1.2) * 1.5
prob = 1.0 / (1.0 + np.exp(-z))
y = (prob > 0.45).astype(int)

scaler = StandardScaler()
X_scaled = scaler.fit_transform(X)

model = HistGradientBoostingClassifier(max_iter=150, random_state=42)
model.fit(X, y)

# Save artifacts
with open(MODELS_DIR / "scaler.pkl", "wb") as f:
    pickle.dump(scaler, f)

with open(MODELS_DIR / "module1_model.pkl", "wb") as f:
    pickle.dump(model, f)

print(f"Successfully generated scaler.pkl and module1_model.pkl in {MODELS_DIR}")
