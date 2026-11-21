# SANKET Module 3: road blockage from a photo

Upload a photo taken on a road and get how much of the road width is blocked, the severity band
and what is blocking it (soil and mud, rocks, fallen trees, flood water, barricades, poles).

## How it works

1. **Scene model:** UPerNet + ConvNeXt-Tiny, a pure CNN (no attention layers) trained
   on **ADE20K**, about 25,000 real photographs labelled pixel by pixel into 150 classes.
   Weights: [`smp-hub/upernet-convnext-tiny`](https://huggingface.co/smp-hub/upernet-convnext-tiny)
   (MIT licence), loaded with `segmentation-models-pytorch`. It is not fine-tuned on disaster photos.
2. **Measurement (`scene_model.py`):** the road corridor is rebuilt from the visible road surface
   (edges interpolated across debris, and extended through soil/rock/water rows); the blocked share
   of the road width is computed row by row and the worst point is reported. Under 10 % = clear.
   If no road is recognised the result says so instead of guessing.

## Validation on real photos

`python -m module3.validate` runs the model on 14 openly licensed Wikimedia Commons photos in
`web/public/module3-samples/` (credits in `validation/photos.json`) and writes
`validation/results.json`, shown in the Road Blockage tab. Current result:

| | |
|---|---|
| Blocked roads detected (≥ 10 % of width) | 7 of 8 |
| Clear roads reported clear | 3 of 4 where a road was recognised |
| No road recognised (declined to answer) | 2 clear-road photos |

Known weak spots: slides that push in from the side of the road (the road edge simply bends
around them) and gravel roads, which can be read as soil.

## Full model setup for local use

```bash
pip install -r requirements.txt -r requirements-road.txt   # CPU-only PyTorch
python -m module3.download_weights       # 237 MB, saved in module3/saved_models/ (git-ignored)
```

On Render Free, the build in the [deployment guide](../DEPLOY.md) exports the same model's
weights as signed 8-bit ONNX weights. It segments photos at a lower input resolution. The API
automatically uses the export when present and the Road Blockage page shows the compact model's
own results. For large uploads, use JPEG. The compact runtime checks one photo at a time.

API: `GET /api/v1/module1/road-blockage/model`, `POST /api/v1/module1/road-blockage`
(multipart field `file`, image up to 10 MB).
