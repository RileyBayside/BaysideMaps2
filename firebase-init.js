
/* firebase-init.js — project config only (no App Check, no Firestore on login) */
(function(){
  const firebaseConfig = {
    apiKey: "AIzaSyDSuG2VGa6-8RRyTYyy05oXqCTXIvS2RJI",
    authDomain: "bayside-maps.firebaseapp.com",
    projectId: "bayside-maps",
    storageBucket: "bayside-maps.firebasestorage.app",
    messagingSenderId: "204164908023",
    appId: "1:204164908023:web:c8644566317c5b1c80264a",
    measurementId: "G-BZG5XPX49P"
  };
  if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
})();
