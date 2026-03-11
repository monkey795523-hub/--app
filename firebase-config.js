// Firebase 配置
const firebaseConfig = {
    apiKey: "AIzaSyDY5eh3oPDex9gQ9ll6p1KiX2LifJTHz90",
    authDomain: "mood-diary-b858d.firebaseapp.com",
    projectId: "mood-diary-b858d",
    storageBucket: "mood-diary-b858d.firebasestorage.app",
    messagingSenderId: "15344064606",
    appId: "1:15344064606:web:d94e878487629cdda87ccf"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();
