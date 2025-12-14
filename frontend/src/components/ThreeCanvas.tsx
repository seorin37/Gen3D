import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
import { MTLLoader } from "three/examples/jsm/loaders/MTLLoader";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

export default function ThreeCanvas({ sceneData }: any) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current || !sceneData) return;

    const scene = new THREE.Scene();
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 8000);
    camera.position.set(0, 150, 400);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // 조명
    const light = new THREE.DirectionalLight(0xffffff, 2);
    light.position.set(100, 200, 150);
    scene.add(light);
    scene.add(new THREE.AmbientLight(0xffffff, 1));

    const textureLoader = new THREE.TextureLoader();

    const loadModel = (objInfo: any) => {
      return new Promise<THREE.Group>((resolve) => {
        const baseDir = objInfo.obj_path.replace(/\/[^/]+$/, "/");

        const texture = objInfo.texture_path
          ? textureLoader.load(objInfo.texture_path)
          : null;

        const mtlLoader = new MTLLoader();
        mtlLoader.setPath(baseDir);

        mtlLoader.load(objInfo.mtl_path.split("/").pop(), (materials) => {
          materials.preload();

          const objLoader = new OBJLoader();
          objLoader.setMaterials(materials);
          objLoader.setPath(baseDir);

          objLoader.load(objInfo.obj_path.split("/").pop(), (obj) => {
            obj.traverse((child: any) => {
              if (child.isMesh) {
                child.material.side = THREE.DoubleSide;

                // 🔥 MTL의 map_Kd가 작동하지 않을 때 강제 텍스처 적용
                if (texture) {
                  child.material.map = texture;
                  child.material.needsUpdate = true;
                }
              }
            });

            const scale = objInfo.scale ?? 40;
            obj.scale.set(scale, scale, scale);

            obj.position.set(
              objInfo.position?.x ?? 0,
              objInfo.position?.y ?? 0,
              objInfo.position?.z ?? 0
            );

            scene.add(obj);
            resolve(obj);
          });
        });
      });
    };

    const loadedObjects: any[] = [];

    const initScene = async () => {
      for (const objInfo of sceneData.objects ?? []) {
        const mesh = await loadModel(objInfo);
        loadedObjects.push({ mesh, info: objInfo });
      }
    };

    initScene();

    const animate = () => {
      requestAnimationFrame(animate);

      loadedObjects.forEach(({ mesh, info }) => {
        mesh.rotation.y += info.rotationSpeed ?? 0.001;

        if (info.orbitRadius) {
          const t = Date.now() * (info.orbitSpeed ?? 0.00005);
          mesh.position.x = Math.cos(t) * info.orbitRadius;
          mesh.position.z = Math.sin(t) * info.orbitRadius;
        }
      });

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      renderer.dispose();
      mountRef.current.removeChild(renderer.domElement);
    };
  }, [sceneData]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        position: "absolute",
        top: 0,
        left: 0,
      }}
    />
  );
}
