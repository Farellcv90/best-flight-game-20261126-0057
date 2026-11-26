// Langit Nusantara: Island Courier — main loop and screens. Wires the
// flight model, renderer, HUD, audio and missions together and owns the
// screen state machine: title, briefing, playing, paused, complete, crashed.
// Shot mode (?shot=…) stages a real scene and freezes it for screenshots.
import { GAME, PLANE } from './config.js';
import { freshFlight, stepFlight, EVENT_CRASHED, EVENT_LANDED } from './physics.js';
import { createScene, renderFrame, CAMERA_CHASE, CAMERA_COCKPIT } from './render.js';
import { createHud } from './hud.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { freshMission, applyEvents } from './missions.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'langit-nusantara-best';

const canvas = document.getElementById('game');
const overlay = document.getElementById('overlay');
const hudRoot = document.getElementById('hud-root');

const world = createScene(canvas);
const hud = createHud(hudRoot);
const input = createInput();
const audio = createAudio();

let flight = freshFlight();
let mission = freshMission();
let screen = 'title'; // title | briefing | play | pause | complete | crashed
let cameraMode = CAMERA_CHASE;
let best = Number(localStorage.getItem(BEST_KEY) || 0);
let lastTime = performance.now();
let shotMode = null;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  const staged = stageShot(shotName, flight, mission);
  screen = staged.screen;
  cameraMode = staged.camera;
  flight.crashed = false;
  flight.crashCause = '';
  flight.landed = false;
  shotMode = shotName;
  hud.setVisible(true);
  hud.update(flight, mission.score, 0);
  if (shotName === 'start') hud.showToast('Langit Nusantara — Island Courier', 30);
}

function screenHtml() {
  if (screen === 'title') {
    return `<div class="panel">
      <h1>Langit Nusantara</h1>
      <h2>Island Courier</h2>
      <p class="tagline">Fly the mail run across the archipelago — five rings,
      one tank of fuel, and a runway waiting for you at golden hour.</p>
      <p class="controls">↑ ↓ pitch &nbsp;·&nbsp; ← → roll &nbsp;·&nbsp; W/S throttle
      &nbsp;·&nbsp; Space brake &nbsp;·&nbsp; C camera &nbsp;·&nbsp; P pause &nbsp;·&nbsp; M mute</p>
      <p class="best">Best score: ${best}</p>
      <button data-action="briefing">Briefing &amp; Fly</button>
    </div>`;
  }
  if (screen === 'briefing') {
    return `<div class="panel">
      <h1>Mission Briefing</h1>
      <p>Take off from the runway, fly through all five green delivery rings
      in order, then land back on the runway. The amber ring refills your
      fuel once. Watch the wind, mind the hills, and land gently.</p>
      <ul>
        <li>Ring 1 — Teluk Biru &nbsp;·&nbsp; Ring 2 — Bukit Hijau</li>
        <li>Ring 3 — Kota Pelabuhan &nbsp;·&nbsp; Ring 4 — Laguna</li>
        <li>Ring 5 — Final Approach, then land on the runway</li>
      </ul>
      <p class="controls">Throttle up with W / Shift. Rotate at 60 kt. Flare with Space.</p>
      <button data-action="play">Take Off</button>
    </div>`;
  }
  if (screen === 'pause') {
    return `<div class="panel"><h1>Paused</h1>
      <p>Score ${mission.score} · Rings ${flight.ringsDone}/5 · Fuel ${Math.round(flight.fuel)}%</p>
      <button data-action="play">Resume</button>
      <button data-action="restart">Restart</button></div>`;
  }
  if (screen === 'complete') {
    return `<div class="panel"><h1>Mission Complete!</h1>
      <p>Delivered all five rings and landed home.</p>
      <p class="score-big">${mission.score} points</p>
      <p>${mission.breakdown.join(' · ')}</p>
      <p class="best">Best score: ${best}</p>
      <button data-action="restart">Fly Again</button></div>`;
  }
  if (screen === 'crashed') {
    return `<div class="panel"><h1>Crashed</h1>
      <p>${mission.cause || 'The courier is down.'}</p>
      <p>Score ${mission.score} · Rings ${flight.ringsDone}/5</p>
      <button data-action="restart">Try Again</button></div>`;
  }
  return '';
}

function showScreen() {
  overlay.innerHTML = screenHtml();
  overlay.style.display = screen === 'play' ? 'none' : 'flex';
  hud.setVisible(screen === 'play' || screen === 'pause' || shotMode !== null);
  overlay.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', () => {
      audio.ensure();
      doAction(button.dataset.action);
    });
  });
}

function doAction(action) {
  if (action === 'briefing') {
    screen = 'briefing';
  } else if (action === 'play') {
    screen = 'play';
    audio.ensure();
  } else if (action === 'restart') {
    flight = freshFlight();
    mission = freshMission();
    screen = 'play';
  }
  showScreen();
}

function saveBest() {
  if (mission.score > best) {
    best = mission.score;
    localStorage.setItem(BEST_KEY, String(best));
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  // Global keys, checked once per frame.
  if (input.pressed('KeyM')) {
    const muted = audio.toggleMute();
    hud.showToast(muted ? 'Sound muted' : 'Sound on');
  }
  if (input.pressed('KeyC')) {
    cameraMode = cameraMode === CAMERA_CHASE ? CAMERA_COCKPIT : CAMERA_CHASE;
    hud.showToast(cameraMode === CAMERA_COCKPIT ? 'Cockpit view' : 'Chase view');
  }
  if (input.pressed('KeyR') && !shotMode) {
    flight = freshFlight();
    mission = freshMission();
    screen = 'play';
    showScreen();
  }
  if (input.pressed('KeyP') && !shotMode) {
    if (screen === 'play') {
      screen = 'pause';
      showScreen();
    } else if (screen === 'pause') {
      screen = 'play';
      showScreen();
    }
  }

  if (screen === 'play' && !shotMode) {
    const pilot = input.read();
    const events = stepFlight(flight, pilot, dt);
    const message = applyEvents(mission, flight, events);
    if (message) hud.showToast(message);
    if (events & EVENT_LANDED) {
      audio.touchdown();
      saveBest();
      screen = 'complete';
      showScreen();
    } else if (events & EVENT_CRASHED) {
      audio.crashSound();
      saveBest();
      screen = 'crashed';
      showScreen();
    } else if (events & 1) {
      audio.ringChime();
    } else if (events & 16) {
      audio.warningBeep();
    }
    audio.update(flight.throttle, flight.speed, PLANE.maxSpeed);
  } else if (shotMode) {
    audio.update(0, 0, PLANE.maxSpeed);
  }

  hud.update(flight, mission.score, dt);
  // In shot mode the physics is frozen but the camera, propeller and
  // clouds still animate, so the staged frame settles into place.
  renderFrame(world, flight, cameraMode, dt, now / 1000);
}

document.title = GAME.name;
showScreen();
requestAnimationFrame(frame);
