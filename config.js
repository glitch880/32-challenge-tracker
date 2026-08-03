/* Deployment settings for the 32 Challenge tracker — everything you'd change to point
   this at your own Firebase project, in one place instead of buried in index.html.
   Loaded as a plain <script> by index.html and require()d by test.js.

   Committed on purpose, and safe to commit: a Firebase web config identifies a project,
   it does not grant access to one. Every Firebase web app ships this to the browser, so
   hiding it here would buy nothing — the page would still hand it to every visitor.
   The data is protected by database.rules.json plus the shared passphrase, and that
   passphrase is never in this repo: members type it and Firebase Auth validates it.  */

const CONFIG = {

  // Firebase console -> Project settings -> Your apps -> Web app -> SDK setup and config.
  // Only databaseURL + apiKey + projectId are strictly needed for Realtime Database,
  // but paste the whole object.
  firebase: {
    apiKey: "AIzaSyBwXwdZso93ls8rc5VNUwgTXQhdiEZKSKs",
    authDomain: "commander-32.firebaseapp.com",
    databaseURL: "https://commander-32-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "commander-32",
    storageBucket: "commander-32.firebasestorage.app",
    messagingSenderId: "861515031209",
    appId: "1:861515031209:web:f4beedd0aed9d745033fb8",
    measurementId: "G-K7KX5L5ZYF"
  },

  // Identifies the shared Firebase account everyone signs in as. Its password is the
  // passphrase — entered by the user, validated by Firebase Auth, never stored here.
  sharedEmail: "pod@32challenge.local",

};

if (typeof module !== 'undefined') module.exports = {CONFIG};
