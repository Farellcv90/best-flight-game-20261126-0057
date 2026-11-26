// Langit Nusantara — staged screenshot scenes. Each scene plays the real
// rules forward from a fresh world, steered by a simple autopilot that
// climbs, turns toward the next ring and eases onto the runway, so every
// frame is a real render of the game and the same seed gives the same frame.
import { RINGS, RUNWAY } from './config.js';
import { freshFlight, stepFlight } from './physics.js';
import { freshMission, applyEvents } from './missions.js';
import { CAMERA_CHASE, CAMERA_COCKPIT } from './render.js';

const SAMPLE = 1 / 30;

/** Steer toward a point: roll to turn, pitch to hold altitude. */
function autopilotInput(flight, targetX, targetY, targetZ, throttleTarget) {
  const dx = targetX - flight.x;
  const dz = targetZ - flight.z;
  const wantHeading = Math.atan2(dx, -dz);
  let diff = wantHeading - flight.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  const roll = Math.max(-1, Math.min(1, -diff * 1.4));
  const altError = targetY - flight.y;
  const pitch = Math.max(-1, Math.min(1, -altError * 0.02));
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
    flyFor(flight, mission, 26, (f) => (f.ringsDone < RINGS.length ? RINGS[f.ringsDone] : { x: 0, y: 60, z: 420 }), 0.7);
    return { screen: 'play', camera: CAMERA_COCKPIT };
  }
  if (name === 'ring') {
    // Fly low along the coast toward ring 1, framed just before the hoop.
    flyFor(flight, mission, 30, (f) => (f.ringsDone < RINGS.length ? RINGS[f.ringsDone] : { x: 0, y: 60, z: 420 }), 0.75);
    return { screen: 'play', camera: CAMERA_CHASE };
  }
  if (name === 'landing') {
    // Complete the route, then set up a gentle final approach.
    flyFor(flight, mission, 150, (f) => (f.ringsDone < RINGS.length ? RINGS[f.ringsDone] : { x: 0, y: 45, z: 700 }), 0.7);
    flight.ringsDone = RINGS.length;
    flight.x = 0;
    flight.z = RUNWAY.z + 420;
    flight.y = 48;
    flight.heading = 0;
    flight.pitch = -0.08;
    flight.roll = 0;
    flight.speed = 30;
    flight.throttle = 0.35;
    flight.fuel = 42;
    return { screen: 'play', camera: CAMERA_CHASE };
  }
  // start (cover): rolling down the runway, rings and town ahead.
  flyFor(flight, mission, 9, () => ({ x: 0, y: 30, z: -200 }), 0.85);
  return { screen: 'title', camera: CAMERA_CHASE };
}
