// Langit Nusantara — missions and scoring. The sortie is a fixed route:
// five delivery rings in order, an optional fuel ring, then a landing on
// the home runway. This module turns flight events into score and verdicts.
import { FUEL_RING, RINGS, SCORING } from './config.js';
import { EVENT_CRASHED, EVENT_DAMAGE, EVENT_FUEL, EVENT_LANDED, EVENT_RING } from './physics.js';

/** A fresh mission ledger. */
export function freshMission() {
  return {
    score: 0,
    rings: 0,
    fuelStops: 0,
    startTime: 0,
    finished: false,
    outcome: '', // 'complete' | 'crashed'
    cause: '',
    breakdown: [],
  };
}

/**
 * Fold one flight step's events into the mission. Returns a short message
 * for the HUD toast, or '' when nothing is worth announcing.
 */
export function applyEvents(mission, flight, events) {
  if (events & EVENT_RING) {
    mission.rings = flight.ringsDone;
    mission.score += SCORING.ringPoints;
    mission.breakdown.push(`Ring ${flight.ringsDone}: +${SCORING.ringPoints}`);
    if (flight.ringsDone >= RINGS.length) {
      return 'All rings done! Return to the runway and land.';
    }
    return `${RINGS[flight.ringsDone - 1].label} — +${SCORING.ringPoints} points!`;
  }
  if (events & EVENT_FUEL) {
    mission.fuelStops += 1;
    mission.score += SCORING.fuelBonus;
    mission.breakdown.push(`Fuel ring: +${SCORING.fuelBonus}`);
    return 'Fuel topped up! +50 points';
  }
  if (events & EVENT_DAMAGE) {
    mission.score = Math.max(0, mission.score - 25);
    return 'Damage! −25 points';
  }
  if (events & EVENT_LANDED) {
    const timeBonus = Math.max(0, Math.round((SCORING.timeParSeconds - flight.time) * SCORING.timeBonusPerSecond));
    const fuelBonus = Math.round(flight.fuel * SCORING.fuelBonusPerUnit);
    const landingBonus = flight.landingSoftness > 0.6
      ? SCORING.softLandingBonus
      : SCORING.firmLandingBonus;
    mission.score += timeBonus + fuelBonus + landingBonus;
    mission.breakdown.push(`Time bonus: +${timeBonus}`);
    mission.breakdown.push(`Fuel left: +${fuelBonus}`);
    mission.breakdown.push(`Landing: +${landingBonus}`);
    mission.finished = true;
    mission.outcome = 'complete';
    return 'Mission complete — welcome home, courier!';
  }
  if (events & EVENT_CRASHED) {
    mission.finished = true;
    mission.outcome = 'crashed';
    mission.cause = flight.crashCause;
    return flight.crashCause;
  }
  return '';
}

/** The next navigation target: a ring, the fuel ring, or the runway. */
export function nextTarget(flight) {
  if (flight.ringsDone < RINGS.length) return RINGS[flight.ringsDone];
  return { x: 0, y: 40, z: 420, r: 30, label: 'Runway — land here' };
}

/** Bearing (degrees) and distance to the next target, for the HUD. */
export function targetBearing(flight) {
  const target = nextTarget(flight);
  const dx = target.x - flight.x;
  const dz = target.z - flight.z;
  const bearing = (Math.atan2(dx, -dz) * 180) / Math.PI;
  return { bearing: Math.round(((bearing + 360) % 360)), distance: Math.round(Math.hypot(dx, dz)) };
}

export { FUEL_RING, RINGS };
