const $ = (id) => document.getElementById(id);
const disc = $('disc');
const tile = $('tile');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
let study = 'klarup';
let yaw = -16;
let pitch = 8;
let installed = true;
let detachedView = false;
let frame = 0;
let drag;

function part(parent, cls, w, h, x, y, z, rotation = '') {
  const el = document.createElement('div');
  el.className = 'part ' + cls;
  Object.assign(el.style, {
    width: w + 'px',
    height: h + 'px',
    left: x - w / 2 + 'px',
    top: y - h / 2 + 'px',
    transform: 'translateZ(' + z + 'px) ' + rotation,
  });
  parent.append(el);
  return el;
}

const radius = 108;
for (let i = 0; i < 80; i++) {
  const angle = (i * Math.PI) / 40;
  const x = radius * Math.cos(angle);
  const y = radius * Math.sin(angle);
  part(disc, 'rim', 9, 24, x, y, 0, 'rotateZ(' + (90 + i * 4.5) + 'deg) rotateX(90deg)');
}
for (const z of [-12, 12]) part(disc, 'face', 216, 216, 0, 0, z);
const laterSessions = [];
function discLabel(text, y, color) {
  const label = part(disc, 'disc-label', 140, 15, 0, y, 15);
  label.textContent = text;
  label.style.color = color;
}
discLabel('You', -48, '#e4d9ff');
discLabel('Your partner', 48, '#b6ffeb');
const gap = part(disc, 'missed-session', 34, 17, 13, -17, 13);
gap.textContent = '···';
for (let row = 0; row < 2; row++) {
  for (let i = 0; i < 13; i++) {
    if (row === 0 && i >= 6 && i <= 8) continue;
    const x = -78 + i * 13;
    const y = (row ? 17 : -17) + Math.sin(i * 0.7) * (8 - i / 2);
    const el = part(disc, 'stroke', 6, 12 + i / 2, x, y, row ? -10 : 13, 'rotateZ(15deg)');
    const color = row ? '#65efcc' : '#bca5ff';
    el.style.background = color;
    el.style.boxShadow = '0 0 6px ' + color;
    if (!row && i >= 9) laterSessions.push(el);
  }
}
// A real path through the depth links the two faces at the missed session.
const bridge = part(disc, 'bridge', 2, 39, 13, 0, 1, 'rotateX(-36deg)');
const pulse = part(disc, 'pulse', 8, 8, 13, 0, 0);
function clearPulse() {
  cancelAnimationFrame(frame);
  $('story').dataset.step = '';
  pulse.hidden = true;
  bridge.style.opacity = '.28';
  laterSessions.forEach((stroke) => (stroke.style.opacity = '1'));
}
clearPulse();

// Close an extruded rounded rectangle along its entire perimeter, including each corner.
function sidewall(parent, width, height, radius, depth, z, material) {
  const points = [];
  for (let corner = 0; corner < 4; corner++) {
    const cx = (corner === 0 || corner === 3 ? 1 : -1) * (width / 2 - radius);
    const cy = (corner < 2 ? 1 : -1) * (height / 2 - radius);
    for (let step = 0; step <= 8; step++) {
      const angle = ((corner + step / 8) * Math.PI) / 2;
      points.push([cx + radius * Math.cos(angle), cy + radius * Math.sin(angle)]);
    }
  }
  points.forEach(([x, y], i) => {
    const [nextX, nextY] = points[(i + 1) % points.length];
    const dx = nextX - x,
      dy = nextY - y;
    const angle = Math.atan2(dy, dx);
    const panel = part(
      parent,
      'wall',
      Math.hypot(dx, dy) + 0.35,
      depth,
      x + dx / 2,
      y + dy / 2,
      z,
      'rotateZ(' + angle + 'rad) rotateX(90deg)',
    );
    panel.style.background = material;
    panel.style.filter = 'brightness(' + (0.89 + 0.11 * Math.cos(angle + 0.6)) + ')';
  });
}

sidewall(
  tile,
  185,
  161,
  18,
  39,
  0,
  'linear-gradient(to bottom,#e1e6df 0 16%,#56636c 16% 23%,#a6b4b7 23% 75%,#606d73 75% 82%,#ccd4ce 82%)',
);
const front = part(tile, 'tile-face paper', 185, 161, 0, 0, 19.5);
front.innerHTML =
  '<small>EDITIONS / 01</small><strong>Activity report</strong><div class="lines"></div><div class="summary">Activity by period<div class="chart"></div></div>';
const summary = front.querySelector('.summary');
for (const height of [9, 14, 11, 20, 17, 23, 15, 19]) {
  const bar = document.createElement('i');
  bar.style.height = height + 'px';
  front.querySelector('.chart').append(bar);
}
const rear = part(tile, 'tile-face back', 185, 161, 0, 0, -19.5, 'rotateY(180deg)');
rear.append(Object.assign(document.createElement('div'), { className: 'rail' }));
const modules = part(tile, 'module', 0, 0, 0, 0, -20, 'rotateY(180deg)');
let blue;
for (let i = 0; i < 3; i++) {
  const module = part(modules, 'module-body', 0, 0, (i - 1) * 45, 0, 0);
  const cls = 'cartridge' + (i === 2 ? ' blue' : '');
  sidewall(module, 37, 73, 5, 16, 8, i === 2 ? '#244aca' : '#77878b');
  const cap = part(module, cls, 37, 73, 0, 0, 16);
  cap.textContent = ['01', '02', '03'][i];
  const contacts = part(module, 'contacts', 37, 73, 0, 0, 0, 'rotateY(180deg)');
  contacts.textContent = '▥';
  if (i === 2) blue = module;
}

function draw() {
  const scale = Math.min($('stage').clientWidth / 310, $('stage').clientHeight / 270, 1.65);
  $('sculpture').style.transform =
    'scale(' + scale + ') rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg)';
}
function play() {
  clearPulse();
  yaw = -20;
  pitch = 5;
  draw();
  laterSessions.forEach((stroke) => (stroke.style.opacity = '.08'));
  const messages = [
    '1. You miss a session. The dotted space marks the gap.',
    '2. Your partner notices and sends a check-in.',
    '3. You return for your next session. The gap stays in your history.',
  ];
  const start = performance.now();
  let previous = -1;
  function animate(time) {
    const t = reducedMotion.matches ? 1 : Math.min(1, (time - start) / 4300);
    const phase = t < 0.3 ? 0 : t < 0.7 ? 1 : 2;
    if (phase !== previous) {
      $('status').textContent = reducedMotion.matches ? messages.join(' ') : messages[phase];
      $('story').dataset.step = String(phase + 1);
      gap.style.opacity = phase === 0 ? '1' : '.65';
      previous = phase;
    }
    const progress = Math.max(0, Math.min(1, (t - 0.3) / 0.4));
    pulse.hidden = phase !== 1;
    bridge.style.opacity = phase === 1 ? '1' : '.4';
    pulse.style.transform =
      'translate3d(0,' + (16 - progress * 32) + 'px,' + (-10 + progress * 23) + 'px)';
    laterSessions.forEach((stroke, i) => {
      stroke.style.opacity = t >= 0.7 + i * 0.08 ? '1' : '.08';
    });
    if (t < 1) frame = requestAnimationFrame(animate);
  }
  frame = requestAnimationFrame(animate);
}
function moduleAction() {
  installed = !installed;
  detachedView = true;
  yaw = 159;
  pitch = 8;
  blue.style.transform = installed
    ? 'translateZ(0)'
    : 'translate3d(16px,-16px,40px) rotateY(-12deg)';
  summary.hidden = !installed;
  $('action').textContent = installed ? 'Release module 03' : 'Reinsert module 03';
  $('flip').textContent = 'View report';
  $('status').textContent = installed
    ? 'Module 03 is seated. Turn to the report to see its chart.'
    : 'Module 03 is out. Turn to the report to see which section disappeared.';
  draw();
}
function reset() {
  yaw = -16;
  pitch = 8;
  detachedView = false;
  $('flip').textContent = study === 'klarup' ? 'View edge' : 'View modules';
  draw();
}
function select(name) {
  study = name;
  clearPulse();
  const klarup = name === 'klarup';
  disc.hidden = !klarup;
  tile.hidden = klarup;
  $('story').hidden = !klarup;
  $('klarup').setAttribute('aria-pressed', String(klarup));
  $('verafin').setAttribute('aria-pressed', String(!klarup));
  $('title').textContent = klarup ? 'Someone Showed Up' : 'Editions';
  $('intro').textContent = klarup
    ? 'You and a friend are practicing together. Each light is one finished session.'
    : 'Three plug-in modules shape one report. Release the blue module and turn the tile over.';
  $('action').textContent = klarup
    ? 'Play the check-in'
    : installed
      ? 'Release module 03'
      : 'Reinsert module 03';
  $('status').textContent = klarup
    ? 'The dotted space is where you missed a session. Play to see what your partner does.'
    : installed
      ? 'Module 03 supplies the activity chart.'
      : 'The report contains the base section only.';
  reset();
}
$('action').onclick = () => (study === 'klarup' ? play() : moduleAction());
$('flip').onclick = () => {
  detachedView = !detachedView;
  yaw = detachedView ? (study === 'klarup' ? -77 : 168) : -8;
  pitch = 6;
  $('flip').textContent = detachedView
    ? study === 'klarup'
      ? 'View face'
      : 'View report'
    : study === 'klarup'
      ? 'View edge'
      : 'View modules';
  draw();
};
$('reset').onclick = reset;
for (const name of ['klarup', 'verafin']) $(name).onclick = () => select(name);
const stage = $('stage');
stage.onpointerdown = (e) => {
  if (drag || e.button !== 0) return;
  drag = { id: e.pointerId, x: e.clientX, y: e.clientY, yaw, pitch, target: e.target };
  stage.setPointerCapture(e.pointerId);
};
stage.onpointermove = (e) => {
  if (drag?.id !== e.pointerId) return;
  yaw = drag.yaw + (e.clientX - drag.x) * 0.75;
  pitch = drag.pitch - (e.clientY - drag.y) * 0.75;
  draw();
};
stage.onpointerup = (e) => {
  if (drag?.id !== e.pointerId) return;
  if (blue.contains(drag.target) && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5)
    moduleAction();
  drag = undefined;
};
stage.onlostpointercapture = stage.onpointercancel = () => {
  drag = undefined;
};
stage.onkeydown = (e) => {
  const delta = { ArrowLeft: [-15, 0], ArrowRight: [15, 0], ArrowUp: [0, 15], ArrowDown: [0, -15] }[
    e.key
  ];
  if (!delta) return;
  e.preventDefault();
  yaw += delta[0];
  pitch += delta[1];
  draw();
};
new ResizeObserver(draw).observe(stage);
select(location.hash === '#verafin' ? 'verafin' : 'klarup');
