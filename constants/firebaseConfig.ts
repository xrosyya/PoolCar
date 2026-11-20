import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDUsF6tilO1zpH7aLDLGaGWB2DzXoYTNuA",
  authDomain: "poolcarapp-a03d2.firebaseapp.com",
  projectId: "poolcarapp-a03d2",
  storageBucket: "poolcarapp-a03d2.firebasestorage.app",
  messagingSenderId: "1028479814116",
  appId: "1:1028479814116:web:e889dcc2805ea7b7399ff1",
  measurementId: "G-DCFN87EZHJ"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);

// Export Firestore database agar bisa dipanggil di auth.tsx
export const db = getFirestore(app);