#!/usr/bin/env python3
"""Convert legacy .pose frame dumps into pose_frames.json format."""
from __future__ import annotations

import argparse
import ast
import json
import re
from pathlib import Path

BODY25_NAMES = [
    "nose",
    "neck",
    "rightShoulder",
    "rightElbow",
    "rightWrist",
    "leftShoulder",
    "leftElbow",
    "leftWrist",
    "midHip",
    "rightHip",
    "rightKnee",
    "rightAnkle",
    "leftHip",
    "leftKnee",
    "leftAnkle",
    "rightEye",
    "leftEye",
    "rightEar",
    "leftEar",
    "leftBigToe",
    "leftSmallToe",
    "leftHeel",
    "rightBigToe",
    "rightSmallToe",
    "rightHeel",
]

DEFAULT_EXPORT = {
    "nose": "nose",
    "leftShoulder": "leftShoulder",
    "rightShoulder": "rightShoulder",
    "leftElbow": "leftElbow",
    "rightElbow": "rightElbow",
    "leftWrist": "leftWrist",
    "rightWrist": "rightWrist",
    "leftHip": "leftHip",
    "rightHip": "rightHip",
}

FLOAT_PATTERN = re.compile(r"np\.float\d+\(([^)]+)\)")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="Path to the source .pose file")
    parser.add_argument(
        "output",
        type=Path,
        help="Where the pose_frames.json output should be written",
    )
    parser.add_argument(
        "--names",
        nargs="*",
        default=list(DEFAULT_EXPORT.keys()),
        help="Subset of keypoint names to export (defaults to the arm + hips set)",
    )
    return parser.parse_args()


def clean_line(raw: str) -> str:
    """Replace the np.float wrappers so ast.literal_eval can parse the line."""
    return FLOAT_PATTERN.sub(r"\1", raw)


def load_frame(raw: str) -> dict:
    cleaned = clean_line(raw)
    return ast.literal_eval(cleaned)


def to_keypoints(frame: dict, names: list[str]) -> dict | None:
    body = frame.get("body") or []
    if not body:
        return None
    if len(body) != len(BODY25_NAMES):
        raise ValueError(f"Expected {len(BODY25_NAMES)} body points, got {len(body)}")

    lookup = {name: idx for idx, name in enumerate(BODY25_NAMES)}
    keypoints: dict[str, dict[str, float]] = {}

    for name in names:
        source = DEFAULT_EXPORT.get(name, name)
        idx = lookup[source]
        x, y, *_ = body[idx]
        keypoints[name] = {"x": float(x), "y": float(y)}

    return keypoints


def convert(input_path: Path, output_path: Path, names: list[str]) -> None:
    frames: list[dict[str, dict[str, float]]] = []
    skipped = 0

    for line in input_path.read_text().splitlines():
        if not line.strip():
            continue
        frame = load_frame(line)
        keypoints = to_keypoints(frame, names)
        if keypoints is None:
            skipped += 1
            continue
        frames.append({"keypoints": keypoints})

    output_path.write_text(json.dumps(frames, indent=2))
    if skipped:
        print(f"Skipped {skipped} frame(s) without body keypoints.")


if __name__ == "__main__":
    args = parse_args()
    convert(args.input, args.output, args.names)
