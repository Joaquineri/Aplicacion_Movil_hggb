// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA5jP5c3Mx-a7BNA9asmPgw4eCLh_aGGfk",
  authDomain: "aplicacionmovilhggb.firebaseapp.com",
  projectId: "aplicacionmovilhggb",
  storageBucket: "aplicacionmovilhggb.firebasestorage.app",
  messagingSenderId: "733816647850",
  appId: "1:733816647850:web:245bb351181752398120d3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app)