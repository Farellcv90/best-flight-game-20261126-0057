// Langit Nusantara — the arcade flight model. A small state object holds
// the plane's position, attitude, speed, throttle, fuel and damage; step()
// advances it one tick from the pilot's inputs and the wind, and reports
// events (ring collected, touchdown, crash) for the mission layer.
import { FUEL_RING, PLANE, RINGS, RUNWAY, WIND } from './config.js';
import { groundHeight, onRunway } from './terrain.js';

export const EVENT_NONE = 0;
export const EVENT_RING = 1;
export const EVENT_FUEL = 2;
export const EVENT_LANDED = 4;
export const EVENT_CRASHED = 8;
export const EVENT_DAMAGE = 16;

/** A fresh flight, sitting on the runway threshold ready to roll. */
export function freshFlight() {
  return {
    x: RUNWAY.x,
    y: groundHeight(RUNWAY.x, RUNWAY.z + RUNWAY.length / 2 - 10) + PLANE.gearHeight,
    z: RUNWAY.z + RUNWAY.length / 2 - 10,
    heading: 0, // 0 = north (-z), grows clockwise
    pitch: 0,
    roll: 0,
    speed: 0,
    throttle: 0,
    fuel: PLANE.fuelCapacity,
    damage: 0,
    ringsDone: 0,
    fuelUsed: false,
    airborne: false,
    verticalSpeed: 0,
    time: 0,
    crashed: false,
    crashCause: '',
    landed: false,
    landingSoftness: 0,
    windX: 0,
    windZ: 0,
  };
}

/** Current wind vector: a steady breeze plus a slow sinusoidal gust. */
export function windAt(time) {
  const gust = Math.sin(time / WIND.gustPeriod) * WIND.gustStrength;
  const speed = WIND.baseSpeed + gust;
  const dir = Math.PI / 4; // blows from the north-east
  return { x: Math.sin(dir) * speed, z: Math.cos(dir) * speed };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * Advance the flight one tick. `input` carries pitch/roll stick (-1..1),
 * throttleDelta (-1..1) and brake. Returns an event bitmask.
 */
export function stepFlight(flight, input, dt) {
  if (flight.crashed || flight.landed) return EVENT_NONE;
  let events = EVENT_NONE;
  flight.time += dt;

  // Throttle and fuel.
  flight.throttle = clamp(flight.throttle + input.throttleDelta * PLANE.throttleRate * dt, 0, 1);
  flight.fuel = Math.max(0, flight.fuel - flight.throttle * PLANE.fuelBurn * dt);
  if (flight.fuel <= 0 && flight.throttle > 0.25) flight.throttle = 0.25;

  // Wind pushes the airframe sideways.
  const wind = windAt(flight.time);
  flight.windX = wind.x;
  flight.windZ = wind.z;

  // Attitude follows the stick, eased so the plane feels weighty.
  const targetRoll = input.roll * 0.9;
  const targetPitch = input.pitch * 0.55;
  flight.roll += (targetRoll - flight.roll) * Math.min(1, dt * 3.2);
  flight.pitch += (targetPitch - flight.pitch) * Math.min(1, dt * 2.6);

  // Speed chases the throttle setting; the brake sheds it fast.
  const targetSpeed = flight.throttle * PLANE.maxSpeed;
  const accel = flight.speed < targetSpeed ? 9 : 14;
  flight.speed += clamp(targetSpeed - flight.speed, -accel * dt, accel * dt);
  if (input.brake) flight.speed = Math.max(0, flight.speed - 22 * dt);

  // Heading turns with bank, more at higher speed.
  const turnAuthority = clamp(flight.speed / PLANE.maxSpeed, 0, 1);
  flight.heading -= flight.roll * PLANE.turnRate * turnAuthority * dt;
  flight.heading = ((flight.heading + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

  // Forward motion plus climb/sink from pitch and lift.
  const forwardX = Math.sin(flight.heading);
  const forwardZ = -Math.cos(flight.heading);
  const lift = flight.speed > PLANE.stallSpeed
    ? Math.sin(flight.pitch) * flight.speed
    : -PLANE.sinkRate * (1 - flight.speed / PLANE.stallSpeed);
  flight.verticalSpeed = lift;
  flight.x += (forwardX * flight.speed + flight.windX * 0.35) * dt;
  flight.z += (forwardZ * flight.speed + flight.windZ * 0.35) * dt;

  // On the ground the plane rolls on its gear: it cannot sink through the
  // runway while it is still gathering speed, and it only leaves the
  // ground once it has rotation speed and the nose is up.
  const groundNow = groundHeight(flight.x, flight.z);
  if (!flight.airborne) {
    flight.y = groundNow + PLANE.gearHeight;
    flight.verticalSpeed = 0;
    if (flight.speed > 26 && flight.pitch > 0.04) {
      flight.airborne = true;
      flight.y += lift * dt;
    }
  } else {
    flight.y += flight.verticalSpeed * dt;
  }

  // Stay inside the playfield: a soft invisible fence turns you back.
  const radius = Math.hypot(flight.x, flight.z);
  if (radius > 1150) {
    flight.heading += Math.PI * dt * 0.5;
    flight.x *= 1150 / radius;
    flight.z *= 1150 / radius;
  }

  // Rings: fly through the next glowing ring in order.
  const ring = RINGS[flight.ringsDone];
  if (ring) {
    const dx = flight.x - ring.x;
    const dy = flight.y - ring.y;
    const dz = flight.z - ring.z;
    if (Math.hypot(dx, dy, dz) < ring.r) {
      flight.ringsDone += 1;
      events |= EVENT_RING;
    } else if (Math.hypot(dx, dz) < 3 && Math.abs(dy) < ring.r + 2) {
      // Clipped the ring post: a glancing blow, not a pass.
      flight.damage += 12;
      events |= EVENT_DAMAGE;
      if (flight.damage >= PLANE.maxDamage) {
        flight.crashed = true;
        flight.crashCause = 'Ring post strike — airframe broke apart';
        return events | EVENT_CRASHED;
      }
    }
  }

  // Floating fuel ring: one refill per sortie.
  if (!flight.fuelUsed) {
    const dx = flight.x - FUEL_RING.x;
    const dy = flight.y - FUEL_RING.y;
    const dz = flight.z - FUEL_RING.z;
    if (Math.hypot(dx, dy, dz) < FUEL_RING.r) {
      flight.fuel = PLANE.fuelCapacity;
      flight.fuelUsed = true;
      events |= EVENT_FUEL;
    }
  }

  // Ground contact: the moment of truth for every landing.
  const ground = groundHeight(flight.x, flight.z);
  const clearance = flight.y - PLANE.gearHeight - ground;
  if (clearance <= 0) {
    flight.y = ground + PLANE.gearHeight;
    if (!flight.airborne) {
      // Still rolling on its gear: no touchdown, no damage, keep speed.
      return events;
    }
    const vertical = Math.abs(flight.verticalSpeed);
    const onStrip = onRunway(flight.x, flight.z);
    const aligned = Math.abs(flight.heading) < 0.35 || Math.abs(Math.abs(flight.heading) - Math.PI) < 0.35;
    const gentle = vertical < 3.2 && flight.speed < 34 && Math.abs(flight.roll) < 0.35;
    if (flight.speed < 10 && vertical < 3.2) {
      // Rolled to a stop: back on the ground, no drama.
      flight.airborne = false;
      flight.pitch = 0;
      flight.roll = 0;
      return events;
    }
    if (onStrip && aligned && gentle && flight.ringsDone >= RINGS.length) {
      flight.landed = true;
      flight.landingSoftness = clamp(1 - vertical / 3.2, 0, 1);
      return events | EVENT_LANDED;
    }
    if (onStrip && aligned && gentle) {
      // A fine touchdown, but the delivery is not finished: roll on.
      flight.speed = Math.max(0, flight.speed - 30 * dt);
      flight.pitch = 0;
      flight.roll *= 0.5;
      return events;
    }
    if (vertical > 7 || flight.speed > 55) {
      flight.crashed = true;
      flight.crashCause = onStrip
        ? 'Hard landing — the gear collapsed on the runway'
        : 'Terrain strike — flew into the island';
      return events | EVENT_CRASHED;
    }
    // A rough bump: damage, bounce, keep flying if you can.
    flight.damage += Math.round(vertical * 4 + 8);
    flight.y = ground + PLANE.gearHeight + 1.5;
    flight.verticalSpeed = 2;
    events |= EVENT_DAMAGE;
    if (flight.damage >= PLANE.maxDamage) {
      flight.crashed = true;
      flight.crashCause = 'Airframe damage — the courier is down';
      return events | EVENT_CRASHED;
    }
  }

  // Out of fuel over the sea with no speed left: ditch.
  if (flight.fuel <= 0 && flight.speed < PLANE.stallSpeed && flight.airborne) {
    flight.crashed = true;
    flight.crashCause = 'Out of fuel — ditched in the sea';
    return events | EVENT_CRASHED;
  }
  return events;
}
