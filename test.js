const {test} = require('node:test');
const assert = require('node:assert');
const {IDENTITIES,clampInt,uniq,ciOf,pips,commanderQuery,tally,winPct,leaderboard} = require('./logic.js');

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

test('leaderboard orders by win rate, desc', () => {
  const people = {p1:'Ann', p2:'Bob'};
  const stats  = {p1:{a:{w:1,l:3}}, p2:{a:{w:3,l:1}}};   // 25% vs 75%
  const rows = leaderboard(people, {}, stats, {});
  assert.deepEqual(rows.map(r=>r.name), ['Bob','Ann']);
  assert.equal(rows[0].pct, 75);
});

test('win rate outranks decks built', () => {
  const people  = {p1:'Ann', p2:'Bob'};
  const entries = {p1:{a:'X'}, p2:{a:'X', b:'Y'}};
  const locks   = {p1:{a:true}, p2:{a:true, b:true}};
  const stats   = {p1:{a:{w:9,l:1}}, p2:{a:{w:1,l:9}}};  // Ann 90% w/ 1 deck, Bob 10% w/ 2
  const rows = leaderboard(people, entries, stats, locks);
  assert.deepEqual(rows.map(r=>r.name), ['Ann','Bob']);
});

test('decks built breaks a win-rate tie', () => {
  const people  = {p1:'Ann', p2:'Bob'};
  const entries = {p1:{a:'X'}, p2:{a:'X', b:'Y'}};
  const locks   = {p1:{a:true}, p2:{a:true, b:true}};
  const stats   = {p1:{a:{w:1,l:1}}, p2:{a:{w:2,l:2}}};  // both 50%
  const rows = leaderboard(people, entries, stats, locks);
  assert.deepEqual(rows.map(r=>r.name), ['Bob','Ann']);
  assert.equal(rows[0].built, 2);
});

test('players with no games rank below a genuine 0%', () => {
  const people = {p1:'Ann', p2:'Bob'};
  const stats  = {p2:{a:{w:0,l:4}}};                     // Ann unranked, Bob 0%
  const rows = leaderboard(people, {}, stats, {});
  assert.deepEqual(rows.map(r=>r.name), ['Bob','Ann']);
  assert.equal(rows[0].pct, 0);
  assert.equal(rows[1].pct, null);
});

test('leaderboard breaks a full tie alphabetically', () => {
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
