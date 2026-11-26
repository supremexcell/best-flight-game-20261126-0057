// Coral Archipelago Air Rally — mission tuning and world constants.
// One clear job: every number the game balances on lives here.

export const WORLD = {
  size: 3600,          // world is size x size metres, centred on 0,0
  seaLevel: 0,
  seed: 20261126,      // fixed seed: the same islands every run
};

export const PLANE = {
  maxSpeed: 96,        // metres per second at full throttle
  minSpeed: 26,        // below this the wing stops flying
  accel: 26,           // m/s^2 toward target speed
  maxRoll: 1.05,       // radians of bank
  maxPitch: 0.55,      // radians nose up / down
  rollRate: 2.6,       // rad/s toward target bank
  pitchRate: 2.2,      // rad/s toward target pitch
  turnFactor: 0.85,    // heading change per radian of bank
  startX: -260,        // parked on Coral Strip, facing +X
  startZ: -900,
  startHeading: Math.PI / 2, // +X
};

// Coral Strip runway: a flat coral-sand strip on the home island.
export const RUNWAY = {
  x: 0, z: -900, length: 560, width: 64, height: 4,
  heading: Math.PI / 2,
};

// Ten rings: [x, z, altitude]. A tour over the islands, ending back at the strip.
export const RINGS = [
  [  120, -720,  70],
  [  420, -380, 110],
  [  760, -120,  90],
  [  980,  320, 140],
  [  640,  760, 100],
  [  180,  980, 130],
  [ -320,  820,  80],
  [ -720,  520, 120],
  [ -860,   60,  90],
  [ -520, -520,  70],
];

export const GAME = {
  ringScore: 100,
  ringFuel: 14,        // fuel points a ring gives back
  fuelStart: 100,
  fuelDrain: 1.6,      // points per second at full throttle
  landingScore: 500,
  fuelBonusPerPoint: 5,
  timeLimitSeconds: 420,
};
