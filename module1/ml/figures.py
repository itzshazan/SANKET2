"""Evaluation graphs for the landslide confidence model (matplotlib).

Re-creates the same honest split as train.py: the model is fitted on samples up to
TRAIN_LAST_YEAR and every "test" graph uses later landslides it never saw. The deployed
model (trained on all years) is not used here, because it has seen the test data.

Writes PNG files and manifest.json (titles, explanations, metrics) to
web/public/model-figures/, which the Data & Model page shows.

Run:  python -m module1.ml.figures      (re-run after retraining)
"""

import json
from datetime import datetime, timezone

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import numpy as np  # noqa: E402
from sklearn.calibration import calibration_curve  # noqa: E402
from sklearn.metrics import (accuracy_score, average_precision_score, confusion_matrix, f1_score,  # noqa: E402
                             precision_recall_curve, precision_score, recall_score, roc_auc_score, roc_curve)
from sklearn.model_selection import GroupKFold  # noqa: E402

from . import features as F  # noqa: E402
from .train import CARD_PATH, GROUPS, ROOT, TRAIN_LAST_YEAR, load, make_model  # noqa: E402

OUT = ROOT.parent / "web" / "public" / "model-figures"
# SANKET theme (doctorrating.in palette): teal, deep forest, orange accent, red, sand, gold
GREEN, BLUE, ORANGE, RED, GREY, GOLD = "#028C74", "#013126", "#FA5D00", "#B42318", "#CDC5B9", "#C9971F"
GROUP_COLOR = {"Rainfall": GREEN, "Soil moisture": GOLD, "Terrain": BLUE, "Temperature & wind": "#98A19C"}
CUT = 0.5          # model alarm at 50 % confidence
RULE_CUT = 1.0     # threshold rule alarm at 1x the published threshold (= Watch)
CLASSES = ["No landslide", "Landslide"]

plt.rcParams.update({
    "figure.dpi": 130, "savefig.dpi": 130, "font.size": 9.5, "axes.titlesize": 11, "axes.titleweight": "bold",
    "axes.spines.top": False, "axes.spines.right": False, "axes.grid": True, "grid.alpha": 0.25,
    "legend.frameon": False,
    "text.color": "#013126", "axes.labelcolor": "#013126", "axes.edgecolor": "#64726F",
    "xtick.color": "#4A5A56", "ytick.color": "#4A5A56",
})
from matplotlib.colors import LinearSegmentedColormap  # noqa: E402
TEAL_CMAP = LinearSegmentedColormap.from_list("sanket", ["#F2FBF6", "#58EDA2", "#028C74", "#013126"])


def save(fig, name):
    fig.tight_layout()
    fig.savefig(OUT / f"{name}.png", bbox_inches="tight", facecolor="white")
    plt.close(fig)


def metrics(y, score, cut):
    yhat = (score >= cut).astype(int)
    return {"accuracy": accuracy_score(y, yhat), "precision": precision_score(y, yhat, zero_division=0),
            "recall": recall_score(y, yhat, zero_division=0), "f1": f1_score(y, yhat, zero_division=0),
            "roc_auc": roc_auc_score(y, score)}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    X, y, m = load()
    years = m["year"]
    tr, te = years <= TRAIN_LAST_YEAR, years > TRAIN_LAST_YEAR
    y_tr, y_te = y[tr], y[te]
    train_label = f"{years[tr].min()}–{years[tr].max()}"
    test_label = f"{years[te].min()}–{years[te].max()}"
    print(f"train {train_label}: {tr.sum()} samples · test {test_label}: {te.sum()} samples")

    model = make_model().fit(X[tr], y[tr])
    p_tr, p_te = model.predict_proba(X[tr])[:, 1], model.predict_proba(X[te])[:, 1]
    rule = np.nan_to_num(m["ratio"][te], nan=0.0)
    figs = []

    def add(name, title, text):
        figs.append({"file": f"{name}.png", "title": title, "text": text})

    # 1. dataset ---------------------------------------------------------------------------
    ys = np.arange(years.min(), years.max() + 1)
    pos = np.array([((years == v) & (y == 1)).sum() for v in ys])
    neg = np.array([((years == v) & (y == 0)).sum() for v in ys])
    fig, ax = plt.subplots(figsize=(6.6, 3.6))
    ax.bar(ys, neg, color=GREY, label="Non-landslide days")
    ax.bar(ys, pos, bottom=neg, color=RED, label="Landslide days")
    ax.axvline(TRAIN_LAST_YEAR + 0.5, color="#013126", ls="--", lw=1)
    top = (pos + neg).max()
    ax.text(TRAIN_LAST_YEAR + 0.3, top * 1.02, "← training", ha="right", fontsize=9)
    ax.text(TRAIN_LAST_YEAR + 0.7, top * 1.02, "test →", ha="left", fontsize=9)
    ax.set(title="Dataset: samples per year", xlabel="Year", ylabel="Samples", ylim=(0, top * 1.12))
    ax.set_xticks(ys[::2], [str(v) for v in ys[::2]])
    ax.legend(loc="upper left")
    save(fig, "01_dataset")
    add("01_dataset", "Dataset and train/test split",
        f"{len(y):,} samples: {int(y.sum()):,} real landslide days and {int((y == 0).sum()):,} non-landslide days "
        f"(the same places on other days, and other places on the same day). Training {train_label} "
        f"({tr.sum():,} samples), test {test_label} ({te.sum():,} samples, never seen in training).")

    # 2. training curve --------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(6.6, 3.6))
    for i, cc in enumerate(model.calibrated_classifiers_):
        est = cc.estimator
        t_loss, v_loss = np.abs(est.train_score_), np.abs(est.validation_score_)
        ax.plot(t_loss, color=BLUE, lw=1.2, alpha=0.75, label="Training loss" if i == 0 else None)
        ax.plot(v_loss, color=ORANGE, lw=1.2, alpha=0.85, label="Validation loss" if i == 0 else None)
        ax.plot(len(v_loss) - 1, v_loss[-1], "o", color=ORANGE, ms=4)
    ax.set(title="Training curve (log-loss per boosting round)", xlabel="Boosting round (trees added)",
           ylabel="Log-loss (lower is better)")
    ax.legend()
    save(fig, "02_training_curve")
    add("02_training_curve", "Training vs validation loss",
        "One blue/orange pair per internal fold (5 folds). Training stops automatically (early stopping, dot) "
        "when the validation loss stops improving, which prevents over-fitting.")

    # 3. train vs test metrics ---------------------------------------------------------------
    m_tr, m_te, m_rule = metrics(y_tr, p_tr, CUT), metrics(y_te, p_te, CUT), metrics(y_te, rule, RULE_CUT)
    names = ["accuracy", "precision", "recall", "f1", "roc_auc"]
    labels = ["Accuracy", "Precision", "Recall", "F1 score", "ROC-AUC"]
    x = np.arange(len(names))
    w = 0.27
    fig, ax = plt.subplots(figsize=(7.2, 3.8))
    for k, (vals, col, lab) in enumerate([(m_tr, BLUE, f"Model, training {train_label}"),
                                          (m_te, GREEN, f"Model, test {test_label}"),
                                          (m_rule, GREY, "Threshold rule, test")]):
        bars = ax.bar(x + (k - 1) * w, [vals[n] for n in names], w, color=col, label=lab)
        ax.bar_label(bars, fmt="%.2f", fontsize=7.5, padding=1)
    majority = 1 - y_te.mean()
    ax.axhline(majority, color=RED, ls=":", lw=1.2, label=f"Accuracy of always saying 'no landslide' ({majority:.2f})")
    ax.set_xticks(x, labels)
    ax.set(title=f"Training vs test scores (alarm at {int(CUT * 100)}% confidence)", ylim=(0, 1.08), ylabel="Score")
    ax.legend(loc="upper center", bbox_to_anchor=(0.5, -0.1), ncol=2, fontsize=8)
    save(fig, "03_train_vs_test")
    add("03_train_vs_test", "Accuracy, precision, recall, F1 and ROC-AUC: training vs test",
        f"Test accuracy {m_te['accuracy']:.1%} vs training {m_tr['accuracy']:.1%}; the small gap means the model "
        f"generalises to years it never saw. Red line: a useless model that always says 'no landslide' would "
        f"already score {majority:.0%} accuracy, so recall and ROC-AUC matter more than accuracy here. "
        f"Recall is lower on training because landslides are {y_tr.mean():.0%} of training samples vs "
        f"{y_te.mean():.0%} of test samples.")

    # 4. confusion matrices ----------------------------------------------------------------
    fig, axes = plt.subplots(1, 2, figsize=(7.6, 3.5))
    for ax, score, cut, title in [(axes[0], p_te, CUT, f"Model (alarm at {int(CUT * 100)}%)"),
                                  (axes[1], rule, RULE_CUT, "Threshold rule (alarm at 1×)")]:
        cm = confusion_matrix(y_te, (score >= cut).astype(int), labels=[0, 1])
        pct = cm / cm.sum(axis=1, keepdims=True)
        ax.imshow(pct, cmap=TEAL_CMAP, vmin=0, vmax=1)
        ax.grid(False)
        for i in range(2):
            for j in range(2):
                ax.text(j, i, f"{cm[i, j]}\n{pct[i, j]:.0%}", ha="center", va="center", fontsize=10,
                        color="white" if pct[i, j] > 0.6 else "#013126", fontweight="bold")
        ax.set_xticks([0, 1], ["No alarm", "Alarm"])
        ax.set_yticks([0, 1], CLASSES)
        ax.set(title=title, xlabel="Predicted", ylabel="Actual")
    fig.suptitle(f"Confusion matrix on the test set ({test_label})", fontweight="bold")
    save(fig, "04_confusion_matrix")
    cm = confusion_matrix(y_te, (p_te >= CUT).astype(int), labels=[0, 1])
    add("04_confusion_matrix", "Confusion matrix (test set)",
        f"Model at {int(CUT * 100)}%: {cm[1, 1]} landslides caught, {cm[1, 0]} missed, {cm[0, 1]} false alarms, "
        f"{cm[0, 0]} correct 'no alarm'. Percentages are per actual class (row).")

    # 5. ROC ----------------------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(4.8, 4.2))
    for score, col, lab in [(p_te, GREEN, "Model"), (rule, GREY, "Threshold rule")]:
        fpr, tpr, _ = roc_curve(y_te, score)
        ax.plot(fpr, tpr, color=col, lw=2, label=f"{lab} (AUC {roc_auc_score(y_te, score):.3f})")
    ax.plot([0, 1], [0, 1], ls="--", color="#013126", lw=0.8, label="Random guess (AUC 0.5)")
    cm_rate = ((p_te >= CUT) & (y_te == 0)).sum() / (y_te == 0).sum(), ((p_te >= CUT) & (y_te == 1)).sum() / (y_te == 1).sum()
    ax.plot(*cm_rate, "o", color=RED, ms=6, label=f"Alarm at {int(CUT * 100)}%")
    ax.set(title="ROC curve (test set)", xlabel="False alarm rate", ylabel="Landslides caught (recall)",
           xlim=(0, 1), ylim=(0, 1.01))
    ax.legend(loc="lower right", fontsize=8)
    save(fig, "05_roc_curve")
    add("05_roc_curve", "ROC curve",
        "How many landslides are caught (up) for each false-alarm rate (right) as the alarm level is moved. "
        "Closer to the top-left corner is better; the area under the curve (AUC) summarises it.")

    # 6. precision-recall -----------------------------------------------------------------------
    fig, ax = plt.subplots(figsize=(4.8, 4.2))
    for score, col, lab in [(p_te, GREEN, "Model"), (rule, GREY, "Threshold rule")]:
        prec, rec, _ = precision_recall_curve(y_te, score)
        ax.plot(rec, prec, color=col, lw=2, label=f"{lab} (AP {average_precision_score(y_te, score):.3f})")
    ax.axhline(y_te.mean(), ls="--", color="#013126", lw=0.8, label=f"Random guess ({y_te.mean():.2f})")
    ax.set(title="Precision–recall curve (test set)", xlabel="Recall (landslides caught)",
           ylabel="Precision (alarms that were real)", xlim=(0, 1), ylim=(0, 1.02))
    ax.legend(loc="lower left", fontsize=8)
    save(fig, "06_precision_recall")
    add("06_precision_recall", "Precision–recall curve",
        "For rare events this is stricter than ROC: it shows what share of alarms were real landslides "
        "at each level of recall.")

    # 7. calibration ------------------------------------------------------------------------------
    frac, mean_p = calibration_curve(y_te, p_te, n_bins=10, strategy="quantile")
    fig, axes = plt.subplots(1, 2, figsize=(8.2, 3.6))
    axes[0].plot([0, 1], [0, 1], ls="--", color="#013126", lw=0.8, label="Perfect calibration")
    axes[0].plot(mean_p, frac, "o-", color=GREEN, lw=2, label="Model")
    axes[0].set(title="Calibration (reliability)", xlabel="Predicted confidence", ylabel="Actual landslide share",
                xlim=(0, 1), ylim=(0, 1))
    axes[0].legend(loc="upper left", fontsize=8)
    bins = np.linspace(0, 1, 21)
    axes[1].hist(p_te[y_te == 0], bins=bins, color=GREY, alpha=0.8, label="No landslide")
    axes[1].hist(p_te[y_te == 1], bins=bins, color=RED, alpha=0.7, label="Landslide")
    axes[1].set(title="Confidence given to each class", xlabel="Predicted confidence", ylabel="Test samples")
    axes[1].legend(fontsize=8)
    save(fig, "07_calibration")
    add("07_calibration", "Calibration and confidence distribution",
        "Left: dots on the dashed line mean the confidence can be read as a probability. "
        + (f"Above the line at the high end (it said {mean_p[-1]:.0%}, {frac[-1]:.0%} were landslides): on the test "
           f"years the model is cautious, not over-confident, partly because landslides are a larger share of the "
           f"test samples ({y_te.mean():.0%}) than of the training samples ({y_tr.mean():.0%}). "
           if frac[-1] > mean_p[-1] + 0.1 else "")
        + "Right: real landslide days (red) get high confidence, other days (grey) mostly low.")

    # 8. feature importance (single inputs from the model card + whole groups shuffled together) --------
    from matplotlib.patches import Patch
    card = json.loads(CARD_PATH.read_text(encoding="utf-8")) if CARD_PATH.exists() else {}
    imp = card.get("evaluation", {}).get("feature_importance_test_auc_drop") or {}
    group_of = {f: g for g, fs in GROUPS.items() for f in fs}
    base_auc = roc_auc_score(y_te, p_te)
    rng_g = np.random.default_rng(0)
    group_drop = {}
    for g, fs in GROUPS.items():
        cols = [F.FEATURES.index(f) for f in fs]
        drops = []
        for _ in range(10):
            Xs = X[te].copy()
            perm = rng_g.permutation(len(Xs))
            Xs[:, cols] = Xs[perm][:, cols]
            drops.append(base_auc - roc_auc_score(y_te, model.predict_proba(Xs)[:, 1]))
        group_drop[g] = float(np.mean(drops))
    fig, axes = plt.subplots(1, 2, figsize=(9.6, 4.8), gridspec_kw={"width_ratios": [1, 1.5]})
    gi = sorted(group_drop.items(), key=lambda kv: kv[1])
    bars = axes[0].barh([g for g, _ in gi], [v for _, v in gi], color=[GROUP_COLOR[g] for g, _ in gi])
    axes[0].bar_label(bars, fmt="%.3f", fontsize=8, padding=2)
    axes[0].set(title="By group", xlabel="Drop in test ROC-AUC")
    axes[0].set_xlim(0, max(group_drop.values()) * 1.25)
    if imp:
        items = sorted(imp.items(), key=lambda kv: kv[1])
        axes[1].barh([F.LABELS.get(f, f) for f, _ in items], [max(v, 0) for _, v in items],
                     color=[GROUP_COLOR.get(group_of.get(f), GREY) for f, _ in items])
        axes[1].set(title="Single inputs", xlabel="Drop in test ROC-AUC")
        axes[1].tick_params(axis="y", labelsize=8)
    axes[1].legend(handles=[Patch(color=c, label=g) for g, c in GROUP_COLOR.items()], loc="lower right", fontsize=8)
    fig.suptitle("Feature importance (test set, permutation)", fontweight="bold")
    save(fig, "08_feature_importance")
    add("08_feature_importance", "Feature importance",
        "How much the test ROC-AUC falls when inputs are randomly shuffled. Left: whole groups shuffled together "
        "(the fair comparison). Right: one input at a time; single rain windows look small because the other "
        "nine rain windows carry almost the same information.")

    # 9. metrics vs alarm level -----------------------------------------------------------------
    cuts = np.linspace(0.05, 0.95, 37)
    rows = [metrics(y_te, p_te, c) for c in cuts]
    far = [((p_te >= c) & (y_te == 0)).sum() / (y_te == 0).sum() for c in cuts]
    fig, ax = plt.subplots(figsize=(6.6, 3.6))
    for key, col, lab in [("accuracy", BLUE, "Accuracy"), ("precision", GREEN, "Precision"),
                          ("recall", RED, "Recall"), ("f1", GOLD, "F1 score")]:
        ax.plot(cuts, [r[key] for r in rows], color=col, lw=2, label=lab)
    ax.plot(cuts, far, color=GREY, lw=1.5, ls="--", label="False alarm rate")
    ax.axvline(CUT, color="#013126", lw=0.8, ls=":")
    ax.set(title="Scores at each alarm level (test set)", xlabel="Alarm when confidence ≥", ylabel="Score",
           xlim=(0, 1), ylim=(0, 1.02))
    ax.legend(ncol=5, fontsize=8, loc="upper center", bbox_to_anchor=(0.5, -0.18))
    save(fig, "09_threshold_tradeoff")
    best = cuts[int(np.argmax([r["f1"] for r in rows]))]
    add("09_threshold_tradeoff", "Choosing the alarm level",
        f"A lower alarm level catches more landslides (recall) but raises more false alarms. "
        f"The best F1 score on the test set is at about {best:.0%}.")

    # 10. learning curve ------------------------------------------------------------------------
    rng = np.random.default_rng(0)
    idx_tr = np.flatnonzero(tr)
    sizes, auc_tr, auc_te = [], [], []
    for frac_ in (0.2, 0.4, 0.6, 0.8, 1.0):
        sub = idx_tr if frac_ == 1.0 else rng.choice(idx_tr, int(len(idx_tr) * frac_), replace=False)
        mm = make_model().fit(X[sub], y[sub])
        sizes.append(len(sub))
        auc_tr.append(roc_auc_score(y[sub], mm.predict_proba(X[sub])[:, 1]))
        auc_te.append(roc_auc_score(y_te, mm.predict_proba(X[te])[:, 1]))
    fig, ax = plt.subplots(figsize=(6.6, 3.6))
    ax.plot(sizes, auc_tr, "o-", color=BLUE, lw=2, label="Training ROC-AUC")
    ax.plot(sizes, auc_te, "o-", color=GREEN, lw=2, label="Test ROC-AUC")
    ax.set(title="Learning curve", xlabel="Training samples used", ylabel="ROC-AUC", ylim=(0.7, 1.0))
    ax.legend(loc="lower right")
    save(fig, "10_learning_curve")
    add("10_learning_curve", "Learning curve",
        f"With more training data the training score falls ({auc_tr[0]:.3f} → {auc_tr[-1]:.3f}) and the test score "
        f"{'rises' if auc_te[-1] - auc_te[0] > 0.02 else 'stays about the same'} ({auc_te[0]:.3f} → {auc_te[-1]:.3f}): "
        "the gap between them narrows, i.e. less over-fitting. "
        + ("It is still rising, so more dated landslide records should help."
           if auc_te[-1] - auc_te[0] > 0.02 else
           "Better (more precisely dated and located) records would help more than simply more of the same."))

    # 11. spatial test: whole states held out ---------------------------------------------------
    fold_auc, fold_lab = [], []
    for k, (a, b) in enumerate(GroupKFold(n_splits=5).split(X, y, groups=m["state"])):
        if len(set(y[b])) < 2:
            continue
        mm = make_model().fit(X[a], y[a])
        fold_auc.append(roc_auc_score(y[b], mm.predict_proba(X[b])[:, 1]))
        states = sorted(set(m["state"][b]), key=lambda s: -(m["state"][b] == s).sum())
        fold_lab.append(f"Fold {k + 1}\n" + "\n".join(s[:16] for s in states[:3]) + ("\n…" if len(states) > 3 else ""))
    fig, ax = plt.subplots(figsize=(6.6, 3.8))
    bars = ax.bar(fold_lab, fold_auc, color=GREEN)
    ax.bar_label(bars, fmt="%.3f", fontsize=8)
    ax.axhline(np.mean(fold_auc), color=RED, ls="--", lw=1, label=f"Mean {np.mean(fold_auc):.3f}")
    ax.set(title="Spatial test: whole states held out", ylabel="ROC-AUC on unseen states", ylim=(0.5, 1.0))
    ax.tick_params(axis="x", labelsize=7)
    ax.legend(loc="lower right")
    save(fig, "11_state_holdout")
    add("11_state_holdout", "Spatial test (unseen states)",
        "Each bar: the model is trained without these states and tested on them, to check it works "
        "in places it has never seen.")

    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "train_years": train_label, "test_years": test_label,
        "train_samples": int(tr.sum()), "test_samples": int(te.sum()),
        "alarm_at": CUT,
        "metrics": {k: {n: round(float(v), 3) for n, v in d.items()} for k, d in
                    [("train", m_tr), ("test", m_te), ("threshold_rule_test", m_rule)]},
        "majority_class_accuracy_test": round(float(majority), 3),
        "figures": figs,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {len(figs)} figures to {OUT}")
    print(json.dumps(manifest["metrics"], indent=1))


if __name__ == "__main__":
    main()
