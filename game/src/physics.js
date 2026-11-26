// Arcade flight model: throttle, bank, pitch, stall, terrain and water.
// One clear job: move the plane one fixed step, and say what happened.

import { PLANE, RUNWAY } from './config.js';
import { heightAt } from './terrain.js';

export function createFlightState() {
  return {
    x: PLANE.startX, y: RUNWAY.height + 2.2, z: PLANE.startZ,
    heading: PLANE.startHeading, pitch: 0, roll: 0,
    speed: 0, throttle: 0, fuel: 100,
    onGround: true, everAirborne: false, crashed: false, landed: false, crashReason: '',
    verticalSpeed: 0,
  };
}

function overRunway(x, z) {
  return Math.abs(x - RUNWAY.x) < RUNWAY.length / 2 && Math.abs(z - RUNWAY.z) < RUNWAY.width / 2;
}

function approach(a, b, rate, dt) {
  const d = b - a;
  const step = rate * dt;
  if (Math.abs(d) <= step) return b;
  return a + Math.sign(d) * step;
}

// input: { throttleUp, throttleDown, rollLeft, rollRight, pitchUp, pitchDown,
//          mouseX, mouseY } — mouse values in [-1, 1], 0 when centred.
// Returns an event string: '' | 'stalled' | 'crashed' | 'landed'.
export function stepFlight(s, input, dt) {
  // Throttle.
  if (input.throttleUp) s.throttle = Math.min(1, s.throttle + 0.55 * dt);
  if (input.throttleDown) s.throttle = Math.max(0, s.throttle - 0.7 * dt);
  const targetSpeed = PLANE.minSpeed + s.throttle * (PLANE.maxSpeed - PLANE.minSpeed);
  s.speed = approach(s.speed, targetSpeed, PLANE.accel, dt);

  // Bank and pitch targets blend keys and mouse.
  const rollKey = (input.rollRight ? 1 : 0) - (input.rollLeft ? 1 : 0);
  const pitchKey = (input.pitchUp ? 1 : 0) - (input.pitchDown ? 1 : 0);
  const targetRoll = Math.max(-1, Math.min(1, rollKey + input.mouseX * 0.9)) * PLANE.maxRoll;
  const targetPitch = Math.max(-1, Math.min(1, pitchKey - input.mouseY * 0.8)) * PLANE.maxPitch;
  s.roll = approach(s.roll, targetRoll, PLANE.rollRate, dt);
  s.pitch = approach(s.pitch, targetPitch, PLANE.pitchRate, dt);

  // Turn: bank turns the heading, harder at speed.
  s.heading -= s.roll * PLANE.turnFactor * (s.speed / PLANE.maxSpeed) * dt * 1.6;

  // Stall: too slow in the air and the wing gives up — nose drops, we sink.
  let stalled = false;
  if (!s.onGround && s.speed < 42) {
    stalled = true;
    s.pitch = approach(s.pitch, -0.3, 1.2, dt);
  }

  // Vertical speed from pitch; a slow plane cannot hold altitude.
  const liftFactor = Math.min(1, s.speed / 55);
  s.verticalSpeed = Math.sin(s.pitch) * s.speed * liftFactor;
  if (!s.onGround && s.speed < 45) s.verticalSpeed -= (45 - s.speed) * 0.35;

  // Move. Wheels stay on the ground until liftoff speed with a pull:
  // pitch alone never hops a parked plane into the air.
  const fx = Math.sin(s.heading), fz = Math.cos(s.heading);
  s.x += fx * s.speed * dt;
  s.z += fz * s.speed * dt;
  const ground = heightAt(s.x, s.z);
  const gearClearance = 2.2;
  if (s.onGround) {
    s.y = ground + gearClearance;
    if (s.speed > 55 && s.pitch > 0.08) s.onGround = false;
    else s.verticalSpeed = 0; // still rolling: no climb rate to show
  } else {
    s.y += s.verticalSpeed * dt;
    if (s.y > ground + 20) s.everAirborne = true;
  }

  // Soft world edge: steer the plane back toward the archipelago.
  const edge = 1750;
  if (Math.abs(s.x) > edge || Math.abs(s.z) > edge) {
    const home = Math.atan2(-s.x, -s.z);
    let diff = home - s.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    s.heading += Math.max(-1, Math.min(1, diff)) * 0.5 * dt;
  }

  // Ground contact. A plane climbing away from the ground never counts as
  // touching it, even in the first instants after liftoff.
  if (s.y <= ground + gearClearance && s.verticalSpeed <= 0.5) {
    const gentle = Math.abs(s.pitch) < 0.16 && Math.abs(s.roll) < 0.3
      && s.speed < 78 && Math.abs(s.verticalSpeed) < 9;
    if (s.onGround) {
      s.y = ground + gearClearance;
      // Takeoff roll: lift off once fast enough with a little pull.
      if (s.speed > 55 && s.pitch > 0.08) s.onGround = false;
    } else if (overRunway(s.x, s.z)) {
      if (gentle && s.everAirborne) {
        s.landed = true;
        s.y = RUNWAY.height + gearClearance;
        return 'landed';
      }
      if (gentle) {
        // Settled straight back down after liftoff: a bounce, not a crash.
        s.onGround = true;
        s.y = ground + gearClearance;
      } else {
        s.crashed = true; s.crashReason = 'slammed into the runway';
        return 'crashed';
      }
    } else if (ground <= 1) {
      s.crashed = true; s.crashReason = 'ditched in the lagoon';
      return 'crashed';
    } else {
      s.crashed = true;
      s.crashReason = ground > 25 ? 'flew into the hillside' : 'hit the ground hard';
      return 'crashed';
    }
  }
  if (s.y < 1.2 && ground <= 1) {
    s.crashed = true; s.crashReason = 'ditched in the lagoon';
    return 'crashed';
  }
  if (s.onGround && s.y > ground + gearClearance + 0.5) s.onGround = false;
  return stalled ? 'stalled' : '';
}
