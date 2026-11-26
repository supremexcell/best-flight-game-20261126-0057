// HUD: numbers, gauges, artificial horizon and compass strip.
// One clear job: turn flight state into readable instruments.

const $ = (id) => document.getElementById(id);

const els = {};
let horizonCtx = null;

export function initHud() {
  for (const id of ['hud', 'objective', 'score', 'time', 'fuel-fill', 'fuel-num',
    'thr-fill', 'thr-num', 'alt', 'spd', 'hdg', 'vs', 'compass-strip', 'message',
    'ring-flash', 'overlay', 'overlay-title', 'overlay-sub', 'overlay-stats',
    'overlay-button', 'overlay-kicker']) {
    els[id] = $(id);
  }
  horizonCtx = $('horizon').getContext('2d');
  buildCompassStrip();
}

function buildCompassStrip() {
  // One long strip: 0..720 degrees of tick labels, slid by heading.
  const labels = [];
  const names = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  for (let d = 0; d <= 720; d += 5) {
    const deg = d % 360;
    if (deg % 45 === 0) labels.push(`<span style="display:inline-block;width:60px;text-align:center">${names[deg / 45]} ${String(deg).padStart(3, '0')}</span>`);
    else if (deg % 15 === 0) labels.push('<span style="display:inline-block;width:60px;text-align:center">|</span>');
    else labels.push('<span style="display:inline-block;width:60px;text-align:center">·</span>');
  }
  els['compass-strip'].innerHTML = labels.join('');
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function updateHud(s, ringIndex, ringTotal, score, elapsed, phase) {
  els['alt'].textContent = String(Math.max(0, Math.round((s.y - 2) * 3.28)));
  els['spd'].textContent = String(Math.round(s.speed * 1.94));
  const deg = ((Math.round((-s.heading * 180) / Math.PI) % 360) + 360) % 360;
  els['hdg'].textContent = `${String(deg).padStart(3, '0')}°`;
  els['vs'].textContent = String(Math.round(s.verticalSpeed * 196.85));
  els['score'].textContent = String(score);
  els['time'].textContent = fmtTime(elapsed);
  els['fuel-num'].textContent = String(Math.max(0, Math.round(s.fuel)));
  els['fuel-fill'].style.width = `${Math.max(0, s.fuel)}%`;
  els['fuel-fill'].style.background = s.fuel < 25
    ? 'linear-gradient(90deg,#ff3b30,#ff9f1c)' : 'linear-gradient(90deg,#ff9f1c,#ffd166)';
  els['thr-num'].textContent = `${Math.round(s.throttle * 100)}%`;
  els['thr-fill'].style.width = `${Math.round(s.throttle * 100)}%`;
  els['objective'].textContent = phase === 'final'
    ? 'All rings cleared — land on Coral Strip!'
    : `Ring ${Math.min(ringIndex + 1, ringTotal)} / ${ringTotal} — fly through the glowing ring`;
  // Compass: 60px per 15°, centre the current heading.
  const pxPerDeg = 4;
  const offset = 170 - (deg * pxPerDeg + 360 * pxPerDeg);
  els['compass-strip'].style.transform = `translateX(${offset}px)`;
  drawHorizon(s.roll, s.pitch);
}

function drawHorizon(roll, pitch) {
  const ctx = horizonCtx, W = 150, H = 150, cx = 75, cy = 75, R = 72;
  ctx.clearRect(0, 0, W, H);
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(-roll);
  const dy = Math.max(-60, Math.min(60, pitch * 110));
  // Sky above the line, ground below it.
  ctx.fillStyle = '#3f8fd2';
  ctx.fillRect(-R, -R + dy, R * 2, R - dy);
  ctx.fillStyle = '#7a5a34';
  ctx.fillRect(-R, dy, R * 2, R - dy + R);
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.moveTo(-R, dy); ctx.lineTo(R, dy); ctx.stroke();
  // Pitch ladder ticks.
  ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.5;
  for (const off of [-30, -15, 15, 30]) {
    ctx.beginPath(); ctx.moveTo(-18, dy + off); ctx.lineTo(18, dy + off); ctx.stroke();
  }
  ctx.restore();
  // Fixed aircraft symbol: amber wings + dot, always level with the screen.
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(45, 75); ctx.lineTo(66, 75); ctx.moveTo(84, 75); ctx.lineTo(105, 75); ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(75, 75, 4, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, R - 1, 0, Math.PI * 2); ctx.stroke();
}

let messageTimer = null;
export function showMessage(text, seconds = 2.6) {
  els['message'].textContent = text;
  els['message'].classList.add('show');
  if (messageTimer) clearTimeout(messageTimer);
  messageTimer = setTimeout(() => els['message'].classList.remove('show'), seconds * 1000);
}

export function flashRing() {
  els['ring-flash'].classList.add('on');
  setTimeout(() => els['ring-flash'].classList.remove('on'), 180);
}

export function showHud(show) { els['hud'].classList.toggle('hidden', !show); }

export function showOverlay({ kicker, title, sub, statsHtml, button }) {
  els['overlay-kicker'].textContent = kicker;
  els['overlay-title'].innerHTML = title;
  els['overlay-sub'].innerHTML = sub;
  els['overlay-stats'].innerHTML = statsHtml || '';
  els['overlay-stats'].classList.toggle('hidden', !statsHtml);
  els['overlay-button'].textContent = button;
  els['overlay'].classList.remove('hidden');
}

export function hideOverlay() { els['overlay'].classList.add('hidden'); }
export function overlayButton() { return els['overlay-button']; }
