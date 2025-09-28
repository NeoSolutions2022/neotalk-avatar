# Pose Animator alignment study and roadmap

## 1. What the Pose Animator reference implementation does
- The official project builds a full bone hierarchy from PoseNet and FaceMesh keypoints, then drives each SVG segment from the bones' blended transforms. Each path segment stores the bones that influence it along with weighting, and every animation frame recomputes positions before redrawing the shape.
- Face features (brows, eyelids, nose, lips) receive additional "secondary bones" so that smaller facial curves inherit motion from their parent bones while preserving local offsets around the jaw and nose. This is why the reference avatar keeps the original face artwork and simply warps it according to the live mesh.
- Limbs and torso bones reuse the same rig metadata: for example, both left and right arms are defined by shoulder–elbow and elbow–wrist bones and share the same update path. No conditional logic hides one side—the code relies on symmetric bone lookup to keep the puppet aligned.

## 2. How the current prototype differs
- Our `teste/index.html` drives the avatar through manually crafted similarity transforms. Arms are rotated with `rotatePuppetSegment`, body and head use transform matrices derived from debug polylines, and facial features are regenerated from the cloned templates each frame.
- Right now the right arm relies on IDs such as `rightUpperArm` / `rightLowerArm`, but readiness depends on successfully grabbing both nodes at load time. If a lookup fails the code falls back to debug-only rendering, which is why the limb appears duplicated or static in prior runs.
- The face anchor is computed from the jaw contour midpoint and then nudged by `FACE_ANCHOR_ADJUST`. Because we do not yet replicate the bone weighting, small offsets produce visible gaps between the head contour and the facial clones.

## 3. Roadmap to meet the acceptance criteria
1. **Recreate the symmetric arm pipeline**
   - Introduce a shared `ensurePuppetArm(side)` helper that verifies both the upper and lower nodes exist, normalizes their transform origins, and records their base vectors during initialization. Mirroring Pose Animator's symmetric bone setup removes left/right divergence and keeps the real arm meshes attached.
   - During `tick`, reuse a single `applyArmRig(side, rig)` path that reads the cached bases, computes similarity transforms for both segments, and applies them regardless of debug visibility. This mirrors the bone update loop and guarantees both arms follow the keypoints.

2. **Stabilize the torso and neck anchor**
   - Cache the puppet torso quad (shoulders and hips) on load so the runtime transform can be re-based just like Pose Animator re-normalizes the torso bones before skinning. After computing the similarity matrix, explicitly realign the shoulders' midpoint to the live rig midpoint to stop the neck from "popping" up.
   - Store the resulting neck anchor and feed it to the head transform before updating the face. This keeps the entire head—including the cloned facial features—locked to the body motion.

3. **Lower and lock the face to the contour**
   - Measure the vertical offset between the jaw anchor and the facial templates inside `boy.svg`, and update `FACE_ANCHOR_ADJUST` so the neutral pose places the features slightly lower (matching the original artwork). Because the reference solution warps existing artwork rather than recreating curves, keeping the templates aligned avoids drift.
   - Extend `updateFaceGuides` so every handler receives the final head matrix and can apply a local corrective transform derived from the cached fallback positions. This emulates the secondary bones used in Pose Animator and ensures eyes, brows, and mouth stay synchronized with the debug polylines while remaining visually identical to the SVG face.

4. **Cross-validate against debug polylines**
   - After implementing the above, add a lightweight validation step that overlays the transformed puppet segments with the debug lines during development. If the live mesh drifts beyond a tolerance, log a warning—mirroring how the reference rigging debug panel highlights misaligned paths. This will help catch future regressions in arm, body, or face alignment.

Following this checklist keeps the avatar faithful to the original `boy.svg` artwork while mirroring the proven rigging patterns from Pose Animator. Once the symmetric arm handling and anchored face adjustments land, the character should satisfy the requested criteria: fully connected face, synchronized arms, and a torso that tracks the pose frames.
