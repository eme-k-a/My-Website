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
let returnStroke;
for (let row = 0; row < 2; row++) {
  for (let i = 0; i < 13; i++) {
    if (row === 0 && i >= 6 && i <= 8) continue;
    const x = -78 + i * 13;
    const y = (row ? 17 : -17) + Math.sin(i * 0.7) * (8 - i / 2);
    const el = part(disc, 'stroke', 6, 12 + i / 2, x, y, row ? -10 : 13, 'rotateZ(15deg)');
    const color = row ? '#65efcc' : '#bca5ff';
    el.style.background = color;
    el.style.boxShadow = '0 0 6px ' + color;
    if (!row && i === 9) returnStroke = el;
  }
}
// A real path through the depth links the two faces at the missed session.
const bridge = part(disc, 'bridge', 2, 39, 13, 0, 1, 'rotateX(-36deg)');
const pulse = part(disc, 'pulse', 8, 8, 13, 0, 0);
function clearPulse() {
  cancelAnimationFrame(frame);
  pulse.hidden = true;
  bridge.style.opacity = '.28';
  returnStroke.style.opacity = '1';
}
clearPulse();

for (let z = -10; z < 10; z += 2) part(tile, 'tile-face tile-edge', 185, 161, 0, 0, z);
const front = part(tile, 'tile-face paper', 185, 161, 0, 0, 11);
front.innerHTML =
  '<small>EDITIONS / 01</small><strong>Activity report</strong><div class="lines"></div><div class="summary">Activity by period<div class="chart"></div></div>';
const summary = front.querySelector('.summary');
for (const height of [9, 14, 11, 20, 17, 23, 15, 19]) {
  const bar = document.createElement('i');
  bar.style.height = height + 'px';
  front.querySelector('.chart').append(bar);
}
const rear = part(tile, 'tile-face back', 185, 161, 0, 0, -11, 'rotateY(180deg)');
rear.append(Object.assign(document.createElement('div'), { className: 'rail' }));
const modules = part(tile, 'module', 0, 0, 0, 0, -13, 'rotateY(180deg)');
let blue;
for (let i = 0; i < 3; i++) {
  const slot = part(modules, 'cartridge' + (i === 2 ? ' blue' : ''), 37, 73, (i - 1) * 45, 0, 2);
  slot.textContent = ['01', '02', '03'][i];
  if (i === 2) blue = slot;
}

function draw() {
  const scale = Math.min($('stage').clientWidth / 310, $('stage').clientHeight / 270, 1.65);
  $('sculpture').style.transform =
    'scale(' + scale + ') rotateX(' + pitch + 'deg) rotateY(' + yaw + 'deg)';
}
function play() {
  clearPulse();
  yaw = -61;
  pitch = 9;
  draw();
  $('status').textContent = 'A partner checks in across the gap.';
  returnStroke.style.opacity = '.12';
  bridge.style.opacity = '1';
  const start = performance.now();
  function animate(time) {
    const progress = reducedMotion.matches ? 1 : Math.min(1, (time - start) / 1800);
    pulse.hidden = progress === 1;
    pulse.style.transform =
      'translate3d(0,' + (16 - progress * 32) + 'px,' + (-10 + progress * 23) + 'px)';
    if (progress < 1) frame = requestAnimationFrame(animate);
    else {
      returnStroke.style.opacity = '1';
      $('status').textContent =
        'Their partner checked in. The next violet stroke is a new session.';
    }
  }
  frame = requestAnimationFrame(animate);
}
function moduleAction() {
  installed = !installed;
  detachedView = true;
  yaw = 159;
  pitch = 8;
  blue.style.transform = installed
    ? 'translateZ(2px)'
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
  $('klarup').setAttribute('aria-pressed', String(klarup));
  $('verafin').setAttribute('aria-pressed', String(!klarup));
  $('title').textContent = klarup ? 'Someone Showed Up' : 'Editions';
  $('intro').textContent = klarup
    ? 'Two people keep a practice. One misses a session. Their partner checks in.'
    : 'Three plug-in modules shape one report. Release the blue module and turn the tile over.';
  $('action').textContent = klarup
    ? 'Play the check-in'
    : installed
      ? 'Release module 03'
      : 'Reinsert module 03';
  $('status').textContent = klarup
    ? 'Each stroke marks a completed session. The violet line has a gap.'
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
  if (drag.target === blue && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 5)
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
