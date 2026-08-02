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

function leaderboard(people, entries={}, stats={}, locks={}, total=IDENTITIES.length){
  return Object.entries(people).map(([id,name])=>{
    const t = tally(entries[id], stats[id], locks[id]);
    return {id, name, ...t, pct: winPct(t.w,t.l), total};
  }).sort((a,b)=> b.built-a.built || a.name.localeCompare(b.name));
}

if (typeof module !== 'undefined') module.exports = {IDENTITIES,clampInt,uniq,ciOf,pips,commanderQuery,tally,winPct,leaderboard};
