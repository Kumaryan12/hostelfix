import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, collectionGroup, updateDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

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
const db = getFirestore(app);

// 🔒 Allow only signed-in users to see admin.html
onAuthStateChanged(auth, (user) => {
  if (!user) {
    window.location.href = "index.html"; // redirect to login if not signed in
  } else {
    loadAllComplaints();
  }
});

// 🔄 Logout
document.getElementById("logout-btn").addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "index.html";
});

// 📦 Load all complaints
function loadAllComplaints() {
  const container = document.getElementById("complaints-container");
  const q = collectionGroup(db, "complaints");

  onSnapshot(q, (snapshot) => {
    container.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const div = document.createElement("div");
      div.classList.add("complaint-item");
      div.innerHTML = `
        <h3>${data.category} - Room ${data.roomNo}</h3>
        <p><strong>Name:</strong> ${data.name}</p>
        <p><strong>Description:</strong> ${data.desc}</p>
        <p><strong>Status:</strong> <span class="status">${data.status}</span></p>
        <button onclick="updateStatus('${docSnap.ref.path}', 'Resolved')">Mark as Resolved</button>
        <hr>
      `;
      container.appendChild(div);
    });
  });
}

// ✏️ Update status
window.updateStatus = async function (docPath, newStatus) {
  try {
    const ref = doc(db, docPath);
    await updateDoc(ref, { status: newStatus });
    alert("Status updated to " + newStatus);
  } catch (err) {
    alert("Failed to update status: " + err.message);
  }
};
