// planet.js
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { PLANET_TEXTURES } from './textureData.js';

const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

// 행성 전체 크기 배율
const SIZE_SCALE = 3.0;

// 텍스처 로더 헬퍼
function loadTex(loader, path) {
  if (!path) return null;
  const tex = loader.load(path);
  return tex;
}

export class Planet {
  constructor(scene, world, loader, data, scenarioType) {
    this.scene = scene;
    this.world = world;
    this.data = data;
    this.isDead = false;

    // 속성
    this.radius = num(data.size, 5) * SIZE_SCALE;
    this.mass = num(data.mass, 1);
    this.isStar = data.textureKey === 'Sun';

    // planet_birth 시나리오에서만 성장
    this.isGrowing = scenarioType === 'planet_birth';
    this.age = 0;
    this.maxAge = 120;

    // ─────────────────────────────────────
    // 1. 뷰 (Mesh)
    // ─────────────────────────────────────
    const texKey = data.textureKey || 'Default';
    const textureInfo =
      PLANET_TEXTURES[texKey] ||
      PLANET_TEXTURES.Default;

    // 텍스처 (없어도 동작)
    let map = null;
    try {
      if (textureInfo.map) map = loadTex(loader, textureInfo.map);
    } catch (e) {
      console.warn('Texture load failed, using basic material', e);
    }

    // 기본 머티리얼 파라미터
    const matParams = {
      map,
      color: new THREE.Color(textureInfo.color ?? 0xffffff),
      roughness: textureInfo.roughness ?? 0.8,
      metalness: textureInfo.metalness ?? 0.0,
    };

    if (textureInfo.emissiveColor) {
      matParams.emissive = new THREE.Color(textureInfo.emissiveColor);
      matParams.emissiveIntensity = textureInfo.emissiveIntensity ?? 2.0;
    }

    const material = new THREE.MeshStandardMaterial(matParams);

    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(this.radius, 64, 64),
      material
    );

    // 🔹 변형용: 원래 버텍스 위치 저장
    const geom = this.mesh.geometry;
    const posAttr = geom.attributes.position;
    const orig = new Float32Array(posAttr.array.length);
    orig.set(posAttr.array);
    geom.setAttribute(
      'origPosition',
      new THREE.BufferAttribute(orig, 3)
    );

    // 🔹 변형 상태 값
    this.deformDir = new THREE.Vector3(1, 0, 0);
    this.deformAmount = 0;
    this.targetDeformAmount = 0;

    // 성장 모드면 0에서 시작
    if (this.isGrowing) {
      this.mesh.scale.set(0.01, 0.01, 0.01);
    } else {
      this.mesh.scale.set(1, 1, 1);
    }

    // 나중에 용암 지구 같은 펄싱 효과 줄 때 플래그로 사용
    this.mesh.userData.pulseEmissive = false;

    scene.add(this.mesh);

    // ─────────────────────────────────────
    // 2. 물리 (Body)
    // ─────────────────────────────────────
    const pos = data.position || { x: 0, y: 0, z: 0 };
    const vel = data.velocity || { x: 0, y: 0, z: 0 };

    this.body = new CANNON.Body({
      mass: this.mass,
      shape: new CANNON.Sphere(this.radius),
      position: new CANNON.Vec3(num(pos.x), num(pos.y), num(pos.z)),
      velocity: new CANNON.Vec3(num(vel.x), num(vel.y), num(vel.z)),
      linearDamping: 0,
      angularDamping: 0,
    });

    // 충돌 시 Planet 객체 찾기용
    this.body.userData = { planet: this };

    // 자전축 기울기 (지구 기준)
    this.body.quaternion.setFromAxisAngle(
      new CANNON.Vec3(0, 0, 1),
      Math.PI / 23.5
    );

    world.addBody(this.body);

    // ─────────────────────────────────────
    // 3. 충돌 감지 및 병합 처리
    // ─────────────────────────────────────
    this.body.addEventListener('collide', (e) => {
      if (this.isDead) return;

      if (window.handleMerger) {
        const otherBody = e.body;
        const otherPlanet = otherBody.userData?.planet;

        if (otherPlanet) {
          // 중복 실행 방지
          if (this.body.id < otherBody.id) {
            window.handleMerger(this, otherPlanet);
          }
        } else {
          console.log(`💥 ${data.name} 알 수 없는 물체와 충돌`);
        }
      } else {
        // 병합 핸들러 없으면 단순 삭제
        console.log(`💥 ${data.name} 충돌 (단순 삭제)`);
        this.isDead = true;
        if (window.createExplosion) {
          window.createExplosion(this.mesh.position, 0xff5500);
        }
      }
    });
  }

  // 🔹 외부에서 "이 방향으로 이만큼 눌려라" 요청
  setDeform(dir, strength) {
    this.deformDir.copy(dir).normalize();
    // 여러 번 호출돼도 가장 강한 값 유지
    this.targetDeformAmount = Math.max(this.targetDeformAmount, strength);
  }

  // 🔹 실제 버텍스 변형
  applyDeformation(deltaTime) {
    const speed = 4.0;
    this.deformAmount +=
      (this.targetDeformAmount - this.deformAmount) * speed * deltaTime;

    // 아무도 안 건드리면 서서히 0으로
    this.targetDeformAmount *= 0.8;

    const amount = this.deformAmount;
    if (amount <= 0.0001) return;

    const geom = this.mesh.geometry;
    const posAttr = geom.attributes.position;
    const origAttr = geom.attributes.origPosition;
    const dir = this.deformDir;
    const radius = this.radius;

    const v = new THREE.Vector3();
    const n = new THREE.Vector3();

    for (let i = 0; i < posAttr.count; i++) {
      v.set(
        origAttr.getX(i),
        origAttr.getY(i),
        origAttr.getZ(i)
      );

      n.copy(v).normalize();
      const dot = n.dot(dir); // -1 ~ 1

      if (dot <= 0) {
        // 반대편은 거의 안 찌그러뜨림
        posAttr.setXYZ(i, v.x, v.y, v.z);
        continue;
      }

      const localStrength = Math.pow(dot, 2.0); // 중심이 더 많이
      const push = -radius * 0.35 * amount * localStrength;

      v.addScaledVector(dir, push);
      posAttr.setXYZ(i, v.x, v.y, v.z);
    }

    posAttr.needsUpdate = true;
    geom.computeVertexNormals();
  }

  update(deltaTime) {
    if (this.body.isMarkedForRemoval) this.isDead = true;

    // 성장 애니메이션
    if (this.isGrowing) {
      this.age += 1;
      const progress = Math.min(this.age / this.maxAge, 1.0);
      const scale = 1.0 * (1 - Math.pow(1 - progress, 3));
      this.mesh.scale.set(scale, scale, scale);
      if (progress >= 1.0) this.isGrowing = false;
    }

    // 위치/회전 동기화
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    // 자전
    this.mesh.rotation.y += 0.005;

    // 용암 지구 같은 펄싱 효과
    if (this.mesh.userData.pulseEmissive) {
      const mat = this.mesh.material;
      if (mat && 'emissiveIntensity' in mat) {
        const t = performance.now() * 0.001;
        mat.emissiveIntensity = 3.0 + Math.sin(t * 10.0) * 0.7;
      }
    }

    // 🔹 근접 변형 적용
    this.applyDeformation(deltaTime);
  }

  dispose() {
    this.world.removeBody(this.body);
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
