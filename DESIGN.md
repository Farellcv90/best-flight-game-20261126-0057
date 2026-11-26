# Langit Nusantara: Island Courier — Design

## Game name & concept
**Langit Nusantara: Island Courier.** You are a courier pilot flying a small
propeller mail plane across a golden-hour Indonesian archipelago. Take off from
the island runway, thread five glowing delivery rings in order, refuel at a
floating fuel ring if you need it, then bring the plane home and land softly on
the same runway. A complete sortie: takeoff, navigation, rings, fuel
management, landing.

## Controls
- Arrow keys / WASD — pitch and roll (elevator + ailerons)
- W / S or Shift / Ctrl — throttle up / down
- Space — airbrake / flaps (slows you, steadies the approach)
- Mouse — gentle steering trim (move to nudge pitch/roll)
- C — chase / cockpit camera, R — restart, P — pause, M — mute
- Click — menu buttons

## Missions & systems
- 5 delivery rings in fixed order over coast, town, hills, lagoon and runway.
- Fuel drains with throttle; a floating fuel ring refills the tank once.
- Wind gusts push the plane sideways and show on the HUD windsock.
- Damage: hard landing, terrain strike, or clipping a ring post. Three strikes
  or a bad crash ends the flight.
- Score: ring bonuses + time bonus + fuel left + landing softness.
- Best score saved in localStorage; screens: title, briefing, playing,
  paused, mission complete, crashed.

## Look
Golden-hour light, gradient sky, low sun, drifting clouds, a procedural
heightmap island with a runway strip, a small town of coloured roofs, palm
clusters, green hills and a blue sea. The plane is built from primitives:
fuselage, wings, tail, spinning propeller, landing gear, courier livery.
Instruments look lit: artificial horizon, gauges, warning lights.

## Sound (WebAudio only, synthesised)
Engine hum tied to throttle, wind noise tied to airspeed, ring chime,
touchdown thud, warning beep. No audio files, no network.

## File map (game/src/, one job each)
- config.js — constants: speeds, fuel, rings, scoring, colours
- random.js — seeded RNG (mulberry32) for deterministic terrain
- terrain.js — heightmap island, runway, town, palms, sea, sky, clouds
- aircraft.js — the courier plane mesh + propeller + gear
- physics.js — flight model: lift, drag, throttle, wind, ground, damage
- input.js — keyboard + mouse state
- hud.js — DOM instruments: altitude, speed, heading, throttle, fuel,
  score, rings, mission text, horizon, warnings
- audio.js — WebAudio synth: engine, wind, chimes, thud, beep
- missions.js — ring order, fuel ring, scoring, landing judgement
- shots.js — staged scenes: autopilot plays the real rules forward
- render.js — Three.js scene, cameras (chase + cockpit), lighting
- main.js — game loop, screens, state machine, wiring

## Screenshot plan (shots.json, ?shot=…&seed=1)
1. 1-cover.jpg — chase view, plane in frame, rings + runway ahead, HUD lit
2. 2-cockpit.jpg — cockpit view over the terrain with instruments
3. 3-ring.jpg — low pass through a ring over the coast
4. 4-landing.jpg — final approach to the runway
