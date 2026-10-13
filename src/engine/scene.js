import * as THREE from 'three';

export const COURT_WIDTH = 15;
export const COURT_LENGTH = 28;
const RIM_HEIGHT = 3;
const HOOP_RADIUS = 0.5;
const HOOP_INSET = 2;

export function getHoopBounds(side) {
  const z = COURT_LENGTH / 2 - HOOP_INSET;
  return {
    center: { x: 0, y: RIM_HEIGHT, z: side === 'home' ? -z : z },
    radius: HOOP_RADIUS,
  };
}

export function createScene(canvas) {
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });

  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(COURT_WIDTH, COURT_LENGTH),
    new THREE.MeshStandardMaterial({ color: 0xb5732a })
  );
  court.rotation.x = -Math.PI / 2;
  scene.add(court);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const directional = new THREE.DirectionalLight(0xffffff, 0.8);
  directional.position.set(10, 20, 10);
  scene.add(directional);

  const hoops = ['home', 'away'].map((side) => {
    const bounds = getHoopBounds(side);
    const hoop = new THREE.Mesh(
      new THREE.TorusGeometry(bounds.radius, 0.05, 8, 24),
      new THREE.MeshStandardMaterial({ color: 0xff6600 })
    );
    hoop.position.set(bounds.center.x, bounds.center.y, bounds.center.z);
    hoop.rotation.x = Math.PI / 2;
    scene.add(hoop);
    return hoop;
  });

  camera.position.set(0, 10, 15);
  camera.lookAt(0, 0, 0);

  return { scene, camera, renderer, court, hoops };
}
