
// appcheck.js (shared; safe activation)
self.FIREBASE_APPCHECK_DEBUG_TOKEN = true; // DEV ONLY: prints a debug token to console

const APPCHECK_SITE_KEY = '6LfDGeIrAAAAAH8bc8-SZHLy1fNZNI6bvyoRO7LL';

function activateAppCheck(){
  try{
    if (!window.firebase || !firebase.app) return;
    firebase.appCheck().activate(APPCHECK_SITE_KEY, true); // auto-refresh
    console.log('[AppCheck] reCAPTCHA v3 activated');
  }catch(e){
    console.error('[AppCheck] activation error:', e);
  }
}
window.addEventListener('load', activateAppCheck);
