"""Download the pretrained scene-segmentation weights (about 237 MB, MIT licence).

Run:  python -m module3.download_weights
"""

from huggingface_hub import snapshot_download

from .scene_model import HF_REPO, MODEL_DIR


def main():
    path = snapshot_download(
        HF_REPO,
        revision="e1fb07fc2dadc8bab9bba593ad55ddea37b2017b",
        local_dir=str(MODEL_DIR),
        allow_patterns=["model.safetensors", "config.json", "README.md"],
    )
    print("weights in", path)


if __name__ == "__main__":
    main()
