// Balance simulation (spec section 4.9). Usage: node tools/balance-sim.js [index.html] [games-per-build-per-policy]
// Reads the engine straight out of index.html, so it tests exactly what ships.
const fs = require('fs');
const src = fs.readFileSync(process.argv[2] || __dirname + '/../index.html', 'utf8');
const code = src.split('/*ENGINE-BEGIN*/')[1].split('/*ENGINE-END*/')[0];
const P7 = new Function(code + '\nreturn P7;')();
const N = +(process.argv[3] || 120);
const FB = JSON.parse(fs.readFileSync(__dirname + '/../assets/fallback.json', 'utf8'));
if (process.env.TUNE) Object.assign(P7.TUNE, JSON.parse(process.env.TUNE));
const D = P7.distanceFactors(FB.horizons.rows);
console.log('TUNE', JSON.stringify(P7.TUNE), 'df', D.df.join(' '));

const BUILDS = {
  flagship: { cls: 'flagship', ship: 'large', robots: ['heavy', 'orbcam'], dish: 'd15', band: 'Ka', rec: 3 },
  breadth:  { cls: 'flagship', ship: 'medium', robots: ['light', 'orbcam', 'weather', 'heli'], dish: 'd30', band: 'Ka', rec: 4 },
  cheap:    { cls: 'frontiers', ship: 'small', robots: ['light', 'weather', 'heli'], dish: 'd15', band: 'X', rec: 2 },
  overbuilt:{ cls: 'flagship', ship: 'large', robots: ['heavy', 'orbcam'], dish: 'd15', band: 'X', rec: 1 }
};

function tryAct(s, id, arg) { return P7.canDo(s, id).ok ? P7.act(s, id, arg) : null; }

// ---- smart policy: triage by value density, keep the pipeline full ----
const SLOTS_PER_WEEK = +(process.env.SPW || 3);
function capBetween(s, w0, w1) { let c = 0; for (let w = w0; w <= w1; w++) c += SLOTS_PER_WEEK * P7.cardsPerSlot({ ...s, flags: {}, week: w }); return c; }
const genFor = (s, o) => s.build.robots.filter(r => P7.ROBOTS[r].tag === o.tag).reduce((a, r) => a + P7.ROBOTS[r].gen, 0);
function triage(s) {
  for (let guard = 0; guard < 5; guard++) {
    const L = P7.live(s).slice().sort((a, b) => a.deadline - b.deadline);
    let victim = null, cum = 0;
    for (const o of L) {
      const left = o.need - o.delivered;
      const supply = o.delivered + s.rec[o.id] + 2 * s.packed[o.id] + genFor(s, o) * Math.max(0, o.deadline - s.week) + 16;
      if (supply < o.need) { victim = o; break; }
      cum += left;
      if (cum > capBetween(s, s.week, o.deadline) * +(process.env.SLACK || 1.15)) {
        const prefix = L.slice(0, L.indexOf(o) + 1);
        victim = prefix.sort((a, b) => a.pts / (a.need - a.delivered) - b.pts / (b.need - b.delivered))[0];
        break;
      }
    }
    if (!victim) return s;
    s = P7.withdraw(s, victim.id);
    if (s.phase !== 'ops') return s;
  }
  return s;
}
function smartResolve(s) {
  if (s.goodwill > 0 && P7.canResolve(s, 'goodwill').ok) return P7.resolve(s, 'goodwill');
  if (s.conflict.short >= 2 && s.week < 12) return P7.resolve(s, 'trade');
  return P7.resolve(s, 'smaller');
}
function smartWeek(s) {
  const step = id => { if (!P7.canDo(s, id).ok) return false; s = P7.act(s, id); if (s.conflict) s = smartResolve(s); return true; };
  s = triage(s);
  if (s.phase !== 'ops') return s;
  const byDl = () => P7.live(s).slice().sort((a, b) => a.deadline - b.deadline);
  const withData = () => byDl().find(o => s.rec[o.id] + s.packed[o.id] > 0);
  if (s.persist.calBroken) step('calibrate');
  if (s.persist.safe) { if (!P7.openSlots(s).length) step('request'); step('repair'); }
  if (s.persist.wheel) { if (!P7.openSlots(s).length) step('request'); step('service'); }
  if (s.stuck) step('ret');
  for (let k = 0; k < 6 && s.pool > 0; k++) {
    const fo = withData(); if (fo) s = P7.setFocus(s, fo.id);
    // calibrate anything that will finish this week or next
    const unc = byDl().find(o => !o.calibrated && o.delivered + s.rec[o.id] + 2 * s.packed[o.id] >= o.need * 0.5);
    if (unc && s.pool >= 1 && (s.pool !== 3 || !P7.openSlots(s).length)) { s = P7.setFocus(s, unc.id); step('calibrate'); continue; }
    if (P7.openSlots(s).length && P7.recUsed(s) && !s.flags.conjunction && s.pool >= 3) {
      if (fo && s.rec[fo.id] >= 4 && P7.recUsed(s) > P7.downlinkCap(s) * 1.5 && s.pool >= 5) { step('analyse'); continue; }
      if (step('upload')) continue;
    }
    if (!P7.openSlots(s).length && s.pool >= 5 && !s.flags.conjunction && !s.persist.safe) { if (step('request')) continue; }
    // generation-bound objective near deadline: command robots
    const starving = byDl().find(o => o.delivered + s.rec[o.id] + 2 * s.packed[o.id] + genFor(s, o) * (o.deadline - s.week) < o.need);
    if (starving && P7.openSlots(s).length && s.pool >= 3) { s = P7.setFocus(s, starving.id); if (step('command')) continue; }
    break;
  }
  if (s.pool === 1 && s.goodwill < 2) step('standdown');
  return P7.endWeek(s);
}

// ---- naive policy: a casual player — requests and uploads, rarely calibrates, never triages ----
function naiveWeek(s) {
  const first = o => P7.canResolve(s, o).ok;
  const go = id => { if (P7.canDo(s, id).ok) { s = P7.act(s, id); if (s.conflict) s = P7.resolve(s, ['split','smaller','concede'].find(first)); } };
  go('request');
  if (Math.random() < 0.35) go('calibrate');
  go('upload');
  const ids = Object.keys(P7.ACTIONS);
  for (let k = 0; k < 3 && s.phase === 'ops'; k++) { const legal = ids.filter(id => P7.canDo(s, id).ok && id !== 'calibrate'); if (!legal.length) break; go(legal[Math.floor(Math.random() * legal.length)]); }
  return P7.endWeek(s);
}

function run(build, policy, seed) {
  let s = P7.newGame(build, { seed, df: D.df, dfSrc: D.src });
  let guard = 0;
  while (s.phase === 'ops' && guard++ < 20) s = policy(s);
  if (s.phase !== 'debrief') throw new Error('paralysed run, week ' + s.week);
  return { ...P7.score(s), overflow: s.stats.overflow };
}
const stats = a => { const m = a.reduce((x, y) => x + y, 0) / a.length; return { mean: m, min: Math.min(...a), max: Math.max(...a) }; };
let total = 0;
for (const [name, b] of Object.entries(BUILDS)) {
  const probs = P7.buildProblems(b);
  const row = { build: name, cost: P7.buildCost(b) + '/' + P7.CLASSES[b.cls].budget, mass: P7.buildMass(b) + '/' + P7.SHIPS[b.ship].cap, probs: probs.join(' ') };
  for (const [pn, pol] of [['smart', smartWeek], ['naive', naiveWeek]]) {
    const rs = []; for (let i = 0; i < N; i++) rs.push(run(b, pol, 1000 + i)); total += N;
    const r = stats(rs.map(x => x.retained)), p = stats(rs.map(x => x.pts)), o = stats(rs.map(x => x.overflow)), ob = stats(rs.map(x => x.obtained));
    row[pn] = `ret ${r.mean.toFixed(0)}% [${r.min}-${r.max}] pts ${p.mean.toFixed(1)} lost ${o.mean.toFixed(0)} obt ${ob.mean.toFixed(0)}%`;
  }
  console.log(JSON.stringify(row));
}
console.log('games simulated:', total);
