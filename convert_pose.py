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

FACE_INDICES = {
    "rightJaw0": 0,
    "rightJaw1": 1,
    "rightJaw2": 2,
    "rightJaw3": 3,
    "rightJaw4": 4,
    "rightJaw5": 5,
    "rightJaw6": 6,
    "rightJaw7": 7,
    "jawMid": 8,
    "leftJaw7": 9,
    "leftJaw6": 10,
    "leftJaw5": 11,
    "leftJaw4": 12,
    "leftJaw3": 13,
    "leftJaw2": 14,
    "leftJaw1": 15,
    "leftJaw0": 16,
    "rightBrow0": 17,
    "rightBrow1": 18,
    "rightBrow2": 19,
    "rightBrow3": 20,
    "rightBrow4": 21,
    "leftBrow0": 22,
    "leftBrow1": 23,
    "leftBrow2": 24,
    "leftBrow3": 25,
    "leftBrow4": 26,
    "nose0": 27,
    "nose1": 28,
    "nose2": 29,
    "nose3": 30,
    "rightNose0": 31,
    "rightNose1": 32,
    "nose4": 33,
    "leftNose1": 34,
    "leftNose0": 35,
    "rightEye0": 36,
    "rightEye1": 37,
    "rightEye2": 38,
    "rightEye3": 39,
    "rightEye4": 40,
    "rightEye5": 41,
    "leftEye0": 42,
    "leftEye1": 43,
    "leftEye2": 44,
    "leftEye3": 45,
    "leftEye4": 46,
    "leftEye5": 47,
    "rightMouthCorner": 48,
    "rightUpperLipTop0": 49,
    "rightUpperLipTop1": 50,
    "upperLipTopMid": 51,
    "leftUpperLipTop1": 52,
    "leftUpperLipTop0": 53,
    "leftMouthCorner": 54,
    "leftLowerLipBottom0": 55,
    "leftLowerLipBottom1": 56,
    "lowerLipBottomMid": 57,
    "rightLowerLipBottom1": 58,
    "rightLowerLipBottom0": 59,
    "rightUpperLipBottom1": 60,
    "upperLipBottomMid": 62,
    "leftUpperLipBottom1": 63,
    "leftLowerLipTop0": 65,
    "lowerLipTopMid": 66,
    "rightLowerLipTop0": 67,
    "rightPupil": 68,
    "leftPupil": 69,
}

HAND_LANDMARK_NAMES = {
    "left_hand": {
        0: ["leftWrist"],
        1: ["leftThumbCMC", "leftThumb0", "leftThumb1"],
        2: ["leftThumbMCP", "leftThumb2"],
        3: ["leftThumbIP", "leftThumb3"],
        4: ["leftThumbTip", "leftThumb4"],
        5: ["leftIndexMCP", "leftIndex0"],
        6: ["leftIndexPIP", "leftIndex1"],
        7: ["leftIndexDIP", "leftIndex2"],
        8: ["leftIndexTip", "leftIndex3"],
        9: ["leftMiddleMCP", "leftMiddle0"],
        10: ["leftMiddlePIP", "leftMiddle1"],
        11: ["leftMiddleDIP", "leftMiddle2"],
        12: ["leftMiddleTip", "leftMiddle3"],
        13: ["leftRingMCP", "leftRing0"],
        14: ["leftRingPIP", "leftRing1"],
        15: ["leftRingDIP", "leftRing2"],
        16: ["leftRingTip", "leftRing3"],
        17: ["leftPinkyMCP", "leftPinky0", "leftLittle0"],
        18: ["leftPinkyPIP", "leftPinky1", "leftLittle1"],
        19: ["leftPinkyDIP", "leftPinky2", "leftLittle2"],
        20: ["leftPinkyTip", "leftPinky3", "leftLittle3"],
    },
    "right_hand": {
        0: ["rightWrist"],
        1: ["rightThumbCMC", "rightThumb0", "rightThumb1"],
        2: ["rightThumbMCP", "rightThumb2"],
        3: ["rightThumbIP", "rightThumb3"],
        4: ["rightThumbTip", "rightThumb4"],
        5: ["rightIndexMCP", "rightIndex0"],
        6: ["rightIndexPIP", "rightIndex1"],
        7: ["rightIndexDIP", "rightIndex2"],
        8: ["rightIndexTip", "rightIndex3"],
        9: ["rightMiddleMCP", "rightMiddle0"],
        10: ["rightMiddlePIP", "rightMiddle1"],
        11: ["rightMiddleDIP", "rightMiddle2"],
        12: ["rightMiddleTip", "rightMiddle3"],
        13: ["rightRingMCP", "rightRing0"],
        14: ["rightRingPIP", "rightRing1"],
        15: ["rightRingDIP", "rightRing2"],
        16: ["rightRingTip", "rightRing3"],
        17: ["rightPinkyMCP", "rightPinky0", "rightLittle0"],
        18: ["rightPinkyPIP", "rightPinky1", "rightLittle1"],
        19: ["rightPinkyDIP", "rightPinky2", "rightLittle2"],
        20: ["rightPinkyTip", "rightPinky3", "rightLittle3"],
    },
}

DEFAULT_EXPORT = {
    "nose": ("body", "nose"),
    "leftShoulder": ("body", "leftShoulder"),
    "rightShoulder": ("body", "rightShoulder"),
    "leftElbow": ("body", "leftElbow"),
    "rightElbow": ("body", "rightElbow"),
    "leftWrist": ("body", "leftWrist"),
    "rightWrist": ("body", "rightWrist"),
    "leftHip": ("body", "leftHip"),
    "rightHip": ("body", "rightHip"),
}

for face_name, index in FACE_INDICES.items():
    DEFAULT_EXPORT[face_name] = ("face", index)

for hand_key, names_map in HAND_LANDMARK_NAMES.items():
    for index, aliases in names_map.items():
        for alias in aliases:
            DEFAULT_EXPORT[alias] = ("hand", (hand_key, int(index)))

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
        help="Subset of keypoint names to export (defaults to body and face debug sets)",
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

    face = frame.get("face") or []
    if face and len(face) < 70:
        raise ValueError(f"Expected at least 70 face points, got {len(face)}")

    body_lookup = {name: idx for idx, name in enumerate(BODY25_NAMES)}
    keypoints: dict[str, dict[str, float]] = {}

    for name in names:
        source = DEFAULT_EXPORT.get(name)
        if source is None:
            raise KeyError(f"No mapping available for keypoint '{name}'")

        kind, ref = source

        if kind == "body":
            idx = body_lookup[ref]
            x, y, *_ = body[idx]
        elif kind == "face":
            if not face:
                # Skip face-only outputs if the source frame lacks data.
                continue
            if isinstance(ref, str):
                idx = FACE_INDICES[ref]
            else:
                idx = int(ref)
            x, y, *_ = face[idx]
        elif kind == "hand":
            hand_key, index = ref
            hand_points = frame.get(hand_key) or []
            if not hand_points:
                continue
            if index >= len(hand_points):
                raise ValueError(
                    f"Expected at least {index + 1} hand points in '{hand_key}', got {len(hand_points)}"
                )
            x, y, *_ = hand_points[index]
        else:
            raise ValueError(f"Unsupported source kind '{kind}' for keypoint '{name}'")

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
