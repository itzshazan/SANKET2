"""Export the existing ADE20K weights to a compact ONNX graph during the Render build."""

from pathlib import Path
from tempfile import TemporaryDirectory

import numpy as np
import onnx
import segmentation_models_pytorch as smp
import torch
from onnx import helper, numpy_helper
from torch import nn

from . import road_onnx
from .ade20k_classes import ADE20K_CLASSES
from .scene_model import MODEL_DIR, weights_present


class FixedAdaptivePool(nn.Module):
    """Export PyTorch's adaptive pooling windows when the output size is not a divisor."""

    def __init__(self, size, bins):
        super().__init__()
        self.windows = [(i * size // bins, ((i + 1) * size + bins - 1) // bins) for i in range(bins)]

    def forward(self, features):
        rows = []
        for top, bottom in self.windows:
            cells = [features[..., top:bottom, left:right].mean(dim=(-2, -1), keepdim=True)
                     for left, right in self.windows]
            rows.append(torch.cat(cells, dim=-1))
        return torch.cat(rows, dim=-2)


class ClassScores(nn.Module):
    def __init__(self, model):
        super().__init__()
        self.model = model
        model.segmentation_head[1] = nn.Identity()
        size = road_onnx.INPUT_SIDE // 32
        for block in model.decoder.psp.blocks:
            bins = block[0].output_size
            if size % bins:
                block[0] = FixedAdaptivePool(size, bins)

    def forward(self, pixels):
        return self.model(pixels)[0]


def quantize_weights(model):
    """Store large convolution and linear weights as per-channel signed 8-bit values."""
    initializers = {tensor.name: tensor for tensor in model.graph.initializer}
    use_count = {}
    for node in model.graph.node:
        for name in node.input:
            use_count[name] = use_count.get(name, 0) + 1

    nodes = []
    for node in model.graph.node:
        if node.op_type in ("Conv", "MatMul"):
            name = node.input[1]
            weight = initializers.get(name)
            if weight is not None and use_count[name] == 1 and weight.data_type == onnx.TensorProto.FLOAT:
                array = numpy_helper.to_array(weight)
                if array.size >= 4096:
                    axis = 0 if node.op_type == "Conv" else array.ndim - 1
                    other_axes = tuple(i for i in range(array.ndim) if i != axis)
                    largest = np.max(np.abs(array), axis=other_axes, keepdims=True)
                    scale = np.maximum(largest / np.float32(127), np.finfo(np.float32).tiny)
                    quantized = np.clip(np.rint(array / scale), -127, 127).astype(np.int8)
                    q_name, s_name = f"{name}_q", f"{name}_scale"
                    model.graph.initializer.remove(weight)
                    model.graph.initializer.extend([
                        numpy_helper.from_array(quantized, q_name),
                        numpy_helper.from_array(scale.reshape(-1), s_name),
                    ])
                    nodes.append(helper.make_node("DequantizeLinear", [q_name, s_name], [name], axis=axis))
        nodes.append(node)
    model.graph.ClearField("node")
    model.graph.node.extend(nodes)


def main():
    if not weights_present():
        raise SystemExit("Run python -m module3.download_weights before exporting ONNX.")

    torch.set_num_threads(2)
    side = road_onnx.INPUT_SIDE
    example = torch.zeros((1, 3, side, side), dtype=torch.float32)
    with TemporaryDirectory(dir=MODEL_DIR) as tmp:
        path = Path(tmp) / "model.onnx"
        model = ClassScores(smp.from_pretrained(str(MODEL_DIR))).eval()
        with torch.no_grad():
            torch.onnx.export(model, (example,), path, opset_version=17, dynamo=False,
                              input_names=["pixels"], output_names=["scores"])
        del model
        graph = onnx.load(path)
        quantize_weights(graph)
        onnx.checker.check_model(graph)
        onnx.save(graph, path)
        del graph
        session = road_onnx.open_session(path)
        scores = session.run(["scores"], {"pixels": example.numpy()})[0]
        del session
        if scores.shape != (len(ADE20K_CLASSES), side // 4, side // 4) or not np.isfinite(scores).all():
            raise RuntimeError("The ONNX export did not return the expected ADE20K class scores.")
        path.replace(road_onnx.MODEL_PATH)
    print(f"Road model ready: {road_onnx.MODEL_PATH.name} ({road_onnx.MODEL_PATH.stat().st_size / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
