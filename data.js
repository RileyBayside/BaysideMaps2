(function(){
  const db = () => firebase.firestore();
  const auth = () => firebase.auth();
  async function currentUser() {
    return new Promise((resolve) => {
      const unsub = auth().onAuthStateChanged(u => { unsub(); resolve(u || null); });
    });
  }
  async function getUserDoc(uid){
    const snap = await db().collection('users').doc(uid).get();
    return snap.exists ? snap.data() : null;
  }
  async function getMyRole(){
    const u = await currentUser();
    if (!u) return null;
    const doc = await getUserDoc(u.uid);
    return doc ? (doc.role || 'operator') : 'operator';
  }
  async function listOperators(){
    const q = await db().collection('users').where('role','==','operator').orderBy('name').get();
    return q.docs.map(d => d.data());
  }
  async function listAssignmentsFor(uid, onlyOpen=true){
    let ref = db().collection('assignments').where('assigneeUid','==',uid);
    if (onlyOpen) ref = ref.where('status','in',['open','in_progress']);
    ref = ref.orderBy('createdAt','desc');
    const q = await ref.get();
    return q.docs.map(d => ({ id: d.id, ...d.data() }));
  }
  async function createAssignment({ assigneeUid, assigneeName, zone, parksSpec, notes }){
    const u = auth().currentUser;
    if (!u) throw new Error('Not signed in');
    const payload = {
      assigneeUid,
      assigneeName,
      zone: (zone||'').trim(),
      parksSpec: (parksSpec||'').trim(),
      notes: (notes||'').trim() || null,
      status: 'open',
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: u.uid
    };
    const ref = await db().collection('assignments').add(payload);
    return ref.id;
  }
  async function updateAssignmentStatus(id, status){
    const allowed = ['open','in_progress','done'];
    if (!allowed.includes(status)) throw new Error('Invalid status');
    await db().collection('assignments').doc(id).update({
      status,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
  window.BaysideData = {
    currentUser, getUserDoc, getMyRole,
    listOperators, listAssignmentsFor,
    createAssignment, updateAssignmentStatus
  };
})();
