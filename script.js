import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, updateDoc, setLogLevel } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- GLOBAL VARIABLES ---
// Mandatory globals provided by the execution environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Firebase instances
let app;
let db;
let auth;
let userId = null; // Will store the authenticated user's ID

// Application state (initial default values)
let playerData = {
    name: "Rogue Analyst",
    rank: "Rookie",
    influence: 0,
    credits: 500
};

// Quick Play Game State
let gameInterval = null;
let gameTime = 0; // Timer for the reflex game

// --- FIREBASE INITIALIZATION & AUTHENTICATION ---

/**
 * Initializes Firebase services and authenticates the user.
 */
async function initializeFirebase() {
    try {
        setLogLevel('debug'); // Enable detailed logging for debugging
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);

        // Sign in using custom token or anonymously if no token is provided
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Firebase: Signed in with custom token.");
        } else {
            await signInAnonymously(auth);
            console.log("Firebase: Signed in anonymously.");
        }

        // Set up the listener for auth state changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log("Auth State Changed: User ID set to:", userId);
                document.getElementById('user-id').textContent = userId;
                document.getElementById('hub-user-id').textContent = userId;

                // Once authenticated, start listening for player data
                setupPlayerDataListener();
            } else {
                userId = null;
                document.getElementById('user-id').textContent = 'Signed Out';
                console.log("Auth State Changed: User signed out.");
            }
        });

    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        showMessage("System Error", "Failed to connect to the database. Check console for details.");
    }
}

// --- FIRESTORE DATA HANDLING ---

/**
 * Gets the document reference for the current player's profile.
 * @returns {object|null} A Firestore Document Reference or null if userId is missing.
 */
function getPlayerDocRef() {
    if (!userId) {
        console.error("Cannot get doc ref: User ID is not set.");
        return null;
    }
    // Path: /artifacts/{appId}/users/{userId}/player_data/profile
    const docPath = `/artifacts/${appId}/users/${userId}/player_data`;
    return doc(db, docPath, 'profile');
}

/**
 * Sets up a real-time listener for the player's profile data.
 */
function setupPlayerDataListener() {
    const playerRef = getPlayerDocRef();
    if (!playerRef) return;

    onSnapshot(playerRef, (docSnap) => {
        if (docSnap.exists()) {
            // Document exists, load the data
            playerData = docSnap.data();
            console.log("Player data loaded:", playerData);
        } else {
            // Document does not exist, initialize a new one
            console.log("No profile found, initializing new player data.");
            // We use the default playerData defined at the top
            savePlayerData(playerData, true); // Create a new profile
        }
        updateUI(); // Always update UI after data change
    }, (error) => {
        console.error("Error listening to player data:", error);
        showMessage("Connection Error", "Failed to retrieve real-time data.");
    });
}

/**
 * Saves the current player data to Firestore.
 * @param {object} data The player data object to save.
 * @param {boolean} initialize If true, uses setDoc to initialize; otherwise, uses updateDoc.
 */
async function savePlayerData(data, initialize = false) {
    const playerRef = getPlayerDocRef();
    if (!playerRef) return;

    try {
        if (initialize) {
            // setDoc will create or overwrite the document
            await setDoc(playerRef, data);
            console.log("New player profile created/overwritten.");
        } else {
            // updateDoc updates specific fields non-destructively
            await updateDoc(playerRef, data);
            console.log("Player data updated.");
        }
    } catch (error) {
        console.error("Error saving player data:", error);
        showMessage("Save Error", "Could not save progress to the server.");
    }
}

// --- UI MANIPULATION ---

/**
 * Updates all UI elements based on the current playerData state.
 */
function updateUI() {
    document.getElementById('player-name').textContent = playerData.name;
    document.getElementById('player-rank').textContent = playerData.rank;
    document.getElementById('player-influence').textContent = playerData.influence;
    document.getElementById('player-credits').textContent = playerData.credits;

    // Update progress bar
    const influenceBar = document.getElementById('influence-bar');
    const maxInfluence = 1000; // Define a rank-up threshold
    const percentage = Math.min(100, (playerData.influence / maxInfluence) * 100);
    influenceBar.style.width = `${percentage}%`;
}

/**
 * Toggles the visibility of screen containers based on the ID.
 * Exposes the function globally via window.
 * @param {string} screenId The ID of the screen container to show.
 */
window.showScreen = function (screenId) {
    // Hide all main screen containers
    const screens = document.querySelectorAll('.main-menu-container, .my-player-container, .missions-log-container, .quick-play-screen');
    screens.forEach(screen => screen.classList.remove('active-screen'));

    // Show the requested screen
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active-screen');
    }

    // Special logic for My Hub screen
    if (screenId === 'my-player') {
        updateUI(); // Ensure the stats are current
    }
};

/**
 * Shows the custom message modal.
 * Exposes the function globally via window.
 * @param {string} title The title of the message.
 * @param {string} text The body content of the message.
 */
window.showMessage = function (title, text) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-text').textContent = text;
    document.getElementById('message-modal').style.display = 'flex';
};

/**
 * Hides the custom message modal.
 * Exposes the function globally via window.
 */
window.hideMessage = function () {
    document.getElementById('message-modal').style.display = 'none';
};

// --- QUICK PLAY GAME LOGIC (Reflex Trainer) ---

const METER_STATES = ["--", "WAIT...", "READY", "GO!", "PEAK!"];
const METER_COLORS = ["#222", "#FFC107", "#4CAF50", "#2196F3", "#E91E63"]; 
const METER_CYCLE_MS = 3000; // 3 seconds for one full cycle

let isGameActive = false;

/**
 * Starts the Quick Play Reflex Game loop.
 * Exposes the function globally via window.
 */
window.startGameLoop = function () {
    if (isGameActive) {
        showMessage("Game Running", "The training is already in progress!");
        return;
    }

    isGameActive = true;
    const button = document.getElementById('quick-play-button');
    button.textContent = 'WAIT...';
    button.disabled = false; // Enable for the click

    document.getElementById('quick-play-score').textContent = "0";
    document.getElementById('meter-display').textContent = METER_STATES[1];
    document.getElementById('meter-display').style.backgroundColor = METER_COLORS[1];
    
    // Set up the click handler logic (attached dynamically to handle state)
    button.onclick = handleQuickPlayClick;

    // Wait a random delay (1-3s) before starting the animation cycle
    const initialDelay = Math.random() * 2000 + 1000;
    
    setTimeout(() => {
        gameTime = 0;
        gameInterval = setInterval(animateMeter, 20); // Update every 20ms
    }, initialDelay);
};

/**
 * Animates the meter display during the game loop.
 */
function animateMeter() {
    gameTime += 20; // 20ms increment
    const meterDisplay = document.getElementById('meter-display');
    const cyclePos = gameTime % METER_CYCLE_MS;
    
    // Simple timing meter states based on cycle position (0-3000ms)
    
    if (cyclePos >= 2500) {
        // Late/Failed zone (2500 - 3000)
        meterDisplay.textContent = "TOO LATE!";
        meterDisplay.style.backgroundColor = METER_COLORS[4]; 
    } else if (cyclePos >= 2000) {
        // PEAK ZONE (Optimal click window) (2000 - 2500)
        meterDisplay.textContent = METER_STATES[4];
        meterDisplay.style.backgroundColor = METER_COLORS[4];
    } else if (cyclePos >= 1000) {
        // GO! Zone (1000 - 2000)
        meterDisplay.textContent = METER_STATES[3];
        meterDisplay.style.backgroundColor = METER_COLORS[3];
    } else if (cyclePos >= 500) {
        // READY Zone (500 - 1000)
        meterDisplay.textContent = METER_STATES[2];
        meterDisplay.style.backgroundColor = METER_COLORS[2];
    }
    // else: WAIT... Zone (0 - 500)
    
    if (gameTime > 5000) { // If it runs for more than 5s in total (multiple cycles), stop
        endGame('miss', "You missed multiple cycles. Focus!");
    }
}

/**
 * Handles the user clicking the Quick Play button during a game.
 */
function handleQuickPlayClick() {
    if (!isGameActive) return;

    clearInterval(gameInterval);
    const cyclePos = gameTime % METER_CYCLE_MS;
    const peakStart = 2000;
    const peakEnd = 2500;
    let score = 0;
    let message = "";

    if (cyclePos >= peakStart && cyclePos <= peakEnd) {
        // Perfect Hit
        score = 150;
        message = "PERFECT HIT! +150 Influence! (Peak Performance)";
    } else if (cyclePos > 1000 && cyclePos < 3000) {
        // Good Timing (GO! Zone or Just missed PEAK)
        const distanceToPeak = Math.min(Math.abs(cyclePos - peakStart), Math.abs(cyclePos - peakEnd));
        // Score is proportional to how close they were to the peak
        score = Math.max(20, 150 - Math.floor(distanceToPeak / 10)); 
        message = `GOOD TIMING! +${score} Influence.`;
    } else {
        // Too Early or Too Late
        score = -50; // Penalize early clicks slightly
        message = "EARLY/LATE CLICK! Influence loss: 50";
    }

    playerData.influence = Math.max(0, playerData.influence + score); // Ensure influence doesn't drop below 0
    
    document.getElementById('quick-play-score').textContent = score;
    endGame('hit', message);
}

/**
 * Ends the quick play game and updates state.
 * @param {string} status 'hit' or 'miss'.
 * @param {string} finalMessage The message to display.
 */
function endGame(status, finalMessage) {
    isGameActive = false;
    clearInterval(gameInterval);

    const button = document.getElementById('quick-play-button');
    button.textContent = 'START TRAINING';
    // Reset click handler to start game
    button.onclick = startGameLoop;
    
    document.getElementById('meter-display').textContent = METER_STATES[0];
    document.getElementById('meter-display').style.backgroundColor = METER_COLORS[0];

    // Update player data in Firestore and UI
    savePlayerData({
        influence: playerData.influence,
        credits: playerData.credits
    });
    
    showMessage("Training Complete", finalMessage);
}


// --- RUNTIME EXECUTION ---

// Start the application when the window fully loads
window.onload = initializeFirebase;
