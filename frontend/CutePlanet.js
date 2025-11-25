import * as THREE from 'three';
import * as CANNON from 'cannon-es';

// ==========================================
// 🎨 귀여운 파스텔 톤 색상 팔레트
// (텍스처 대신 이 색상들을 사용합니다)
// ==========================================
const CUTE_COLORS = {
    'Sun': 0xFFD93D,      // 쨍한 노랑 (태양)
    'Mercury': 0xB2BEC3,  // 밝은 회색
    'Venus': 0xFF7675,    // 소프트 핑크
    'Earth': 0x74B9FF,    // 스카이 블루
    'Mars': 0xFF6B6B,     // 살몬 레드
    'Jupiter': 0xFDCB6E,  // 샌드 옐로우
    'Saturn': 0xE17055,   // 테라코타 주황
    'Uranus': 0x81ECEC,   // 민트
    'Neptune': 0x0984E3,  // 진한 파랑
    'default': 0xA29BFE    // 연보라 (기본값)
};

const num = (v, f = 0) => (Number.isFinite(Number(v)) ? Number(v) : f);

export class Planet {
  // loader 인자는 사용하지 않지만, 기존 코드와의 호환성을 위해 남겨둡니다.
  constructor(scene, world, loader, data, scenarioType) {
    this.scene = scene;
    this.world = world;
    this.data = data;
    this.isDead = false;

    // -------------------------------
    // 1. 속성 설정
    // -------------------------------
    this.radius = num(data.size, 5);
    this.mass = num(data.mass, 1);
    this.isStar = data.textureKey === 'Sun';

    // 시나리오별 특수 설정 (성장 모드)
    this.isGrowing = (scenarioType === 'planet_birth'); 
    this.age = 0;
    this.maxAge = 120; // 약 2초 (60fps 기준)

    // -------------------------------
    // 2. 뷰 (Mesh) - ★ 귀여운 스타일 적용 ★
    // -------------------------------
    
    // (1) 색상 가져오기
    const colorHex = CUTE_COLORS[data.textureKey] || CUTE_COLORS['default'];

    // (2) 재질 설정
    // 태양은 스스로 빛나게(Basic), 행성은 빛을 받게(Standard) 설정
    let material;
    if (this.isStar) {
        material = new THREE.MeshBasicMaterial({ color: colorHex });
    } else {
        material = new THREE.MeshStandardMaterial({ 
            color: colorHex,
            roughness: 0.6,      // 매트한 고무/플라스틱 느낌
            metalness: 0.1,      // 금속성 낮음
            flatShading: true,   // ★ 핵심: 면을 각지게 표현 (Low Poly)
        });
    }

    // (3) 형태 설정 (IcosahedronGeometry 사용)
    // 두 번째 인자(detail)가 1이면 적당히 각진 보석 모양이 됩니다.
    const geometry = new THREE.IcosahedronGeometry(this.radius, 1);

    this.mesh = new THREE.Mesh(geometry, material);
    
    // 그림자가 있어야 입체감이 살아납니다.
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;

    // 성장 모드 초기 크기
    if (this.isGrowing) {
        this.mesh.scale.set(0.01, 0.01, 0.01);
    } else {
        this.mesh.scale.set(1, 1, 1);
    }
    
    scene.add(this.mesh);

    // -------------------------------
    // 3. 물리 (Body)
    // -------------------------------
    // 시각적으로는 각져 보이지만, 물리 계산은 '완벽한 구(Sphere)'로 합니다.
    // 그래야 굴러갈 때 덜컹거리지 않고 부드럽게 움직입니다.
    
    const pos = data.position || { x: 0, y: 0, z: 0 };
    const vel = data.velocity || { x: 0, y: 0, z: 0 };

    this.body = new CANNON.Body({
      mass: this.mass,
      shape: new CANNON.Sphere(this.radius),
      position: new CANNON.Vec3(num(pos.x), num(pos.y), num(pos.z)),
      velocity: new CANNON.Vec3(num(vel.x), num(vel.y), num(vel.z)),
      linearDamping: 0.1,  // 약간의 마찰 (공기저항)
      angularDamping: 0.1
    });

    // 자전축 기울기
    this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 0, 1), Math.PI / 23.5);
    
    world.addBody(this.body);

    // 충돌 감지 리스너
    this.body.addEventListener("collide", (e) => {
        if (this.isStar) return; // 태양은 파괴되지 않음
        
        // 강한 충돌 시에만 로그 출력 (선택사항)
        const relativeVelocity = e.contact.getImpactVelocityAlongNormal();
        if(Math.abs(relativeVelocity) > 2) {
             // console.log(`💥 ${data.name || 'Planet'} 쿵!`);
        }
        
        // 파괴 로직이 필요하다면 여기에 추가
        // this.isDead = true; 
    });
  }

  update(deltaTime) {
    if (this.body.isMarkedForRemoval) this.isDead = true;

    // -------------------------------
    // 4. 애니메이션 업데이트
    // -------------------------------

    // (1) 성장 애니메이션 (BackOut Easing 적용: 띠용~ 하는 느낌)
    if (this.isGrowing) {
        this.age += 1;
        const progress = Math.min(this.age / this.maxAge, 1.0);
        
        // 젤리처럼 살짝 커졌다가 돌아오는 효과 수식
        const c1 = 1.70158;
        const c3 = c1 + 1;
        let scale = 1 + c3 * Math.pow(progress - 1, 3) + c1 * Math.pow(progress - 1, 2);
        
        // 수식이 0 이하로 내려가거나 1 완료 시 보정
        if (scale < 0.01) scale = 0.01;
        if (progress >= 1.0) {
            scale = 1.0;
            this.isGrowing = false;
        }

        this.mesh.scale.set(scale, scale, scale);
    }

    // (2) 위치/회전 동기화 (물리 엔진 -> 그래픽)
    this.mesh.position.copy(this.body.position);
    this.mesh.quaternion.copy(this.body.quaternion);

    // (3) 시각적 자전 (물리 회전과 별개로 예쁘게 돌기 위함)
    this.mesh.rotation.y += 0.005; 
  }

  dispose() {
    this.world.removeBody(this.body);
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}