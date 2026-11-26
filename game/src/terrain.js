// Archipelago terrain: heightfield, sea, islands, palms, runway, clouds, sky.
// One clear job: build the world the plane flies over, and answer heightAt(x, z).

import { WORLD, RUNWAY } from './config.js';
import { fbm, mulberry32 } from './random.js';

// Eleven islands: [x, z, radius, peak height]. Hand-placed for a readable
// coastline: a home island with the runway, a big mountain island, and a
// ring of smaller green islands around a lagoon.
const ISLANDS = [
  [    0,  -900, 620,  42], // home island — Coral Strip
  [  950,   250, 540, 150], // mountain island
  [  420,  -380, 300,  68],
  [  760,  -120, 260,  55],
  [  640,   760, 330,  72],
  [  180,   980, 300,  60],
  [ -320,   820, 280,  58],
  [ -720,   520, 320,  84],
  [ -860,    60, 260,  48],
  [ -520,  -520, 300,  62],
  [ 1200,  -700, 240,  46],
];

function islandHeight(x, z) {
  let h = -14; // seabed
  for (const [cx, cz, r, peak] of ISLANDS) {
    const dx = (x - cx) / r, dz = (z - cz) / r;
    const d2 = dx * dx + dz * dz;
    if (d2 < 4) h += peak * Math.exp(-d2 * 1.6);
  }
  return h;
}

export function heightAt(x, z) {
  let h = islandHeight(x, z);
  // Rolling detail only where land rises above the sea.
  if (h > -2) h += fbm(x * 0.004, z * 0.004, WORLD.seed) * 9 * Math.min(1, Math.max(0, h / 40));
  // Flatten the runway shelf so landings read as landings: perfectly flat
  // across the whole strip, and a wide flat coral shelf around it so the
  // final approach is over low ground, feathering out over 250 m beyond.
  const beyond = Math.max(
    Math.abs(x - RUNWAY.x) - (RUNWAY.length / 2 + 150),
    Math.abs(z - RUNWAY.z) - (RUNWAY.width / 2 + 80),
  );
  if (beyond <= 0) return RUNWAY.height;
  const blend = Math.max(0, Math.min(1, beyond / 250));
  return RUNWAY.height * (1 - blend) + h * blend;
}

function terrainColor(h, slope) {
  // Sand at the waterline, grass on the slopes, rock on the peaks.
  if (h < 3.5) return [0.93, 0.82, 0.58];           // pale coral sand
  if (h < 7)   return [0.86, 0.78, 0.52];           // wet sand / dune grass
  if (h > 95 || slope > 0.55) return [0.52, 0.47, 0.42]; // grey rock
  if (h > 60)  return [0.42, 0.55, 0.28];           // high scrub
  return [0.26, 0.58, 0.26];                        // tropical green
}

export function buildTerrain(scene) {
  const size = WORLD.size, seg = 180;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);
    const hx = heightAt(x + 8, z) - heightAt(x - 8, z);
    const hz = heightAt(x, z + 8) - heightAt(x, z - 8);
    const slope = Math.hypot(hx, hz) / 16;
    const [r, g, b] = terrainColor(h, slope);
    // Patchy variation: two-tone grass and sun-bleached sand so the terrain
    // reads as land, not a flat green sheet.
    const patch = fbm(x * 0.008 + 40, z * 0.008, 21);
    const jitter = 0.88 + patch * 0.14;
    colors[i * 3] = r * jitter; colors[i * 3 + 1] = g * jitter; colors[i * 3 + 2] = b * jitter;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const mesh = new THREE.Mesh(geo, mat);
  scene.add(mesh);

  // Sea: one big glossy plane just above the seabed.
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 1.6, size * 1.6),
    new THREE.MeshPhongMaterial({ color: 0x1b7fa6, shininess: 120, specular: 0x99ddff, transparent: true, opacity: 0.94 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = 0.4;
  scene.add(sea);

  buildRunway(scene);
  buildPalms(scene);
  buildClouds(scene);
  buildSky(scene);
  return { heightAt };
}

function buildRunway(scene) {
  const g = new THREE.Group();
  // Asphalt strip.
  const strip = new THREE.Mesh(
    new THREE.BoxGeometry(RUNWAY.length, 1.2, RUNWAY.width),
    new THREE.MeshLambertMaterial({ color: 0x3a3f46 }),
  );
  strip.position.set(RUNWAY.x, RUNWAY.height + 0.4, RUNWAY.z);
  g.add(strip);
  // Centre dashes.
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xf5f2e8 });
  for (let d = -RUNWAY.length / 2 + 30; d < RUNWAY.length / 2 - 10; d += 46) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(24, 0.4, 3), dashMat);
    dash.position.set(RUNWAY.x + d, RUNWAY.height + 1.1, RUNWAY.z);
    g.add(dash);
  }
  // Threshold bars at both ends.
  for (const end of [-1, 1]) {
    for (let k = -2; k <= 2; k++) {
      const bar = new THREE.Mesh(new THREE.BoxGeometry(14, 0.4, 4), dashMat);
      bar.position.set(RUNWAY.x + end * (RUNWAY.length / 2 - 22), RUNWAY.height + 1.1, RUNWAY.z + k * 11);
      g.add(bar);
    }
  }
  // Windsock pole + orange cone beside the strip.
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 0.7, 26, 8),
    new THREE.MeshLambertMaterial({ color: 0xe8e8e8 }),
  );
  pole.position.set(RUNWAY.x - 40, RUNWAY.height + 13, RUNWAY.z + RUNWAY.width / 2 + 26);
  g.add(pole);
  const sock = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 12, 10),
    new THREE.MeshLambertMaterial({ color: 0xff6b1a }),
  );
  sock.rotation.z = Math.PI / 2;
  sock.position.set(RUNWAY.x - 34, RUNWAY.height + 25, RUNWAY.z + RUNWAY.width / 2 + 26);
  g.add(sock);
  scene.add(g);
}

function buildPalms(scene) {
  const rng = mulberry32(WORLD.seed + 5);
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5230 });
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x2f8f3e });
  const trunkGeo = new THREE.CylinderGeometry(0.5, 0.9, 12, 6);
  const leafGeo = new THREE.ConeGeometry(5.5, 7, 6);
  const palms = new THREE.Group();
  let placed = 0, tries = 0;
  while (placed < 150 && tries < 3000) {
    tries++;
    const x = (rng() - 0.5) * WORLD.size, z = (rng() - 0.5) * WORLD.size;
    const h = heightAt(x, z);
    if (h < 4 || h > 55) continue;
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 6;
    trunk.rotation.z = (rng() - 0.5) * 0.2;
    palm.add(trunk);
    for (let k = 0; k < 3; k++) {
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = 13.5 + k * 1.2;
      leaf.rotation.z = 0.5 + k * 0.5;
      leaf.rotation.y = (k * 2.1) + rng();
      palm.add(leaf);
    }
    palm.position.set(x, h, z);
    palm.rotation.y = rng() * Math.PI * 2;
    const s = 0.8 + rng() * 0.7;
    palm.scale.set(s, s, s);
    palms.add(palm);
    placed++;
  }
  scene.add(palms);
}

function buildClouds(scene) {
  const rng = mulberry32(WORLD.seed + 9);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
  const clouds = new THREE.Group();
  for (let i = 0; i < 34; i++) {
    const puff = new THREE.Group();
    const n = 3 + Math.floor(rng() * 3);
    for (let k = 0; k < n; k++) {
      const r = 14 + rng() * 22;
      const ball = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
      ball.position.set((rng() - 0.5) * 70, (rng() - 0.5) * 8, (rng() - 0.5) * 34);
      ball.scale.y = 0.45;
      puff.add(ball);
    }
    puff.position.set((rng() - 0.5) * WORLD.size, 190 + rng() * 90, (rng() - 0.5) * WORLD.size);
    clouds.add(puff);
  }
  clouds.name = 'clouds';
  scene.add(clouds);
}

function buildSky(scene) {
  // Gradient sky dome with a sun glow, drawn by a tiny shader.
  const skyGeo = new THREE.SphereGeometry(5200, 24, 16);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2f7fd0) },
      horizonColor: { value: new THREE.Color(0xcfeaf7) },
      sunDir: { value: new THREE.Vector3(0.55, 0.42, -0.72).normalize() },
      sunColor: { value: new THREE.Color(0xfff2c0) },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor; uniform vec3 horizonColor;
      uniform vec3 sunDir; uniform vec3 sunColor;
      varying vec3 vDir;
      void main() {
        float h = clamp(vDir.y, -0.08, 1.0);
        vec3 col = mix(horizonColor, topColor, pow(max(h, 0.0), 0.62));
        float s = max(dot(normalize(vDir), normalize(sunDir)), 0.0);
        col += sunColor * pow(s, 220.0) * 1.4 + sunColor * pow(s, 8.0) * 0.22;
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));
  scene.fog = new THREE.Fog(0xcfe3ef, 900, 4200);

  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x3d7a4a, 0.85);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1cf, 1.05);
  sun.position.set(1100, 850, -1450);
  scene.add(sun);
}
