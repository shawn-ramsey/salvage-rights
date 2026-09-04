/* Builds the Salvage Rights game-flow diagram from one definition, and emits:
     1. docs/game-flow.excalidraw  — editable scene for excalidraw.com
     2. docs/game-flow.svg         — standalone export for slides and handouts
     3. tools/game-flow.inline.svg — the copy pasted into index.html, which uses
        the page's CSS colour variables (hand-drawn via roughjs, the same engine
        Excalidraw draws with)
   The page ships the SVG, not the library: no runtime dependency is added. */
const fs = require('fs');
const { JSDOM } = require('jsdom');
const rough = require('roughjs');

const W = 980, H = 1010;
const COL_X = 70, COL_W = 430;                 // main flow column
const SIDE_X = 570, SIDE_W = 360;              // optional-actions column
const cx = COL_X + COL_W / 2;

/* page palette; literal hex so the scene file and any standalone export match */
const C = {
  ink: '#E8E4D8', ink2: '#A8B0AE', ink3: '#6B7680',
  line: '#233040', panel2: '#161F29', ground: '#0B1015',
  amber: '#E8A33D', calm: '#66C7A0', tense: '#E9BC55',
};

const NODES = [
  { id: 'prep',   kind: 'start', x: COL_X, y: 14,  w: COL_W, h: 78, accent: C.amber,
    kicker: 'BEFORE DAY 1', lines: ['Write your agent’s instructions', 'in Copilot — then freeze them'] },
  { id: 'read',   kind: 'step', x: COL_X, y: 140, w: COL_W, h: 58, accent: C.ink2,
    kicker: '1', kickerColor: C.amber, lines: ['Read the crew’s message on this screen'] },
  { id: 'paste',  kind: 'step', x: COL_X, y: 232, w: COL_W, h: 58, accent: C.ink2,
    kicker: '2', kickerColor: C.amber, lines: ['Copy it into your Copilot chat'] },
  { id: 'agent',  kind: 'step', x: COL_X, y: 324, w: COL_W, h: 68, accent: C.ink2,
    kicker: '3', kickerColor: C.amber, lines: ['Your agent writes a reply', '(150 words or fewer)'] },
  { id: 'relay',  kind: 'step', x: COL_X, y: 426, w: COL_W, h: 68, accent: C.ink2,
    kicker: '4', kickerColor: C.amber, lines: ['Copy that reply into the message box', 'word for word'] },
  { id: 'fields', kind: 'step', x: COL_X, y: 528, w: COL_W, h: 86, accent: C.ink2,
    kicker: '5', kickerColor: C.amber, lines: ['Fill in the fields below it:', 'cash offer · solar panel help', 'handover terms · proof question'] },
  { id: 'send',   kind: 'step', x: COL_X, y: 648, w: COL_W, h: 54, accent: C.amber,
    kicker: '6', lines: ['Press SEND'] },
  { id: 'end',    kind: 'end',  x: COL_X, y: 900, w: COL_W, h: 76, accent: C.calm,
    kicker: 'FINISHED', lines: ['Results screen — send your', 'score to the leaderboard'] },
];
const DECISION = { x: cx, y: 800, rx: 215, ry: 62,
  lines: ['Deal agreed, or day 6 reached?'] };

const SIDE = [
  { id: 'directive', x: SIDE_X, y: 452, w: SIDE_W, h: 96, accent: C.amber,
    kicker: 'FROM DAY 4 · ONCE · FREE', lines: ['Send your agent a directive', 'of 25 words to change its', 'instructions'], to: 'relay' },
  { id: 'voss', x: SIDE_X, y: 586, w: SIDE_W, h: 96, accent: C.tense,
    kicker: 'ONCE PER GAME · −5 POINTS', lines: ['Call Voss, the advisor,', 'for one hint about where', 'you are going wrong'], to: 'fields' },
];

const node = id => NODES.find(n => n.id === id);

/* ---------- SVG (roughjs) ---------- */
const dom = new JSDOM('<!DOCTYPE html><body></body>');
const doc = dom.window.document;
const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
const rc = rough.svg(svg);

const out = [];
const add = el => out.push(el.outerHTML);
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const SEEDS = {};
let seedN = 1;
const seed = id => (SEEDS[id] = SEEDS[id] || seedN++ * 7919);

function box(n) {
  add(rc.rectangle(n.x, n.y, n.w, n.h, {
    stroke: n.accent, strokeWidth: n.kind === 'step' ? 1.1 : 1.7,
    fill: C.panel2, fillStyle: 'solid', roughness: 1.1, bowing: 1.4, seed: seed(n.id),
  }));
}
function sideBox(n) {
  add(rc.rectangle(n.x, n.y, n.w, n.h, {
    stroke: n.accent, strokeWidth: 1.1, strokeLineDash: [7, 5],
    fill: C.ground, fillStyle: 'solid', roughness: 1.2, bowing: 1.5, seed: seed(n.id),
  }));
}
function diamond(d) {
  const pts = [[d.x, d.y - d.ry], [d.x + d.rx, d.y], [d.x, d.y + d.ry], [d.x - d.rx, d.y]];
  add(rc.polygon(pts, {
    stroke: C.tense, strokeWidth: 1.6, fill: C.panel2, fillStyle: 'solid',
    roughness: 1.1, bowing: 1.4, seed: seed('decision'),
  }));
}
function arrow(x1, y1, x2, y2, opt = {}) {
  const o = { stroke: opt.color || C.ink3, strokeWidth: 1.3, roughness: 1.1,
    seed: seed('a' + x1 + y1 + x2 + y2) };
  if (opt.dash) o.strokeLineDash = [6, 5];
  add(rc.line(x1, y1, x2, y2, o));
  const a = Math.atan2(y2 - y1, x2 - x1), L = 11, S = 0.42;
  add(rc.linearPath([
    [x2 - L * Math.cos(a - S), y2 - L * Math.sin(a - S)], [x2, y2],
    [x2 - L * Math.cos(a + S), y2 - L * Math.sin(a + S)],
  ], { stroke: opt.color || C.ink3, strokeWidth: 1.3, roughness: 0.9, seed: seed('h' + x2 + y2) }));
}
function path(pts, opt = {}) {
  const o = { stroke: opt.color || C.ink3, strokeWidth: 1.3, roughness: 1.1, seed: seed('p' + pts[0][0] + pts[0][1]) };
  if (opt.dash) o.strokeLineDash = [6, 5];
  add(rc.linearPath(pts, o));
  const [px, py] = pts[pts.length - 2], [qx, qy] = pts[pts.length - 1];
  const a = Math.atan2(qy - py, qx - px), L = 11, S = 0.42;
  add(rc.linearPath([
    [qx - L * Math.cos(a - S), qy - L * Math.sin(a - S)], [qx, qy],
    [qx - L * Math.cos(a + S), qy - L * Math.sin(a + S)],
  ], { stroke: opt.color || C.ink3, strokeWidth: 1.3, roughness: 0.9, seed: seed('ph' + qx + qy) }));
}
const text = (x, y, s, o = {}) =>
  out.push(`<text x="${x}" y="${y}" text-anchor="${o.anchor || 'middle'}" ` +
    `font-family="${o.mono ? 'var(--mono)' : 'var(--sans)'}" font-size="${o.size || 15}" ` +
    `${o.weight ? `font-weight="${o.weight}" ` : ''}${o.spacing ? `letter-spacing="${o.spacing}" ` : ''}` +
    `fill="${o.fill || C.ink}">${esc(s)}</text>`);

function label(n) {
  const midX = n.x + n.w / 2;
  const kickerH = n.kicker ? 15 : 0;
  const total = kickerH + n.lines.length * 20;
  let y = n.y + (n.h - total) / 2 + 12;
  if (n.kicker) { text(midX, y, n.kicker, { mono: true, size: 10.5, spacing: 2, fill: n.kickerColor || n.accent }); y += kickerH + 4; }
  for (const l of n.lines) { text(midX, y + 4, l, { size: 15 }); y += 20; }
}

// main chain
for (const n of NODES) { box(n); label(n); }
diamond(DECISION);
text(DECISION.x, DECISION.y + 5, DECISION.lines[0], { size: 15, fill: C.ink });

const chain = ['prep', 'read', 'paste', 'agent', 'relay', 'fields', 'send'];
for (let i = 0; i < chain.length - 1; i++) {
  const a = node(chain[i]), b = node(chain[i + 1]);
  arrow(cx, a.y + a.h, cx, b.y - 5);
}
// send -> decision, decision -> end
arrow(cx, node('send').y + node('send').h, cx, DECISION.y - DECISION.ry - 4);
arrow(cx, DECISION.y + DECISION.ry, cx, node('end').y - 5, { color: C.calm });
text(cx + 16, node('end').y - 16, 'YES', { anchor: 'start', mono: true, size: 11, spacing: 1.6, fill: C.calm });

// loop back: decision -> read
path([[DECISION.x - DECISION.rx, DECISION.y], [26, DECISION.y], [26, node('read').y + 26], [COL_X - 5, node('read').y + 26]],
  { color: C.ink3 });
out.push(`<text transform="rotate(-90 17 545)" x="17" y="545" text-anchor="middle" font-family="var(--mono)" font-size="11" letter-spacing="1.4" fill="${C.ink3}">NO \u2014 THE CREW REPLIES, NEXT DAY</text>`);

// optional actions
for (const s of SIDE) {
  sideBox(s); label(s);
  const t = node(s.to);
  arrow(s.x - 6, s.y + s.h / 2, t.x + t.w + 8, t.y + t.h / 2, { dash: true, color: s.accent });
}
text(SIDE_X + SIDE_W / 2, 424, 'OPTIONAL ACTIONS', { mono: true, size: 11, spacing: 2, fill: C.ink3 });

const svgBody = out.join('\n  ');
const inlineSvg =
`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Flow chart of how to play Salvage Rights: write and freeze your agent's instructions, then each day read the crew's message, copy it into Copilot, copy your agent's reply back, fill in the fields and press Send, until a deal is agreed or day 6 is reached." style="display:block;width:100%;height:auto">
  ${svgBody}
</svg>`;

/* ---------- .excalidraw scene ---------- */
let ex = 0;
const el = o => ({
  id: 'sr' + (++ex), angle: 0, strokeWidth: 1, strokeStyle: 'solid', roughness: 1,
  opacity: 100, groupIds: [], frameId: null, roundness: null, seed: (ex * 104729) % 2147483647,
  version: 1, versionNonce: (ex * 15485863) % 2147483647, isDeleted: false,
  boundElements: null, updated: 1, link: null, locked: false,
  fillStyle: 'solid', backgroundColor: 'transparent', strokeColor: C.ink, ...o,
});
const exText = (x, y, w, s, size, color, align) => el({
  type: 'text', x, y, width: w, height: size * 1.25, text: s, originalText: s,
  fontSize: size, fontFamily: 1, textAlign: align || 'center', verticalAlign: 'top',
  containerId: null, lineHeight: 1.25, strokeColor: color, baseline: size,
});
const elements = [];
for (const n of [...NODES, ...SIDE]) {
  elements.push(el({
    type: 'rectangle', x: n.x, y: n.y, width: n.w, height: n.h,
    strokeColor: n.accent, backgroundColor: SIDE.includes(n) ? C.ground : C.panel2,
    strokeStyle: SIDE.includes(n) ? 'dashed' : 'solid', roundness: { type: 3 },
  }));
  let ty = n.y + 12;
  if (n.kicker) { elements.push(exText(n.x, ty, n.w, n.kicker, 11, n.accent)); ty += 20; }
  for (const l of n.lines) { elements.push(exText(n.x, ty, n.w, l, 16, C.ink)); ty += 22; }
}
elements.push(el({
  type: 'diamond', x: DECISION.x - DECISION.rx, y: DECISION.y - DECISION.ry,
  width: DECISION.rx * 2, height: DECISION.ry * 2, strokeColor: C.tense, backgroundColor: C.panel2,
}));
elements.push(exText(DECISION.x - DECISION.rx, DECISION.y - 10, DECISION.rx * 2, DECISION.lines[0], 16, C.ink));
const exArrow = (x1, y1, x2, y2, color, dashed) => elements.push(el({
  type: 'arrow', x: x1, y: y1, width: x2 - x1, height: y2 - y1,
  points: [[0, 0], [x2 - x1, y2 - y1]], strokeColor: color || C.ink3,
  strokeStyle: dashed ? 'dashed' : 'solid', startBinding: null, endBinding: null,
  startArrowhead: null, endArrowhead: 'arrow', roundness: { type: 2 },
}));
for (let i = 0; i < chain.length - 1; i++) {
  const a = node(chain[i]), b = node(chain[i + 1]);
  exArrow(cx, a.y + a.h, cx, b.y - 5);
}
exArrow(cx, node('send').y + node('send').h, cx, DECISION.y - DECISION.ry - 4);
exArrow(cx, DECISION.y + DECISION.ry, cx, node('end').y - 5, C.calm);
elements.push(el({
  type: 'arrow', x: DECISION.x - DECISION.rx, y: DECISION.y,
  width: -(DECISION.x - DECISION.rx - COL_X + 5), height: node('read').y + 26 - DECISION.y,
  points: [[0, 0], [26 - (DECISION.x - DECISION.rx), 0],
           [26 - (DECISION.x - DECISION.rx), node('read').y + 26 - DECISION.y],
           [COL_X - 5 - (DECISION.x - DECISION.rx), node('read').y + 26 - DECISION.y]],
  strokeColor: C.ink3, startBinding: null, endBinding: null, startArrowhead: null,
  endArrowhead: 'arrow', roundness: { type: 2 },
}));
for (const s of SIDE) {
  const t = node(s.to);
  exArrow(s.x - 6, s.y + s.h / 2, t.x + t.w + 8, t.y + t.h / 2, s.accent, true);
}

fs.writeFileSync(__dirname + '/../docs/game-flow.excalidraw', JSON.stringify({
  type: 'excalidraw', version: 2, source: 'https://excalidraw.com',
  elements, appState: { gridSize: null, viewBackgroundColor: C.ground }, files: {},
}, null, 2));

fs.writeFileSync(__dirname + '/../docs/game-flow.svg', inlineSvg.replace(/var\(--mono\)/g, 'IBM Plex Mono, monospace').replace(/var\(--sans\)/g, 'IBM Plex Sans, sans-serif'));
fs.writeFileSync(__dirname + '/game-flow.inline.svg', inlineSvg);
console.log('elements:', elements.length, '| svg bytes:', inlineSvg.length);
