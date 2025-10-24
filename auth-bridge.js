
// auth-bridge.js
(function(){
  const DEFAULT_TTL_HOURS = 0.5; // 30 minutes

  function prettyNameFromEmail(email){
    if (!email) return 'Operator';
    const local = email.split('@')[0];
    return local.charAt(0).toUpperCase() + local.slice(1);
  }

  async function ensureUserDoc(user){
    const db = firebase.firestore();
    const ref = db.collection('users').doc(user.uid);
    const snap = await ref.get();
    const base = {
      uid: user.uid,
      email: user.email || null,
      name: (user.displayName && user.displayName.trim()) ? user.displayName.trim() : prettyNameFromEmail(user.email || ''),
      role: snap.exists ? (snap.data().role || 'operator') : 'operator',
      updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdAt: snap.exists ? (snap.data().createdAt || firebase.firestore.FieldValue.serverTimestamp())
                             : firebase.firestore.FieldValue.serverTimestamp()
    };
    await ref.set(base, { merge: true });
    return base.role;
  }

  async function onFirebaseLogin(user){
    try{
      await ensureUserDoc(user);
      const name = (user.displayName && user.displayName.trim()) || prettyNameFromEmail(user.email || '');
      if (window.BaysideAuth && BaysideAuth.setAuth){
        BaysideAuth.setAuth({ name, ttlHours: DEFAULT_TTL_HOURS });
      }
      window.location.replace("index.html");
    }catch(e){
      console.warn("auth-bridge ensureUserDoc failed:", e);
      alert("Login succeeded but profile sync failed: " + (e && e.message ? e.message : e));
    }
  }

  window.BaysideAuthBridge = { onFirebaseLogin };
})();
