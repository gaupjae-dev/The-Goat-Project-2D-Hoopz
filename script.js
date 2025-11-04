// ==========================================================
// 1. GLOBAL GAME & FIREBASE VARIABLES
// ==========================================================

let db;
let auth;
let userId = null;
let playerState = null;
let isAuthReady = false; // Flag to ensure we don't proceed without a user ID

// Mission 1 Meter Variables
let meterValue = 0;
let meterDirection = 1; // 1 for increasing, -1 for decreasing
let meterSpeed = 0.5; // Controls the speed of the meter's movement
let animationFrameId = null;

// The default state for a new player
const defaultPlayerState = {
    overallRating: 75,
    missionProgress: 0, // 0 = start, 100 = finished
    currentMission: 1,
    missionsCompleted: {
        1: false,
        2: false,
        3: false, // Placeholder for future missions
    }
};

// ==========================================================
// 2. FIREBASE INITIALIZATION AND AUTHENTICATION
// ==========================================================

window.onload = function() {
    // Only proceed if the necessary global variables are available from index.html
    if (window.globalFirebaseConfig && window.globalAppId) {
        setupFirebaseAndAuth();
    } else {
        console.error("Firebase config or App ID is missing. Cannot initialize Firebase.");
    }
};

/**
 * Initializes Firebase, authenticates the user, and starts data subscription.
 */
async function setupFirebaseAndAuth() {
    try {
        setLogLevel('debug'); // Enable detailed logging for debugging

        // Initialize App and Services
        const app = initializeApp(globalFirebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Handle Authentication
        if (globalInitialAuthToken) {
            await signInWithCustomToken(auth, globalInitialAuthToken);
        } else {
            // Fallback for anonymous sign-in if no token is provided
            await signInAnonymously(auth);
        }

        // Listen for Auth State changes
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                console.log(`Authenticated. User ID: ${userId}`);
                document.getElementById('player-id-display').textContent = userId;
                isAuthReady = true;
                subscribeToGameData();
            } else {
                // If sign-out happens (shouldn't typically happen in this environment)
                userId = null;
                isAuthReady = false;
                console.warn("User signed out or authentication failed.");
            }
        });

    } catch (error) {
        console.error("Error setting up Firebase and Authentication:", error);
    }
}

/**
 * Gets the document reference for the current player's save data.
 * @returns {object|null} A Firestore document reference or null if user is not ready.
 */
function getDocRef() {
    if (!db || !userId) {
        console.error("Firestore or User ID is not ready.");
        return null;
    }
    // Path: /artifacts/{appId}/users/{userId}/gameData/playerSave
    return doc(db, 'artifacts', globalAppId, 'users', userId, 'gameData', 'playerSave');
}


// ==========================================================
// 3. GAME DATA SUBSCRIPTION (REAL-TIME LOADING)
// ==========================================================

/**
 * Subscribes to the player's game data in real-time.
 * This is the primary way the game loads and updates its state.
 */
function subscribeToGameData() {
    const docRef = getDocRef();
    if (!docRef) return;

    // Set up the real-time listener
    onSnapshot(docRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            // Player has existing data
            playerState = docSnapshot.data();
            console.log("Game state updated from Firestore:", playerState);
        } else {
            // Player is new (no document exists)
            console.log("No existing game data found. Creating new save.");
            playerState = defaultPlayerState;
            // Immediately save the default state to Firestore
            saveGame(false); 
        }
        updateUI();
    }, (error) => {
        console.error("Error subscribing to game data:", error);
        showCustomModal("Connection Error", "Could not connect to the cloud database. Check your internet connection.", [{text: "OK", action: hideCustomModal}]);
    });
}

// ==========================================================
// 4. FIREBASE SAVE, LOAD, AND RESET
// ==========================================================

/**
 * Saves the current game state to Firestore.
 * @param {boolean} showSuccess Whether to display a success modal. Defaults to true.
 */
async function saveGame(showSuccess = true) {
    const docRef = getDocRef();
    if (!docRef || !playerState) return;

    try {
        // Use setDoc to create the document if it doesn't exist, or overwrite if it does
        await setDoc(docRef, playerState);
        if (showSuccess) {
            showCustomModal("Game Saved!", "Your progress has been saved to the cloud.", [{text: "Awesome!", action: hideCustomModal}]);
        }
    } catch (error) {
        console.error("Error saving game:", error);
        showCustomModal("Save Failed", "Could not save your progress. Please try again.", [{text: "OK", action: hideCustomModal}]);
    }
}

/**
 * Forces a reload of the current game state (mostly redundant with onSnapshot, but useful for manual load button).
 */
async function loadGame() {
    // onSnapshot is already handling the real-time loading, but we confirm success here.
    if (playerState) {
        updateUI(); // Ensure UI is up-to-date
        showCustomModal("Game Loaded!", "Your latest progress was successfully synchronized from the cloud.", [{text: "Got It", action: hideCustomModal}]);
    } else {
        showCustomModal("Load Error", "No cloud save found or data is still loading.", [{text: "OK", action: hideCustomModal}]);
    }
}

/**
 * Prompts the user before resetting the game.
 */
function confirmResetGame() {
    showCustomModal(
        "Reset Progress?",
        "Are you sure you want to permanently delete ALL of your player progress and start over?",
        [
            {text: "YES, Delete All", action: resetGame},
            {text: "NO, Go Back", action: hideCustomModal}
        ]
    );
}

/**
 * Deletes the player's save document and re-initializes the state.
 */
async function resetGame() {
    hideCustomModal();
    const docRef = getDocRef();
    if (!docRef) return;

    try {
        await deleteDoc(docRef);
        console.log("Game data deleted from cloud.");
        
        // Reset local state, which will trigger onSnapshot to create a new save
        playerState = defaultPlayerState; 
        updateUI();
        showCustomModal("Reset Complete", "All progress has been wiped. Welcome to a fresh start!", [{text: "Let's Go!", action: hideCustomModal}]);

    } catch (error) {
        console.error("Error deleting game data:", error);
        showCustomModal("Reset Failed", "Could not reset progress.", [{text: "OK", action: hideCustomModal}]);
    }
}


// ==========================================================
// 5. UI MANAGEMENT & UPDATES
// ==========================================================

/**
 * Hides all main screen containers.
 */
function hideAllScreens() {
    const screens = document.querySelectorAll('.missions-log-container, .my-player-container, .options-container, .quit-container, .mission-screen');
    screens.forEach(screen => {
        screen.style.display = 'none';
    });
}

/**
 * Main function to update all dynamic UI elements based on playerState.
 */
function updateUI() {
    if (!playerState) return;

    updateStatsDisplay();
    updateMissionButtons();
}

/**
 * Updates the stats screen elements.
 */
function updateStatsDisplay() {
    document.querySelector('#my-stats-screen p:nth-child(2) strong').textContent = `Overall Rating: ${playerState.overallRating}`;
    
    // Mission Progress Bar
    const progressBar = document.getElementById('mission-progress-bar');
    progressBar.style.width = `${playerState.missionProgress}%`;

    // Current Mission Status
    let currentMissionName = "None";
    if (playerState.currentMission === 1) {
        currentMissionName = "The Jump Start";
    } else if (playerState.currentMission === 2) {
        currentMissionName = "The Rookie Contract";
    }
    document.querySelector('#my-stats-screen p:nth-child(4) strong').textContent = `Current Mission: ${currentMissionName}`;

    // Mission Status Text
    document.querySelector('#my-stats-screen p:nth-child(3) strong').textContent = `Mission Status: ${playerState.missionProgress >= 100 ? 'Complete' : 'Active'}`;
}

/**
 * Updates the mission buttons based on completion status.
 */
function updateMissionButtons() {
    // Mission 1
    const m1Button = document.getElementById('mission-1-button');
    if (playerState.missionsCompleted[1]) {
        m1Button.textContent = "1. The Jump Start (COMPLETE)";
        m1Button.disabled = true;
    } else {
        m1Button.textContent = "1. The Jump Start (IN PROGRESS)";
        m1Button.disabled = false;
    }

    // Mission 2
    const m2Button = document.getElementById('mission-2-button');
    if (playerState.missionsCompleted[2]) {
        m2Button.textContent = "2. The Rookie Contract (COMPLETE)";
        m2Button.disabled = true;
    } else if (playerState.missionsCompleted[1]) {
        m2Button.textContent = "2. The Rookie Contract (READY)";
        m2Button.disabled = false;
    } else {
        m2Button.textContent = "2. The Rookie Contract (LOCKED)";
        m2Button.disabled = true;
    }
}

// ------------------- SCREEN NAVIGATION -------------------

function showMainMenu() {
    hideAllScreens();
    // Stop the meter animation if returning from Mission 1
    cancelAnimationFrame(animationFrameId);
}

function loadMissions() {
    hideAllScreens();
    document.getElementById('missions-screen').style.display = 'block';
}

function loadMyHub() {
    hideAllScreens();
    document.getElementById('my-hub-screen').style.display = 'block';
}

function loadMyStats() {
    hideAllScreens();
    document.getElementById('my-stats-screen').style.display = 'block';
    updateStatsDisplay(); // Ensure stats are fresh
}

function loadOptions() {
    hideAllScreens();
    document.getElementById('options-screen').style.display = 'block';
}

function quitGame() {
    hideAllScreens();
    document.getElementById('quit-screen').style.display = 'block';
    saveGame(false); // Silent save before quitting
}

function loadTraining() {
    showCustomModal("Training Facility", "This area is under construction! Check back soon for new drills.", [{text: "Roger That", action: hideCustomModal}]);
}

function quickPlay() {
    // Determine which mission to start based on progress
    if (!playerState.missionsCompleted[1]) {
        startMission(1);
    } else if (!playerState.missionsCompleted[2]) {
        startMission(2);
    } else {
        showCustomModal("All Done!", "You've completed all available missions! More content coming soon.", [{text: "Nice!", action: hideCustomModal}]);
    }
}

/**
 * Navigates to the selected mission screen and starts the mission logic.
 * @param {number} missionId
 */
function startMission(missionId) {
    if (!isAuthReady) {
        showCustomModal("Loading...", "Please wait for player data to load.", [{text: "OK", action: hideCustomModal}]);
        return;
    }
    
    // Check if locked
    if (missionId === 2 && !playerState.missionsCompleted[1]) {
        showCustomModal("Mission Locked", "You must complete 'The Jump Start' first!", [{text: "Got it!", action: hideCustomModal}]);
        return;
    }
    
    hideAllScreens();
    
    if (missionId === 1) {
        document.getElementById('mission-1-screen').style.display = 'block';
        startMeter();
    } else if (missionId === 2) {
        document.getElementById('mission-2-screen').style.display = 'block';
    }
    playerState.currentMission = missionId;
}


// ==========================================================
// 6. MISSION 1 GAMEPLAY (METER TIMING)
// ==========================================================

/**
 * Starts the continuous meter animation loop.
 */
function startMeter() {
    const meterDisplay = document.getElementById('meter-display');
    const feedback = document.getElementById('mission-feedback');
    feedback.innerHTML = '<p style="color:#00c4ff;">Watch the meter... get ready!</p>';
    
    // Reset meter to 0
    meterValue = 0;
    meterDirection = 1;
    meterDisplay.textContent = '0';
    
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }
    
    // Start the loop
    meterLoop();
}

/**
 * The main animation loop for the timing meter.
 */
function meterLoop() {
    // Update meter value
    meterValue += meterDirection * meterSpeed;

    // Boundary check (0 to 100)
    if (meterValue >= 100) {
        meterValue = 100;
        meterDirection = -1; // Reverse direction
    } else if (meterValue <= 0) {
        meterValue = 0;
        meterDirection = 1; // Reverse direction
    }

    // Update the display, rounded to the nearest integer
    document.getElementById('meter-display').textContent = Math.round(meterValue);
    
    // Request the next frame
    animationFrameId = requestAnimationFrame(meterLoop);
}

/**
 * Stops the meter and calculates the score/result.
 */
function stopMeter() {
    cancelAnimationFrame(animationFrameId);
    const finalValue = Math.round(meterValue);
    const feedback = document.getElementById('mission-feedback');

    let message = '';
    let isSuccess = false;

    if (finalValue >= 90 && finalValue <= 100) {
        message = `<p style="color:#ff00ff;">PERFECT TIMING (${finalValue})! Mission 1 Complete. You earned a +2 rating boost!</p>`;
        playerState.overallRating += 2;
        playerState.missionProgress = 100;
        playerState.missionsCompleted[1] = true;
        isSuccess = true;
    } else if (finalValue >= 80 || finalValue <= 20) {
        message = `<p style="color:#00c4ff;">Good attempt (${finalValue}). You barely hit the target, but you passed! +1 rating boost.</p>`;
        playerState.overallRating += 1;
        playerState.missionProgress = 50; // Set to 50% for partial success
        isSuccess = true;
    } else {
        message = `<p style="color:red;">MISS (${finalValue})! Timing was way off. Try again!</p>`;
        playerState.missionProgress = 0;
    }

    feedback.innerHTML = message;
    
    if (isSuccess) {
        updateUI(); // Reflect score changes immediately
        saveGame(false); // Save silently
        
        // Change the button to go back to the menu or retry
        document.querySelector('#mission-1-screen .skill-button').textContent = "RETRY DRILL";
        document.querySelector('#mission-1-screen .skill-button').onclick = startMeter;

        if (playerState.missionsCompleted[1]) {
            showCustomModal("Mission Complete!", `You nailed 'The Jump Start' and boosted your rating to ${playerState.overallRating}! Mission 2 is now available.`, [{text: "Next Mission", action: loadMissions}]);
        }
    }
}


// ==========================================================
// 7. MISSION 2 GAMEPLAY (CONTRACT CHOICE)
// ==========================================================

/**
 * Handles the completion of Mission 2 based on contract choice.
 * @param {number} contractId - 1 for Contract A, 2 for Contract B
 */
function completeMission2(contractId) {
    if (playerState.missionsCompleted[2]) return;

    let boost;
    let message;
    
    if (contractId === 1) {
        // Contract A: High Incentives (+5 Overall Potential)
        boost = 5;
        message = `You chose Contract A! A gutsy choice focusing on incentives. Your current Overall Rating jumps by ${boost} points!`;
    } else if (contractId === 2) {
        // Contract B: Large Upfront Bonus (+1 Overall Potential)
        boost = 1;
        message = `You chose Contract B! A safe choice for the upfront bonus. Your current Overall Rating jumps by ${boost} point.`;
    }

    playerState.overallRating += boost;
    playerState.missionProgress = 100;
    playerState.missionsCompleted[2] = true;

    // Update UI and Save
    updateUI();
    saveGame(false);

    showCustomModal(
        "Mission 2 Complete!",
        message,
        [
            {text: "View Updated Stats", action: loadMyStats},
            {text: "Back to Menu", action: showMainMenu}
        ]
    );
}


// ==========================================================
// 8. CUSTOM MODAL (Replaces alert/confirm)
// ==========================================================

const modal = document.getElementById('custom-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalActions = document.getElementById('modal-actions');

/**
 * Displays the custom modal with dynamic content and action buttons.
 * @param {string} title The title for the modal.
 * @param {string} message The main message content.
 * @param {Array<Object>} actions Array of button definitions: [{text: "Button Text", action: function}]
 */
function showCustomModal(title, message, actions) {
    // Clear previous actions
    modalActions.innerHTML = ''; 

    // Set content
    modalTitle.textContent = title;
    modalMessage.textContent = message;

    // Create buttons
    actions.forEach(action => {
        const button = document.createElement('button');
        button.textContent = action.text;
        
        // Attach the provided function/action to the button's click event
        button.onclick = () => {
            // Execute the action first
            action.action();
            // Then, in most cases, close the modal, unless the action is designed to handle it
            // We rely on the action function (e.g., hideCustomModal) to close it.
        };
        modalActions.appendChild(button);
    });

    // Show the modal
    modal.style.display = 'flex'; 
}

/**
 * Hides the custom modal.
 */
function hideCustomModal() {
    modal.style.display = 'none';
}
