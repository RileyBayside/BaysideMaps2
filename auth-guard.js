/* auth-guard.js — repo-safe login redirect & guard
   - Clears stale redirect targets from old repo paths (e.g., /BaysideMapss → /Maps)
   - Only redirects to same-origin, same-repo pages
   - Supports ?next=... and cached "bayside_next" in session/local storage
*/

(() => {
  'use strict';

  const KEY = 'bayside_next';

  // Determine the current GitHub Pages repo path prefix, e.g. "/Maps/"
  const repo = (location.pathname.split('/')[1] || '').trim();
  const PREFIX = repo ? `/${repo}/` : '/';

  // --- Utilities -------------------------------------------------------------

  function pageName() {
    const last = location.pathname.split('/').pop() || '';
    return last || 'index.html';
  }

  function currentPathAndQuery() {
    // Always ensure path is absolute and includes repo prefix
    let p = location.pathname + location.search + location.hash;
    if (!p.startsWith('/')) p = `/${p}`;
    if (repo && !p.startsWith(PREFIX)) {
      // Force under current repo if somehow missing
      p = PREFIX + p.replace(/^\//, '');
    }
    return p;
  }

  function safeStartsWithRepo(path) {
    try {
      return typeof path === 'string' && path.startsWith(PREFIX);
    } catch {
      return false;
    }
  }

  function sanitizeNext(raw) {
    if (!raw || typeof raw !== 'string') return null;

    try {
      // Decode once if URL-encoded
      raw = decodeURIComponent(raw);
    } catch { /* ignore */ }

    // Disallow absolute URLs (prevent open redirect)
    if (/^https?:\/\//i.test(raw)) return null;

    // Normalize bare filenames ("index.html") and relative paths ("admin.html")
    if (!raw.startsWith('/')) raw = `${PREFIX}${raw.replace(/^\//, '')}`;

    // Enforce same-repo
    if (!safeStartsWithRepo(raw)) return null;

    // Don’t allow redirecting back to login
    if (/\/login\.html(\?|#|$)/i.test(raw)) return null;

    return raw;
  }

  function storeNext(path) {
    if (!path) return;
    try { sessionStorage.setItem(KEY, path); } catch { /* ignore */ }
    try { localStorage.setItem(KEY, path); } catch { /* ignore */ }
  }

  function readNextFromStorage() {
    let v = null;
    try { v = sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || null; } catch { /* ignore */ }
    return v;
  }

  function clearNextStorage() {
    try { sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    try { localStorage.removeItem(KEY); } catch { /* ignore */ }
  }

  function consumeNext() {
    // Priority: ?next=... then cached storage
    const fromQuery = new URLSearchParams(location.search).get('next');
    let candidate = sanitizeNext(fromQuery) || sanitizeNext(readNextFromStorage());
    if (candidate) clearNextStorage();
    return candidate;
  }

  function purgeStaleCachedTargets() {
    // If any cached next doesn’t start with current repo prefix, drop it
    try {
      const sn = sessionStorage.getItem(KEY);
      if (sn && !safeStartsWithRepo(sn)) sessionStorage.removeItem(KEY);
    } catch { /* ignore */ }
    try {
      const ln = localStorage.getItem(KEY);
      if (ln && !safeStartsWithRepo(ln)) localStorage.removeItem(KEY);
    } catch { /* ignore */ }
  }

  function toLoginWithNext(nextTarget) {
    const loginUrl = `${PREFIX}login.html?next=${encodeURIComponent(nextTarget)}`;
    location.replace(loginUrl);
  }

  // --- Firebase wait helper --------------------------------------------------

  function waitForFirebaseAuth(callback) {
    // Call callback once firebase.auth() is ready; give it plenty of time.
    const start = Date.now();
    const limitMs = 15000; // 15s
    const iv = setInterval(() => {
      const ready = !!(window.firebase && typeof window.firebase.auth === 'function');
      if (ready) {
        clearInterval(iv);
        callback();
      } else if (Date.now() - start > limitMs) {
        clearInterval(iv);
        console.warn('[auth-guard] firebase.auth() not found after 15s; proceeding without guard.');
      }
    }, 50);
  }

  // --- Main guard ------------------------------------------------------------

  function runGuard() {
    purgeStaleCachedTargets();

    const onLoginPage = /\/login\.html$/i.test(location.pathname) || pageName().toLowerCase() === 'login.html';

    // Keep a sane default target under the current repo
    const DEFAULT_TARGET = `${PREFIX}index.html`;

    try {
      firebase.auth().onAuthStateChanged(user => {
        // LOGIN PAGE BEHAVIOR
        if (onLoginPage) {
          if (user) {
            // Already signed in → send to intended page (consume ?next or cached), else index
            const target = consumeNext() || DEFAULT_TARGET;
            location.replace(target);
            return;
          }

          // Not signed in: if a valid ?next is present, cache it (helps post-login redir)
          const qNext = new URLSearchParams(location.search).get('next');
          const sanitized = sanitizeNext(qNext);
          if (sanitized) storeNext(sanitized);

          // Stay on login page; your login UI will handle sign-in.
          return;
        }

        // NON-LOGIN PAGES
        if (!user) {
          // Not signed in → go to login with a good next back to this page
          const here = currentPathAndQuery();
          // Ensure here is under current repo and not login
          const safeHere = sanitizeNext(here) || DEFAULT_TARGET;
          storeNext(safeHere);
          toLoginWithNext(safeHere);
          return;
        }

        // Signed in and not on login → carry on (page scripts continue)
      });
    } catch (e) {
      console.error('[auth-guard] Exception wiring auth state listener:', e);
    }
  }

  // Kick off once firebase is available
  if (window.firebase && typeof window.firebase.auth === 'function') {
    runGuard();
  } else {
    waitForFirebaseAuth(runGuard);
  }

  // Expose tiny debug helpers if needed
  window.authGuard = Object.freeze({
    PREFIX,
    consumeNext,
    storeNext,
    clearNextStorage,
    sanitizeNext
  });
})();
