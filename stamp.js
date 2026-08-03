/* Stamps a content hash of each local script into its <script src="…?v=…"> tag in
   index.html.

   index.html and its scripts are separately-cached URLs, so a browser (or the CDN in
   front of GitHub Pages, whose headers we don't control) can serve a fresh index.html
   against a stale logic.js or config.js. That skew is silent: the page renders, then
   something calls a function or reads a setting the old file doesn't have and dies.
   Hashing the URL means a changed file is always a cache miss.

   No build step and no dependencies — index.html stays directly openable from disk.

     node stamp.js           rewrite index.html if the stamp is stale
     node stamp.js --check   exit 1 if stale (pre-commit hook, CI)

   Exit 2 means the script tag itself is missing or renamed, which must fail loudly
   rather than quietly pass a --check.  */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DIR = __dirname;
const HTML = path.join(DIR, 'index.html');

// Every local script index.html loads. Each is separately cached, so each needs its own
// stamp — adding a file here and forgetting to stamp it is how the original bug happened.
const STAMPED = ['config.js', 'logic.js'];

// Matches one file's tag and captures its current stamp, so a rewrite can't touch
// anything else on the line — including the other file's tag.
const tagRe = file =>
  new RegExp(`(<script src="${file.replace(/\./g, '\\.')}\\?v=)([^"]*)(">)`);

const hashFile = file =>
  crypto.createHash('sha256').update(fs.readFileSync(path.join(DIR, file))).digest('hex').slice(0, 8);

// Exported for test.js so the suite reads the same tags the stamper writes.
function currentStamp(file, html = fs.readFileSync(HTML, 'utf8')){
  const m = html.match(tagRe(file));
  return m ? m[2] : null;
}

function main(){
  const check = process.argv.includes('--check');
  let html = fs.readFileSync(HTML, 'utf8');
  let stale = 0;

  for(const file of STAMPED){
    const want = hashFile(file);
    const have = currentStamp(file, html);

    if(have === null){
      console.error(`stamp: no <script src="${file}?v=…"> tag in index.html`);
      process.exit(2);
    }
    if(have === want){
      console.log(`stamp: ${file} up to date (${want})`);
      continue;
    }
    stale++;
    if(check){
      console.error(`stamp: ${file} is stale — index.html has ${have}, file hashes to ${want}.`);
      continue;
    }
    html = html.replace(tagRe(file), `$1${want}$3`);
    console.log(`stamp: ${file} ${have} -> ${want}`);
  }

  if(check && stale){
    console.error('stamp: run `node stamp.js` and commit index.html.');
    process.exit(1);
  }
  if(stale) fs.writeFileSync(HTML, html);
}

if(require.main === module) main();

module.exports = {STAMPED, hashFile, currentStamp, HTML};
