// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCWZUntqahqUTchnrrl6CYa3I49pq0RDQE",
  authDomain: "wimbli-34755.firebaseapp.com",
  projectId: "wimbli-34755",
  storageBucket: "wimbli-34755.firebasestorage.app",
  messagingSenderId: "589555125082",
  appId: "1:589555125082:web:22a1dfc551fd2b972e0163"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);