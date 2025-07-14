// Firebase SDKs - Ensure these are correct paths
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
    onSnapshot,
    orderBy // Added for consistent complaint order
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Gemini Integration - Ensure this path is correct
import { getComplaintSeverity } from './gemini.js';

// --- Firebase Configuration ---
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

// --- Global State Variables ---
let currentUserId = null;

// --- DOM Element References (Cache them for performance) ---
const messageBox = document.getElementById('message-box');
const googleSignInBtn = document.getElementById("google-signin-btn");
const logoutBtn = document.getElementById("logout-btn");
const submitComplaintBtn = document.getElementById("submit-complaint-btn");

const formSection = document.getElementById("form-section");
const authSection = document.getElementById("auth");
const complaintsListSection = document.getElementById("complaints-list-section");
const userIdDisplay = document.getElementById("user-id-display");
const complaintsContainer = document.getElementById("complaints-container");

const nameInput = document.getElementById("name");
const roomNoInput = document.getElementById("roomNo");
const categoryInput = document.getElementById("category");
const descInput = document.getElementById("desc");


// --- UI Feedback & Utilities ---

/**
 * Displays a toast message to the user.
 * @param {string} message The message to display.
 * @param {boolean} isError True if it's an error message, false for success/info.
 */
function showMessage(message, isError = false) {
    messageBox.textContent = message;
    messageBox.classList.remove('error', 'success', 'info'); // Clear previous states
    if (isError) {
        messageBox.classList.add('error');
    } else {
        messageBox.classList.add('success'); // Assuming success for non-error
    }
    messageBox.classList.add('show');

    // Remove message after 3 seconds
    setTimeout(() => {
        messageBox.classList.remove('show');
    }, 3000);
}

/**
 * Toggles the visibility of UI sections based on user authentication status.
 * @param {firebase.User} user The authenticated Firebase user object, or null if logged out.
 */
function toggleUI(user) {
    if (user) {
        formSection.classList.remove("hidden");
        authSection.classList.add("hidden");
        complaintsListSection.classList.remove("hidden");
        userIdDisplay.textContent = `Logged in as: ${user.email || user.uid}`; // Prefer email
        userIdDisplay.classList.remove("hidden");
        currentUserId = user.uid;
        loadComplaints(user.uid);
    } else {
        formSection.classList.add("hidden");
        authSection.classList.remove("hidden");
        complaintsListSection.classList.add("hidden");
        userIdDisplay.classList.add("hidden");
        currentUserId = null;
    }
}

/**
 * Disables or enables a button and optionally adds a loading spinner.
 * @param {HTMLButtonElement} button The button element to modify.
 * @param {boolean} isLoading True to disable and show loading, false to enable and hide loading.
 * @param {string} originalText The original text of the button to restore.
 */
function setButtonLoadingState(button, isLoading, originalText = '') {
    if (isLoading) {
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Loading...';
    } else {
        button.disabled = false;
        button.innerHTML = originalText;
    }
}


// --- Authentication Functions ---

/**
 * Handles Google Sign-In process.
 */
async function googleSignIn() {
    console.log("Google Sign-In button clicked ✅");
    setButtonLoadingState(googleSignInBtn, true, 'Sign in with Google'); // Assuming Google button has this text
    const provider = new GoogleAuthProvider();
    try {
        const result = await signInWithPopup(auth, provider);
        showMessage(`Welcome, ${result.user.displayName || result.user.email}!`);
    } catch (error) {
        let errorMessage = "Sign in failed.";
        if (error.code === 'auth/popup-closed-by-user') {
            errorMessage = "Sign-in cancelled by user.";
        } else if (error.code === 'auth/cancelled-popup-request') {
            errorMessage = "Sign-in already in progress. Please wait.";
        } else {
            errorMessage += ` Error: ${error.message}`;
        }
        showMessage(errorMessage, true);
        console.error("Google Sign-In Error:", error);
    } finally {
        setButtonLoadingState(googleSignInBtn, false, '<i class="fab fa-google mr-2"></i> Sign in with Google');
    }
}

/**
 * Handles user logout.
 */
async function logout() {
    setButtonLoadingState(logoutBtn, true, 'Logout');
    try {
        await signOut(auth);
        showMessage("Logged out successfully!");
    } catch (error) {
        showMessage("Logout failed: " + error.message, true);
        console.error("Logout Error:", error);
    } finally {
        setButtonLoadingState(logoutBtn, false, '<i class="fas fa-sign-out-alt mr-2"></i> Logout');
    }
}


// --- Complaint Management Functions ---

/**
 * Submits a new complaint to Firestore.
 */
async function submitComplaint() {
    const user = auth.currentUser;
    if (!user) {
        return showMessage("Please sign in first to submit a complaint.", true);
    }

    const name = nameInput.value.trim();
    const roomNo = roomNoInput.value.trim();
    const category = categoryInput.value.trim();
    const desc = descInput.value.trim();

    if (!name || !roomNo || !category || !desc) {
        return showMessage("Please fill in all fields.", true);
    }

    setButtonLoadingState(submitComplaintBtn, true, 'Submit Complaint');

    try {
        // Get severity from Gemini *before* submitting
        let severity = "Moderate"; // default fallback
        try {
            severity = await getComplaintSeverity(desc);
            console.log("Complaint severity determined by Gemini:", severity);
        } catch (err) {
            console.error("Gemini error while classifying severity (using fallback):", err);
            // Don't block submission if Gemini fails
        }

        const complaintsCollectionRef = collection(db, `artifacts/${appId}/users/${user.uid}/complaints`);
        await addDoc(complaintsCollectionRef, {
            uid: user.uid,
            name,
            roomNo,
            category,
            desc,
            severity: severity, // Add severity to the complaint document
            status: "Pending",
            timestamp: serverTimestamp()
        });

        showMessage("Complaint submitted successfully!");
        // Clear form fields
        nameInput.value = "";
        roomNoInput.value = "";
        categoryInput.value = "";
        descInput.value = "";
    } catch (error) {
        showMessage("Error submitting complaint: " + error.message, true);
        console.error("Error submitting complaint:", error);
    } finally {
        setButtonLoadingState(submitComplaintBtn, false, '<i class="fas fa-paper-plane mr-2"></i> Submit Complaint');
    }
}

/**
 * Loads and displays user-specific complaints in real-time.
 * @param {string} userId The UID of the currently logged-in user.
 */
function loadComplaints(userId) {
    // Order complaints by timestamp for chronological display
    const q = query(
        collection(db, `artifacts/${appId}/users/${userId}/complaints`),
        orderBy("timestamp", "desc") // Latest complaints first
    );

    // Set up real-time listener
    onSnapshot(q, (snapshot) => {
        complaintsContainer.innerHTML = ''; // Clear existing complaints

        if (snapshot.empty) {
            complaintsContainer.innerHTML = '<p class="text-gray-500 p-4 text-center">No complaints submitted yet. Your complaints will appear here.</p>';
            return;
        }

        snapshot.forEach((doc) => {
            const complaint = doc.data();
            const complaintElement = document.createElement('div');
            complaintElement.classList.add('complaint-item'); // Assuming this class is styled in CSS

            // Determine status class for styling
            let statusClass = '';
            switch (complaint.status.toLowerCase()) {
                case 'pending':
                    statusClass = 'status-pending';
                    break;
                case 'in progress':
                    statusClass = 'status-in-progress';
                    break;
                case 'resolved':
                    statusClass = 'status-resolved';
                    break;
                default:
                    statusClass = ''; // Fallback
            }

            // Determine severity class for styling
            let severityClass = '';
            switch (complaint.severity ? complaint.severity.toLowerCase() : 'moderate') { // Default to moderate if not present
                case 'low':
                    severityClass = 'severity-low';
                    break;
                case 'moderate':
                    severityClass = 'severity-moderate';
                    break;
                case 'high':
                    severityClass = 'severity-high';
                    break;
                case 'critical':
                    severityClass = 'severity-critical';
                    break;
                default:
                    severityClass = 'severity-moderate';
            }

            complaintElement.innerHTML = `
                <div class="complaint-header">
                    <h3 class="text-lg font-semibold">${complaint.category}</h3>
                    <span class="status-badge ${statusClass}">${complaint.status}</span>
                </div>
                <p class="text-gray-700 mt-1"><strong>Room No:</strong> ${complaint.roomNo}</p>
                <p class="text-gray-700"><strong>Name:</strong> ${complaint.name}</p>
                <p class="text-gray-600 mt-2"><strong>Description:</strong> ${complaint.desc}</p>
                <div class="complaint-footer">
    <span class="timestamp text-sm text-gray-500">
        ${complaint.timestamp ? new Date(complaint.timestamp.toDate()).toLocaleString() : 'N/A'}
    </span>
</div>
            `;
            complaintsContainer.appendChild(complaintElement);
        });
    }, (error) => {
        console.error("Error fetching complaints:", error);
        showMessage("Error loading complaints: " + error.message, true);
    });
}


// --- Event Listeners ---
document.addEventListener('DOMContentLoaded', () => {
    // Initial check for authentication state
    onAuthStateChanged(auth, (user) => {
        toggleUI(user);
    });

    // Attach event listeners to buttons
    googleSignInBtn.addEventListener("click", googleSignIn);
    logoutBtn.addEventListener("click", logout);
    submitComplaintBtn.addEventListener("click", submitComplaint);

    // Add Font Awesome icons to buttons if they don't have them
    // This is a safety measure; ideally, they're in the HTML
    if (!googleSignInBtn.querySelector('i')) {
        googleSignInBtn.innerHTML = '<i class="fab fa-google mr-2"></i> ' + googleSignInBtn.textContent;
    }
    if (!logoutBtn.querySelector('i')) {
        logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt mr-2"></i> ' + logoutBtn.textContent;
    }
    if (!submitComplaintBtn.querySelector('i')) {
        submitComplaintBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i> ' + submitComplaintBtn.textContent;
    }
});