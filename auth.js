/* Bayside auth + operator storage (Option B)
   Include this before any enforceGate() call on gated pages.
*/
(function () {
  const AUTH_KEY = "bayside.auth";                // { name, exp }
  const LEGACY_NAME_KEYS = ["operator", "user", "username"]; // read-only fallbacks
  const REDIRECT_KEY = "bayside.postLoginRedirect";
  const hoursToMs = (h) => h * 3600 * 1000;

  function readJSON(key) {
    try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
  }
  function writeJSON(key, obj) {
    try { localStorage.setItem(key, JSON.stringify(obj)); } catch {}
  }
  function readAuth() {
    const rec = readJSON(AUTH_KEY);
    if (rec && rec.exp && rec.name && Date.now() < +rec.exp) return rec;
    // Legacy upgrade path
    for (const k of LEGACY_NAME_KEYS) {
      const v = localStorage.getItem(k);
      if (v && v.trim()) {
        const name = v.trim();
        const exp = Date.now() + hoursToMs(12);
        const upgraded = { name, exp };
        writeJSON(AUTH_KEY, upgraded);
        return upgraded;
      }
    }
    return null;
  }
  function clearAuthOnly() {
    try { localStorage.removeItem(AUTH_KEY); } catch {}
  }

  window.BaysideAuth = {
    setAuth({ name, ttlHours = 12 }) {
      const exp = Date.now() + hoursToMs(ttlHours);
      try { localStorage.setItem(AUTH_KEY, JSON.stringify({ name: (name || "").trim(), exp })); } catch {}
    },
    isAuthed() { return !!readAuth(); },
    getUserName() { const a = readAuth(); return a ? a.name : null; },
    clear() {
      clearAuthOnly();
      try { sessionStorage.removeItem(REDIRECT_KEY); } catch {}
    },
    enforceGate() {
      if (this.isAuthed()) return;
      try { sessionStorage.setItem(REDIRECT_KEY, window.location.href); } catch {}
      const loginUrl = new URL("login.html", window.location.href);
      loginUrl.searchParams.set("next", window.location.href);
      window.location.replace(loginUrl.toString());
    },
    nextUrlAfterLogin(defaultPath = "ParksMowing.html") {
      const uParam = new URLSearchParams(window.location.search).get("next");
      let sParam = null;
      try { sParam = sessionStorage.getItem(REDIRECT_KEY); } catch {}
      const target = uParam || sParam || defaultPath;
      try { sessionStorage.removeItem(REDIRECT_KEY); } catch {}
      return target;
    }
  };
})();
