import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken, 
    onAuthStateChanged,
    setPersistence,
    browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    onSnapshot, 
    collection, 
    query 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- GLOBAL FIREBASE & GAME STATE ---

// IMPORTANT: Global variables provided by the Canvas environment
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

let app;
let db;
let auth;
let userId = null;
let isAuthReady = false;

// Player Data State (Local)
let playerData = {
    overallRating: 75,
    highScore: 0,
    currentMission: 1, // 1 = The Jump Start
    missions: {
        1: { completed: false, value: 0 },
        2: { completed: false, value: 0 }
    }
};

// Quick Play Game State
let canvas, ctx;
const ballRadius = 15;
const hoopPosition = { x: 700, y: 150, width: 40, height: 10 };
const GRAVITY = 0.5;
const AIR_FRICTION = 0.99;
let isGameRunning = false;

let ball = {
    x: 60,
    y: 400,
    vx: 0,
    vy: 0,
    state: 'ready', // 'ready', 'dragging', 'flying', 'scored'
    scoreFlag: false // Prevents scoring multiple times per shot
};

let gameScore = 0;
let shotsFired = 0;
let dragStart = { x: 0, y: 0 };
let currentDrag = { x: 0, y: 0 };

// --- FIREBASE INITIALIZATION & AUTHENTICATION ---

/**
 * Initializes Firebase, authenticates the user, and sets up the data listener.
 */
async function initApp() {
    try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
        auth = getAuth(app);
        
        // Use local persistence to maintain user state
        await setPersistence(auth, browserLocalPersistence);

        // Sign in using the custom token if provided, otherwise sign in anonymously
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // Auth state change listener
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                isAuthReady = true;
                console.log("Firebase Auth Ready. User ID:", userId);
                
                // Set up real-time listener for player data
                setupDataListener();
            } else {
                // Should not happen with anonymous auth, but good practice
                console.log("No user signed in. Using default ID.");
                userId = 'guest-' + crypto.randomUUID(); 
                isAuthReady = true;
                // Still update UI with initial data
                updateUI();
            }
        });

    } catch (e) {
        console.error("Firebase Initialization Error:", e);
        // Fallback for UI even if Firebase fails
        isAuthReady = true;
        updateUI();
    }
}

// --- FIRESTORE DATA HANDLING ---

/**
 * Constructs the Firestore path for the player's private data.
 */
function getPlayerDocRef() {
    if (!userId) return null;
    return doc(db, 'artifacts', appId, 'users', userId, 'playerData', 'stats');
}

/**
 * Sets up a real-time listener for the player's stats document.
 */
function setupDataListener() {
    const docRef = getPlayerDocRef();
    if (!docRef) return;

    // Listen for real-time updates
    onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            // Data received from Firestore
            const data = docSnap.data();
            playerData = { ...playerData, ...data };
            console.log("Player data updated in real-time:", playerData);
        } else {
            console.log("No player data found. Creating default data.");
            // If the document doesn't exist, save the default data (this creates the document)
            savePlayerData();
        }
        updateUI();
    }, (error) => {
        console.error("Firestore real-time listener error:", error);
    });
}

/**
 * Saves the current local playerData object to Firestore.
 */
async function savePlayerData() {
    if (!isAuthReady || !userId) {
        console.warn("Authentication not ready. Cannot save data.");
        return;
    }
    const docRef = getPlayerDocRef();
    if (!docRef) {
        console.error("Could not get Firestore document reference.");
        return;
    }

    try {
        // Use setDoc to create or overwrite the document
        await setDoc(docRef, playerData, { merge: true });
        console.log("Player data successfully saved!");
    } catch (e) {
        console.error("Error saving player data:", e);
    }
}

// --- UI AND SCREEN MANAGEMENT ---

/**
 * Updates all screen elements with the current playerData.
 */
function updateUI() {
    // Check if the auth state has been determined before updating UI with user-specific data
    if (!isAuthReady) return; 

    // Helper to safely set text content
    const safeSetText = (id, text) => {
        const element = document.getElementById(id);
        if (element) element.textContent = text;
    };

    // Update global user info
    safeSetText('user-info', `USER ID: ${userId ? userId.substring(0, 8)}...`);
    safeSetText('player-id-display', userId || 'Guest');

    // Update MY STATS screen
    safeSetText('stats-overall-rating', playerData.overallRating);
    safeSetText('stats-high-score', playerData.highScore);
    
    const progressBar = document.getElementById('mission-progress-bar');
    if (progressBar) {
        // Simple progress based on overall rating (just for visual flair)
        const progressPercent = Math.min(100, (playerData.overallRating - 75) * 4); 
        progressBar.style.width = `${progressPercent}%`;
    }

    // Update Quick Play High Score Display
    safeSetText('high-score-display', `BEST: ${playerData.highScore}`);

    // Update Mission buttons based on completion
    const mission2Button = document.getElementById('mission-2-button');
    if (mission2Button) {
        mission2Button.textContent = playerData.missions[1].completed 
            ? '2. The Rookie Contract (AVAILABLE)' 
            : '2. The Rookie Contract (LOCKED)';
        mission2Button.disabled = !playerData.missions[1].completed;
    }
}

/**
 * Hides all main content screens and shows only the target screen.
 */
function showScreen(screenId) {
    const screens = [
        'main-menu-container', 'quick-play-game-screen', 'missions-screen', 
        'my-hub-screen', 'my-stats-screen', 'options-screen', 'quit-screen', 
        'mission-1-screen', 'mission-2-screen'
    ];
    
    screens.forEach(id => {
        const screen = document.getElementById(id);
        if (screen) {
            screen.classList.add('hidden');
            // Stop Mission 1 meter if exiting
            if (id.includes('mission-1')) clearInterval(missionMeterInterval);
        }
    });

    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.remove('hidden');
    }
}

// Menu Functions
function showMainMenu() {
    showScreen('main-menu-container');
    // Ensure the game loop is stopped when exiting Quick Play
    isGameRunning = false;
}

function quickPlay() {
    showScreen('quick-play-game-screen');
    // Initialize or restart the game loop
    if (!canvas) {
        setupCanvas();
    }
    if (!isGameRunning) {
        isGameRunning = true;
        gameLoop();
    }
    resetGame(false); // Start a new session
}

function loadMissions() {
    showScreen('missions-screen');
}

function loadMyHub() {
    showScreen('my-hub-screen');
    updateUI();
}

function loadMyStats() {
    showScreen('my-stats-screen');
    updateUI();
}

function loadOptions() {
    showScreen('options-screen');
}

function quitGame() {
    showScreen('quit-screen');
}

// --- QUICK PLAY (BACKYARD HOOPZ) LOGIC ---

/**
 * Sets up the canvas and event listeners for the game.
 */
function setupCanvas() {
    canvas = document.getElementById('game-canvas');
    ctx = canvas.getContext('2d');

    // Add event listeners for shooting mechanics
    canvas.addEventListener('mousedown', handleStart);
    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseup', handleEnd);
    
    // Add touch listeners for mobile
    canvas.addEventListener('touchstart', handleStart);
    canvas.addEventListener('touchmove', handleMove);
    canvas.addEventListener('touchend', handleEnd);
}

/**
 * Resets the ball position, score, and shot counter.
 * @param {boolean} fullReset - If true, resets score and shots. If false, just resets ball state.
 */
function resetGame(fullReset = true) {
    ball.x = 60;
    ball.y = 400;
    ball.vx = 0;
    ball.vy = 0;
    ball.state = 'ready';
    ball.scoreFlag = false;

    if (fullReset) {
        gameScore = 0;
        shotsFired = 0;
    }
    
    // Update score displays
    const scoreDisplay = document.getElementById('score-display');
    const shotsDisplay = document.getElementById('shots-fired');

    if (scoreDisplay) scoreDisplay.textContent = `SCORE: ${gameScore}`;
    if (shotsDisplay) shotsDisplay.textContent = `SHOTS: ${shotsFired}`;
    
    // Redraw immediately to show the reset state
    if (isGameRunning) {
         drawCourt();
         drawHoop();
         drawBall();
    }
}

// Input Handlers
function getEventLocation(e) {
    const rect = canvas.getBoundingClientRect();
    let x, y;
    
    if (e.touches && e.touches.length > 0) {
        x = e.touches[0].clientX - rect.left;
        y = e.touches[0].clientY - rect.top;
    } else {
        x = e.clientX - rect.left;
        y = e.clientY - rect.top;
    }
    return { x, y };
}

function handleStart(e) {
    if (ball.state !== 'ready') return;
    
    const pos = getEventLocation(e);
    // Check if click is on the ball
    if (Math.hypot(pos.x - ball.x, pos.y - ball.y) < ballRadius) {
        ball.state = 'dragging';
        dragStart = pos;
        currentDrag = pos;
        e.preventDefault(); 
    }
}

function handleMove(e) {
    if (ball.state !== 'dragging') return;
    currentDrag = getEventLocation(e);
    e.preventDefault(); 
}

function handleEnd(e) {
    if (ball.state !== 'dragging') return;
    
    const dragEnd = getEventLocation(e);
    
    // Calculate launch velocity (slingshot effect)
    // The direction is opposite the drag
    const dx = dragStart.x - dragEnd.x;
    const dy = dragStart.y - dragEnd.y;
    
    // Scale the velocity (adjust the multiplier for desired power)
    ball.vx = dx * 0.15;
    ball.vy = dy * 0.15; 
    
    // Limit max velocity
    const maxSpeed = 25;
    const speed = Math.hypot(ball.vx, ball.vy);
    if (speed > maxSpeed) {
        ball.vx = (ball.vx / speed) * maxSpeed;
        ball.vy = (ball.vy / speed) * maxSpeed;
    }

    ball.state = 'flying';
    shotsFired++;
    const shotsDisplay = document.getElementById('shots-fired');
    if (shotsDisplay) shotsDisplay.textContent = `SHOTS: ${shotsFired}`;
    e.preventDefault(); 
}

// Drawing Functions

function drawCourt() {
    // 1. Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 2. Draw the streetball court surface (Dark Asphalt)
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 3. Draw the out-of-bounds line (White/Light Gray)
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 4;
    ctx.beginPath();
    // Sidelines
    ctx.moveTo(10, 10);
    ctx.lineTo(canvas.width - 10, 10);
    ctx.lineTo(canvas.width - 10, canvas.height - 10);
    ctx.lineTo(10, canvas.height - 10);
    ctx.closePath();
    ctx.stroke();
    
    // 4. Draw the free throw line (half-court line is skipped for backyard style)
    ctx.strokeStyle = '#CCCCCC';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(canvas.width - 250, canvas.height - 10);
    ctx.lineTo(canvas.width - 250, 10);
    ctx.stroke();
}

function drawHoop() {
    const x = hoopPosition.x;
    const y = hoopPosition.y;
    const w = hoopPosition.width;
    const h = hoopPosition.height;

    // 1. Backboard (Neon Pink)
    ctx.fillStyle = 'rgba(255, 0, 255, 0.8)'; // Pink
    ctx.shadowColor = 'rgba(255, 0, 255, 1)';
    ctx.shadowBlur = 15;
    ctx.fillRect(x + 10, y - 50, 10, 100);
    
    // 2. Rim (Neon Blue)
    ctx.fillStyle = 'rgba(0, 196, 255, 0.8)'; // Blue
    ctx.shadowColor = 'rgba(0, 196, 255, 1)';
    ctx.shadowBlur = 15;
    ctx.fillRect(x - 25, y, w + 10, h); 

    // Reset shadow for other elements
    ctx.shadowBlur = 0;
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
    
    // Orange Basketball Color
    ctx.fillStyle = 'orange'; 
    ctx.fill();
    
    // Black lines on the basketball
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Draw the slingshot line if dragging
    if (ball.state === 'dragging') {
        ctx.strokeStyle = 'rgba(255, 0, 255, 0.6)'; // Pink dotted line
        ctx.setLineDash([5, 5]); // Dotted
        ctx.lineWidth = 3;
        
        ctx.beginPath();
        // Line from the ball (launch point) to the current drag position
        ctx.moveTo(ball.x, ball.y);
        ctx.lineTo(currentDrag.x, currentDrag.y);
        ctx.stroke();
        
        ctx.setLineDash([]); // Reset line style
    }
}

// Physics & Update Functions
function updateBall() {
    if (ball.state === 'flying') {
        // Apply physics
        ball.vy += GRAVITY;
        ball.vx *= AIR_FRICTION;
        ball.vy *= AIR_FRICTION;

        ball.x += ball.vx;
        ball.y += ball.vy;

        // Wall collision (rebound)
        if (ball.x - ballRadius < 10 || ball.x + ballRadius > canvas.width - 10) {
            ball.vx = -ball.vx * 0.8; // Bounce with energy loss
            ball.x = Math.max(ballRadius + 10, Math.min(canvas.width - ballRadius - 10, ball.x));
        }

        // Floor collision (stop)
        if (ball.y + ballRadius > canvas.height - 10) {
            ball.vy = -ball.vy * 0.7; // Bounce
            ball.y = canvas.height - ballRadius - 10;
            if (Math.abs(ball.vy) < 1) {
                ball.state = 'bouncing'; // Change state to allow it to settle
            }
        }
    }
    
    if (ball.state === 'bouncing') {
        ball.vy += GRAVITY;
        ball.y += ball.vy;
        
        // Settle on the ground
        if (ball.y + ballRadius >= canvas.height - 10) {
            ball.y = canvas.height - ballRadius - 10;
            ball.vy = 0;
            ball.vx = 0;
            // After settling, reset to ready state
            if (shotsFired > 0) {
                 setTimeout(() => ball.state = 'ready', 1500); // Give player time to see the result
            }
        }
    }

    // HOOP/SCORING LOGIC
    // Check for collision with the backboard (Right side of the court)
    const backboardX = hoopPosition.x + 10;
    const backboardY = hoopPosition.y - 50;
    const backboardW = 10;
    const backboardH = 100;
    
    // Simple collision with backboard (a static vertical rectangle)
    if (ball.x + ballRadius > backboardX && ball.x - ballRadius < backboardX + backboardW &&
        ball.y + ballRadius > backboardY && ball.y - ballRadius < backboardY + backboardH) {
        
        // Reverse X velocity if ball is approaching from the left
        if (ball.vx > 0 && ball.x < backboardX) {
            ball.vx = -ball.vx * 0.7; 
        } else if (ball.vx < 0 && ball.x > backboardX + backboardW) {
             ball.vx = -ball.vx * 0.7;
        }
        
        // Increase Y velocity slightly (hit sounds flat)
        ball.vy *= 0.8;
    }
    
    // Check for scoring (passing through the rim area top-down)
    const rimX = hoopPosition.x - 25;
    const rimY = hoopPosition.y;
    const rimWidth = hoopPosition.width + 10;
    
    // Condition 1: Ball is moving downwards
    // Condition 2: Ball center passes the top edge of the rim
    // Condition 3: Ball is within the horizontal range of the rim
    if (ball.vy > 0 && ball.y - ballRadius < rimY && ball.y + ballRadius > rimY && 
        ball.x > rimX && ball.x < rimX + rimWidth) {
        
        // Successful pass-through check (scoring)
        if (!ball.scoreFlag) {
            gameScore += 2;
            ball.scoreFlag = true;
            
            // Update score UI
            const scoreDisplay = document.getElementById('score-display');
            if (scoreDisplay) scoreDisplay.textContent = `SCORE: ${gameScore}`;
            
            // Check for new High Score
            if (gameScore > playerData.highScore) {
                playerData.highScore = gameScore;
                updateUI(); // Updates the BEST score display
                savePlayerData(); // Save the new high score to Firestore
                showMessageBox(`NEW HIGH SCORE! ${playerData.highScore} points!`, 'neon-pink');
            } else {
                 showMessageBox("Swish! 2 Points!", 'neon-blue');
            }
        }
    } else if (ball.y > rimY + 50) {
        // Reset score flag once the ball is well below the rim to allow new scoring
        ball.scoreFlag = false;
    }
}

/**
 * Main game loop for the Quick Play screen.
 */
function gameLoop() {
    if (!isGameRunning) return;

    drawCourt();
    drawHoop();
    updateBall();
    drawBall();

    requestAnimationFrame(gameLoop);
}

// --- MISSION LOGIC ---

let missionMeterInterval = null;
let missionMeterValue = 0;
let meterDirection = 1; // 1 for up, -1 for down

function startMission(missionId) {
    if (missionId === 1) {
        showScreen('mission-1-screen');
        missionMeterValue = 0;
        meterDirection = 1;
        
        const meterDisplay = document.getElementById('meter-display');
        const feedback = document.getElementById('mission-feedback');
        if(meterDisplay) meterDisplay.textContent = '0';
        if(feedback) feedback.textContent = '';
        
        // Start meter animation
        if (missionMeterInterval) clearInterval(missionMeterInterval);
        missionMeterInterval = setInterval(updateMissionMeter, 20);
    } else if (missionId === 2) {
        // Mission 2 check
        if (!playerData.missions[1].completed) {
            showMessageBox("Mission 2 is LOCKED. Complete Mission 1 first!", 'neon-pink');
            return;
        }
        showScreen('mission-2-screen');
    }
}

function updateMissionMeter() {
    missionMeterValue += meterDirection;
    
    if (missionMeterValue >= 100) {
        meterDirection = -1;
        missionMeterValue = 100;
    } else if (missionMeterValue <= 0) {
        meterDirection = 1;
        missionMeterValue = 0;
    }
    
    const meterDisplay = document.getElementById('meter-display');
    if (meterDisplay) meterDisplay.textContent = missionMeterValue;
}

function stopMeter() {
    if (missionMeterInterval) {
        clearInterval(missionMeterInterval);
        missionMeterInterval = null;
    }
    
    const feedback = document.getElementById('mission-feedback');
    if (!feedback) return;
    
    // Scoring logic for Mission 1 (95 is perfect)
    let score = 0;
    if (missionMeterValue >= 90 && missionMeterValue <= 100) {
        score = 100;
        feedback.textContent = 'PERFECT PASS! (+5 Overall)';
        feedback.classList.remove('text-red-500');
        feedback.classList.add('text-neon-blue');
        playerData.overallRating += 5;
    } else if (missionMeterValue >= 80 || missionMeterValue <= 10) {
        score = 50;
        feedback.textContent = 'GOOD! (+2 Overall)';
        feedback.classList.remove('text-red-500');
        feedback.classList.add('text-neon-pink');
        playerData.overallRating += 2;
    } else {
        feedback.textContent = 'MISS! (No change)';
        feedback.classList.remove('text-neon-blue', 'text-neon-pink');
        feedback.classList.add('text-red-500');
    }

    if (score > 0) {
        playerData.missions[1].completed = true;
        savePlayerData();
        updateUI();
    }
}

function completeMission2(option) {
    let resultMessage = '';
    
    if (option === 1) {
        // Option 1: Small Bonus, High Incentives (+5 Overall)
        playerData.overallRating += 5;
        resultMessage = "Smart choice! You earned a +5 OVERALL boost from your incentives!";
    } else {
        // Option 2: Large Bonus, Low Incentives (+1 Overall)
        playerData.overallRating += 1;
        resultMessage = "A safe choice. You earned a +1 OVERALL boost.";
    }

    playerData.missions[2].completed = true;
    savePlayerData();
    updateUI();
    showMessageBox(resultMessage, 'neon-blue');
    showMainMenu();
}

// --- UTILITIES (Custom Modal) ---

let modalTimeout;

/**
 * Displays a custom modal message.
 * @param {string} message - The text to display.
 * @param {string} color - 'neon-pink' or 'neon-blue' to style the modal.
 */
function showMessageBox(message, color = 'neon-blue') {
    const modal = document.getElementById('message-modal');
    const box = document.getElementById('message-box');
    const text = document.getElementById('modal-text');
    
    if (modal && box && text) {
        text.textContent = message;
        
        // Remove existing shadow classes
        box.classList.remove('shadow-pink-500/70', 'shadow-blue-500/70');
        
        // Apply color styling
        if (color === 'neon-pink') {
            box.style.borderColor = 'var(--neon-pink)';
            box.classList.add('shadow-pink-500/70');
            // Re-apply animation for pulsing color change
            box.style.animation = 'none';
            void box.offsetHeight; // Trigger reflow
            box.style.animation = 'pulse 0.8s ease-in-out infinite alternate';
        } else {
            box.style.borderColor = 'var(--neon-blue)';
            box.classList.add('shadow-blue-500/70');
            // Remove pulsing for blue
            box.style.animation = 'none';
        }
        
        modal.style.display = 'flex';
        modal.classList.remove('hidden');

        // Automatically hide the message box after a few seconds
        clearTimeout(modalTimeout);
        modalTimeout = setTimeout(hideMessageBox, 3000); 
    }
}

function hideMessageBox() {
    const modal = document.getElementById('message-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.add('hidden');
    }
}

// Global window functions for HTML button handlers
window.showMainMenu = showMainMenu;
window.quickPlay = quickPlay;
window.loadMissions = loadMissions;
window.loadMyHub = loadMyHub;
window.loadMyStats = loadMyStats;
window.loadOptions = loadOptions;
window.quitGame = quitGame;
window.resetGame = resetGame;
window.startMission = startMission;
window.stopMeter = stopMeter;
window.completeMission2 = completeMission2;
window.showMessageBox = showMessageBox;
window.hideMessageBox = hideMessageBox;

// --- START APP ---
// Wait for the window to load before initializing Firebase and the UI.
window.onload = function() {
    initApp();
    showMainMenu();
}
