import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.161/build/three.module.js';
import { OrbitControls } from 'https://cdn.jsdelivr.net/npm/three@0.161/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@0.161/examples/jsm/loaders/FBXLoader.js';

let scene, camera, renderer;
let skeleton, bonesByName = {};
let frames = [];
let frameIndex = 0;

init();
loadPose().then(data => frames = data);

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0xdddddd);

  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 1.5, 3);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  new OrbitControls(camera, renderer.domElement);

  const light = new THREE.HemisphereLight(0xffffff, 0x444444);
  light.position.set(0, 1, 0);
  scene.add(light);

  const loader = new FBXLoader();
  loader.load('avatar.fbx', fbx => {
    fbx.scale.setScalar(0.01);
    scene.add(fbx);
    fbx.traverse(obj => {
      if (obj.isSkinnedMesh) {
        skeleton = obj.skeleton;
        skeleton.bones.forEach(b => bonesByName[b.name] = b);
      }
    });
  });

  window.addEventListener('resize', onWindowResize);
  animate();
}

async function loadPose() {
  const text = await fetch('frame.pose').then(r => r.text());
  const lines = text.trim().split(/\n+/).filter(Boolean).slice(0, 129);
  return lines.map(line => {
    line = line.replace(/np\.float\d+\(([^)]+)\)/g, '$1').replace(/'/g, '"');
    return JSON.parse(line);
  });
}

const BODY_KEYPOINTS_ORDER = ['Nose', 'Neck', 'RShoulder', 'RElbow', 'RWrist', 'LShoulder', 'LElbow', 'LWrist', 'MidHip', 'RHip', 'RKnee', 'RAnkle', 'LHip', 'LKnee', 'LAnkle', 'REye', 'LEye', 'REar', 'LEar', 'LBigToe', 'LSmallToe', 'LHeel', 'RBigToe', 'RSmallToe', 'RHeel'];
const HAND_KEYPOINTS_ORDER = ['Wrist', 'Thumb1', 'Thumb2', 'Thumb3', 'Thumb4', 'Index1', 'Index2', 'Index3', 'Index4', 'Middle1', 'Middle2', 'Middle3', 'Middle4', 'Ring1', 'Ring2', 'Ring3', 'Ring4', 'Pinky1', 'Pinky2', 'Pinky3', 'Pinky4'];
const FACE_KEYPOINTS_ORDER = Array.from({ length: 70 }, (_, i) => `Face_${i}`);

function applyPose(frame) {
  if (!skeleton) return;
  const all = [...frame.body, ...frame.left_hand, ...frame.right_hand, ...frame.face];
  const xs = all.map(p => p[0]);
  const ys = all.map(p => p[1]);
  const cx = (Math.max(...xs) + Math.min(...xs)) / 2;
  const cy = (Math.max(...ys) + Math.min(...ys)) / 2;
  const scale = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const mapPart = (points, order, prefix = '') => {
    points.forEach((p, i) => {
      const name = prefix + order[i];
      const bone = bonesByName[name];
      if (bone) {
        const x = (p[0] - cx) / scale;
        const y = -(p[1] - cy) / scale;
        bone.position.x = x;
        bone.position.y = y;
      }
    });
  };
  mapPart(frame.body, BODY_KEYPOINTS_ORDER);
  mapPart(frame.left_hand, HAND_KEYPOINTS_ORDER, 'Left ');
  mapPart(frame.right_hand, HAND_KEYPOINTS_ORDER, 'Right ');
  mapPart(frame.face, FACE_KEYPOINTS_ORDER);
}

function animate() {
  requestAnimationFrame(animate);
  if (frames.length) {
    applyPose(frames[frameIndex]);
    frameIndex = (frameIndex + 1) % frames.length;
  }
  renderer.render(scene, camera);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
