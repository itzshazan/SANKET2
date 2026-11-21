"""Check the road-blockage model on real, openly licensed photos.

Photos: web/public/module3-samples/ (Wikimedia Commons; credits in module3/validation/photos.json).
Expected answer per photo ("blocked" / "clear") comes from the photo's own title and description;
the exact blocked percentage is not known, so this is a pass/fail check:
  * a blocked road passes if the model reports >= 10 % of the width blocked;
  * a clear road passes if the model reports < 10 %;
  * "no road recognised" is counted separately (the model declines to answer).

Writes module3/validation/results.json, which the Road Blockage tab shows.
Run:  python -m module3.validate
"""

import json
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

from . import scene_model

ROOT = Path(__file__).resolve().parent
PHOTOS = ROOT.parent / "web" / "public" / "module3-samples"
MANIFEST = ROOT / "validation" / "photos.json"
RESULTS = ROOT / "validation" / "results.json"


def main():
    photos = json.loads(MANIFEST.read_text(encoding="utf-8"))
    rows = []
    for p in photos:
        r = scene_model.analyze(Image.open(PHOTOS / p["file"]).convert("RGB"))
        pct = r.get("blockage_percentage")
        if r["status"] == "no_road":
            outcome = "no_road"
        elif r["status"] != "ok":
            outcome = "error"
        else:
            said_blocked = pct >= 10.0
            outcome = "pass" if said_blocked == (p["expected"] == "blocked") else "fail"
        rows.append({"file": p["file"], "label": p["label"], "expected": p["expected"], "outcome": outcome,
                     "blockage_percentage": pct, "causes": r.get("obstacle_display_names") or [],
                     "author": p.get("author"), "license": p.get("license"), "source_url": p.get("source_url")})
        print(f"{p['file']:24s} expected {p['expected']:8s} -> {str(pct):>6} {outcome}")

    def count(exp, outcome):
        return sum(1 for r in rows if r["expected"] == exp and r["outcome"] == outcome)

    summary = {
        "blocked_total": sum(1 for r in rows if r["expected"] == "blocked"),
        "blocked_detected": count("blocked", "pass"),
        "blocked_no_road": count("blocked", "no_road"),
        "clear_total": sum(1 for r in rows if r["expected"] == "clear"),
        "clear_correct": count("clear", "pass"),
        "clear_no_road": count("clear", "no_road"),
    }
    out = {"generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "rule": "blocked if >= 10 % of the road width is blocked", "summary": summary, "photos": rows}
    RESULTS.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(json.dumps(summary))


if __name__ == "__main__":
    main()
