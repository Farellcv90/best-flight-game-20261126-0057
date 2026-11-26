// Langit Nusantara — the cockpit HUD. A DOM overlay kept always visible
// while flying: altitude, speed, heading, throttle, fuel, score, ring
// counter, mission text, an artificial horizon, and warning lights. The
// instruments are drawn with lit gradients and needles, not flat text.
import { PLANE, RINGS } from './config.js';

const KNOTS_PER_MS = 1.94384;

function el(tag, className, parent) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  parent.appendChild(node);
  return node;
}

/** Build the HUD overlay inside `root` and return its update functions. */
export function createHud(root) {
  const hud = el('div', 'hud', root);

  const topBar = el('div', 'hud-top', hud);
  const mission = el('div', 'hud-mission', topBar);
  const scoreBox = el('div', 'hud-score', topBar);
  const scoreValue = el('span', 'hud-score-value', scoreBox);
  scoreValue.textContent = '0';
  const scoreLabel = el('span', 'hud-score-label', scoreBox);
  scoreLabel.textContent = 'SCORE';

  const leftCluster = el('div', 'hud-left', hud);
  const altBox = el('div', 'gauge', leftCluster);
  el('div', 'gauge-label', altBox).textContent = 'ALTITUDE';
  const altValue = el('div', 'gauge-value', altBox);
  const altBar = el('div', 'gauge-bar', altBox);
  const altFill = el('div', 'gauge-fill alt-fill', altBar);

  const spdBox = el('div', 'gauge', leftCluster);
  el('div', 'gauge-label', spdBox).textContent = 'AIRSPEED';
  const spdValue = el('div', 'gauge-value', spdBox);
  const spdBar = el('div', 'gauge-bar', spdBox);
  const spdFill = el('div', 'gauge-fill spd-fill', spdBar);

  const hdgBox = el('div', 'gauge', leftCluster);
  el('div', 'gauge-label', hdgBox).textContent = 'HEADING';
  const hdgValue = el('div', 'gauge-value', hdgBox);
  const compass = el('div', 'compass', hdgBox);
  const needle = el('div', 'compass-needle', compass);

  // Artificial horizon: a rotating sky/ground disc inside a bezel.
  const horizonBox = el('div', 'horizon-box', hud);
  el('div', 'gauge-label', horizonBox).textContent = 'ATTITUDE';
  const horizon = el('div', 'horizon', horizonBox);
  const horizonDisc = el('div', 'horizon-disc', horizon);
  el('div', 'horizon-sky', horizonDisc);
  el('div', 'horizon-ground', horizonDisc);
  el('div', 'horizon-line', horizonDisc);
  el('div', 'horizon-fixed', horizon);

  const rightCluster = el('div', 'hud-right', hud);
  const thrBox = el('div', 'gauge', rightCluster);
  el('div', 'gauge-label', thrBox).textContent = 'THROTTLE';
  const thrValue = el('div', 'gauge-value', thrBox);
  const thrBar = el('div', 'gauge-bar vertical', thrBox);
  const thrFill = el('div', 'gauge-fill thr-fill', thrBar);

  const fuelBox = el('div', 'gauge', rightCluster);
  el('div', 'gauge-label', fuelBox).textContent = 'FUEL';
  const fuelValue = el('div', 'gauge-value', fuelBox);
  const fuelBar = el('div', 'gauge-bar', fuelBox);
  const fuelFill = el('div', 'gauge-fill fuel-fill', fuelBar);

  const ringBox = el('div', 'gauge', rightCluster);
  el('div', 'gauge-label', ringBox).textContent = 'DELIVERY RINGS';
  const ringValue = el('div', 'gauge-value', ringBox);
  const ringDots = el('div', 'ring-dots', ringBox);
  const dots = [];
  for (let i = 0; i < RINGS.length; i += 1) {
    const dot = el('span', 'ring-dot', ringDots);
    dot.textContent = '●';
    dots.push(dot);
  }

  const warnings = el('div', 'hud-warnings', hud);
  const warnFuel = el('div', 'warn warn-fuel', warnings);
  warnFuel.textContent = 'LOW FUEL';
  const warnDamage = el('div', 'warn warn-damage', warnings);
  warnDamage.textContent = 'DAMAGE';
  const warnStall = el('div', 'warn warn-stall', warnings);
  warnStall.textContent = 'STALL';
  const warnWind = el('div', 'warn warn-wind', warnings);
  warnWind.textContent = 'WIND GUST';

  const toast = el('div', 'hud-toast', hud);

  let toastTimer = 0;

  function showToast(text, seconds = 2.5) {
    toast.textContent = text;
    toast.classList.add('show');
    toastTimer = seconds;
  }

  /** Refresh every instrument from the current flight state. */
  function update(flight, score, dt) {
    const altitudeM = Math.max(0, flight.y - 6);
    altValue.textContent = `${Math.round(altitudeM)} m`;
    altFill.style.width = `${Math.min(100, altitudeM / 3)}%`;
    const knots = Math.round(flight.speed * KNOTS_PER_MS);
    spdValue.textContent = `${knots} kt`;
    spdFill.style.width = `${Math.min(100, (flight.speed / PLANE.maxSpeed) * 100)}%`;
    const degrees = Math.round(((flight.heading * 180) / Math.PI + 360) % 360);
    hdgValue.textContent = `${String(degrees).padStart(3, '0')}°`;
    needle.style.transform = `rotate(${degrees}deg)`;
    thrValue.textContent = `${Math.round(flight.throttle * 100)}%`;
    thrFill.style.height = `${flight.throttle * 100}%`;
    fuelValue.textContent = `${Math.round(flight.fuel)}%`;
    fuelFill.style.width = `${flight.fuel}%`;
    fuelFill.classList.toggle('low', flight.fuel < 25);
    scoreValue.textContent = String(score);
    ringValue.textContent = `${flight.ringsDone} / ${RINGS.length}`;
    dots.forEach((dot, i) => dot.classList.toggle('done', i < flight.ringsDone));
    const next = RINGS[flight.ringsDone];
    mission.textContent = next
      ? `✈ ${next.label} — fly through the green ring`
      : '✈ All rings done — land on the runway!';
    horizonDisc.style.transform = `rotate(${-flight.roll}rad) translateY(${flight.pitch * 40}px)`;
    warnFuel.classList.toggle('on', flight.fuel < 25);
    warnDamage.classList.toggle('on', flight.damage > 40);
    warnStall.classList.toggle('on', flight.airborne && flight.speed < PLANE.stallSpeed + 3);
    warnWind.classList.toggle('on', Math.abs(flight.windX) + Math.abs(flight.windZ) > 9);
    if (toastTimer > 0) {
      toastTimer -= dt;
      if (toastTimer <= 0) toast.classList.remove('show');
    }
  }

  function setVisible(visible) {
    hud.style.display = visible ? 'block' : 'none';
  }

  return { update, showToast, setVisible, root: hud };
}
