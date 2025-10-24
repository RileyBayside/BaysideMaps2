// Firebase Cloud Functions — Admin-create operator users
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

async function assertIsAdmin(context) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'You must be signed in.');
  }
  const uid = context.auth.uid;
  const snap = await admin.firestore().doc(`users/${uid}`).get();
  if (!snap.exists || snap.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Admin role required.');
  }
}

exports.adminCreateOperator = functions.region('australia-southeast1').https.onCall(async (data, context) => {
  await assertIsAdmin(context);

  const username = (data.username || '').toLowerCase().trim();
  const password = (data.password || '').trim();
  const displayName = (data.displayName || '').trim();

  if (!username || !/^[a-z0-9._-]{3,}$/.test(username)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid username', { username });
  }
  if (!password || password.length < 6) {
    throw new functions.https.HttpsError('invalid-argument', 'Password must be at least 6 characters');
  }

  const email = `${username}@bayside.local`;

  // Create the Auth user
  const userRecord = await admin.auth().createUser({
    email,
    password,
    displayName: displayName || username,
    emailVerified: false,
    disabled: false,
  });

  // Upsert Firestore /users/{uid}
  await admin.firestore().doc(`users/${userRecord.uid}`).set({
    uid: userRecord.uid,
    email,
    name: displayName || username,
    role: 'operator',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { uid: userRecord.uid, email };
});
