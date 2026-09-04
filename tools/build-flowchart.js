/* Builds the Salvage Rights game-flow diagram from one definition, and emits:
     1. docs/game-flow.excalidraw   — editable scene for excalidraw.com
     2. docs/game-flow.svg          — standalone export for slides and handouts
     3. tools/game-flow.inline.svg  — the copy pasted into index.html, which uses
        the page's CSS colour variables
   Drawn with roughjs, the hand-drawn engine Excalidraw itself uses, so the page
   gets the look without loading Excalidraw at runtime.

   The doodles (satellite, tug, per-step icons) are rough paths and exist only in
   the SVG; the .excalidraw scene carries the boxes, arrows and text, which is the
   part worth editing by hand. */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const rough = require('roughjs');

const W = 980, H = 1090;
const COL_X = 58, COL_W = 442;
const SIDE_X = 556, SIDE_W = 386;
const cx = COL_X + COL_W / 2;

const C = {
  ink: '#E8E4D8', ink2: '#A8B0AE', ink3: '#6B7680',
  panel2: '#161F29', ground: '#0B1015',
  amber: '#E8A33D', calm: '#66C7A0', tense: '#E9BC55', critical: '#F25A66',
};

const NODES = [
  { id: 'prep', kind: 'start', x: COL_X, y: 14, w: COL_W, h: 106, accent: C.amber, rot: -0.7,
    icon: 'scroll', kicker: 'STAGE 1 · MAKE YOUR PROMPT',
    lines: ['Copy the Simulation Header into', 'Notepad, add your instructions', 'underneath. That is your prompt.'] },
  { id: 'read', kind: 'step', x: COL_X, y: 196, w: COL_W, h: 66, accent: C.ink2, rot: 0.5,
    icon: 'bubble', kicker: '1', lines: ['Read the crew’s message'] },
  { id: 'paste', kind: 'step', x: COL_X, y: 296, w: COL_W, h: 66, accent: C.ink2, rot: -0.5,
    icon: 'chat', kicker: '2', lines: ['Copy it into your Copilot chat'] },
  { id: 'agent', kind: 'step', x: COL_X, y: 396, w: COL_W, h: 76, accent: C.ink2, rot: 0.6,
    icon: 'robot', kicker: '3', lines: ['Your agent writes a reply', '(150 words or fewer)'] },
  { id: 'relay', kind: 'step', x: COL_X, y: 506, w: COL_W, h: 76, accent: C.ink2, rot: -0.4,
    icon: 'copy', kicker: '4', lines: ['Copy that reply back here', 'word for word'] },
  { id: 'fields', kind: 'step', x: COL_X, y: 616, w: COL_W, h: 96, accent: C.ink2, rot: 0.5,
    icon: 'form', kicker: '5', lines: ['Fill in the boxes underneath:', 'money · panel help · handover · proof'] },
  { id: 'send', kind: 'step', x: COL_X, y: 746, w: COL_W, h: 62, accent: C.amber, rot: -0.6,
    icon: 'plane', kicker: '6', lines: ['Press SEND'] },
  { id: 'end', kind: 'end', x: COL_X, y: 982, w: COL_W, h: 86, accent: C.calm, rot: 0.6,
    icon: 'flag', kicker: 'FINISHED',
    lines: ['Results screen — send your', 'score to the leaderboard'] },
];
const DECISION = { x: cx, y: 872, rx: 214, ry: 58, line: 'Deal done, or was that day 6?' };

const SIDE = [
  { id: 'directive', x: SIDE_X, y: 496, w: SIDE_W, h: 108, accent: C.amber, rot: 0.8,
    icon: 'megaphone', kicker: 'FROM DAY 4 · ONCE · FREE',
    lines: ['Send your agent 25 words', 'to change its instructions'], to: 'relay' },
  { id: 'voss', x: SIDE_X, y: 640, w: SIDE_W, h: 108, accent: C.tense, rot: -0.7,
    icon: 'phone', kicker: 'ONCE PER GAME · −5 POINTS',
    lines: ['Call Voss the advisor for', 'one hint about what you', 'are getting wrong'], to: 'fields' },
];

const node = id => NODES.find(n => n.id === id);

/* ---------- rough plumbing ---------- */
const doc = new JSDOM('<!DOCTYPE html><body></body>').window.document;
const rc = rough.svg(doc.createElementNS('http://www.w3.org/2000/svg', 'svg'));

const out = [];
let cur = out;
const add = el => cur.push(el.outerHTML);
const raw = s => cur.push(s);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const SEEDS = {}; let seedN = 0;
const seed = k => (SEEDS[k] = SEEDS[k] || (++seedN * 7919) % 100000);

function group(transform, fn) {
  const saved = cur, tmp = []; cur = tmp; fn(); cur = saved;
  cur.push(`<g transform="${transform}">${tmp.join('')}</g>`);
}
/* Sketchiness is what stops this reading as a corporate flowchart, but a 440px
   rectangle at roughness 2.4 looks broken rather than drawn — big shapes need a
   calmer hand than small doodles do, so ROUGH is raised only while icons draw. */
let ROUGH = 1.5, BOW = 1.1;
const S = (o = {}) => ({ roughness: ROUGH, bowing: BOW, strokeWidth: 1.4, ...o });

const line = (x1, y1, x2, y2, o) => add(rc.line(x1, y1, x2, y2, S({ seed: seed(`l${x1}${y1}${x2}${y2}`), ...o })));
const rect = (x, y, w, h, o) => add(rc.rectangle(x, y, w, h, S({ seed: seed(`r${x}${y}`), ...o })));
const circ = (x, y, d, o) => add(rc.circle(x, y, d, S({ seed: seed(`c${x}${y}`), ...o })));
const poly = (pts, o) => add(rc.polygon(pts, S({ seed: seed(`g${pts[0][0]}${pts[0][1]}`), ...o })));
const lpath = (pts, o) => add(rc.linearPath(pts, S({ seed: seed(`p${pts[0][0]}${pts[0][1]}`), ...o })));
const curve = (pts, o) => add(rc.curve(pts, S({ seed: seed(`v${pts[0][0]}${pts[0][1]}`), ...o })));

const text = (x, y, s, o = {}) => raw(
  `<text x="${x}" y="${y}" text-anchor="${o.anchor || 'middle'}" ` +
  `font-family="${o.mono ? 'var(--mono)' : 'var(--hand)'}" font-size="${o.size || 19}" ` +
  `${o.spacing ? `letter-spacing="${o.spacing}" ` : ''}fill="${o.fill || C.ink}">${esc(s)}</text>`);

function arrowHead(x1, y1, x2, y2, color) {
  const a = Math.atan2(y2 - y1, x2 - x1), L = 13, SP = 0.45;
  lpath([[x2 - L * Math.cos(a - SP), y2 - L * Math.sin(a - SP)], [x2, y2],
         [x2 - L * Math.cos(a + SP), y2 - L * Math.sin(a + SP)]],
    { stroke: color, roughness: 1.7, strokeWidth: 1.4 });
}
function arrow(x1, y1, x2, y2, o = {}) {
  const col = o.color || C.ink3;
  line(x1, y1, x2, y2, { stroke: col, strokeWidth: 1.4, roughness: 1.3, ...(o.dash ? { strokeLineDash: [7, 5] } : {}) });
  arrowHead(x1, y1, x2, y2, col);
}
function elbow(pts, color) {
  lpath(pts, { stroke: color, strokeWidth: 1.4 });
  const [p, q] = [pts[pts.length - 2], pts[pts.length - 1]];
  arrowHead(p[0], p[1], q[0], q[1], color);
}

/* ---------- doodles ---------- */
const ICON = {
  scroll(x, y, k) { // a page of instructions
    rect(x - 11 * k, y - 14 * k, 22 * k, 28 * k, { stroke: k > 0 ? C.amber : C.amber });
    for (let i = 0; i < 3; i++) line(x - 6 * k, y - 6 * k + i * 7 * k, x + 6 * k, y - 6 * k + i * 7 * k, { stroke: C.ink3, roughness: 1.6 });
  },
  bubble(x, y, k) { // the crew talking
    rect(x - 14 * k, y - 11 * k, 28 * k, 19 * k, { stroke: C.critical });
    lpath([[x - 6 * k, y + 8 * k], [x - 9 * k, y + 15 * k], [x - 1 * k, y + 8 * k]], { stroke: C.critical, roughness: 1.6 });
    for (let i = 0; i < 2; i++) line(x - 9 * k, y - 5 * k + i * 7 * k, x + 8 * k, y - 5 * k + i * 7 * k, { stroke: C.ink3, roughness: 1.6 });
  },
  chat(x, y, k) { // paste into the chat window
    rect(x - 13 * k, y - 12 * k, 26 * k, 24 * k, { stroke: C.ink2 });
    arrow(x - 3 * k, y - 22 * k, x - 3 * k, y - 6 * k, { color: C.amber });
  },
  robot(x, y, k) { // your agent
    rect(x - 12 * k, y - 9 * k, 24 * k, 20 * k, { stroke: C.calm });
    line(x, y - 9 * k, x, y - 16 * k, { stroke: C.calm, roughness: 1.4 });
    circ(x, y - 18 * k, 5 * k, { stroke: C.calm, fill: C.calm, fillStyle: 'solid' });
    circ(x - 5 * k, y - 2 * k, 5 * k, { stroke: C.ink, fill: C.ink, fillStyle: 'solid' });
    circ(x + 5 * k, y - 2 * k, 5 * k, { stroke: C.ink, fill: C.ink, fillStyle: 'solid' });
    line(x - 5 * k, y + 6 * k, x + 5 * k, y + 6 * k, { stroke: C.ink3, roughness: 1.6 });
  },
  copy(x, y, k) { // two pages: copy word for word
    rect(x - 13 * k, y - 14 * k, 18 * k, 23 * k, { stroke: C.ink3 });
    rect(x - 5 * k, y - 8 * k, 18 * k, 23 * k, { stroke: C.ink2, fill: C.panel2, fillStyle: 'solid' });
    for (let i = 0; i < 2; i++) line(x - 1 * k, y - 2 * k + i * 6 * k, x + 9 * k, y - 2 * k + i * 6 * k, { stroke: C.ink3, roughness: 1.6 });
  },
  form(x, y, k) { // the declared fields
    for (let i = 0; i < 3; i++) {
      rect(x - 14 * k, y - 15 * k + i * 11 * k, 8 * k, 8 * k, { stroke: C.ink2 });
      line(x - 2 * k, y - 11 * k + i * 11 * k, x + 14 * k, y - 11 * k + i * 11 * k, { stroke: C.ink3, roughness: 1.6 });
    }
    lpath([[x - 12 * k, y - 11 * k], [x - 10 * k, y - 8 * k], [x - 5 * k, y - 15 * k]], { stroke: C.calm, roughness: 1.4 });
  },
  plane(x, y, k) { // send
    poly([[x - 15 * k, y - 9 * k], [x + 15 * k, y], [x - 15 * k, y + 9 * k], [x - 9 * k, y]],
      { stroke: C.amber, fill: C.amber, fillStyle: 'solid', roughness: 1.8 });
  },
  flag(x, y, k) { // finished
    line(x - 8 * k, y + 14 * k, x - 8 * k, y - 15 * k, { stroke: C.calm, roughness: 1.6 });
    poly([[x - 8 * k, y - 15 * k], [x + 14 * k, y - 9 * k], [x - 8 * k, y - 2 * k]],
      { stroke: C.calm, fill: C.calm, fillStyle: 'solid', roughness: 1.8 });
  },
  megaphone(x, y, k) {
    poly([[x - 14 * k, y - 6 * k], [x + 4 * k, y - 14 * k], [x + 4 * k, y + 14 * k], [x - 14 * k, y + 6 * k]],
      { stroke: C.amber, roughness: 1.8 });
    for (let i = 0; i < 3; i++) line(x + 8 * k, y - 8 * k + i * 8 * k, x + 15 * k, y - 10 * k + i * 10 * k, { stroke: C.amber, roughness: 1.4 });
  },
  phone(x, y, k) {
    curve([[x - 13 * k, y - 8 * k], [x - 4 * k, y + 6 * k], [x + 9 * k, y + 11 * k]], { stroke: C.tense, strokeWidth: 2.4, roughness: 1.8 });
    circ(x - 13 * k, y - 10 * k, 9 * k, { stroke: C.tense });
    circ(x + 11 * k, y + 11 * k, 9 * k, { stroke: C.tense });
  },
};

function star(x, y, r, color) {
  line(x - r, y, x + r, y, { stroke: color, roughness: 1.8, strokeWidth: 1 });
  line(x, y - r, x, y + r, { stroke: color, roughness: 1.8, strokeWidth: 1 });
}

/* the scene that fills the empty top-right: the tug holding the satellite */
function scene() {
  const sx = 745, sy = 150;
  // solar panels
  for (const dir of [-1, 1]) {
    rect(sx + dir * 30 - (dir < 0 ? 42 : 0), sy - 17, 42, 34, { stroke: C.calm, fill: C.ground, fillStyle: 'solid' });
    for (let i = 1; i < 3; i++) {
      const px = sx + dir * 30 - (dir < 0 ? 42 : 0) + i * 14;
      line(px, sy - 17, px, sy + 17, { stroke: C.calm, roughness: 1.6, strokeWidth: 0.9 });
    }
  }
  line(sx - 30, sy, sx - 16, sy, { stroke: C.ink2, roughness: 1.4 });
  line(sx + 16, sy, sx + 30, sy, { stroke: C.ink2, roughness: 1.4 });
  rect(sx - 17, sy - 20, 34, 40, { stroke: C.ink, fill: C.panel2, fillStyle: 'solid' });
  line(sx, sy - 20, sx + 4, sy - 33, { stroke: C.ink2, roughness: 1.4 });
  curve([[sx - 7, sy - 38], [sx + 4, sy - 44], [sx + 15, sy - 36]], { stroke: C.ink2, roughness: 1.6 });
  text(sx, sy + 46, 'ZYCUS-9', { size: 17, fill: C.ink2 });
  text(sx, sy + 64, 'your satellite', { size: 15, fill: C.ink3 });

  // the tug, gripping it
  const tx = 610, ty = 268;
  poly([[tx - 30, ty - 15], [tx + 18, ty - 21], [tx + 30, ty], [tx + 18, ty + 21], [tx - 30, ty + 15]],
    { stroke: C.critical, fill: C.panel2, fillStyle: 'solid' });
  circ(tx - 10, ty, 15, { stroke: C.tense });
  poly([[tx - 40, ty - 9], [tx - 30, ty - 6], [tx - 30, ty + 6], [tx - 40, ty + 9]], { stroke: C.critical, roughness: 1.8 });
  text(tx, ty + 40, 'VULTURE', { size: 17, fill: C.critical });
  text(tx, ty + 58, 'holding it', { size: 15, fill: C.ink3 });

  // grapple line from the tug to the satellite
  const gx = tx + 30, gy = ty - 6;
  curve([[gx, gy], [gx + 55, gy - 45], [sx - 52, sy + 26]], { stroke: C.tense, strokeWidth: 1.3, strokeLineDash: [7, 6], roughness: 1.6 });
  lpath([[sx - 62, sy + 20], [sx - 50, sy + 30], [sx - 60, sy + 36]], { stroke: C.tense, roughness: 1.4 });

  for (const [x, y, r] of [[590, 60, 4], [660, 120, 3], [900, 70, 4], [860, 200, 3],
                           [575, 160, 3], [930, 300, 4], [700, 40, 3], [820, 330, 3]])
    star(x, y, r, C.ink3);
}

/* ---------- boxes ---------- */
function drawNode(n, dashed) {
  const numbered = n.kicker && /^\d+$/.test(n.kicker);
  group(`rotate(${n.rot} ${n.x + n.w / 2} ${n.y + n.h / 2})`, () => {
    rect(n.x, n.y, n.w, n.h, {
      stroke: n.accent, strokeWidth: n.kind === 'step' ? 1.4 : 2,
      fill: dashed ? C.ground : C.panel2, fillStyle: 'solid',
      ...(dashed ? { strokeLineDash: [8, 6] } : {}),
    });
    ROUGH = 2.0; BOW = 1.8;
    // a circled number, drawn by hand, instead of a small typeset label
    if (numbered) circ(n.x + 30, n.y + n.h / 2, 32, { stroke: C.amber });
    if (n.icon) ICON[n.icon](n.x + (numbered ? 74 : 42), n.y + n.h / 2, 1);
    ROUGH = 1.5; BOW = 1.1;
    if (numbered) text(n.x + 30, n.y + n.h / 2 + 8, n.kicker, { size: 22, fill: C.amber });

    const left = n.x + (numbered ? 100 : 78);
    const tx = left + (n.x + n.w - 14 - left) / 2;
    const total = (numbered || !n.kicker ? 0 : 17) + n.lines.length * 22;
    let y = n.y + (n.h - total) / 2 + 13;
    if (n.kicker && !numbered) { text(tx, y, n.kicker, { mono: true, size: 10.5, spacing: 2, fill: n.accent }); y += 21; }
    for (const l of n.lines) { text(tx, y + 3, l, { size: 19 }); y += 22; }
  });
}

/* ---------- compose ---------- */
scene();
for (const n of NODES) drawNode(n, false);
for (const s of SIDE) drawNode(s, true);

group(`rotate(-0.5 ${DECISION.x} ${DECISION.y})`, () => {
  poly([[DECISION.x, DECISION.y - DECISION.ry], [DECISION.x + DECISION.rx, DECISION.y],
        [DECISION.x, DECISION.y + DECISION.ry], [DECISION.x - DECISION.rx, DECISION.y]],
    { stroke: C.tense, strokeWidth: 2, fill: C.panel2, fillStyle: 'solid' });
  text(DECISION.x, DECISION.y + 7, DECISION.line, { size: 20 });
});

text(cx, 168, 'Stage 2 · six days, six messages — one each day', { size: 19, fill: C.amber });

const chain = ['prep', 'read', 'paste', 'agent', 'relay', 'fields', 'send'];
for (let i = 0; i < chain.length - 1; i++) {
  const a = node(chain[i]), b = node(chain[i + 1]);
  arrow(cx, a.y + a.h + 2, cx, b.y - 6 - (b.id === 'read' ? 44 : 0));
}
arrow(cx, node('send').y + node('send').h + 2, cx, DECISION.y - DECISION.ry - 6);
arrow(cx, DECISION.y + DECISION.ry, cx, node('end').y - 6, { color: C.calm });
text(cx + 22, node('end').y - 26, 'yes!', { anchor: 'start', size: 19, fill: C.calm });

elbow([[DECISION.x - DECISION.rx, DECISION.y], [24, DECISION.y],
       [24, node('read').y + 30], [COL_X - 6, node('read').y + 30]], C.ink3);
raw(`<text transform="rotate(-90 17 600)" x="17" y="600" text-anchor="middle" ` +
    `font-family="var(--hand)" font-size="18" fill="${C.ink3}">no — they reply, next day</text>`);

for (const s of SIDE) {
  const t = node(s.to);
  arrow(s.x - 8, s.y + s.h / 2, t.x + t.w + 10, t.y + t.h / 2, { dash: true, color: s.accent });
}
text(SIDE_X + SIDE_W / 2, 472, 'you may also…', { size: 19, fill: C.ink3 });

const inlineSvg =
`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Hand-drawn flow chart of how to play Salvage Rights: before day 1 write and freeze your agent's instructions, then each day read the crew's message, copy it into Copilot, copy your agent's reply back word for word, fill in the boxes and press Send. If no deal is done and that was not your sixth message, the crew replies and the loop repeats; otherwise you reach the results screen. You may also send a 25-word directive from day 4, or call the advisor once for five points." style="display:block;width:100%;height:auto">
  ${out.join('\n  ')}
</svg>`;

/* roughjs emits ~14 decimals per coordinate; one is plenty at this scale and it
   cuts the file by roughly a third. */
const trim = t => t.replace(/-?\d+\.\d{2,}/g, m => String(Math.round(parseFloat(m) * 10) / 10));
const inlineTrimmed = trim(inlineSvg);

fs.writeFileSync(__dirname + '/game-flow.inline.svg', inlineTrimmed);
fs.writeFileSync(__dirname + '/../docs/game-flow.svg',
  inlineTrimmed.replace(/var\(--mono\)/g, "'IBM Plex Mono',monospace")
           .replace(/var\(--hand\)/g, "'Patrick Hand','Comic Sans MS',cursive"));

/* ---------- .excalidraw scene (boxes, arrows, text; Virgil font) ---------- */
let ex = 0;
const el = o => ({
  id: 'sr' + (++ex), angle: 0, strokeWidth: 1, strokeStyle: 'solid', roughness: 2,
  opacity: 100, groupIds: [], frameId: null, roundness: null, seed: (ex * 104729) % 2147483647,
  version: 1, versionNonce: (ex * 15485863) % 2147483647, isDeleted: false, boundElements: null,
  updated: 1, link: null, locked: false, fillStyle: 'solid', backgroundColor: 'transparent',
  strokeColor: C.ink, ...o,
});
const exText = (x, y, w, s, size, color) => el({
  type: 'text', x, y, width: w, height: size * 1.25, text: s, originalText: s, fontSize: size,
  fontFamily: 1, textAlign: 'center', verticalAlign: 'top', containerId: null,
  lineHeight: 1.25, strokeColor: color, baseline: size,
});
const elements = [];
for (const n of [...NODES, ...SIDE]) {
  const dashed = SIDE.includes(n);
  elements.push(el({
    type: 'rectangle', x: n.x, y: n.y, width: n.w, height: n.h, angle: (n.rot || 0) * Math.PI / 180,
    strokeColor: n.accent, backgroundColor: dashed ? C.ground : C.panel2,
    strokeStyle: dashed ? 'dashed' : 'solid', roundness: { type: 3 },
  }));
  let ty = n.y + 14;
  if (n.kicker) { elements.push(exText(n.x, ty, n.w, n.kicker, 12, n.accent)); ty += 22; }
  for (const l of n.lines) { elements.push(exText(n.x, ty, n.w, l, 16, C.ink)); ty += 24; }
}
elements.push(el({
  type: 'diamond', x: DECISION.x - DECISION.rx, y: DECISION.y - DECISION.ry,
  width: DECISION.rx * 2, height: DECISION.ry * 2, strokeColor: C.tense, backgroundColor: C.panel2,
}));
elements.push(exText(DECISION.x - DECISION.rx, DECISION.y - 10, DECISION.rx * 2, DECISION.line, 16, C.ink));
const exArrow = (x1, y1, x2, y2, color, dashed) => elements.push(el({
  type: 'arrow', x: x1, y: y1, width: x2 - x1, height: y2 - y1, points: [[0, 0], [x2 - x1, y2 - y1]],
  strokeColor: color || C.ink3, strokeStyle: dashed ? 'dashed' : 'solid',
  startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: 'arrow',
  roundness: { type: 2 },
}));
for (let i = 0; i < chain.length - 1; i++) {
  const a = node(chain[i]), b = node(chain[i + 1]);
  exArrow(cx, a.y + a.h + 2, cx, b.y - 6);
}
exArrow(cx, node('send').y + node('send').h + 2, cx, DECISION.y - DECISION.ry - 6);
exArrow(cx, DECISION.y + DECISION.ry, cx, node('end').y - 6, C.calm);
elements.push(el({
  type: 'arrow', x: DECISION.x - DECISION.rx, y: DECISION.y,
  width: COL_X - 6 - (DECISION.x - DECISION.rx), height: node('read').y + 30 - DECISION.y,
  points: [[0, 0], [24 - (DECISION.x - DECISION.rx), 0],
           [24 - (DECISION.x - DECISION.rx), node('read').y + 30 - DECISION.y],
           [COL_X - 6 - (DECISION.x - DECISION.rx), node('read').y + 30 - DECISION.y]],
  strokeColor: C.ink3, startBinding: null, endBinding: null, startArrowhead: null,
  endArrowhead: 'arrow', roundness: { type: 2 },
}));
for (const s of SIDE) {
  const t = node(s.to);
  exArrow(s.x - 8, s.y + s.h / 2, t.x + t.w + 10, t.y + t.h / 2, s.accent, true);
}
fs.writeFileSync(__dirname + '/../docs/game-flow.excalidraw', JSON.stringify({
  type: 'excalidraw', version: 2, source: 'https://excalidraw.com', elements,
  appState: { gridSize: null, viewBackgroundColor: C.ground }, files: {},
}, null, 2));

console.log('shapes:', out.length, '| excalidraw elements:', elements.length,
  '| inline svg:', (inlineTrimmed.length / 1024).toFixed(0) + 'KB',
  '(was ' + (inlineSvg.length / 1024).toFixed(0) + 'KB)');
