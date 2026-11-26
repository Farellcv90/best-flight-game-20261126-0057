// Langit Nusantara — tuning constants. One place for every number the
// flight model, missions and scoring share, so balancing is a single edit.
export const GAME = {
  name: 'Langit Nusantara: Island Courier',
  seed: 20261126,
};

export const WORLD = {
  size: 2400, // island playfield, metres across
  islandRadius: 900,
  seaLevel: 0,
  maxHill: 130,
};

export const RUNWAY = {
  x: 0,
  z: 420,
  heading: 0, // runway points north (-z)
  length: 260,
  width: 22,
};

export const PLANE = {
  maxSpeed: 62, // m/s at full throttle
  cruiseSpeed: 38,
  stallSpeed: 16,
  climbRate: 9,
  sinkRate: 6,
  rollRate: 1.9, // rad/s at full stick
  pitchRate: 1.1,
  turnRate: 0.55,
  throttleRate: 0.55, // per second
  gearHeight: 2.2,
  fuelCapacity: 100,
  fuelBurn: 2.6, // per second at full throttle
  maxDamage: 100,
};

export const RINGS = [
  { x: -260, y: 70, z: 60, r: 16, label: 'Ring 1 — Teluk Biru' },
  { x: -420, y: 95, z: -330, r: 16, label: 'Ring 2 — Bukit Hijau' },
  { x: 120, y: 80, z: -560, r: 16, label: 'Ring 3 — Kota Pelabuhan' },
  { x: 480, y: 65, z: -120, r: 16, label: 'Ring 4 — Laguna' },
  { x: 180, y: 55, z: 300, r: 16, label: 'Ring 5 — Final Approach' },
];

export const FUEL_RING = { x: -80, y: 75, z: -180, r: 18 };

export const SCORING = {
  ringPoints: 200,
  fuelBonus: 50,
  timeParSeconds: 240,
  timeBonusPerSecond: 2,
  fuelBonusPerUnit: 3,
  softLandingBonus: 300,
  firmLandingBonus: 120,
};

export const WIND = {
  baseSpeed: 4,
  gustStrength: 6,
  gustPeriod: 7,
};

export const COLOURS = {
  skyTop: 0x2e5fa3,
  skyHorizon: 0xffc98a,
  sea: 0x1d6f8e,
  sand: 0xe8d29a,
  grass: 0x4d8a3f,
  hill: 0x3a6e33,
  rock: 0x8a7f72,
  runway: 0x3c3f45,
  planeBody: 0xff7a1a,
  planeWing: 0xfff3e0,
  planeTail: 0x0b5fa5,
  ring: 0x37e6a0,
  fuelRing: 0xffc21a,
};
