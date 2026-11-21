# SANKET Module 3: road blockage from a photo

Upload a photo taken on a road and get how much of the road width is blocked, the severity band
and what is blocking it (soil and mud, rocks, fallen trees, flood water, barricades, poles).

## How it works

1. **Scene model:** UPerNet + ConvNeXt-Tiny, a pure CNN (no attention layers) trained
   on **ADE20K**, about 25,000 real photographs labelled pixel by pixel into 150 classes.
   Weights: [`smp-hub/upernet-convnext-tiny`](https://huggingface.co/smp-hub/upernet-convnext-tiny)
   (MIT licence), loaded with `segmentation-models-pytorch`. It is not fine-tuned on disaster photos.
2. **Measurement.** The estimator joins fragments of the same visible road and looks for debris
   inside its inferred edges. It estimates blockage across a short stretch using the full width
   in each cross-section. A photo with insufficient evidence for the road width is inconclusive.

## Validation on real photos

`python -m module3.validate` runs the model on 14 openly licensed Wikimedia Commons photos in
`web/public/module3-samples/` (credits in `validation/photos.json`) and writes
`validation/results.json` or `validation/results-onnx.json`. The Road Blockage tab shows the
report for the active runtime.

Sample labels check blocked or clear at an estimated 10% cutoff. Field measurements are needed
to verify the width estimates. Distant roads, sharp bends and gravel surfaces remain difficult.

## Full model setup for local use

```bash
pip install -r requirements.txt -r requirements-road.txt   # CPU-only PyTorch
python -m module3.download_weights       # 237 MB, saved in module3/saved_models/ (git-ignored)
```

On Render Free, the build in the [deployment guide](../DEPLOY.md) exports the same model's
weights as signed 8-bit ONNX weights. Both runtimes use a 320 px input. The API
automatically uses the export when present and the Road Blockage page shows the compact model's
own results. For large uploads, use JPEG. The compact runtime checks one photo at a time.

API: `GET /api/v1/module1/road-blockage/model`, `POST /api/v1/module1/road-blockage`
(multipart field `file`, image up to 10 MB).
