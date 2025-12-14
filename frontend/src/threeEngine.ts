// src/threeEngine.ts
import * as THREE from "three";

// ===== 전역 상태 =====
let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;

let rootGroup: THREE.Group;
let objectsToAnimate: {
  mesh: THREE.Mesh;
  orbit: THREE.Object3D;
}[] = [];

const textureLoader = new THREE.TextureLoader();

// ===============================
// 초기화
// ===============================
export function initThreeEngine(container: HTMLDivElement) {
  const width = container.clientWidth;
  const height = container.clientHeight;

  // Scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);

  // Camera
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 3000);
  camera.position.set(0, 30, 80);

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  container.innerHTML = "";
  container.appendChild(renderer.domElement);

  // Light 구성
  const sunLight = new THREE.PointLight(0xffffff, 1.8, 0);
  sunLight.position.set(0, 0, 0);
  scene.add(sunLight);

  const ambient = new THREE.AmbientLight(0xffffff, 0.3);
  scene.add(ambient);

  // Root Group
  rootGroup = new THREE.Group();
  scene.add(rootGroup);

  animate();
}

// ===============================
// 리사이즈
// ===============================
export function resizeRenderer() {
  if (!renderer || !camera) return;

  const parent = renderer.domElement.parentElement;
  if (!parent) return;

  const width = parent.clientWidth;
  const height = parent.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

// ===============================
// 애니메이션 루프
// ===============================
function animate() {
  requestAnimationFrame(animate);

  for (const obj of objectsToAnimate) {
    if (obj.orbit.userData.orbitSpeed) {
      obj.orbit.rotation.y += obj.orbit.userData.orbitSpeed;
    }
    if (obj.mesh.userData.rotationSpeed) {
      obj.mesh.rotation.y += obj.mesh.userData.rotationSpeed;
    }
  }

  renderer.render(scene, camera);
}

// ===============================
// SceneGraph 로딩
// ===============================
export function loadSceneFromGraph(graph: any) {
  clearScene();

  if (!graph?.objects) return;

  const registry: Record<
    string,
    { mesh: THREE.Mesh; orbit: THREE.Object3D }
  > = {};

  // 1. 모든 객체 생성
  graph.objects.forEach((obj: any) => {
    registry[obj.name] = createObject(obj);
  });

  // 2. 계층 구조 연결
  graph.objects.forEach((obj: any) => {
    const entry = registry[obj.name];
    if (!entry) return;

    const parentName = obj.orbit?.target;
    const parent =
      (parentName && registry[parentName]?.mesh) ?? rootGroup;

    if (entry.orbit.parent) {
      entry.orbit.parent.remove(entry.orbit);
    }
    parent.add(entry.orbit);
  });

  // 3. 카메라 맞추기
  fitCamera(rootGroup);
}

// ===============================
// Object 생성
// ===============================
function createObject(obj: any) {
  const size = obj.size || 5;
  const color = parseColor(obj.color);
  const texturePath = obj.texture_path;

  let material: THREE.MeshStandardMaterial;

  if (texturePath) {
    material = new THREE.MeshStandardMaterial({
      map: textureLoader.load(texturePath),
    });
  } else {
    material = new THREE.MeshStandardMaterial({
      color: color,
    });
  }

  const geometry = new THREE.SphereGeometry(size, 48, 48);
  const mesh = new THREE.Mesh(geometry, material);

  const orbit = new THREE.Object3D();
  orbit.add(mesh);

  // position (distance)
  if (obj.orbit?.distance) {
    mesh.position.x = obj.orbit.distance;
  }

  // speed
  orbit.userData.orbitSpeed = obj.orbit?.speed ?? 0;
  mesh.userData.rotationSpeed = obj.rotation_speed ?? 0.01;

  objectsToAnimate.push({ mesh, orbit });
  rootGroup.add(orbit);

  return { mesh, orbit };
}

// ===============================
// Scene 비우기 (메모리 누수 방지)
// ===============================
function clearScene() {
  rootGroup.children.forEach((child) => {
    child.traverse((obj) => {
      if ((obj as any).geometry) (obj as any).geometry.dispose();
      if ((obj as any).material) {
        const mat = (obj as any).material;
        if (Array.isArray(mat)) {
          mat.forEach((m) => m.dispose());
        } else {
          mat.dispose();
        }
      }
    });
  });

  rootGroup.clear();
  objectsToAnimate = [];
}

// ===============================
// Camera fit
// ===============================
function fitCamera(target: THREE.Object3D) {
  const box = new THREE.Box3().setFromObject(target);
  const size = new THREE.Vector3();
  box.getSize(size);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fitDist = maxDim * 2.2;

  camera.position.set(fitDist, fitDist * 0.6, fitDist);
  camera.lookAt(0, 0, 0);
}

// ===============================
// color parser
// ===============================
function parseColor(c: any): number {
  if (!c) return 0xffffff;
  if (typeof c === "number") return c;
  if (typeof c !== "string") return 0xffffff;

  const s = c.trim().toLowerCase();

  if (s.startsWith("0x")) return parseInt(s.replace("0x", ""), 16);
  if (s.startsWith("#")) return parseInt(s.replace("#", ""), 16);

  const val = parseInt(s, 16);
  return Number.isFinite(val) ? val : 0xffffff;
}
