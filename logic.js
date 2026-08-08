/* Pure logic for the 32 Challenge tracker — no DOM, no Firebase.
   Loaded as a plain <script> by index.html and require()d by test.js.
   Run the tests with:  node --test  */

const IDENTITIES = [
  {id:'c',name:'Colorless',c:['C']},
  {id:'w',name:'White',c:['W']},{id:'u',name:'Blue',c:['U']},{id:'b',name:'Black',c:['B']},
  {id:'r',name:'Red',c:['R']},{id:'g',name:'Green',c:['G']},
  {id:'wu',name:'Azorius',c:['W','U']},{id:'ub',name:'Dimir',c:['U','B']},{id:'br',name:'Rakdos',c:['B','R']},
  {id:'rg',name:'Gruul',c:['R','G']},{id:'gw',name:'Selesnya',c:['G','W']},{id:'wb',name:'Orzhov',c:['W','B']},
  {id:'ur',name:'Izzet',c:['U','R']},{id:'bg',name:'Golgari',c:['B','G']},{id:'rw',name:'Boros',c:['R','W']},
  {id:'gu',name:'Simic',c:['G','U']},
  {id:'gwu',name:'Bant',c:['G','W','U']},{id:'wub',name:'Esper',c:['W','U','B']},{id:'ubr',name:'Grixis',c:['U','B','R']},
  {id:'brg',name:'Jund',c:['B','R','G']},{id:'rgw',name:'Naya',c:['R','G','W']},
  {id:'wbg',name:'Abzan',c:['W','B','G']},{id:'urw',name:'Jeskai',c:['U','R','W']},{id:'bgu',name:'Sultai',c:['B','G','U']},
  {id:'rwb',name:'Mardu',c:['R','W','B']},{id:'gur',name:'Temur',c:['G','U','R']},
  {id:'wubr',name:'Artifice',c:['W','U','B','R']},{id:'ubrg',name:'Chaos',c:['U','B','R','G']},
  {id:'brgw',name:'Aggro',c:['B','R','G','W']},{id:'rgwu',name:'Altruism',c:['R','G','W','U']},
  {id:'gwub',name:'Growth',c:['G','W','U','B']},
  {id:'wubrg',name:'5-color',c:['W','U','B','R','G']}
];

const clampInt = v => Math.max(0, Math.floor(+v || 0));

const uniq = a => [...new Set(a)];

// ['G','W','U'] -> 'gwu' — Scryfall's exact color-identity filter (letter order irrelevant).
const ciOf = cs => cs.join('').toLowerCase();

// id= is EXACT. id<= would match subsets (mono/2-colour cards in a 3-colour row) — wrong here.
const commanderQuery = (ci,q) => `is:commander id=${ci} ${q}`;

// Every printing of one card. !"..." is Scryfall's exact-name match — the caller adds
// &unique=prints, which is a search parameter rather than query syntax.
const printsQuery = name => `!"${String(name).trim().replace(/"/g,'')}"`;

// What we store and show for a chosen printing.
// name: flavor_name is reserved for cards printing two names side by side (the Godzilla
// treatment); English reflavored prints — Miku as Trostani — carry printed_name instead.
// Reading only one of them misses half the reskins.
// set: most printings of a card share one name, so the set and collector number are the
// only thing that tells plain alternate arts apart. It is a label, not a nicety.
function printInfo(card={}){
  return {
    id: card.id || '',
    name: card.flavor_name || card.printed_name || card.name || '',
    set: [card.set_name, card.collector_number && '#'+card.collector_number]
           .filter(Boolean).join(' '),
  };
}

// A pinned printing is addressed by id; without one we fall back to a fuzzy name lookup,
// which is what every card image did before printings could be chosen.
function imageUrl(pin, name, version='art_crop'){
  const base = 'https://api.scryfall.com/cards/';
  return pin && pin.id
    ? `${base}${encodeURIComponent(pin.id)}?format=image&version=${version}`
    : `${base}named?format=image&version=${version}&fuzzy=${encodeURIComponent(name)}`;
}

function pips(colors){
  return '<div class="pips">' +
    colors.map(k=>`<i class="ms ms-${k.toLowerCase()} ms-cost"></i>`).join('') +
    '</div>';
}

// A deck is "built" when its row is locked AND has a commander — locking an empty row shouldn't count.
function tally(ent={}, st={}, lk={}){
  const built = Object.keys(lk).filter(r=>lk[r] && (ent[r]||'').trim()).length;
  let w=0,l=0;
  Object.values(st).forEach(s=>{ w+=clampInt(s.w); l+=clampInt(s.l); });
  return {built,w,l};
}

const winPct = (w,l) => (w+l) ? Math.round(100*w/(w+l)) : null;   // null = no games yet

const Z = 1.96;   // 95% confidence

// Lower bound of the Wilson score interval — "the win rate this deck can be trusted to
// hold up at". Raw rate rewards small samples: 1–0 shows 100% and beats 5–1. The bound
// discounts a result by how little evidence backs it, so 1–0 scores 0.21 while 5–1 —
// a worse rate on more games — scores 0.44. Returns null with no games: nothing to bound.
function wilsonLower(w, l, z=Z){
  w = clampInt(w); l = clampInt(l);
  const n = w + l;
  if(!n) return null;
  const p = w/n, z2 = z*z;
  return (p + z2/(2*n) - z*Math.sqrt((p*(1-p) + z2/(4*n))/n)) / (1 + z2/n);
}

// score===null means "no games yet" — unranked, not 0. The bound is >= 0, so -1 parks
// those below a deck that has genuinely gone 0–n.
const rank = r => r.score===null ? -1 : r.score;

const IDENTITY_BY_ID = Object.fromEntries(IDENTITIES.map(i=>[i.id,i]));

// The challenge's own six categories, in IDENTITIES order — how the original printable
// sheet groups them, and how the art board lays itself out.
// Colorless is checked first on purpose: its c is ['C'], length 1, so a plain size test
// would file it under mono.
const GROUPS = [
  ['Colorless',   i=> i.id==='c'],
  ['Mono',        i=> i.c.length===1],
  ['Two-color',   i=> i.c.length===2],
  ['Three-color', i=> i.c.length===3],
  ['Four-color',  i=> i.c.length===4],
  ['Five-color',  i=> i.c.length===5],
];

function identityGroups(list=IDENTITIES){
  const left = [...list];
  return GROUPS.map(([label, match])=>{
    const items = [];
    for(let n=left.length-1; n>=0; n--){          // walk back so splicing is safe
      if(match(left[n])) items.unshift(...left.splice(n,1));
    }
    return {label, items};
  });
}

// Board 1 — one row per player, ranked by progress through the 32.
function leaderboard(people, entries={}, stats={}, locks={}, total=IDENTITIES.length){
  return Object.entries(people).map(([id,name])=>{
    const t = tally(entries[id], stats[id], locks[id]);
    return {id, name, ...t, pct: winPct(t.w,t.l), total};
  }).sort((a,b)=> b.built-a.built || a.name.localeCompare(b.name));
}

// Board 2 — one row per player *per deck*, ranked by that deck's Wilson lower bound.
// Only built decks compete: same rule as tally() — the row must be locked AND named.
// pct is what the row displays; score is what it sorts on. Unplayed decks sit at the bottom.
// The bound is exactly 0 for any winless deck, so the last tiebreak is fewest losses —
// 0–1 is a smaller sample of bad news than 0–20, not an equal one.
function winRateBoard(people, entries={}, stats={}, locks={}){
  const rows = [];
  Object.entries(people).forEach(([id,name])=>{
    const ent = entries[id] || {}, st = stats[id] || {}, lk = locks[id] || {};
    Object.keys(lk).forEach(rowId=>{
      const commander = (ent[rowId]||'').trim();
      if(!lk[rowId] || !commander) return;
      const idn = IDENTITY_BY_ID[rowId];
      if(!idn) return;                       // unknown row id — stale data, skip it
      const w = clampInt((st[rowId]||{}).w), l = clampInt((st[rowId]||{}).l);
      rows.push({playerId:id, player:name, rowId, commander,
                 identity:idn.name, colors:idn.c, w, l,
                 pct:winPct(w,l), score:wilsonLower(w,l)});
    });
  });
  return rows.sort((a,b)=>
    rank(b)-rank(a) || a.l-b.l ||
    a.player.localeCompare(b.player) || a.commander.localeCompare(b.commander));
}

if (typeof module !== 'undefined') module.exports = {IDENTITIES,clampInt,uniq,ciOf,pips,commanderQuery,printsQuery,printInfo,imageUrl,tally,winPct,wilsonLower,leaderboard,winRateBoard,identityGroups};
