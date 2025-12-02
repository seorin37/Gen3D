// main.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

import { Planet } from './planet.js';
import { getJsonFromAI } from './AIClient.js';

// 시나리오
import { initCollisionScene } from './scenarios/SceneCollision.js';
import { initSolarSystem } from './scenarios/SceneSolarSystem.js';
import { initBirthScene } from './scenarios/SceneBirth.js';
import { initGiantImpact } from './scenarios/SceneGiantImpact.js';
import { Explosion } from './Explosion.js';

// ─────────────────────────────────────
// 1. 기본 씬 설정
// ─────────────────────────────────────
const canvas = document.querySelector('#three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
camera.position.set(0, 50, 100);

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
scene.add(ambientLight);

const sunLight = new THREE.PointLight(0xffffff, 2, 1000);
sunLight.position.set(0, 0, 0);
scene.add(sunLight);

// ─────────────────────────────────────
// 2. 물리 월드
// ─────────────────────────────────────
const world = new CANNON.World();
world.gravity.set(0, 0, 0);
world.broadphase = new CANNON.NaiveBroadphase();

// ─────────────────────────────────────
// 3. 상태 관리
// ─────────────────────────────────────
let planets = [];
let explosions = [];
let currentScenarioType = '';

// Giant Impact 전용 상태
let giantImpactTime = 0;
let isGiantImpactPlaying = false;
let gaiaRef = null;
let theiaRef = null;
let impactHappened = false;
let timeScale = 1.0;

// ─────────────────────────────────────
// 4. 유틸리티
// ─────────────────────────────────────
function resetScene() {
  for (const p of planets) p.dispose();
  planets = [];

  for (const e of explosions) e.dispose?.();
  explosions = [];
}

// 폭발 이펙트
window.createExplosion = (position, color) => {
  try {
    const explosion = new Explosion(scene, position, color);
    explosions.push(explosion);
  } catch (e) {
    console.warn('Explosion effect missing.');
  }
};

// Giant Impact 타임라인 시작
function startGiantImpactTimeline() {
  giantImpactTime = 0;
  isGiantImpactPlaying = true;
  impactHappened = false;

  if (theiaRef?.body) {
    theiaRef.body.velocity.set(-8, 0, 0); // 초기 속도 재설정 (안전용)
  }
}

// ✅ 옆(측면) 시점 카메라 연출
function updateGiantImpactCamera(delta) {
  if (!isGiantImpactPlaying) return;

  giantImpactTime += delta;

  // 0 ~ 4초: 멀리서 옆에서 줌인
  if (giantImpactTime < 4) {
    timeScale = 0.7;
    const targetPos = new THREE.Vector3(0, 35, 260);
    camera.position.lerp(targetPos, 0.03);
    camera.lookAt(0, 0, 0);
  }
  // 4 ~ 8초: 충돌 직전, 더 가까이 + 슬로모션
  else if (giantImpactTime < 8) {
    timeScale = 0.3;
    const targetPos = new THREE.Vector3(0, 20, 120);
    camera.position.lerp(targetPos, 0.05);
    camera.lookAt(0, 0, 0);
  }
  // 8초 이후: 옆뷰 오비탈
  else {
    timeScale = 0.5;

    const t = giantImpactTime - 8;
    const radius = 150;
    const height = 25;
    const speed = 0.2;

    const angle = speed * t;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;

    const targetPos = new THREE.Vector3(x, height, z);
    camera.position.lerp(targetPos, 0.08);
    camera.lookAt(0, 0, 0);
  }
}

// 충돌 섬광 + 충격파 링
function createImpactFlash(pos) {
  // 플래시 구
  const geometry = new THREE.SphereGeometry(1, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 1.0,
  });
  const flash = new THREE.Mesh(geometry, material);
  flash.position.set(pos.x, pos.y, pos.z);
  flash.scale.set(12, 12, 12);
  scene.add(flash);

  const expandFlash = () => {
    flash.scale.multiplyScalar(1.08);
    flash.material.opacity -= 0.12;

    if (flash.material.opacity > 0) {
      requestAnimationFrame(expandFlash);
    } else {
      scene.remove(flash);
      geometry.dispose();
      material.dispose();
    }
  };
  expandFlash();

  // 충격파 링
  const ringGeo = new THREE.RingGeometry(8, 9, 64);
  const ringMat = new THREE.MeshBasicMaterial({
    color: 0xfff2aa,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(pos.x, pos.y, pos.z);
  scene.add(ring);

  const animateRing = () => {
    ring.scale.multiplyScalar(1.09);
    ring.material.opacity *= 0.9;
    if (ring.material.opacity > 0.02) {
      requestAnimationFrame(animateRing);
    } else {
      scene.remove(ring);
      ringGeo.dispose();
      ringMat.dispose();
    }
  };
  animateRing();
}

// 🌑 달 탄생 시퀀스 (지구 옆·앞 쪽에서 브리지 + 파편이 달로 변하는 연출)
function createMoonSequence(scene, world, loader, centerPos, earthRadius, earthVel) {
  console.log('🌑 달 탄생 시퀀스: 지구 옆·앞 브리지 + 파편 응집 달 생성');

  const center = new THREE.Vector3(centerPos.x, centerPos.y, centerPos.z);
  const dirMoon = new THREE.Vector3(1, 0.25, 0.35).normalize();

  const moonDist = earthRadius * 8.0;
  const tailLengthMul = 1.8;
  const bridgeEnd = center.clone().add(dirMoon.clone().multiplyScalar(moonDist));

  const particleCount = 1400;
  const geometry = new THREE.BufferGeometry();
  const positions = [];
  const colors = [];
  const velocities = [];
  const isMoonSeed = [];
  const seedOffset = [];

  const up = new THREE.Vector3(0, 1, 0);
  let side1 = new THREE.Vector3().crossVectors(dirMoon, up);
  if (side1.lengthSq() < 0.0001) side1 = new THREE.Vector3(0, 0, 1);
  side1.normalize();
  const side2 = new THREE.Vector3().crossVectors(dirMoon, side1).normalize();

  // 1) 파편 생성
  for (let i = 0; i < particleCount; i++) {
    const r0 = earthRadius * (0.3 + Math.random() * 0.5);
    const theta = Math.random() * Math.PI * 2;
    const phi = (Math.random() - 0.5) * Math.PI * 0.3;

    const startX = center.x + r0 * Math.cos(theta) * Math.cos(phi);
    const startY = center.y + r0 * Math.sin(phi);
    const startZ = center.z + r0 * Math.sin(theta) * Math.cos(phi);

    positions.push(startX, startY, startZ);

    const baseSpeed = 22 + Math.random() * 10;
    const vAlong = dirMoon.clone().multiplyScalar(baseSpeed);

    const spread1 = (Math.random() - 0.5) * earthRadius * 0.2;
    const spread2 = (Math.random() - 0.5) * earthRadius * 0.2;

    const vPerp = side1
      .clone()
      .multiplyScalar(spread1 * 0.18)
      .add(side2.clone().multiplyScalar(spread2 * 0.18));

    const vx = vAlong.x + vPerp.x;
    const vy = vAlong.y + vPerp.y;
    const vz = vAlong.z + vPerp.z;

    velocities.push({ x: vx, y: vy, z: vz });

    const seed = Math.random() < 0.3;
    isMoonSeed.push(seed);

    if (seed) {
      seedOffset.push({
        radial: (Math.random() - 0.5) * earthRadius * 0.4,
        height: (Math.random() - 0.5) * earthRadius * 0.25,
      });
    } else {
      seedOffset.push({ radial: 0, height: 0 });
    }

    const c = Math.random();
    if (c > 0.85) colors.push(1.0, 1.0, 1.0);
    else if (c > 0.6) colors.push(1.0, 0.9, 0.4);
    else if (c > 0.3) colors.push(1.0, 0.5, 0.1);
    else colors.push(0.8, 0.2, 0.05);
  }

  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 1.3,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  const ejecta = new THREE.Points(geometry, material);
  scene.add(ejecta);

  let time = 0;
  let moonSpawned = false;
  let moonCorePos = null;
  ejecta.userData = { isFinished: false };

  ejecta.update = function () {
    time++;
    const posAttr = this.geometry.attributes.position;
    const positionsArr = posAttr.array;
    const dt = 1 / 60;

    let seedCx = 0,
      seedCy = 0,
      seedCz = 0,
      seedCount = 0;

    for (let i = 0; i < particleCount; i++) {
      const ix = i * 3;
      const iy = i * 3 + 1;
      const iz = i * 3 + 2;

      let px = positionsArr[ix];
      let py = positionsArr[iy];
      let pz = positionsArr[iz];

      let vx = velocities[i].x;
      let vy = velocities[i].y;
      let vz = velocities[i].z;

      if (!moonSpawned) {
        if (time < 25) {
          px += vx * dt;
          py += vy * dt;
          pz += vz * dt;

          velocities[i].x *= 0.99;
          velocities[i].y *= 0.99;
          velocities[i].z *= 0.99;
        } else {
          px += vx * dt;
          py += vy * dt;
          pz += vz * dt;

          const posVec = new THREE.Vector3(px, py, pz);
          const rel = posVec.clone().sub(center);

          const along = rel.dot(dirMoon);
          const maxAlong = moonDist * tailLengthMul;
          const alongClamped = Math.max(0, Math.min(along, maxAlong));

          let onLine = center
            .clone()
            .add(dirMoon.clone().multiplyScalar(alongClamped));

          const perp = rel.sub(dirMoon.clone().multiplyScalar(alongClamped));

          const tNorm = alongClamped / maxAlong;
          const curveAmp = earthRadius * 0.2;
          const curve = Math.sin(tNorm * Math.PI) * curveAmp;
          onLine = onLine.add(side2.clone().multiplyScalar(curve));

          const baseShrink = 0.55;
          const noiseRaw =
            Math.sin(alongClamped * 0.03 + i * 1.7) +
            Math.cos(alongClamped * 0.07 - i * 0.5);
          const noise = noiseRaw * 0.15;
          let shrink = baseShrink + noise;
          shrink = Math.max(0.25, Math.min(shrink, 0.9));

          const newPos = onLine.add(perp.multiplyScalar(shrink));

          const lerpFactor = 0.4;
          px += (newPos.x - px) * lerpFactor;
          py += (newPos.y - py) * lerpFactor;
          pz += (newPos.z - pz) * lerpFactor;

          const vVec = new THREE.Vector3(vx, vy, vz);
          const vAlong = dirMoon.clone().multiplyScalar(vVec.dot(dirMoon));
          const vPerp = vVec.sub(vAlong).multiplyScalar(0.45);
          const vNew = vAlong.add(vPerp);

          velocities[i].x = vNew.x * 0.995;
          velocities[i].y = vNew.y * 0.995;
          velocities[i].z = vNew.z * 0.995;
        }
      } else {
        const posVec = new THREE.Vector3(px, py, pz);

        if (isMoonSeed[i]) {
          const target = moonCorePos.clone();
          const lerpFactor = 0.22;
          posVec.lerp(target, lerpFactor);

          px = posVec.x;
          py = posVec.y;
          pz = posVec.z;
        } else {
          posVec.addScaledVector(dirMoon, 0.25 * dt * 60);
          px = posVec.x;
          py = posVec.y;
          pz = posVec.z;
        }

        velocities[i].x *= 0.99;
        velocities[i].y *= 0.99;
        velocities[i].z *= 0.99;
      }

      positionsArr[ix] = px;
      positionsArr[iy] = py;
      positionsArr[iz] = pz;

      if (!moonSpawned && isMoonSeed[i]) {
        seedCx += px;
        seedCy += py;
        seedCz += pz;
        seedCount++;
      }
    }

    posAttr.needsUpdate = true;

    if (!moonSpawned && time > 140) {
      if (seedCount > 0) {
        const cx = seedCx / seedCount;
        const cy = seedCy / seedCount;
        const cz = seedCz / seedCount;

        const baseCore = new THREE.Vector3(cx, cy, cz);
        const forwardShift = dirMoon.clone().multiplyScalar(earthRadius * 0.5);
        moonCorePos = baseCore.add(forwardShift);
      } else {
        moonCorePos = bridgeEnd.clone();
      }

      spawnMoonAt(moonCorePos);
      moonSpawned = true;
    }

    if (time > 220) {
      this.material.opacity *= 0.97;
      this.scale.multiplyScalar(0.998);
    }
    if (this.material.opacity <= 0.02) {
      this.isFinished = true;
      this.dispose();
    }
  };

  ejecta.dispose = function () {
    scene.remove(this);
    this.geometry.dispose();
    this.material.dispose();
  };

  explosions.push(ejecta);

  function spawnMoonAt(posVec3) {
    import('./planet.js').then(({ Planet }) => {
      const moon = new Planet(
        scene,
        world,
        loader,
        {
          name: 'The-Moon',
          textureKey: 'Moon',
          size: earthRadius / 3.5 / 3.0,
          mass: 10,
          position: {
            x: posVec3.x,
            y: posVec3.y,
            z: posVec3.z,
          },
          velocity: {
            x: earthVel.x,
            y: earthVel.y,
            z: earthVel.z + 5,
          },
        },
        'planet_birth'
      );

      planets.push(moon);
      console.log('🌝 지구 옆·앞 브리지 끝에서 달이 성장하기 시작합니다!');
    });
  }
}

// ─────────────────────────────────────
// 전역 병합 핸들러
// ─────────────────────────────────────
window.handleMerger = (p1, p2) => {
  if (p1.isDead || p2.isDead) return;

  const n1 = p1.data.name;
  const n2 = p2.data.name;
  const combinedNames = (n1 + n2).toLowerCase();
  const isGiantImpact = combinedNames.includes('theia');

  if (currentScenarioType === 'giant_impact') {
    if (impactHappened) return;
    impactHappened = true;
  }

  console.log(
    `🪨 병합 시작: ${n1} + ${n2} (거대 충돌 모드: ${isGiantImpact})`
  );

  const newMass = p1.mass + p2.mass;
  const newRadius = Math.cbrt(
    Math.pow(p1.radius, 3) + Math.pow(p2.radius, 3)
  );

  const ratio = p1.mass / newMass;
  const newPos = {
    x: p1.body.position.x * ratio + p2.body.position.x * (1 - ratio),
    y: p1.body.position.y * ratio + p2.body.position.y * (1 - ratio),
    z: p1.body.position.z * ratio + p2.body.position.z * (1 - ratio),
  };
  const newVel = {
    x: (p1.mass * p1.body.velocity.x + p2.mass * p2.body.velocity.x) / newMass,
    y: (p1.mass * p1.body.velocity.y + p2.mass * p2.body.velocity.y) / newMass,
    z: (p1.mass * p1.body.velocity.z + p2.mass * p2.body.velocity.z) / newMass,
  };

  p1.isDead = true;
  p2.isDead = true;
  p1.body.isMarkedForRemoval = true;
  p2.body.isMarkedForRemoval = true;

  const loader = new THREE.TextureLoader();

  const textureKey = isGiantImpact
    ? 'MoltenEarth'
    : p1.mass > p2.mass
    ? p1.data.textureKey
    : p2.data.textureKey;

  setTimeout(() => {
    const mergedPlanet = new Planet(
      scene,
      world,
      loader,
      {
        name: isGiantImpact ? 'Molten-Earth' : `Merged-${p1.data.name}`,
        textureKey,
        size: newRadius / 3.0,
        mass: newMass,
        position: newPos,
        velocity: newVel,
      },
      'merge_event'
    );

    if (isGiantImpact) {
      const mat = mergedPlanet.mesh.material;
      mat.color.setHex(0xffaa00);
      mat.emissive = new THREE.Color(0xff2200);
      mat.emissiveIntensity = 3.0;
      mergedPlanet.mesh.userData.pulseEmissive = true;
    }

    planets.push(mergedPlanet);

    if (!isGiantImpact && window.createExplosion) {
      window.createExplosion(newPos, 0xffffff);
    }

    if (isGiantImpact) {
      createImpactFlash(newPos);
      createMoonSequence(scene, world, loader, newPos, newRadius, newVel);
    }
  }, 50);
};

// ─────────────────────────────────────
// 5. AI 데이터 → 시나리오
// ─────────────────────────────────────
async function createSceneFromData(aiData) {
  resetScene();

  console.log('📦 3. createSceneFromData:', aiData);

  if (!aiData || !aiData.scenarioType) {
    console.error('🚨 scenarioType 없음');
    return;
  }

  let safeScenarioType = aiData.scenarioType.toLowerCase().trim();

  const hasTheia = aiData.objects?.some((o) =>
    o.name.toLowerCase().includes('theia')
  );
  if (hasTheia) {
    console.log("🔥 'Theia' 감지 -> giant_impact 로 전환");
    safeScenarioType = 'giant_impact';
  }

  console.log(`🧐 4. 변환된 시나리오 타입: '${safeScenarioType}'`);

  currentScenarioType = safeScenarioType;
  let setupData = null;
  const loader = new THREE.TextureLoader();

  switch (safeScenarioType) {
    case 'collision':
      setupData = initCollisionScene(scene, world, loader, aiData);
      break;
    case 'solar_system':
    case 'orbit':
    case 'solar_eclipse':
    case 'lunar_eclipse':
      setupData = initSolarSystem(scene, world, loader, aiData);
      break;
    case 'planet_birth':
      setupData = initBirthScene(scene, world, loader, aiData);
      break;
    case 'giant_impact':
      setupData = initGiantImpact(scene, world, loader, aiData);
      gaiaRef = setupData.gaia;
      theiaRef = setupData.theia;
      startGiantImpactTimeline();
      break;
    default:
      setupData = { planets: [], cameraPosition: aiData.cameraPosition };
      if (aiData.objects) {
        for (const objData of aiData.objects) {
          const p = new Planet(scene, world, loader, objData, currentScenarioType);
          planets.push(p);
        }
      }
      break;
  }

  if (setupData) {
    if (setupData.planets) planets = setupData.planets;
    const camPos = setupData.cameraPosition || aiData.cameraPosition;
    const lookAtPos = setupData.cameraLookAt || { x: 0, y: 0, z: 0 };

    if (camPos) {
      camera.position.set(camPos.x, camPos.y, camPos.z);
      camera.lookAt(lookAtPos.x, lookAtPos.y, lookAtPos.z);
    }
  }
}

// 중력 (태양계용)
function applyGravity() {
  if (currentScenarioType === 'collision' || currentScenarioType === 'planet_birth')
    return;
  if (planets.length < 2) return;

  const sortedPlanets = [...planets].sort((a, b) => b.mass - a.mass);
  const star = sortedPlanets[0];
  const G = 10;

  for (let i = 1; i < sortedPlanets.length; i++) {
    const planet = sortedPlanets[i];
    const distVec = new CANNON.Vec3();
    star.body.position.vsub(planet.body.position, distVec);
    const r_sq = distVec.lengthSquared();
    if (r_sq < 1) continue;
    const force = (G * star.mass * planet.mass) / r_sq;
    distVec.normalize();
    distVec.scale(force, distVec);
    planet.body.applyForce(distVec, planet.body.position);
  }
}

// 🔹 두 행성이 가까워졌을 때 표면을 서로 향해 눌러주는 함수
function applyMutualDeformation(deltaTime) {
  // giant impact 에서만 쓰고 싶으면 이 조건 유지
  if (currentScenarioType !== 'giant_impact') return;
  if (planets.length < 2) return;

  // 프레임 시작 시 타겟 값 초기화
  for (const p of planets) {
    p.targetDeformAmount = 0;
  }

  for (let i = 0; i < planets.length; i++) {
    for (let j = i + 1; j < planets.length; j++) {
      const a = planets[i];
      const b = planets[j];

      const posA = a.mesh.position;
      const posB = b.mesh.position;

      const dist = posA.distanceTo(posB);
      const sumR = a.radius + b.radius;

      // 너무 멀면 스킵 (계수는 느낌 보면서 튜닝)
      if (dist > sumR * 1.4) continue;

      const t = THREE.MathUtils.clamp(
        1 - (dist - sumR * 0.7) / (sumR * 0.7),
        0,
        1
      );
      if (t <= 0) continue;

      const dirAB = new THREE.Vector3().subVectors(posB, posA).normalize();

      a.setDeform(dirAB, t);
      b.setDeform(dirAB.clone().negate(), t);
    }
  }
}

// ─────────────────────────────────────
// 6. 입력 처리
// ─────────────────────────────────────
const inputField = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const statusDiv = document.getElementById('ai-status');

async function handleUserRequest() {
  const text = inputField.value;
  if (!text) return;

  sendBtn.disabled = true;
  inputField.disabled = true;

  try {
    statusDiv.innerText = 'AI가 생각 중... 🤔';
    const scenarioData = await getJsonFromAI(text);
    await createSceneFromData(scenarioData);
    statusDiv.innerText = `✅ 적용 완료: ${scenarioData.scenarioType}`;
  } catch (error) {
    console.error('🚨 오류:', error);
    statusDiv.innerText = '🚨 오류 발생!';
  } finally {
    sendBtn.disabled = false;
    inputField.disabled = false;
    inputField.value = '';
    inputField.focus();
  }
}

if (sendBtn) {
  sendBtn.addEventListener('click', handleUserRequest);
  inputField.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleUserRequest();
  });
}

// ─────────────────────────────────────
// 7. 루프
// ─────────────────────────────────────
const clock = new THREE.Clock();
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

function animate() {
  requestAnimationFrame(animate);
  const rawDelta = clock.getDelta();

  if (currentScenarioType === 'giant_impact' && isGiantImpactPlaying) {
    updateGiantImpactCamera(rawDelta);
  } else {
    timeScale = 1.0;
  }

  const deltaTime = rawDelta * timeScale;

  applyGravity();
  world.step(1 / 60, deltaTime, 3);

  for (let i = planets.length - 1; i >= 0; i--) {
    const p = planets[i];
    p.update(deltaTime);
    if (p.isDead) {
      p.dispose();
      planets.splice(i, 1);
    }
  }

  // ✅ 위치 업데이트 후, 근접한 행성들 표면 눌러주기
  applyMutualDeformation(deltaTime);

  for (let i = explosions.length - 1; i >= 0; i--) {
    explosions[i].update();
    if (explosions[i].isFinished) {
      explosions.splice(i, 1);
    }
  }

  controls.update();
  renderer.render(scene, camera);
}

// 초기: 태양계 시나리오
createSceneFromData({ scenarioType: 'solar_system', objects: [] });
animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
