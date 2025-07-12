import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyADGsHMnQe2mt3vDpaMkDZUK715RTvKkWo",
  authDomain: "hostelfix-96462.firebaseapp.com",
  projectId: "hostelfix-96462",
  storageBucket: "hostelfix-96462.appspot.com",
  messagingSenderId: "594623083730",
  appId: "1:594623083730:web:3cf6bcc8165b337799e90b"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// ✅ Admin Google Sign-In
document.getElementById("google-signin-btn").addEventListener("click", async () => {
  try {
    const result = await signInWithPopup(auth, provider);
    // Redirect to admin page
    window.location.href = "admin.html";
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    alert("Sign in failed: " + error.message);
  }
});
