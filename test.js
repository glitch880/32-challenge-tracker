const {test} = require('node:test');
const assert = require('node:assert');
const {IDENTITIES,clampInt,uniq,ciOf,pips,commanderQuery,tally,winPct,wilsonLower,leaderboard,winRateBoard} = require('./logic.js');

test('clampInt floors to a non-negative integer', () => {
  assert.equal(clampInt(-3), 0);
  assert.equal(clampInt('2'), 2);
  assert.equal(clampInt(''), 0);
  assert.equal(clampInt('abc'), 0);
  assert.equal(clampInt(2.9), 2);
  assert.equal(clampInt(undefined), 0);
});

test('uniq removes duplicates, keeps order', () => {
  assert.deepEqual(uniq(['a','a','b']), ['a','b']);
  assert.deepEqual(uniq([]), []);
});

test('ciOf builds a Scryfall colour-identity string', () => {
  assert.equal(ciOf(['G','W','U']), 'gwu');
  assert.equal(ciOf(['C']), 'c');
  assert.equal(ciOf(['W','U','B','R','G']), 'wubrg');
});

test('commanderQuery filters by EXACT colour identity, not a subset', () => {
  const q = commanderQuery('gwu', 'atraxa');
  assert.match(q, /\bid=gwu\b/);
  assert.ok(!q.includes('id<='), 'must not use subset matching — that lets mono/2-colour cards into a 3-colour row');
  assert.ok(q.includes('is:commander'));
  assert.ok(q.includes('atraxa'));
});

test('tally counts a deck only when the row is locked AND has a commander', () => {
  const ent = {a:'Atraxa', b:'', c:'Kenrith'};
  const lk  = {a:true, b:true};              // b locked but empty; c filled but unlocked
  assert.equal(tally(ent, {}, lk).built, 1);
});

test('tally ignores falsy lock values', () => {
  assert.equal(tally({a:'Atraxa'}, {}, {a:false}).built, 0);
});

test('tally sums W/L across rows and clamps junk', () => {
  const st = {a:{w:2,l:1}, b:{w:3,l:4}, c:{w:-5,l:'2'}};
  const {w,l} = tally({}, st, {});
  assert.equal(w, 5);   // 2 + 3 + 0 (negative clamped)
  assert.equal(l, 7);   // 1 + 4 + 2 (string coerced)
});

test('tally on empty input is all zeros', () => {
  assert.deepEqual(tally(), {built:0, w:0, l:0});
});

test('winPct rounds, and is null before any games', () => {
  assert.equal(winPct(2,1), 67);
  assert.equal(winPct(0,0), null);   // null, not 0 — "no games" differs from "lost every game"
  assert.equal(winPct(0,5), 0);
  assert.equal(winPct(5,0), 100);
});

test('wilsonLower is null before any games', () => {
  assert.equal(wilsonLower(0,0), null);
});

test('wilsonLower discounts a small sample', () => {
  // The whole point: 1–0 shows 100% but is worth less than 5–1's 83%.
  assert.ok(wilsonLower(1,0) < wilsonLower(5,1));
  assert.ok(wilsonLower(1,0) < 0.25, 'a 100% record on one game should score below a quarter');
});

test('wilsonLower rises with evidence at a fixed rate', () => {
  assert.ok(wilsonLower(1,0) < wilsonLower(5,0));
  assert.ok(wilsonLower(5,0) < wilsonLower(50,0));
  assert.ok(wilsonLower(2,2) < wilsonLower(20,20));
});

test('wilsonLower stays within [0,1] and matches known values', () => {
  for(const [w,l] of [[0,1],[1,0],[3,1],[5,1],[50,50],[0,20]]){
    const s = wilsonLower(w,l);
    assert.ok(s >= 0 && s <= 1, `${w}-${l} out of range: ${s}`);
  }
  // Hand-computed at z=1.96.
  assert.ok(Math.abs(wilsonLower(1,0) - 0.20654) < 1e-4);
  assert.ok(Math.abs(wilsonLower(5,1) - 0.43649) < 1e-4);
});

test('wilsonLower is 0 for any winless deck, never negative', () => {
  assert.equal(wilsonLower(0,1), 0);
  assert.equal(wilsonLower(0,20), 0);
});

test('wilsonLower clamps junk W/L like the sheet does', () => {
  assert.equal(wilsonLower(-3,0), null);        // clamps to 0–0 -> no games
  assert.equal(wilsonLower('3','1'), wilsonLower(3,1));
});

test('leaderboard orders by decks built, desc', () => {
  const people = {p1:'Ann', p2:'Bob'};
  const entries = {p1:{a:'X'}, p2:{a:'X', b:'Y'}};
  const locks   = {p1:{a:true}, p2:{a:true, b:true}};
  const rows = leaderboard(people, entries, {}, locks);
  assert.deepEqual(rows.map(r=>r.name), ['Bob','Ann']);
  assert.equal(rows[0].built, 2);
});

test('leaderboard ignores win rate when ranking', () => {
  const people  = {p1:'Ann', p2:'Bob'};
  const entries = {p1:{a:'X'}, p2:{a:'X', b:'Y'}};
  const locks   = {p1:{a:true}, p2:{a:true, b:true}};
  const stats   = {p1:{a:{w:9,l:1}}, p2:{a:{w:1,l:9}}};  // Ann 90% w/ 1 deck, Bob 10% w/ 2
  const rows = leaderboard(people, entries, stats, locks);
  assert.deepEqual(rows.map(r=>r.name), ['Bob','Ann']);   // decks win — rate lives on its own board
});

test('leaderboard breaks a tie alphabetically', () => {
  const people = {p1:'Zoe', p2:'Ann'};
  const rows = leaderboard(people, {}, {}, {});
  assert.deepEqual(rows.map(r=>r.name), ['Ann','Zoe']);
});

test('leaderboard reports the 32-slot total and win rate', () => {
  const rows = leaderboard({p1:'Ann'}, {p1:{a:'X'}}, {p1:{a:{w:3,l:1}}}, {p1:{a:true}});
  assert.equal(rows[0].total, 32);
  assert.equal(rows[0].built, 1);
  assert.equal(rows[0].pct, 75);
});

test('leaderboard on no people is empty', () => {
  assert.deepEqual(leaderboard({}), []);
});

// ---- winRateBoard: one row per player *per deck* -------------------------------

const PEOPLE = {p1:'Ann', p2:'Bob'};

test('winRateBoard emits a row per player per locked, named deck', () => {
  const entries = {p1:{w:'Ann White', u:'Ann Blue'}, p2:{w:'Bob White'}};
  const locks   = {p1:{w:true, u:true}, p2:{w:true}};
  const rows = winRateBoard(PEOPLE, entries, {}, locks);
  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map(r=>r.commander).sort(), ['Ann Blue','Ann White','Bob White']);
});

test('winRateBoard includes only locked rows that name a commander', () => {
  const entries = {p1:{w:'Locked', u:'Unlocked', b:'   '}};
  const locks   = {p1:{w:true, b:true, r:true}};   // b is whitespace-only, r is empty
  const rows = winRateBoard(PEOPLE, entries, {}, locks);
  assert.deepEqual(rows.map(r=>r.commander), ['Locked']);
});

test('winRateBoard ranks by win rate, desc', () => {
  const entries = {p1:{w:'Low'}, p2:{u:'High'}};
  const locks   = {p1:{w:true}, p2:{u:true}};
  const stats   = {p1:{w:{w:1,l:3}}, p2:{u:{w:3,l:1}}};   // 25% vs 75%, same sample size
  const rows = winRateBoard(PEOPLE, entries, stats, locks);
  assert.deepEqual(rows.map(r=>r.commander), ['High','Low']);
  assert.equal(rows[0].pct, 75);
});

test('winRateBoard separates equal rates by sample size', () => {
  const entries = {p1:{w:'Proven', u:'Lucky'}};
  const locks   = {p1:{w:true, u:true}};
  const stats   = {p1:{w:{w:5,l:0}, u:{w:1,l:0}}};        // both 100%
  const rows = winRateBoard(PEOPLE, entries, stats, locks);
  assert.deepEqual(rows.map(r=>r.commander), ['Proven','Lucky']);
});

test('winRateBoard does not let a lucky 1–0 outrank a proven 5–1', () => {
  const entries = {p1:{w:'Lucky'}, p2:{u:'Proven'}};
  const locks   = {p1:{w:true}, p2:{u:true}};
  const stats   = {p1:{w:{w:1,l:0}}, p2:{u:{w:5,l:1}}};   // 100% on 1 game vs 83% on 6
  const rows = winRateBoard(PEOPLE, entries, stats, locks);
  assert.deepEqual(rows.map(r=>r.commander), ['Proven','Lucky']);
  assert.equal(rows[0].pct, 83);                          // still *displays* the raw rate
  assert.equal(rows[1].pct, 100);
});

test('winRateBoard exposes both the displayed rate and the ranking score', () => {
  const rows = winRateBoard({p1:'Ann'}, {p1:{w:'Deck'}}, {p1:{w:{w:3,l:1}}}, {p1:{w:true}});
  assert.equal(rows[0].pct, 75);
  assert.ok(rows[0].score > 0 && rows[0].score < 0.75, 'score is the discounted bound, not the rate');
});

test('winRateBoard orders winless decks by fewest losses', () => {
  const entries = {p1:{w:'Bad', u:'Worse'}};
  const locks   = {p1:{w:true, u:true}};
  const stats   = {p1:{w:{w:0,l:1}, u:{w:0,l:9}}};        // both score 0
  const rows = winRateBoard(PEOPLE, entries, stats, locks);
  assert.deepEqual(rows.map(r=>r.commander), ['Bad','Worse']);
});

test('winRateBoard parks unplayed decks below a genuine 0%', () => {
  const entries = {p1:{w:'Never played'}, p2:{u:'Winless'}};
  const locks   = {p1:{w:true}, p2:{u:true}};
  const stats   = {p2:{u:{w:0,l:4}}};
  const rows = winRateBoard(PEOPLE, entries, stats, locks);
  assert.deepEqual(rows.map(r=>r.commander), ['Winless','Never played']);
  assert.equal(rows[0].pct, 0);
  assert.equal(rows[1].pct, null);
});

test('winRateBoard carries the identity name and colours for the pips', () => {
  const rows = winRateBoard({p1:'Ann'}, {p1:{gwu:'Atraxa'}}, {}, {p1:{gwu:true}});
  assert.equal(rows[0].identity, 'Bant');
  assert.deepEqual(rows[0].colors, ['G','W','U']);
  assert.equal(rows[0].player, 'Ann');
  assert.equal(rows[0].playerId, 'p1');
  assert.equal(rows[0].rowId, 'gwu');
});

test('winRateBoard clamps junk W/L like the sheet does', () => {
  const rows = winRateBoard({p1:'Ann'}, {p1:{w:'X'}}, {p1:{w:{w:-2,l:'3'}}}, {p1:{w:true}});
  assert.equal(rows[0].w, 0);
  assert.equal(rows[0].l, 3);
  assert.equal(rows[0].pct, 0);
});

test('winRateBoard skips row ids that are not real identities', () => {
  const rows = winRateBoard({p1:'Ann'}, {p1:{nonsense:'Ghost'}}, {}, {p1:{nonsense:true}});
  assert.deepEqual(rows, []);
});

test('winRateBoard on no people is empty', () => {
  assert.deepEqual(winRateBoard({}), []);
});

// ---- repo integrity -----------------------------------------------------------
// Not logic: this catches a stale cache stamp before it ships, which is the failure
// that blanked the win-rate board on the live site once.

const {hashLogic, currentStamp} = require('./stamp.js');

test('index.html carries the current logic.js hash', () => {
  assert.equal(currentStamp(), hashLogic(),
    'index.html is stale — run `node stamp.js` and commit it (stamp.js explains why)');
});

test('pips renders one mana symbol per colour', () => {
  const html = pips(['G','W']);
  assert.ok(html.includes('ms-g'));
  assert.ok(html.includes('ms-w'));
  assert.equal(html.match(/<i /g).length, 2);
});

// The challenge is 32 decks by definition — these guard the identity table itself.
test('IDENTITIES has exactly 32 unique rows', () => {
  assert.equal(IDENTITIES.length, 32);
  assert.equal(uniq(IDENTITIES.map(i=>i.id)).length, 32);
  assert.equal(uniq(IDENTITIES.map(i=>i.name)).length, 32);
});

test('each IDENTITIES id matches its colours', () => {
  for(const i of IDENTITIES) assert.equal(i.id, ciOf(i.c), `${i.name} id/colour mismatch`);
});

test('IDENTITIES uses only valid colour letters', () => {
  for(const i of IDENTITIES){
    for(const c of i.c) assert.ok('WUBRGC'.includes(c), `${i.name} has bad colour ${c}`);
  }
});

test('IDENTITIES has the right category counts', () => {
  const size = n => IDENTITIES.filter(i=>i.c.length===n && i.id!=='c').length;
  assert.equal(IDENTITIES.filter(i=>i.id==='c').length, 1, 'colorless');
  assert.equal(size(1), 5,  'mono');
  assert.equal(size(2), 10, 'two-colour');
  assert.equal(size(3), 10, 'three-colour');
  assert.equal(size(4), 5,  'four-colour');
  assert.equal(size(5), 1,  'five-colour');
});
