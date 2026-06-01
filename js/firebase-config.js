// Firebase Configuration - Intivelvet
const firebaseConfig = {
  apiKey: "AIzaSyBFP5zcLsViFp8Zt8UHpgs2w0--udD4bB0",
  authDomain: "intivelvet.firebaseapp.com",
  projectId: "intivelvet",
  storageBucket: "intivelvet.firebasestorage.app",
  messagingSenderId: "493255955693",
  appId: "1:493255955693:web:40df12be4358ec1a4da8e4",
  measurementId: "G-LCLRVPJLS7"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
