// Seeded randomness and value noise for the archipelago.
// One clear job: deterministic numbers — same seed, same islands, every run.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Integer-lattice hash -> [0, 1). Stable for any (x, z) pair.
export function hash2(ix, iz, seed) {
  let h = (ix * 374761393 + iz * 668265263 + seed * 974634211) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function smooth(t) { return t * t * (3 - 2 * t); }

// 2D value noise in [-1, 1], one octave.
export function valueNoise(x, z, seed) {
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const a = hash2(ix, iz, seed), b = hash2(ix + 1, iz, seed);
  const c = hash2(ix, iz + 1, seed), d = hash2(ix + 1, iz + 1, seed);
  const u = smooth(fx), v = smooth(fz);
  const top = a + (b - a) * u, bot = c + (d - c) * u;
  return (top + (bot - top) * v) * 2 - 1;
}

// Fractal brownian motion, 3 octaves, in [-1, 1].
export function fbm(x, z, seed) {
  let sum = 0, amp = 0.55, freq = 1, norm = 0;
  for (let i = 0; i < 3; i++) {
    sum += amp * valueNoise(x * freq, z * freq, seed + i * 101);
    norm += amp; amp *= 0.5; freq *= 2.1;
  }
  return sum / norm;
}
