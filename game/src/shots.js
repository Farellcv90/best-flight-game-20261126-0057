// Langit Nusantara — staged screenshot scenes. Each scene plays the real
// rules forward from a fresh world, steered by a simple autopilot that
// climbs, turns toward the next ring and eases onto the runway, so every
// frame is a real render of the game and the same seed gives the same frame.
import { RINGS, RUNWAY } from './config.js';
import { freshFlight, stepFlight } from './physics.js';
import { freshMission, applyEvents } from './missions.js';
import { CAMERA_CHASE, CAMERA_COCKPIT } from './render.js';
import { groundHeight } from './terrain.js';

const SAMPLE = 1 / 30;

/** Steer toward a point: roll to turn, pitch to hold altitude. */
function autopilotInput(flight, targetX, targetY, targetZ, throttleTarget) {
  const dx = targetX - flight.x;
  const dz = targetZ - flight.z;
  const wantHeading = Math.atan2(dx, -dz);
  let diff = wantHeading - flight.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const roll = Math.max(-0.5, Math.min(0.5, -diff * 1.4));
  const altError = targetY - flight.y;
  let pitch = Math.max(-1, Math.min(1, -altError * 0.02));
  // Terrain avoidance: pull up hard when the ground gets too close,
  // whatever the target altitude says.
  if (flight.y < groundHeight(flight.x, flight.z) + 25) pitch = -1;
  return {
    pitch: -pitch,
    roll,
    throttleDelta: flight.throttle < throttleTarget ? 1 : -0.4,
    brake: false,
  };
}

/** Run the flight forward for `seconds` toward `targetOf(flight)`. */
function flyFor(flight, mission, seconds, targetOf, throttleTarget) {
  for (let t = 0; t < seconds; t += SAMPLE) {
    const target = targetOf(flight);
    const input = autopilotInput(flight, target.x, target.y, target.z, throttleTarget);
    const events = stepFlight(flight, input, SAMPLE);
    applyEvents(mission, flight, events);
    if (flight.crashed || flight.landed) break;
  }
}

/**
 * Set the world to the named scene and return the screen and camera to
 * draw over it. Scenes: start (cover), cockpit, ring, landing.
 */
export function stageShot(name, flight, mission) {
  const fresh = freshFlight();
  Object.assign(flight, fresh);
  Object.assign(mission, freshMission());

  if (name === 'cockpit') {
    // A shorter climb toward ring 1: gentle bank, nose over the coast.
    flyFor(flight, mission, 18, (f) => (f.ringsDone < RINGS.length ? RINGS[f.ringsDone] : { x: 0, y: 60, z: 420 }), 0.7);
    // Freeze the frame wings-level so the cockpit reads, not the bank.
    flight.roll = 0;
    flight.pitch = 0.02;
    return { screen: 'play', camera: CAMERA_COCKPIT };
  }
  if (name === 'ring') {
    // Fly low along the coast toward ring 1, framed just before the hoop.
    flyFor(flight, mission, 16, (f) => (f.ringsDone < RINGS.length ? RINGS[f.ringsDone] : { x: 0, y: 60, z: 420 }), 0.75);
    return { screen: 'play', camera: CAMERA_CHASE };
  }
  if (name === 'landing') {
    // Complete the route, then set up a gentle final approach.
    flyFor(flight, mission, 150, (f) => (f.ringsDone < RINGS.length ? RINGS[f.ringsDone] : { x: 0, y: 45, z: 700 }), 0.7);
    flight.ringsDone = RINGS.length;
    flight.x = 0;
    flight.z = RUNWAY.z + 220;
    flight.y = 32;
    flight.heading = 0;
    flight.pitch = -0.08;
    flight.roll = 0;
    flight.speed = 28;
    flight.throttle = 0.35;
    flight.fuel = 42;
    return { screen: 'play', camera: CAMERA_CHASE };
  }
  // start (cover): rolling down the runway, then climbing away with the
  // runway below, the town and a ring ahead — shown in play, HUD lit.
  flyFor(flight, mission, 10, () => ({ x: -160, y: 75, z: -150 }), 0.85);
  return { screen: 'play', camera: CAMERA_CHASE };
}
