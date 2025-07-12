// Import Firebase modular SDKs
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  query,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ✅ Replace this with your actual config
const firebaseConfig = {
  apiKey: "AIzaSyADGsHMnQe2mt3vDpaMkDZUK715RTvKkWo",
  authDomain: "hostelfix-96462.firebaseapp.com",
  projectId: "hostelfix-96462",
  storageBucket: "hostelfix-96462.appspot.com",
  messagingSenderId: "594623083730",
  appId: "1:594623083730:web:3cf6bcc8165b337799e90b"
};

const appId = "hostelfix-96462";
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserId = null;

// Show toast message
function showMessage(message, isError = false) {
  const messageBox = document.getElementById('message-box');
  messageBox.textContent = message;
  messageBox.classList.remove('error');
  if (isError) messageBox.classList.add('error');
  messageBox.classList.add('show');
  setTimeout(() => messageBox.classList.remove('show'), 3000);
}

// Toggle UI based on login status
function toggleUI(user) {
  const formSection = document.getElementById("form-section");
  const authSection = document.getElementById("auth");
  const complaintsListSection = document.getElementById("complaints-list-section");
  const userIdDisplay = document.getElementById("user-id-display");

  if (user) {
    formSection.classList.remove("hidden");
    authSection.classList.add("hidden");
    complaintsListSection.classList.remove("hidden");
    currentUserId = user.uid;
    userIdDisplay.textContent = `Logged in as: ${user.uid}`;
    userIdDisplay.classList.remove("hidden");
    loadComplaints(user.uid);
  } else {
    formSection.classList.add("hidden");
    authSection.classList.remove("hidden");
    complaintsListSection.classList.add("hidden");
    userIdDisplay.classList.add("hidden");
    currentUserId = null;
  }
}

// Google Sign-In
async function googleSignIn() {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    showMessage("Signed in as " + result.user.displayName);
  } catch (error) {
    showMessage("Sign in failed: " + error.message, true);
    console.error("Google Sign-In Error:", error);
  }
}

// Logout
async function logout() {
  try {
    await signOut(auth);
    showMessage("Logged out successfully!");
  } catch (error) {
    showMessage("Logout failed: " + error.message, true);
    console.error("Logout Error:", error);
  }
}

// Submit complaint
async function submitComplaint() {
  const user = auth.currentUser;
  if (!user) return showMessage("Please sign in first to submit a complaint.", true);

  const name = document.getElementById("name").value.trim();
  const roomNo = document.getElementById("roomNo").value.trim();
  const category = document.getElementById("category").value.trim();
  const desc = document.getElementById("desc").value.trim();

  if (!name || !roomNo || !category || !desc) {
    return showMessage("Please fill in all fields.", true);
  }

  try {
    const complaintsCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/complaints`);
    await addDoc(complaintsCollectionRef, {
      uid: user.uid,
      name,
      roomNo,
      category,
      desc,
      status: "Pending",
      timestamp: serverTimestamp()
    });
    showMessage("Complaint submitted successfully!");
    document.getElementById("name").value = "";
    document.getElementById("roomNo").value = "";
    document.getElementById("category").value = "";
    document.getElementById("desc").value = "";
  } catch (error) {
    showMessage("Error submitting complaint: " + error.message, true);
    console.error("Error submitting complaint:", error);
  }
}

// Load complaints
function loadComplaints(userId) {
  const complaintsContainer = document.getElementById("complaints-container");
  const q = query(collection(db, `artifacts/${appId}/users/${userId}/complaints`));

  onSnapshot(q, (snapshot) => {
    complaintsContainer.innerHTML = '';
    if (snapshot.empty) {
      complaintsContainer.innerHTML = '<p class="text-gray-500">No complaints submitted yet.</p>';
      return;
    }
    snapshot.forEach((doc) => {
      const complaint = doc.data();
      const complaintElement = document.createElement('div');
      complaintElement.classList.add('complaint-item');
      complaintElement.innerHTML = `
        <h3 class="text-lg">${complaint.category} - Room No: ${complaint.roomNo}</h3>
        <p><strong>Name:</strong> ${complaint.name}</p>
        <p><strong>Description:</strong> ${complaint.desc}</p>
        <span class="status ${complaint.status}">${complaint.status}</span>
        <span class="timestamp">${complaint.timestamp ? new Date(complaint.timestamp.toDate()).toLocaleString() : 'N/A'}</span>
      `;
      complaintsContainer.appendChild(complaintElement);
    });
  }, (error) => {
    console.error("Error fetching complaints:", error);
    showMessage("Error loading complaints: " + error.message, true);
  });
}

// Listen to auth changes
onAuthStateChanged(auth, (user) => {
  toggleUI(user);
});

// Bind buttons
document.getElementById("google-signin-btn").addEventListener("click", googleSignIn);
document.getElementById("logout-btn").addEventListener("click", logout);
document.getElementById("submit-complaint-btn").addEventListener("click", submitComplaint);
