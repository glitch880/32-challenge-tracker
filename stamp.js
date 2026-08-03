/* Stamps a content hash of logic.js into index.html's <script src="logic.js?v=…"> tag.

   index.html and logic.js are two separately-cached URLs, so a browser (or the CDN in
   front of GitHub Pages, whose headers we don't control) can serve a fresh index.html
   against a stale logic.js. That skew is silent: the page renders, then a board calls a
   function the old file doesn't have and dies. Hashing the URL means a changed logic.js
   is always a cache miss.

   No build step and no dependencies — index.html stays directly openable from disk.

     node stamp.js           rewrite index.html if the stamp is stale
     node stamp.js --check   exit 1 if stale (pre-commit hook, CI)

   Exit 2 means the script tag itself is missing or renamed, which must fail loudly
   rather than quietly pass a --check.  */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const LOGIC = path.join(DIR, 'logic.js');
const HTML = path.join(DIR, 'index.html');

// Matches the tag and captures the current stamp, so the rewrite can't touch anything else.
const TAG = /(<script src="logic\.js\?v=)([^"]*)(">)/;

const hashLogic = () =>
  crypto.createHash('sha256').update(fs.readFileSync(LOGIC)).digest('hex').slice(0, 8);

// Exported for test.js so the suite checks the same tag the stamper writes.
function currentStamp(html = fs.readFileSync(HTML, 'utf8')){
  const m = html.match(TAG);
  return m ? m[2] : null;
}

function main(){
  const check = process.argv.includes('--check');
  const want = hashLogic();
  const html = fs.readFileSync(HTML, 'utf8');
  const have = currentStamp(html);

  if(have === null){
    console.error('stamp: no <script src="logic.js?v=…"> tag in index.html');
    process.exit(2);
  }
  if(have === want){
    console.log(`stamp: up to date (${want})`);
    return;
  }
  if(check){
    console.error(`stamp: index.html is stale — has ${have}, logic.js hashes to ${want}.`);
    console.error('stamp: run `node stamp.js` and commit index.html.');
    process.exit(1);
  }
  fs.writeFileSync(HTML, html.replace(TAG, `$1${want}$3`));
  console.log(`stamp: ${have} -> ${want}`);
}

if(require.main === module) main();

module.exports = {hashLogic, currentStamp, HTML, LOGIC};
