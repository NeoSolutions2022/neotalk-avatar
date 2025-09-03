import * as THREE from 'three';
import { OrbitControls } from 'three/examples/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/loaders/FBXLoader.js';

const scene = new THREE.Scene();
scene.add(new THREE.AmbientLight(0xffffff, 0.3));
const grid = new THREE.GridHelper(4, 40, 0x444444, 0x222222);
grid.rotation.x = -Math.PI / 2;
scene.add(grid);

const camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 1.7, 3);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let mesh = null;
let skeleton = null;
let frames = [];
let frame = 0;
let playing = false;
let last = 0;
let interval = 1000 / 30;

const info = document.getElementById('info');
const playBtn = document.getElementById('playBtn');
const stepBtn = document.getElementById('stepBtn');

playBtn.onclick = () => (playing = !playing);
stepBtn.onclick = () => {
  playing = false;
  advance();
};

// Ordem completa dos keypoints conforme gerador de .pose
const BODY_KEYPOINTS_ORDER = [
  'Nose','Neck','RShoulder','RElbow','RWrist','LShoulder','LElbow','LWrist','MidHip','RHip',
  'RKnee','RAnkle','LHip','LKnee','LAnkle','REye','LEye','REar','LEar','LBigToe',
  'LSmallToe','LHeel','RBigToe','RSmallToe','RHeel'
];
const HAND_KEYPOINTS_ORDER = [
  'Wrist',
  'Thumb1','Thumb2','Thumb3','Thumb4',
  'Index1','Index2','Index3','Index4',
  'Middle1','Middle2','Middle3','Middle4',
  'Ring1','Ring2','Ring3','Ring4',
  'Pinky1','Pinky2','Pinky3','Pinky4'
];
const FACE_KEYPOINTS_ORDER = Array.from({ length: 70 }, (_, i) => `Face_${i}`);

// Subconjunto utilizado para animar o rig
const BODY = ['Nose','Neck','RShoulder','RElbow','RWrist','LShoulder','LElbow','LWrist','MidHip','RHip','RKnee','RAnkle','LHip','LKnee','LAnkle'];
const child = {Neck:'Nose', RShoulder:'RElbow', RElbow:'RWrist', LShoulder:'LElbow', LElbow:'LWrist', RHip:'RKnee', RKnee:'RAnkle', LHip:'LKnee', LKnee:'LAnkle'};
const MAP = {
  Neck:['CC_Base_NeckTwist01','neck'],
  RShoulder:['CC_Base_R_Upperarm','upperarm_r','shoulder_r'],
  RElbow:['CC_Base_R_Forearm','forearm_r','elbow_r'],
  RWrist:['CC_Base_R_Hand','hand_r','wrist_r'],
  LShoulder:['CC_Base_L_Upperarm','upperarm_l','shoulder_l'],
  LElbow:['CC_Base_L_Forearm','forearm_l','elbow_l'],
  LWrist:['CC_Base_L_Hand','hand_l','wrist_l'],
  RHip:['CC_Base_R_Thigh','thigh_r','hip_r'],
  RKnee:['CC_Base_R_Calf','calf_r','knee_r'],
  RAnkle:['CC_Base_R_Foot','foot_r','ankle_r'],
  LHip:['CC_Base_L_Thigh','thigh_l','hip_l'],
  LKnee:['CC_Base_L_Calf','calf_l','knee_l'],
  LAnkle:['CC_Base_L_Foot','foot_l','ankle_l']
};

let GLOBAL_SCALE = 1;
let MOTION_GAIN = 4;

function toVec3(p) {
  return new THREE.Vector3((p[0] - 0.5), (0.5 - p[1]), 0).multiplyScalar(GLOBAL_SCALE * MOTION_GAIN);
}

function rotBone(bone, a, b) {
  if (!bone) return;
  const rest = bone.userData.restDir;
  if (!rest) return;
  const target = new THREE.Vector3().subVectors(b, a).normalize();
  if (!target.lengthSq()) return;
  const q = new THREE.Quaternion().setFromUnitVectors(rest, target);
  bone.quaternion.copy(bone.userData.restQuat).premultiply(q);
}

function applyFrame(f) {
  if (!skeleton) return;
  const pts = f.body;
  for (const [name, boneName] of Object.entries(MAP)) {
    const i = BODY.indexOf(name);
    const j = BODY.indexOf(child[name]);
    if (i === -1 || j === -1) continue;
    const a = pts[i];
    const b = pts[j];
    if (!a || !b) continue;
    const bone = skeleton.getBoneByName(boneName);
    if (!bone) continue;
    const a3 = toVec3(a);
    const b3 = toVec3(b);
    rotBone(bone, a3, b3);
  }
}

function advance() {
  if (!frames.length) return;
  applyFrame(frames[frame]);
  frame = (frame + 1) % frames.length;
}

function loop(t) {
  requestAnimationFrame(loop);
  if (playing && t - last > interval) {
    last = t;
    advance();
  }
  if (skeleton) skeleton.update();
  renderer.render(scene, camera);
}
loop(0);

function parsePose(text) {
  // Remove wrappers tipo np.float64()
  text = text.replace(/np\.float(?:64|32)\(([^)]+)\)/g, '$1');
  // Formato novo com seções "# Frame: N - Body keypoints"
  if (text.includes('# Frame')) {
    const lines = text.split(/\r?\n/);
    const frames = [];
    let current = null;
    let section = null;
    let currentIdx = -1;
    for (const line of lines) {
      const l = line.trim();
      if (!l) continue;
      const header = l.match(/^# Frame:\s*(\d+)\s*-\s*(.+) keypoints/i);
      if (header) {
        const idx = +header[1];
        const part = header[2].toLowerCase();
        if (idx !== currentIdx) {
          if (current) frames.push(current);
          current = {
            body: Array(BODY_KEYPOINTS_ORDER.length).fill(null),
            left_hand: Array(HAND_KEYPOINTS_ORDER.length).fill(null),
            right_hand: Array(HAND_KEYPOINTS_ORDER.length).fill(null),
            face: Array(FACE_KEYPOINTS_ORDER.length).fill(null),
          };
          currentIdx = idx;
        }
        if (part.startsWith('body')) section = 'body';
        else if (part.startsWith('left hand')) section = 'left_hand';
        else if (part.startsWith('right hand')) section = 'right_hand';
        else if (part.startsWith('face')) section = 'face';
        else section = null;
        continue;
      }
      if (!current || !section) continue;
      const m = l.match(/^([^:]+):\s*([\d.eE+-]+)\s+([\d.eE+-]+)\s+([\d.eE+-]+)/);
      if (!m) continue;
      let name = m[1].trim();
      const x = parseFloat(m[2]);
      const y = parseFloat(m[3]);
      const c = parseFloat(m[4]);
      let order;
      if (section === 'body') {
        order = BODY_KEYPOINTS_ORDER;
      } else if (section === 'left_hand') {
        order = HAND_KEYPOINTS_ORDER;
        name = name.replace(/^Left\s+/, '');
      } else if (section === 'right_hand') {
        order = HAND_KEYPOINTS_ORDER;
        name = name.replace(/^Right\s+/, '');
      } else {
        order = FACE_KEYPOINTS_ORDER;
      }
      const idx = order.indexOf(name);
      if (idx !== -1) current[section][idx] = [x, y, c];
    }
    if (current) frames.push(current);
    return frames;
  }
  // Formato antigo: dicionários Python concatenados "}{" sem vírgulas
  if (text.includes('}{')) {
    try {
      const json = '[' + text.replace(/}\s*{/g, '},{') + ']';
      return JSON.parse(json.replace(/'/g, '"'));
    } catch (e) {
      console.error('parsePose(): concat parse fail', e);
    }
  }
  // Fallback: JSON-L (um frame por linha)
  try {
    return text
      .replace(/'/g, '"')
      .split(/\n+/)
      .map(l => l.trim())
      .filter(Boolean)
      .map(JSON.parse);
  } catch (e) {
    console.error('parsePose(): JSON-L parse fail', e);
    return [];
  }
}

function normalizeFrames(frames) {
  const W = 1280, H = 720;
  frames.forEach(f => {
    Object.values(f).forEach(group => {
      group.forEach(p => {
        if (!p) return;
        if (p[0] > 1 || p[1] > 1) {
          p[0] /= W;
          p[1] /= H;
        }
      });
    });
  });
}

function loadPoseFromText(text) {
  frames = parsePose(text);
  normalizeFrames(frames);
  frame = 0;
  console.log('Frames:', frames.length);
}

function setupSkeleton(sk) {
  skeleton = sk;
  skeleton.bones.forEach(bone => {
    let dir;
    if (bone.children.length) {
      const childPos = new THREE.Vector3().setFromMatrixPosition(bone.children[0].matrixWorld);
      const bonePos = new THREE.Vector3().setFromMatrixPosition(bone.matrixWorld);
      dir = childPos.sub(bonePos).normalize();
    } else {
      dir = new THREE.Vector3().setFromMatrixColumn(bone.matrixWorld, 2).normalize();
    }
    bone.userData.restDir = dir.clone();
    bone.userData.restQuat = bone.quaternion.clone();
  });
  Object.keys(MAP).forEach(k => {
    const val = MAP[k];
    if (Array.isArray(val)) {
      MAP[k] = val.find(n => skeleton.getBoneByName(n)) || val[0];
    }
  });
  info.textContent = skeleton.bones.map(b => b.name).join('\n');
}

function loadAvatar(src) {
  const loader = new FBXLoader();
  loader.load(src, fbx => {
    mesh = fbx;
    scene.add(mesh);
    const bbox = new THREE.Box3().setFromObject(mesh);
    const center = bbox.getCenter(new THREE.Vector3());
    mesh.position.sub(center);
    const size = bbox.getSize(new THREE.Vector3());
    if (size.y < size.z) {
      mesh.rotation.x = -Math.PI / 2;
    }
    bbox.setFromObject(mesh);
    mesh.position.y -= bbox.min.y;
    const sphere = bbox.getBoundingSphere(new THREE.Sphere());
    const radius = sphere.radius;
    camera.position.set(0, radius * 0.6, radius * 2);
    camera.near = radius * 0.01;
    camera.far = radius * 4;
    camera.updateProjectionMatrix();
    controls.target.copy(sphere.center).setY(radius * 0.6);
    controls.update();
    GLOBAL_SCALE = radius * 0.8;
    let sk = null;
    mesh.traverse(obj => {
      if (obj.isSkinnedMesh && !sk) sk = obj.skeleton;
    });
    if (sk) setupSkeleton(sk);
  });
}

// default files
fetch('frame.pose').then(r => r.text()).then(loadPoseFromText);
loadAvatar('avatar.fbx');

fbxInput.onchange = e => {
  if (!e.target.files[0]) return;
  loadAvatar(URL.createObjectURL(e.target.files[0]));
};
poseInput.onchange = e => {
  if (!e.target.files[0]) return;
  const reader = new FileReader();
  reader.onload = ev => loadPoseFromText(ev.target.result);
  reader.readAsText(e.target.files[0]);
};
