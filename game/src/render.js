// Langit Nusantara — the Three.js scene. Builds the renderer, golden-hour
// lighting, sky dome, sun and the ring meshes; owns both cameras (chase and
// cockpit) and keeps the chase camera behind the plane without ever
// fighting the pilot's stick.
import * as THREE from 'three';
import { COLOURS, FUEL_RING, RINGS } from './config.js';
import { buildTerrain, updateClouds } from './terrain.js';
import { buildAircraft, spinPropeller } from './aircraft.js';

export const CAMERA_CHASE = 'chase';
export const CAMERA_COCKPIT = 'cockpit';

/** Create the renderer, scene and lights inside `canvas`. */
export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = false;

  const scene = new THREE.Scene();
  // Golden-hour sky: a big gradient dome the camera sits inside.
  const skyGeo = new THREE.SphereGeometry(2400, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color(COLOURS.skyTop) },
      horizon: { value: new THREE.Color(COLOURS.skyHorizon) },
    },
    vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 vPos; uniform vec3 top; uniform vec3 horizon; void main(){ float h = normalize(vPos).y * 0.5 + 0.5; gl_FragColor = vec4(mix(horizon, top, pow(h, 0.8)), 1.0); }',
  });
  const sky = new THREE.Mesh(skyGeo, skyMat);
  sky.name = 'sky-dome';
  scene.add(sky);

  scene.fog = new THREE.Fog(0xf2c184, 500, 2200);

  // Low golden sun + warm hemisphere fill.
  const sun = new THREE.DirectionalLight(0xffd9a0, 1.6);
  sun.position.set(-600, 420, -800);
  scene.add(sun);
  const fill = new THREE.HemisphereLight(0xbfd9ff, 0x5a7d4a, 0.75);
  scene.add(fill);

  // The sun disc itself, low over the sea.
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(60, 32),
    new THREE.MeshBasicMaterial({ color: 0xfff2c0, fog: false }),
  );
  sunDisc.position.set(-1100, 320, -1600);
  sunDisc.lookAt(0, 100, 0);
  scene.add(sunDisc);

  const camera = new THREE.PerspectiveCamera(68, window.innerWidth / window.innerHeight, 0.5, 5000);
  scene.add(camera);

  const terrain = buildTerrain(scene, 20261126);
  const plane = buildAircraft();
  scene.add(plane.group);

  // Delivery rings: glowing torus hoops, upright, facing the route.
  const ringMeshes = RINGS.map((ring, i) => {
    const mesh = new THREE.Mesh(
      new THREE.TorusGeometry(ring.r, 1.4, 12, 40),
      new THREE.MeshBasicMaterial({ color: COLOURS.ring, transparent: true, opacity: 0.9 }),
    );
    mesh.position.set(ring.x, ring.y, ring.z);
    mesh.name = `ring-${i + 1}`;
    scene.add(mesh);
    // A soft inner disc so the hoop reads from far away.
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(ring.r * 0.9, 32),
      new THREE.MeshBasicMaterial({ color: COLOURS.ring, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
    );
    disc.position.copy(mesh.position);
    scene.add(disc);
    return { mesh, disc, ring };
  });

  // Fuel ring: amber, with a floating "FUEL" beacon light above it.
  const fuelMesh = new THREE.Mesh(
    new THREE.TorusGeometry(FUEL_RING.r, 1.6, 12, 40),
    new THREE.MeshBasicMaterial({ color: COLOURS.fuelRing, transparent: true, opacity: 0.95 }),
  );
  fuelMesh.position.set(FUEL_RING.x, FUEL_RING.y, FUEL_RING.z);
  fuelMesh.name = 'fuel-ring';
  scene.add(fuelMesh);
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(2.5, 12, 10),
    new THREE.MeshBasicMaterial({ color: COLOURS.fuelRing }),
  );
  beacon.position.set(FUEL_RING.x, FUEL_RING.y + FUEL_RING.r + 6, FUEL_RING.z);
  scene.add(beacon);

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  window.addEventListener('resize', onResize);

  return {
    renderer, scene, camera, terrain, plane, ringMeshes, fuelMesh, beacon, onResize,
  };
}

/** Place the plane mesh from the flight state. */
export function placePlane(world, flight) {
  const group = world.plane.group;
  group.position.set(flight.x, flight.y, flight.z);
  group.rotation.set(0, 0, 0);
  group.rotateY(flight.heading);
  group.rotateX(flight.pitch);
  group.rotateZ(flight.roll);
}

/** Chase camera: behind and above the tail, looking at the nose. */
function chaseCamera(world, flight, dt) {
  const camera = world.camera;
  const back = 26;
  const up = 8;
  const fx = Math.sin(flight.heading);
  const fz = -Math.cos(flight.heading);
  const target = new THREE.Vector3(
    flight.x - fx * back,
    flight.y + up,
    flight.z - fz * back,
  );
  camera.position.lerp(target, Math.min(1, dt * 4));
  camera.lookAt(flight.x + fx * 20, flight.y + 1, flight.z + fz * 20);
  camera.rotation.z = flight.roll * 0.25; // gentle bank with the plane
}

/** Cockpit camera: at the canopy, looking straight ahead. */
function cockpitCamera(world, flight) {
  const camera = world.camera;
  const fx = Math.sin(flight.heading);
  const fz = -Math.cos(flight.heading);
  camera.position.set(flight.x, flight.y + 1.1, flight.z);
  const look = new THREE.Vector3(
    flight.x + fx * 40 - Math.sin(flight.heading) * 0,
    flight.y + Math.sin(flight.pitch) * 40,
    flight.z + fz * 40,
  );
  camera.lookAt(look);
  camera.rotation.z = flight.roll * 0.12;
}

/** One render tick: move the plane, cameras, rings and clouds, then draw. */
export function renderFrame(world, flight, mode, dt, time) {
  placePlane(world, flight);
  spinPropeller(world.plane.propeller, flight.throttle, dt);
  if (mode === CAMERA_COCKPIT) cockpitCamera(world, flight);
  else chaseCamera(world, flight, dt);
  // Pulse the next ring; dim the ones already flown.
  world.ringMeshes.forEach((entry, i) => {
    const done = i < flight.ringsDone;
    const next = i === flight.ringsDone;
    const pulse = next ? 0.75 + Math.sin(time * 4) * 0.25 : 0.9;
    entry.mesh.material.opacity = done ? 0.18 : pulse;
    entry.disc.material.opacity = done ? 0.02 : 0.08;
    if (next) entry.mesh.rotation.z = Math.sin(time * 0.8) * 0.15;
  });
  world.fuelMesh.visible = !flight.fuelUsed;
  world.beacon.visible = !flight.fuelUsed;
  if (!flight.fuelUsed) {
    world.beacon.position.y = FUEL_RING.y + FUEL_RING.r + 6 + Math.sin(time * 2) * 2;
  }
  updateClouds(world.terrain.clouds, dt, time);
  world.renderer.render(world.scene, world.camera);
}
