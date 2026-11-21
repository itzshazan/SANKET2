"""Train and honestly evaluate the landslide confidence model.

Evaluation (reported in module1/models/landslide_confidence_v1.card.json):
  * time split   : train on samples up to TRAIN_LAST_YEAR, test on everything later (never seen)
  * state split  : 5-fold cross-validation with whole states held out
  * baseline     : the published-threshold ratio currently used live, scored on the same test set
  * "hard" test  : positives vs the SAME places on other days, i.e. can it tell WHEN
Metrics are ROC-AUC / PR-AUC / Brier and hit-rate / false-alarm tables. Plain accuracy is not
reported: with rare events it rewards a model that never warns.

Run:  python -m module1.ml.train
"""

import argparse
import csv
import json
from datetime import date, datetime, timezone
from pathlib import Path

import joblib
import numpy as np
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import HistGradientBoostingClassifier
from sklearn.inspection import permutation_importance
from sklearn.metrics import average_precision_score, brier_score_loss, roc_auc_score
from sklearn.model_selection import GroupKFold

from . import context as C
from . import features as F

ROOT = Path(__file__).resolve().parent.parent
SAMPLES = ROOT / "data" / "training" / "samples.csv"
TRAIN_LAST_YEAR = 2016          # train 2007-2016, test 2017-2024 (recent events the model never saw)
MODEL_PATH = ROOT / "models" / "landslide_confidence_v1.joblib"
CARD_PATH = ROOT / "models" / "landslide_confidence_v1.card.json"
RAIN_SOIL_MODEL_PATH = ROOT / "models" / "landslide_confidence_rain_soil.joblib"
RAIN_SOIL_CARD_PATH = ROOT / "models" / "landslide_confidence_rain_soil.card.json"
CONTEXT_MODEL_PATH = ROOT / "models" / "landslide_confidence_context.joblib"
CONTEXT_CARD_PATH = ROOT / "models" / "landslide_confidence_context.card.json"
VARIANTS = {
    "hourly": (F.FEATURES, MODEL_PATH, CARD_PATH, "SANKET landslide confidence v1"),
    "rain_soil": (F.RAIN_SOIL_FEATURES, RAIN_SOIL_MODEL_PATH, RAIN_SOIL_CARD_PATH, "SANKET rain and soil confidence"),
    "context": (F.CONTEXT_FEATURES, CONTEXT_MODEL_PATH, CONTEXT_CARD_PATH, "SANKET all-factor confidence"),
}
GROUPS = {
    "Rainfall": [f for f in F.FEATURES if f.startswith("rain_") or f == "max_hourly_rain_24h"],
    "Soil moisture": ["soil_7_28", "soil_28_100", "soil_7_28_change_72h"],
    "Terrain": ["elevation_m", "relief_550m_m", "gradient_550m_deg"],
    "Temperature & wind": ["temp_mean_24h", "wind_max_24h"],
    "Vegetation baseline": ["vegetation_baseline_ndvi"],
    "Nearby past landslides": ["prior_landslides_10km"],
}


def _merge_context(rows):
    def key(row):
        return row["lat"], row["lon"], row["date"]

    with C.WEATHER_TRAINING_PATH.open(encoding="utf-8", newline="") as fh:
        weather = {key(r): r for r in csv.DictReader(fh)}
    complete = []
    for row in rows:
        lat, lon = float(row["lat"]), float(row["lon"])
        ndvi = C.vegetation_at(lat, lon)
        count = C.nearby_landslides(lat, lon, date.fromisoformat(row["date"]))
        if key(row) in weather and ndvi is not None and count is not None:
            complete.append({**row, **weather[key(row)], "vegetation_baseline_ndvi": ndvi,
                             "prior_landslides_10km": count})
    print(f"All-factor data coverage: {len(complete)} of {len(rows)} cases")
    return complete


def load(feature_names=F.FEATURES):
    with open(SAMPLES, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    if feature_names == F.CONTEXT_FEATURES:
        rows = _merge_context(rows)
    num = lambda v: float(v) if v not in ("", None) else np.nan
    X = np.array([[num(r[f]) for f in feature_names] for r in rows])
    y = np.array([int(r["label"]) for r in rows])
    meta = {k: np.array([r.get(k, "") for r in rows]) for k in ("kind", "state", "group", "date", "source")}
    meta["year"] = np.array([int(r["year"]) for r in rows])
    meta["ratio"] = np.array([num(r["threshold_ratio"]) for r in rows])
    return X, y, meta


def make_model(feature_names=F.FEATURES):
    hgb = HistGradientBoostingClassifier(
        max_iter=300, learning_rate=0.05, max_leaf_nodes=15, min_samples_leaf=20, l2_regularization=1.0,
        monotonic_cst=[F.MONOTONIC.get(f, 0) for f in feature_names], early_stopping=True,
        validation_fraction=0.15, random_state=0)
    return CalibratedClassifierCV(hgb, method="isotonic", cv=5)


def scores(y, p):
    out = {"n": int(len(y)), "positives": int(y.sum()),
           "roc_auc": round(float(roc_auc_score(y, p)), 3), "pr_auc": round(float(average_precision_score(y, p)), 3)}
    if np.nanmax(p) <= 1:
        out["brier"] = round(float(brier_score_loss(y, p)), 4)
    return out


def operating_table(y, p, cuts):
    pos, neg = y == 1, y == 0
    rows = []
    for c in cuts:
        alarm = p >= c
        tp, fp = int((alarm & pos).sum()), int((alarm & neg).sum())
        rows.append({"at": c, "hit_rate": round(tp / max(pos.sum(), 1), 3),
                     "false_alarm_rate": round(fp / max(neg.sum(), 1), 3),
                     "precision": round(tp / max(tp + fp, 1), 3), "alarms": tp + fp})
    return rows


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    models = parser.add_mutually_exclusive_group()
    models.add_argument("--rain-soil", dest="variant", action="store_const", const="rain_soil")
    models.add_argument("--context", dest="variant", action="store_const", const="context")
    variant = parser.parse_args().variant or "hourly"
    feature_names, model_path, card_path, model_name = VARIANTS[variant]
    active_groups = {name: [col for col in cols if col in feature_names] for name, cols in GROUPS.items()}
    active_groups = {name: cols for name, cols in active_groups.items() if cols}
    X, y, m = load(feature_names)
    print(f"{len(y)} samples, {int(y.sum())} positives")
    train, test = m["year"] <= TRAIN_LAST_YEAR, m["year"] > TRAIN_LAST_YEAR
    yrs = m["year"]
    train_label = f"{yrs[train].min()}-{yrs[train].max()}"
    test_label = f"{yrs[test].min()}-{yrs[test].max()}"

    model = make_model(feature_names).fit(X[train], y[train])
    p = model.predict_proba(X[test])[:, 1]
    r = np.nan_to_num(m["ratio"][test], nan=0.0)
    yt, kind = y[test], m["kind"][test]
    hard = (kind == "positive") | (kind == "neg_same_place")
    easy = (kind == "positive") | (kind == "neg_same_day")

    report = {
        "time_split": {
            "train": train_label, "test": test_label,
            "model": scores(yt, p), "threshold_rule_baseline": scores(yt, r),
            "hard_when_same_place": {"model": scores(yt[hard], p[hard]), "threshold_rule": scores(yt[hard], r[hard])},
            "where_same_day_elsewhere": {"model": scores(yt[easy], p[easy]), "threshold_rule": scores(yt[easy], r[easy])},
            "model_operating_points": operating_table(yt, p, [0.2, 0.35, 0.5, 0.65, 0.8]),
            "threshold_rule_operating_points": operating_table(yt, r, [1.0, 2.0, 4.0]),
        }
    }

    if variant == "context":
        rain_soil_X = X[:, :len(F.RAIN_SOIL_FEATURES)]
        baseline = make_model(F.RAIN_SOIL_FEATURES).fit(rain_soil_X[train], y[train])
        report["time_split"]["matched_rain_soil_baseline"] = scores(yt, baseline.predict_proba(rain_soil_X[test])[:, 1])

    # whole states held out
    aucs = []
    for tr, te in GroupKFold(n_splits=5).split(X, y, groups=m["state"]):
        if len(set(y[te])) < 2:
            continue
        mm = make_model(feature_names).fit(X[tr], y[tr])
        aucs.append(float(roc_auc_score(y[te], mm.predict_proba(X[te])[:, 1])))
    report["state_split_cv"] = {"folds": len(aucs), "roc_auc_mean": round(float(np.mean(aucs)), 3),
                                "roc_auc_min": round(float(np.min(aucs)), 3), "roc_auc_max": round(float(np.max(aucs)), 3)}

    imp = permutation_importance(model, X[test], yt, scoring="roc_auc", n_repeats=10, random_state=0)
    report["feature_importance_test_auc_drop"] = dict(sorted(
        {f: round(float(v), 4) for f, v in zip(feature_names, imp.importances_mean)}.items(), key=lambda kv: -kv[1]))

    final = make_model(feature_names).fit(X, y)
    neg = X[y == 0]
    reference = {f: (None if np.isnan(np.nanmedian(neg[:, i])) else round(float(np.nanmedian(neg[:, i])), 4))
                 for i, f in enumerate(feature_names)}
    model_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(final, model_path)
    card = {
        "name": model_name,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "algorithm": "Gradient-boosted trees (scikit-learn HistGradientBoosting, monotone in rain and soil moisture), isotonic calibration",
        "features": feature_names, "feature_labels": {f: F.LABELS[f] for f in feature_names},
        "groups": active_groups,
        "reference_non_event": reference,
        "training_data": {
            "positives_description": ("India, rainfall-triggered, dated: NASA Global Landslide Catalog 2007-2016 and NASA COOLR reports "
                          "(location accuracy <= 5 km), Kerala 2018 monsoon inventory (Univ. Twente / GSI, DANS, CC-BY-4.0) and "
                          "NASA COOLR Himachal July 2023 inventory, thinned to one point per ~5 km cell"),
            "positives_by_source": {s: int(((m["source"] == s) & (y == 1)).sum()) for s in sorted(set(m["source"]))},
            "years": f"{yrs.min()}-{yrs.max()}",
            "negatives": "same place on 3 other days without a catalogued landslide (25 km / 7 days), and 1 random point in India on the same day",
            "weather": "ERA5 hourly via Open-Meteo archive (live inference uses ECMWF IFS, same soil layers)",
            "terrain": ("Terrain features omitted from this model." if variant == "rain_soil" else
                        "Copernicus GLO-90 elevation (Open-Meteo) at the point and ~550 m north and east"),
            "samples": int(len(y)), "positives": int(y.sum()),
        },
        "meaning_of_confidence": (
            "Calibrated probability that a landslide is recorded within ~5 km on that day, for cases mixed like the "
            f"training set (1 landslide day per {round((len(y) - y.sum()) / y.sum())} non-landslide days). Real landslide "
            "days are far rarer, so read it as a relative alarm level and use the validated hit / false-alarm table."),
        "limitations": [
            "The catalogue is news-based: remote landslides are under-reported, so some negatives are really landslide days.",
            "ERA5 (~25 km) underestimates local cloudbursts; some events had little ERA5 rain.",
            "Locations are accurate to ~1-5 km, so terrain is described at ~0.5 km scale, not the exact slope.",
            "Events after 2018 are sparse in public catalogues; Kerala 2018 events are dated to the 16 Aug peak (exact day unknown).",
        ],
        "evaluation": report,
    }
    if variant == "rain_soil":
        card["limitations"].append(
            "Uses aligned 3–240 hour rainfall totals and soil moisture. Trained and evaluated on "
            "ERA5-derived features, with live scores using ECMWF IFS. Available inputs do not "
            "include hourly rainfall peaks, wind, temperature or local terrain."
        )
    if variant == "context":
        card["training_data"].update({
            "weather": ("ERA5 via Open-Meteo through the day before each dated case. Both live feeds "
                        "use the same 3–240 hour rainfall windows and 3-hour temperature and wind sampling."),
            "terrain": ("Copernicus elevation, relief and gradient over ~550 m. Training uses GLO-90. "
                        "Live uses bundled GLO-90 hotspot stencils or the equivalent GLO-30 stencil."),
            "vegetation": (f"{C.NDVI_SOURCE}. Mean of available quarterly samples in 2004–2006, estimated "
                           "from the official NDVI color bins, at about 2 km resolution."),
            "vegetation_url": "https://gibs.earthdata.nasa.gov/layer-metadata/v1.0/MODIS_Terra_L3_NDVI_Monthly.json",
            "landslide_history": (f"{C.HISTORY_SOURCE}. Dated events within 10 km, at least 30 days before "
                                   "the scored date. Zero means no matching catalogue record."),
            "landslide_history_url": "https://gis.earthdata.nasa.gov/portal/rest/services/Landslides/COOLR_Reports_Points/MapServer/0",
        })
        card["limitations"].extend([
            "Vegetation is a fixed pre-training baseline. It cannot capture recent changes such as deforestation.",
            "Nearby landslide counts depend on catalogue coverage, record dates, and location accuracy.",
            "Weather is cut off before the case date because the event hour is generally unknown. "
            "This evaluation measures discrimination between catalogue cases and sample controls.",
        ])
    card_path.write_text(json.dumps(card, indent=1), encoding="utf-8")
    print(json.dumps(report, indent=1))
    print(f"saved {model_path} and {card_path}")


if __name__ == "__main__":
    main()
