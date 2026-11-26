// Coral Archipelago Air Rally — game loop, camera, rings, input, states.
// One clear job: run the game: start, fly, pause, land, crash, restart.

import { WORLD, PLANE, RINGS, GAME, RUNWAY } from './config.js';
import { buildTerrain, heightAt } from './terrain.js';
import { buildPlane, spinPropeller } from './plane.js';
import { createFlightState, stepFlight } from './physics.js';
import {
  initHud, updateHud, showMessage, flashRing, showHud,
  showOverlay, hideOverlay, overlayButton,
} from './hud.js';
import {
  initAudio, resumeAudio, startEngine, updateEngine,
  playRingChime, playLandingFanfare, playCrash,
} from './audio.js';

const params = new URLSearchParams(location.search);
const SHOT = params.get('shot') ? parseInt(params.get('shot'), 10) : 0;

let renderer, scene, camera, plane, flight;
let phase = 'title';            // title | flying | paused | landed | crashed
let finalLeg = false;         // all rings done — head for the runway
let ringIndex = 0, score = 0, elapsed = 0;
let ringMeshes = [];
let camPos = new THREE.Vector3();
let camLook = new THREE.Vector3();
let titleAngle = 0.6;
let stallWarned = false;

const keys = {};
const mouse = { x: 0, y: 0, active: false };

function readInput() {
  return {
    throttleUp: !!keys['KeyW'],
    throttleDown: !!keys['KeyS'],
    rollLeft: !!keys['KeyA'] || !!keys['ArrowLeft'],
    rollRight: !!keys['KeyD'] || !!keys['ArrowRight'],
    pitchUp: !!keys['ArrowUp'],
    pitchDown: !!keys['ArrowDown'],
    mouseX: mouse.active ? mouse.x : 0,
    mouseY: mouse.active ? mouse.y : 0,
  };
}
// W/S are throttle; arrows pitch (up/down) and roll (left/right).

function buildRings() {
  const group = new THREE.Group();
  ringMeshes = RINGS.map(([x, z, alt], i) => {
    const ring = new THREE.Group();
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(13, 1.3, 12, 40),
      new THREE.MeshBasicMaterial({ color: 0xff9f1c, transparent: true, opacity: 0.95 }),
    );
    ring.add(torus);
    const glow = new THREE.Mesh(
      new THREE.CircleGeometry(12.4, 32),
      new THREE.MeshBasicMaterial({ color: 0xffc46b, transparent: true, opacity: 0.14, side: THREE.DoubleSide }),
    );
    ring.add(glow);
    ring.position.set(x, alt, z);
    // Face the ring toward the next ring (or the runway for the last).
    const next = RINGS[i + 1] || [RUNWAY.x, RUNWAY.z, RUNWAY.height + 30];
    ring.lookAt(next[0], next[2], next[1]);
    ring.userData = { passed: false, baseScale: 1 };
    group.add(ring);
    return ring;
  });
  scene.add(group);
}

function markRingPassed(i) {
  const ring = ringMeshes[i];
  ring.userData.passed = true;
  ring.children[0].material = new THREE.MeshBasicMaterial({ color: 0x2aff66, transparent: true, opacity: 0.55 });
  ring.children[1].material.opacity = 0.05;
}

function resetGame() {
  flight = createFlightState();
  ringIndex = 0; score = 0; elapsed = 0; stallWarned = false; finalLeg = false;
  for (const ring of ringMeshes) {
    ring.userData.passed = false;
    ring.children[0].material = new THREE.MeshBasicMaterial({ color: 0xff9f1c, transparent: true, opacity: 0.95 });
    ring.children[1].material.opacity = 0.14;
    ring.scale.set(1, 1, 1);
  }
}

function startFlying() {
  resumeAudio();
  startEngine();
  resetGame();
  phase = 'flying';
  hideOverlay();
  showHud(true);
  showMessage('Full throttle — lift off from Coral Strip!', 3.2);
}

function endLanded() {
  phase = 'landed';
  const allRings = ringIndex >= RINGS.length;
  const timeBonus = allRings ? Math.max(0, Math.round((GAME.timeLimitSeconds - elapsed) * 2)) : 0;
  const fuelBonus = allRings ? Math.round(flight.fuel) * GAME.fuelBonusPerPoint : 0;
  const landingBonus = allRings ? GAME.landingScore : 100;
  score += landingBonus + fuelBonus + timeBonus;
  playLandingFanfare();
  showOverlay({
    kicker: 'TOUCHDOWN — CORAL STRIP',
    title: allRings ? 'WHEELS DOWN,<br>CAPTAIN!' : 'WHEELS DOWN —<br>EARLY LANDING',
    sub: allRings
      ? 'All ten rings, one smooth landing. The archipelago is yours.'
      : 'A safe landing — but rings are still out there. Fly again and finish the course!',
    statsHtml: `SCORE <span class="big">${score}</span><br>RINGS ${ringIndex} / 10 · TIME ${fmtClock(elapsed)}<br>Landing +${landingBonus} · Fuel bonus +${fuelBonus} · Time bonus +${timeBonus}`,
    button: 'FLY AGAIN',
  });
  showHud(true);
}

function endCrashed(reason) {
  phase = 'crashed';
  playCrash();
  showOverlay({
    kicker: 'SORTIE OVER',
    title: 'KITEFIN DOWN',
    sub: `The little coral plane ${reason}. The rings are still out there — go again.`,
    statsHtml: `SCORE <span class="big">${score}</span><br>RINGS ${ringIndex} / 10 · TIME ${fmtClock(elapsed)}`,
    button: 'FLY AGAIN',
  });
  showHud(true);
}

function fmtClock(s) {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${m}:${String(ss).padStart(2, '0')}`;
}

function showTitle() {
  phase = 'title';
  resetGame();
  showOverlay({
    kicker: 'MAKE.FUN · BEST FLIGHT GAME',
    title: 'CORAL ARCHIPELAGO<br>AIR RALLY',
    sub: 'Ten glowing rings over a tropical archipelago, then a wheels-down landing on Coral Strip. Watch your fuel — every ring tops the tank back up.',
    statsHtml: '',
    button: 'CLICK TO FLY',
  });
  showHud(false);
}

function togglePause() {
  if (phase === 'flying') {
    phase = 'paused';
    showOverlay({
      kicker: 'PAUSED',
      title: 'HOLDING<br>PATTERN',
      sub: 'The Kitefin is circling, waiting for you.',
      statsHtml: `SCORE ${score} · RINGS ${ringIndex} / 10 · TIME ${fmtClock(elapsed)}`,
      button: 'RESUME FLYING',
    });
  } else if (phase === 'paused') {
    phase = 'flying';
    hideOverlay();
  }
}

function stepGame(dt) {
  if (phase !== 'flying') return;
  elapsed += dt;

  // Fuel: rings pay it back, throttle spends it.
  flight.fuel -= flight.throttle * GAME.fuelDrain * dt;
  if (flight.fuel <= 0) {
    flight.fuel = 0;
    flight.throttle = 0;
    if (!flight.fuelWarned) { flight.fuelWarned = true; showMessage('OUT OF FUEL — glide to the strip!', 3); }
  }
  if (elapsed > GAME.timeLimitSeconds && !flight.timeWarned) {
    flight.timeWarned = true;
    showMessage('Time up — land now to bank your score!', 3);
  }

  const input = readInput();
  const event = stepFlight(flight, input, dt);
  if (event === 'stalled' && !stallWarned) {
    stallWarned = true;
    showMessage('STALL! Nose down, throttle up!', 2.2);
  }
  if (event === 'stalled') stallWarned = true;
  if (event !== 'stalled') stallWarned = false;

  // Rings: fly through the glowing one. RINGS entries are [x, z, altitude].
  if (ringIndex < RINGS.length) {
    const [rx, rz, ralt] = RINGS[ringIndex];
    const d = Math.hypot(flight.x - rx, flight.y - ralt, flight.z - rz);
    if (d < 15.5) {
      markRingPassed(ringIndex);
      ringIndex++;
      score += GAME.ringScore;
      flight.fuel = Math.min(100, flight.fuel + GAME.ringFuel);
      playRingChime();
      flashRing();
      if (ringIndex >= RINGS.length) {
        finalLeg = true;
        showMessage('ALL RINGS! Land on Coral Strip — gently!', 3.5);
      } else {
        showMessage(`Ring ${ringIndex} / ${RINGS.length} — +${GAME.ringScore} pts, fuel topped up!`, 2.2);
      }
    }
  }

  if (event === 'landed') { endLanded(); return; }
  if (event === 'crashed') { endCrashed(flight.crashReason); return; }
}

function updatePlaneMesh(dt) {
  plane.position.set(flight.x, flight.y, flight.z);
  plane.rotation.set(0, 0, 0);
  plane.rotateY(flight.heading);
  plane.rotateX(-flight.pitch);
  plane.rotateZ(flight.roll);
  spinPropeller(plane, flight.speed, dt);
}

function updateCamera(dt) {
  const fx = Math.sin(flight.heading), fz = Math.cos(flight.heading);
  let desired, look;
  if (phase === 'title') {
    titleAngle += dt * 0.12;
    const px = flight.x + Math.sin(titleAngle) * 24;
    const pz = flight.z + Math.cos(titleAngle) * 24;
    desired = new THREE.Vector3(px, flight.y + 9, pz);
    look = new THREE.Vector3(flight.x, flight.y + 1, flight.z + 8);
  } else {
    desired = new THREE.Vector3(
      flight.x - fx * 21 + Math.sin(flight.heading + Math.PI / 2) * flight.roll * 4,
      flight.y + 7 - flight.pitch * 6,
      flight.z - fz * 21,
    );
    look = new THREE.Vector3(flight.x + fx * 30, flight.y + 2 + flight.pitch * 14, flight.z + fz * 30);
  }
  const k = 1 - Math.exp(-dt * (phase === 'title' ? 1.2 : 5));
  camPos.lerp(desired, k);
  camLook.lerp(look, k);
  // Keep the camera out of the sea and the hills.
  const ground = heightAt(camPos.x, camPos.z);
  camPos.y = Math.max(camPos.y, ground + 4);
  camera.position.copy(camPos);
  camera.lookAt(camLook);
}

function updateRings(dt, t) {
  ringMeshes.forEach((ring, i) => {
    if (ring.userData.passed) return;
    const isNext = i === ringIndex;
    const pulse = isNext ? 1 + Math.sin(t * 4) * 0.07 : 1;
    ring.scale.set(pulse, pulse, pulse);
  });
  const clouds = scene.getObjectByName('clouds');
  if (clouds) clouds.position.x = Math.sin(t * 0.004) * 40;
}

function renderFrame(dt, t) {
  stepGame(dt);
  updatePlaneMesh(dt);
  updateCamera(dt);
  updateRings(dt, t);
  updateEngine(flight.throttle, flight.speed, phase === 'flying');
  if (phase !== 'title') updateHud(flight, ringIndex, RINGS.length, score, elapsed, finalLeg ? 'final' : 'flying');
  renderer.render(scene, camera);
}

function init() {
  initHud();
  initAudio();
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.getElementById('game-root').appendChild(renderer.domElement);

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.5, 12000);
  buildTerrain(scene);
  buildRings();
  plane = buildPlane();
  scene.add(plane);

  flight = createFlightState();
  camPos.set(flight.x - 24, flight.y + 10, flight.z - 24);
  camLook.set(flight.x, flight.y, flight.z);

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Enter' && (phase === 'title' || phase === 'landed' || phase === 'crashed')) startFlying();
    if (e.code === 'KeyP') togglePause();
    if (e.code === 'KeyR' && phase !== 'title') startFlying();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    mouse.active = true;
  });
  window.addEventListener('mousedown', () => {
    if (phase === 'title' || phase === 'landed' || phase === 'crashed') startFlying();
    else if (phase === 'paused') togglePause();
  });
  overlayButton().addEventListener('click', (e) => {
    e.stopPropagation();
    if (phase === 'paused') togglePause();
    else startFlying();
  });

  if (SHOT) {
    runShot(SHOT);
  } else {
    showTitle();
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      renderFrame(dt, now / 1000);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}

// Scripted screenshot poses: deterministic states, HUD on, overlay off.
// ?shot=1 cover — banking through ring 3 over the lagoon islands.
// ?shot=2 takeoff roll on Coral Strip, nose up, runway ahead.
// ?shot=3 low pass toward ring 5 with the mountain island behind.
// ?shot=4 final approach to Coral Strip, gear down, strip dead ahead.
function runShot(n) {
  hideOverlay();
  showHud(true);
  const poses = {
    1: { x: 574, y: 100, z: 678, heading: 0.68, pitch: 0.03, roll: -0.5, speed: 80, throttle: 0.8, ring: 4, fuel: 68, elapsed: 188 },
    2: { x: -220, y: 6.2, z: -900, heading: Math.PI / 2, pitch: 0.14, roll: 0, speed: 62, throttle: 1, ring: 0, fuel: 98, elapsed: 8 },
    3: { x: -634, y: 120, z: 618, heading: -2.42, pitch: -0.02, roll: 0.35, speed: 84, throttle: 0.75, ring: 7, fuel: 58, elapsed: 240 },
    4: { x: -380, y: 52, z: -900, heading: Math.PI / 2, pitch: -0.1, roll: 0.05, speed: 58, throttle: 0.35, ring: 10, fuel: 41, elapsed: 302 },
  };
  const p = poses[n] || poses[1];
  phase = 'flying';
  resetGame();
  Object.assign(flight, {
    x: p.x, y: p.y, z: p.z, heading: p.heading, pitch: p.pitch, roll: p.roll,
    speed: p.speed, throttle: p.throttle, fuel: p.fuel, onGround: n === 2,
  });
  ringIndex = p.ring;
  finalLeg = p.ring >= RINGS.length;
  score = p.ring * GAME.ringScore + 40;
  elapsed = p.elapsed;
  for (let i = 0; i < p.ring; i++) markRingPassed(i);
  // Settle the chase camera and spin the prop with fixed steps. The pose is
  // NOT simulated forward: the framing stays exactly as scripted.
  for (let i = 0; i < 150; i++) {
    updatePlaneMesh(1 / 60);
    updateCamera(1 / 60);
    updateRings(1 / 60, i / 60);
  }
  if (n === 1) showMessage('RING 5 / 10 — thread the needle!', 60);
  if (n === 3) showMessage('Ring 8 ahead — over the western isles!', 60);
  if (n === 4) showMessage('FINAL — land on Coral Strip!', 60);
  updateHud(flight, ringIndex, RINGS.length, score, elapsed, finalLeg ? 'final' : 'flying');
  renderer.render(scene, camera);
  document.title = 'SHOT-READY';
}

init();
