// Langit Nusantara — procedural island terrain. One height function drives
// both the visible mesh and the flight model's ground collisions, so what
// you see is exactly what you can hit. A flat runway shelf is carved into
// the south of the island, with a town, palm clusters and hills around it.
import * as THREE from 'three';
import { COLOURS, RUNWAY, WORLD } from './config.js';
import { makeNoise2D, makeRng, range } from './random.js';

const noise = makeNoise2D(90210);

/** True ground height (metres) at world (x, z). Sea is 0 outside the island. */
export function groundHeight(x, z) {
  const dist = Math.hypot(x, z);
  const falloff = Math.max(0, 1 - dist / WORLD.islandRadius);
  const coast = falloff * falloff * (3 - 2 * falloff);
  let height = coast * WORLD.maxHill * (0.35 + 0.65 * noise(x * 0.004 + 7, z * 0.004 + 3));
  height += coast * 22 * noise(x * 0.02, z * 0.02);
  // Carve the runway shelf flat so takeoffs and landings are fair.
  const along = -(z - RUNWAY.z); // distance along the runway from its centre
  const across = x - RUNWAY.x;
  const onStrip = Math.abs(along) < RUNWAY.length / 2 + 40 && Math.abs(across) < RUNWAY.width / 2 + 40;
  if (onStrip) {
    const edge = Math.min(
      (RUNWAY.length / 2 + 40 - Math.abs(along)) / 40,
      (RUNWAY.width / 2 + 40 - Math.abs(across)) / 40,
    );
    const blend = Math.max(0, Math.min(1, edge));
    height = height * (1 - blend) + 6 * blend;
  }
  return height;
}

/** Is (x, z) on the runway strip (for landing judgement)? */
export function onRunway(x, z) {
  const along = -(z - RUNWAY.z);
  const across = x - RUNWAY.x;
  return Math.abs(along) < RUNWAY.length / 2 && Math.abs(across) < RUNWAY.width / 2;
}

function terrainColour(height, slope) {
  if (height < 4) return new THREE.Color(COLOURS.sand);
  if (slope > 0.55) return new THREE.Color(COLOURS.rock);
  if (height > 85) return new THREE.Color(COLOURS.hill);
  return new THREE.Color(COLOURS.grass);
}

/** Build the island mesh, sea, runway, town, palms, hills props and clouds. */
export function buildTerrain(scene, seed) {
  const rng = makeRng(seed);
  const group = new THREE.Group();
  group.name = 'island';

  // Island mesh: a displaced plane, vertex-coloured by height and slope.
  const segments = 128;
  const geo = new THREE.PlaneGeometry(WORLD.size, WORLD.size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colours = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = groundHeight(x, z);
    pos.setY(i, h);
    const slope = Math.abs(groundHeight(x + 6, z) - h) / 6 + Math.abs(groundHeight(x, z + 6) - h) / 6;
    const colour = terrainColour(h, slope);
    colours[i * 3] = colour.r;
    colours[i * 3 + 1] = colour.g;
    colours[i * 3 + 2] = colour.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colours, 3));
  geo.computeVertexNormals();
  const island = new THREE.Mesh(
    geo,
    new THREE.MeshLambertMaterial({ vertexColors: true }),
  );
  island.name = 'island-mesh';
  group.add(island);

  // Sea: a big flat disc just below the beach line.
  const sea = new THREE.Mesh(
    new THREE.CircleGeometry(WORLD.size, 48),
    new THREE.MeshLambertMaterial({ color: COLOURS.sea }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.4;
  sea.name = 'sea';
  group.add(sea);

  // Runway: dark strip with white centre dashes and threshold bars.
  const runway = new THREE.Group();
  runway.name = 'runway';
  const strip = new THREE.Mesh(
    new THREE.PlaneGeometry(RUNWAY.width, RUNWAY.length),
    new THREE.MeshLambertMaterial({ color: COLOURS.runway }),
  );
  strip.rotation.x = -Math.PI / 2;
  strip.position.set(RUNWAY.x, 6.15, RUNWAY.z);
  runway.add(strip);
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (let d = -100; d <= 100; d += 40) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 18), dashMat);
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(RUNWAY.x, 6.3, RUNWAY.z - d);
    runway.add(dash);
  }
  group.add(runway);

  // Town: a cluster of small houses with coloured roofs near the runway.
  const roofColours = [0xc0392b, 0xe67e22, 0x2980b9, 0x8e44ad, 0x16a085];
  const town = new THREE.Group();
  town.name = 'town';
  for (let i = 0; i < 42; i += 1) {
    const hx = 60 + rng() * 260 - 60;
    const hz = RUNWAY.z - 190 - rng() * 160;
    const h = groundHeight(hx, hz);
    if (h < 5) continue;
    const house = new THREE.Group();
    const walls = new THREE.Mesh(
      new THREE.BoxGeometry(9, 6, 8),
      new THREE.MeshLambertMaterial({ color: 0xf5ead6 }),
    );
    walls.position.y = 3;
    house.add(walls);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(7.5, 4, 4),
      new THREE.MeshLambertMaterial({ color: roofColours[i % roofColours.length] }),
    );
    roof.position.y = 8;
    roof.rotation.y = Math.PI / 4;
    house.add(roof);
    house.position.set(hx, h, hz);
    house.rotation.y = rng() * Math.PI;
    town.add(house);
  }
  group.add(town);

  // Palm clusters: trunk + a crown of flattened cones, scattered on beaches.
  const palms = new THREE.Group();
  palms.name = 'palms';
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a5a2b });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f7d32 });
  for (let i = 0; i < 90; i += 1) {
    const angle = rng() * Math.PI * 2;
    const radius = WORLD.islandRadius * (0.55 + rng() * 0.35);
    const px = Math.cos(angle) * radius;
    const pz = Math.sin(angle) * radius;
    const h = groundHeight(px, pz);
    if (h < 3 || h > 40) continue;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.8, 9, 6), trunkMat);
    trunk.position.y = 4.5;
    trunk.rotation.z = (rng() - 0.5) * 0.2;
    palm.add(trunk);
    for (let leaf = 0; leaf < 6; leaf += 1) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(1.6, 7, 4), leafMat);
      const a = (leaf / 6) * Math.PI * 2;
      frond.position.set(Math.cos(a) * 2.4, 9.6, Math.sin(a) * 2.4);
      frond.rotation.z = Math.cos(a) * 1.1;
      frond.rotation.x = -Math.sin(a) * 1.1;
      palm.add(frond);
    }
    palm.position.set(px, h, pz);
    palms.add(palm);
  }
  group.add(palms);

  // Drifting clouds: soft white flattened spheres high above the island.
  const clouds = new THREE.Group();
  clouds.name = 'clouds';
  const cloudMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 14; i += 1) {
    const cloud = new THREE.Group();
    const puffs = 3 + Math.floor(rng() * 3);
    for (let p = 0; p < puffs; p += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(9 + rng() * 10, 10, 8), cloudMat);
      puff.position.set(p * 12 - puffs * 6, rng() * 3, (rng() - 0.5) * 10);
      puff.scale.y = 0.45;
      cloud.add(puff);
    }
    cloud.position.set((rng() - 0.5) * 2000, range(rng, 190, 280), (rng() - 0.5) * 2000);
    clouds.add(cloud);
  }
  group.add(clouds);

  scene.add(group);
  return { group, clouds };
}

/** Drift the clouds slowly so the sky feels alive. */
export function updateClouds(clouds, dt, time) {
  clouds.children.forEach((cloud, i) => {
    cloud.position.x += Math.sin(time * 0.05 + i) * dt * 1.2;
    if (cloud.position.x > 1200) cloud.position.x = -1200;
  });
}
