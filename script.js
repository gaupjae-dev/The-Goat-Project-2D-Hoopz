<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>THE G.O.A.T. PROJECT</title>
    <!-- Load Tailwind CSS for modern aesthetics and responsive design -->
    <script src="https://cdn.tailwindcss.com"></script>
    <!-- Load Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
    
    <style>
        /* Custom Neon Theme */
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@400;700;900&family=Inter:wght@400;700&display=swap');

        :root {
            --neon-blue: #00c4ff;
            --neon-pink: #ff00ff;
            --dark-bg: #1a1a2e;
            --mid-bg: #2c2c44;
            --text-color: #f0f0f0;
            --court-color: #0d0d1a;
        }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--dark-bg);
            color: var(--text-color);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            padding: 10px;
        }

        /* Main App Container */
        #main-wrapper {
            width: 100%;
            max-width: 1000px;
            background-color: var(--mid-bg);
            border-radius: 12px;
            box-shadow: 0 0 40px rgba(0, 196, 255, 0.3);
            padding: 20px;
            min-height: 90vh;
            display: flex;
            flex-direction: column;
            align-items: center;
        }

        /* Titles */
        .main-title {
            font-family: 'Exo 2', sans-serif;
            font-weight: 900;
            font-size: 2.5rem;
            text-shadow: 0 0 10px var(--neon-pink), 0 0 20px var(--neon-pink);
            color: var(--text-color);
            margin-bottom: 30px;
            text-align: center;
        }
        
        .screen h2 {
            font-family: 'Exo 2', sans-serif;
            font-size: 1.8rem;
            color: var(--neon-blue);
            text-shadow: 0 0 8px rgba(0, 196, 255, 0.7);
            margin-bottom: 20px;
        }

        /* Menu/Button Styling */
        .menu-bar {
            display: flex;
            flex-direction: column;
            gap: 15px;
            width: 100%;
            max-width: 300px;
        }

        .menu-button, .neon-btn {
            background-color: var(--neon-blue);
            color: var(--dark-bg);
            font-family: 'Exo 2', sans-serif;
            font-weight: 700;
            padding: 12px 24px;
            border-radius: 8px;
            text-transform: uppercase;
            transition: all 0.2s ease-in-out;
            box-shadow: 0 0 10px rgba(0, 196, 255, 0.7);
            border: 2px solid var(--neon-blue);
            cursor: pointer;
            text-align: center;
        }

        .menu-button:hover, .neon-btn:hover {
            background-color: var(--neon-pink);
            color: var(--dark-bg);
            box-shadow: 0 0 20px var(--neon-pink);
            border-color: var(--neon-pink);
            transform: translateY(-2px);
        }

        /* Canvas Specific Styling */
        #game-canvas {
            border: 4px solid var(--neon-blue);
            box-shadow: 0 0 15px var(--neon-blue), 0 0 25px var(--neon-blue) inset;
            background-color: var(--court-color);
            border-radius: 8px;
            touch-action: none;
            width: 100%;
            max-width: 760px;
            height: auto;
        }

        .mission-item {
            width: 100%;
            padding: 10px;
            margin-top: 10px;
            border-radius: 6px;
            background-color: var(--mid-bg);
            border: 1px solid var(--neon-blue);
            color: var(--text-color);
            transition: background-color 0.1s;
            text-align: left; /* Missions text is left-aligned */
        }
        
        .mission-item:not([disabled]):hover {
            background-color: var(--neon-blue);
            color: var(--dark-bg);
        }
        
        .mission-item[disabled] {
            opacity: 0.5;
            cursor: not-allowed;
            border-color: #555;
            color: #aaa;
        }

        .hidden {
            display: none !important;
        }
        
        /* Custom Alert Modal */
        #message-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.7);
            display: none; /* Controlled by JS */
            place-items: center;
            z-index: 1000;
        }
        #message-box {
            background-color: var(--mid-bg);
            border: 3px solid var(--neon-pink);
            border-radius: 12px;
            padding: 25px;
            max-width: 400px;
            width: 90%;
            text-align: center;
            box-shadow: 0 0 20px var(--neon-pink);
        }
        .modal-text {
            margin-bottom: 20px;
            font-size: 1.1rem;
            color: var(--text-color);
        }

        /* Canvas Shake Effect */
        @keyframes shake {
            0% { transform: translate(1px, 1px) rotate(0deg); }
            10% { transform: translate(-1px, -2px) rotate(-1deg); }
            20% { transform: translate(-3px, 0px) rotate(1deg); }
            30% { transform: translate(3px, 2px) rotate(0deg); }
            40% { transform: translate(1px, -1px) rotate(1deg); }
            50% { transform: translate(-1px, 2px) rotate(-1deg); }
            60% { transform: translate(-3px, 1px) rotate(0deg); }
            70% { transform: translate(3px, 1px) rotate(-1deg); }
            80% { transform: translate(-1px, -1px) rotate(1deg); }
            90% { transform: translate(1px, 2px) rotate(0deg); }
            100% { transform: translate(1px, -2px) rotate(-1deg); }
        }
        .shake {
            animation: shake 0.2s cubic-bezier(.36,.07,.19,.97) both;
            transform: translate3d(0, 0, 0);
            backface-visibility: hidden;
            perspective: 1000px;
        }
    </style>
</head>
<body class="p-0 sm:p-4">
    <div id="main-wrapper">
        <!-- Main Menu Screen -->
        <div class="main-menu-container text-center" id="main-menu-container">
            <h1 class="main-title">THE G.O.A.T. PROJECT</h1>
            <div class="menu-bar mx-auto">
                <button class="menu-button" onclick="quickPlay()">QUICK PLAY</button>
                <button class="menu-button" onclick="loadMissions()">MISSIONS</button>
                <button class="menu-button" onclick="loadMyHub()">MY HUB</button>
                <button class="menu-button" onclick="loadOptions()">OPTIONS</button>
                <button class="menu-button" onclick="quitGame()">QUIT</button>
            </div>
            <div id="user-info" class="mt-8 text-sm text-neon-blue"></div>
        </div>

        <!-- QUICK PLAY GAME SCREEN (2D Hoops) -->
        <div id="quick-play-game-screen" class="screen hidden">
            <h2 class="mb-4 text-center">BACKYARD HOOPZ - QUICK PLAY</h2>
            
            <!-- Game Canvas and Controls -->
            <div class="w-full max-w-[760px] flex flex-col items-center">
                
                <canvas id="game-canvas" width="760" height="480"></canvas>
                
                <div class="control-bar flex justify-between w-full mt-4 p-3 rounded-xl border border-neon-pink shadow-lg shadow-pink-500/20">
                    <div id="score-display" class="text-lg font-bold text-neon-blue">SCORE: 0</div>
                    <div id="high-score-display" class="text-lg font-bold text-neon-pink">BEST: 0</div>
                    <div id="shots-fired" class="text-lg font-bold text-neon-blue">SHOTS: 0</div>
                </div>

                <p id="game-message" class="text-center mt-4 text-lg font-bold text-neon-pink">Click & drag to shoot!</p>
                
                <button class="menu-button mt-6 w-full max-w-[200px]" onclick="showMainMenu()">
                    <i class="fas fa-arrow-left mr-2"></i>EXIT GAME
                </button>
            </div>
        </div>

        <!-- MISSIONS LOG SCREEN -->
        <div class="missions-log-container text-center hidden" id="missions-screen">
            <h2>MISSIONS LOG</h2>
            <div class="w-full max-w-sm mx-auto flex flex-col gap-3">
                <button class="mission-item" id="mission-1-button" onclick="startMission(1)">1. The Jump Start (STATUS)</button>
                <button class="mission-item" id="mission-2-button" onclick="startMission(2)">2. The Rookie Contract (STATUS)</button>
            </div>
            <button class="menu-button mt-8 w-full max-w-[200px]" onclick="showMainMenu()">BACK</button>
        </div>
        
        <!-- MY HUB SCREEN -->
        <div class="my-player-container text-center hidden" id="my-hub-screen">
            <h2>MY HUB</h2>
            <p class="text-gray-300">Welcome to your personal dashboard.</p>
            <div class="menu-bar mt-6 mx-auto">
                <button class="menu-button" onclick="loadMyStats()">VIEW MY STATS</button>
                <button class="menu-button" onclick="loadTraining()">TRAINING FACILITY</button>
            </div>
            <button class="menu-button mt-8 w-full max-w-[200px]" onclick="showMainMenu()">BACK</button>
        </div>

        <!-- MY STATS SCREEN -->
        <div class="my-player-container text-center hidden" id="my-stats-screen">
            <h2>MY PLAYER STATS</h2>
            <div class="mt-4 p-4 bg-dark-bg rounded-lg border border-neon-blue/50 max-w-md mx-auto">
                <p class="mb-2"><strong>Player ID:</strong> <span id="player-id-display">N/A</span></p>
                <p class="mb-2"><strong>Overall Rating:</strong> <span id="stats-overall-rating">75</span></p>
                <p class="mb-2"><strong>Position:</strong> Point Guard</p>
                <p class="mb-2"><strong>Quick Play High Score:</strong> <span id="stats-high-score">0</span></p>
            </div>
            <p class="mt-4" id="stats-current-mission"><strong>Current Mission:</strong> The Jump Start</p>
            <div class="progress-bar-container w-full max-w-xs h-3 bg-gray-700 mx-auto mt-2 rounded-full overflow-hidden">
                <div class="bg-neon-pink h-full transition-all duration-500" id="mission-progress-bar" style="width: 0%;"></div>
            </div>
            <button class="menu-button mt-8 w-full max-w-[200px]" onclick="loadMyHub()">BACK TO HUB</button>
        </div>

        <!-- OPTIONS SCREEN -->
        <div class="options-container text-center hidden" id="options-screen">
            <h2>OPTIONS</h2>
            <div class="p-4 bg-dark-bg rounded-lg border border-neon-pink/50 max-w-md mx-auto">
                <p class="mb-2">VOLUME: [|||||||||||--]</p>
                <p class="mb-2">DIFFICULTY: Rookie</p>
                <p>LANGUAGE: English</p>
            </div>
            <button class="menu-button mt-8 w-full max-w-[200px]" onclick="showMainMenu()">BACK</button>
        </div>

        <!-- QUIT SCREEN -->
        <div class="quit-container text-center hidden" id="quit-screen">
            <h2>GAME OVER</h2>
            <p class="text-gray-300">Thanks for playing THE G.O.A.T. PROJECT demo!</p>
            <p class="text-gray-300">You can close your browser tab now.</p>
            <button class="menu-button mt-8 w-full max-w-[200px]" onclick="showMainMenu()">START NEW GAME</button>
        </div>
        
        <!-- MISSION 1 SCREEN (Power Meter) -->
        <div class="mission-screen text-center hidden" id="mission-1-screen">
            <h2>MISSION 1: THE JUMP START</h2>
            <p class="text-gray-300">Coach says: Hit the button when the meter reaches 95 for a perfect pass!</p>
            
            <div class="mission-content mt-6">
                <h1 id="meter-display" class="text-6xl font-extrabold text-neon-pink my-4">0</h1>
                <button class="menu-button w-48" onclick="stopMeter()">SHOOT / PASS</button>
            </div>

            <div id="mission-feedback" class="mt-8 text-xl font-bold"></div>

            <button class="menu-button mt-8 w-48" onclick="showMainMenu()">EXIT MISSION</button>
        </div>
        
        <!-- MISSION 2 SCREEN (Rookie Contract) -->
        <div class="mission-screen text-center hidden" id="mission-2-screen">
            <h2>MISSION 2: THE ROOKIE CONTRACT</h2>
            <p class="text-gray-300">Your agent, Mr. Smith, has two contract offers for you. He asks: **Which offer do you take?**</p>
            
            <div class="mission-content mt-6 flex flex-col gap-4 w-full max-w-md mx-auto">
                <button class="menu-button" onclick="completeMission2(1)">Option 1: Small Bonus, High Incentives (+5 OVERALL)</button>
                <button class="menu-button" onclick="completeMission2(0)">Option 2: Large Bonus, Low Incentives (+1 OVERALL)</button>
            </div>
            
            <button class="menu-button mt-8 w-48" onclick="showMainMenu()">EXIT MISSION</button>
        </div>
    </div>
    
    <!-- Custom Message Modal (Replaces alert()) -->
    <div id="message-modal" class="hidden absolute top-0 left-0 w-full h-full flex items-center justify-center">
        <div id="message-box">
            <p id="modal-text" class="modal-text"></p>
            <button class="neon-btn text-sm" onclick="hideMessageBox()">OK</button>
        </div>
    </div>

    <!-- Combined JavaScript for Firebase, Menu Navigation, and Game Logic -->
    <script type="module">
        // --- Firebase Setup ---
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, setDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        // Global Firebase and Canvas variables (MUST BE USED)
        const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
        const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
        
        let app, db, auth;
        let userId = 'guest';
        let isAuthReady = false;
        
        const FIREBASE_COLLECTION = `artifacts/${appId}/users`;
        const FIREBASE_DOC_ID = 'game_data';

        // --- GAME STATE VARIABLES (from user's script.js - using localStorage) ---
        let playerCurrentMission = 1; 
        let playerOverall = 75;
        let missionProgress = 0;
        let meterInterval = null;
        let meterValue = 0;


        // --- CUSTOM MESSAGE BOX (Replaces alert() and confirm()) ---
        function showMessageBox(message, callback = null) {
            document.getElementById('modal-text').textContent = message;
            document.getElementById('message-modal').style.display = 'grid';
            
            // Re-assign OK button handler
            const okButton = document.querySelector('#message-box button');
            okButton.onclick = () => {
                hideMessageBox();
                if (callback) callback();
            };
        }

        function hideMessageBox() {
            document.getElementById('message-modal').style.display = 'none';
        }

        // --- SAVE/LOAD GAME STATE (User's localStorage implementation) ---
        // This handles player stats and mission progress.
        function saveGame() {
            const gameState = {
                mission: playerCurrentMission,
                overall: playerOverall,
                progress: missionProgress
            };
            localStorage.setItem('goatProjectSave', JSON.stringify(gameState));
            console.log("Player State Saved to localStorage!");
        }

        function loadGame() {
            const savedState = localStorage.getItem('goatProjectSave');
            if (savedState) {
                const gameState = JSON.parse(savedState);
                playerCurrentMission = gameState.mission;
                playerOverall = gameState.overall;
                missionProgress = gameState.progress;
                console.log(`Player State Loaded! Current Mission: ${playerCurrentMission}, Overall: ${playerOverall}`);
            } else {
                console.log("No saved player state found. Starting new game.");
            }
        }
        
        // --- FIREBASE HIGH SCORE FUNCTIONS (Kept for environment compliance) ---
        // This handles only the Quick Play High Score.
        let quickPlayData = { score: 0, highScore: 0, shots: 0 }; // Used for current session
        
        const initializeFirebase = async () => {
            if (!firebaseConfig) {
                console.error("Firebase config is missing. Data persistence disabled.");
                isAuthReady = true;
                return;
            }
            try {
                app = initializeApp(firebaseConfig);
                db = getFirestore(app);
                auth = getAuth(app);
                
                if (initialAuthToken) {
                    await signInWithCustomToken(auth, initialAuthToken);
                } else {
                    await signInAnonymously(auth);
                }

                onAuthStateChanged(auth, (user) => {
                    if (user) {
                        userId = user.uid;
                        isAuthReady = true;
                        document.getElementById('user-info').textContent = `Authenticated ID: ${userId.substring(0, 8)}...`;
                        document.getElementById('player-id-display').textContent = userId;
                        loadGameData(); // Load Firebase High Score
                    } else {
                        userId = crypto.randomUUID();
                        isAuthReady = true;
                        document.getElementById('player-id-display').textContent = userId;
                        loadGameData(); // Load Firebase High Score (or initialize)
                    }
                });
            } catch (error) {
                console.error("Error initializing Firebase:", error);
                isAuthReady = true;
            }
        };

        const loadGameData = () => {
            if (!isAuthReady || !db) return;
            const docRef = doc(db, FIREBASE_COLLECTION, userId, 'data', FIREBASE_DOC_ID);
            
            onSnapshot(docRef, (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    quickPlayData.highScore = data.highScore || 0;
                } else {
                    quickPlayData.highScore = 0;
                    saveGameData(); // Create initial document
                }
                updateGameUI(); // Update UI with loaded high score
                document.getElementById('stats-high-score').textContent = quickPlayData.highScore;
            }, (error) => {
                console.error("Error listening to quick play data:", error);
            });
        };

        const saveGameData = () => {
            if (!isAuthReady || !db) return;
            const docRef = doc(db, FIREBASE_COLLECTION, userId, 'data', FIREBASE_DOC_ID);
            setDoc(docRef, { 
                highScore: quickPlayData.highScore 
            }, { merge: true }).catch(error => {
                console.error("Error saving quick play data:", error);
            });
        };
        
        // --- SCREEN MANAGEMENT (Adapted from user's script) ---
        const screenIds = [
            'main-menu-container', 'quick-play-game-screen',
            'missions-screen', 'my-hub-screen', 
            'my-stats-screen', 'options-screen', 'quit-screen',
            'mission-1-screen', 'mission-2-screen'
        ];

        function showScreen(screenId) {
            screenIds.forEach(id => {
                const element = document.getElementById(id);
                if (element) {
                    if (id === screenId) {
                        element.classList.remove('hidden');
                        if (id === 'main-menu-container') {
                             element.style.display = 'flex'; // Maintain flex for main menu layout
                        } else {
                             element.style.display = 'block';
                        }
                    } else {
                        element.classList.add('hidden');
                    }
                }
            });

            // Handle game loop pausing/resuming
            if (screenId === 'quick-play-game-screen') {
                resetGame();
                requestAnimationFrame(gameLoop);
            } else {
                 // Stop the game loop when moving to any other screen
                 quickPlayData.shots = 0;
                 quickPlayData.score = 0;
            }
        }

        // --- MENU & NAVIGATION FUNCTIONS (from user's script.js) ---

        function showMainMenu() {
            if (meterInterval) {
                clearInterval(meterInterval);
                meterInterval = null;
            }
            showScreen('main-menu-container');
        }

        function quickPlay() {
            // Quick Play always launches the 2D Basketball Game
            showScreen('quick-play-game-screen');
        }

        function loadMissions() {
            showScreen('missions-screen');
            
            let mission1Button = document.getElementById('mission-1-button');
            let mission2Button = document.getElementById('mission-2-button');
            
            if (playerCurrentMission === 1) {
                mission1Button.textContent = `1. The Jump Start (IN PROGRESS, ${missionProgress}%)`;
                mission2Button.textContent = "2. The Rookie Contract (LOCKED)";
                mission2Button.onclick = () => showMessageBox("Mission 2 is LOCKED! Complete Mission 1 first.");
                mission2Button.disabled = true;
            } else if (playerCurrentMission === 2) {
                mission1Button.textContent = "1. The Jump Start (COMPLETED)";
                mission2Button.textContent = "2. The Rookie Contract (AVAILABLE)";
                mission2Button.onclick = () => startMission(2);
                mission2Button.disabled = false;
            } else { // playerCurrentMission >= 3
                mission1Button.textContent = "1. The Jump Start (COMPLETED)";
                mission2Button.textContent = "2. The Rookie Contract (COMPLETED)";
                mission2Button.onclick = () => showMessageBox("All main missions are complete!");
                mission2Button.disabled = true;
            }
        }

        function loadMyHub() {
            showScreen('my-hub-screen');
        }

        function loadMyStats() {
            showScreen('my-stats-screen');
            
            let missionTitle;
            let progress;

            if (playerCurrentMission === 1) {
                missionTitle = "The Jump Start";
                progress = missionProgress;
            } else if (playerCurrentMission === 2) {
                missionTitle = "The Rookie Contract";
                progress = 50; 
            } else {
                missionTitle = "THE G.O.A.T.!";
                progress = 100;
            }

            document.getElementById('stats-overall-rating').textContent = playerOverall;
            document.getElementById('stats-current-mission').innerHTML = '<strong>Current Mission:</strong> ' + missionTitle;
            document.getElementById('mission-progress-bar').style.width = progress + '%';
        }

        function loadTraining() {
            showMessageBox("Training Facility Coming Soon!");
        }

        function loadOptions() {
            showScreen('options-screen');
        }

        function quitGame() {
            showScreen('quit-screen');
        }

        // --- MISSION & GAMEPLAY LOGIC (from user's script.js, adapted) ---

        function startMission(missionId) {
            if (missionId === 1 && playerCurrentMission === 1) {
                launchMission1();
            } else if (missionId === 2 && playerCurrentMission >= 2) {
                launchMission2();
            } else if (missionId === 1 && playerCurrentMission > 1) {
                showMessageBox("Mission 1 is already complete!");
                loadMissions();
            } else if (missionId === 2 && playerCurrentMission < 2) {
                showMessageBox("Mission 2 is LOCKED! Complete Mission 1 first.");
                loadMissions();
            }
        }

        // --- Mission 1 Functions (Meter Game) ---
        function launchMission1() {
            showScreen('mission-1-screen');
            meterValue = 0;
            document.getElementById('meter-display').textContent = meterValue;
            document.getElementById('mission-feedback').innerHTML = '';
            
            // The meter loop logic
            if (meterInterval) clearInterval(meterInterval);
            let direction = 1;
            
            meterInterval = setInterval(function() {
                meterValue += direction;
                if (meterValue > 100) {
                    meterValue = 100;
                    direction = -1;
                } else if (meterValue < 0) {
                    meterValue = 0;
                    direction = 1;
                }
                document.getElementById('meter-display').textContent = meterValue;
            }, 20);
        }

        function stopMeter() {
            if (!meterInterval) return; // Already stopped
            clearInterval(meterInterval);
            meterInterval = null;
            
            let feedbackDiv = document.getElementById('mission-feedback');

            if (meterValue >= 90 && meterValue <= 100) {
                feedbackDiv.innerHTML = `<p class="text-neon-blue">PERFECT PASS! SCORE: ${meterValue}</p>`;
                playerOverall += 1;
                missionProgress = 100;
                
                showMessageBox("Mission 1 Complete! Overall Rating +1. Returning to Main Menu.", () => {
                    playerCurrentMission = 2;
                    saveGame();
                    showMainMenu();
                });
                
            } else {
                feedbackDiv.innerHTML = `<p class="text-neon-pink">MISSED IT! SCORE: ${meterValue}. Trying again...</p>`;
                missionProgress = meterValue;
                setTimeout(launchMission1, 1500); // Relaunch the mission after a delay
            }
        }

        // --- Mission 2 Functions (Contract Choice) ---
        function launchMission2() {
            showScreen('mission-2-screen');
        }

        function completeMission2(choiceId) {
            let message = "";
            
            if (choiceId === 1) {
                playerOverall += 5;
                message = "SMART CHOICE! You bet on your talent. Contract signed! Your potential has increased (Overall +5).";
            } else {
                playerOverall += 1;
                message = "The safer choice. Contract signed. You secured the bag, but the easy road rarely leads to greatness (Overall +1).";
            }
            
            showMessageBox(`CONTRACT SIGNED! ${message}`, () => {
                playerCurrentMission = 3;
                saveGame();
                showMainMenu();
            });
        }


        // --- 2D HOOPS CANVAS GAME LOGIC (Quick Play) ---

        const canvas = document.getElementById('game-canvas');
        const ctx = canvas.getContext('2d');
        const CANVAS_WIDTH = 760;
        const CANVAS_HEIGHT = 480;
        
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        // Ball State
        const ball = {
            x: 100, y: CANVAS_HEIGHT - 50, radius: 15, color: '#ff6600',
            vx: 0, vy: 0, mass: 1, isThrown: false,
        };

        // Hoop State
        const hoop = {
            backboardX: CANVAS_WIDTH - 50, backboardY: 100, backboardH: 100,
            rimX: CANVAS_WIDTH - 80, rimY: 140, rimW: 10, rimThickness: 3,
            netZone: { x: CANVAS_WIDTH - 90, y: 140, w: 20, h: 5 },
        };
        
        let lastUpdateTime = 0;
        const gravity = 0.5;
        let isDragging = false;
        let startPoint = { x: 0, y: 0 };
        let endPoint = { x: 0, y: 0 };
        let shotVelocityScale = 0.15;
        let goalScored = false;

        const resetGame = () => {
            quickPlayData.score = 0;
            quickPlayData.shots = 0;
            updateGameUI();
            resetBall();
            document.getElementById('game-message').textContent = "Click & drag to shoot!";
            canvas.classList.remove('shake');
        };

        const resetBall = () => {
            ball.x = 100;
            ball.y = CANVAS_HEIGHT - 50;
            ball.vx = 0;
            ball.vy = 0;
            ball.isThrown = false;
            isDragging = false;
            goalScored = false;
        };

        const updateGameUI = () => {
            document.getElementById('score-display').textContent = `SCORE: ${quickPlayData.score}`;
            document.getElementById('high-score-display').textContent = `BEST: ${quickPlayData.highScore}`;
            document.getElementById('shots-fired').textContent = `SHOTS: ${quickPlayData.shots}`;
        };

        function varToRgb(cssVar, alpha = 1) {
            const hex = getComputedStyle(document.documentElement).getPropertyValue(cssVar).trim();
            if (hex.startsWith('#') && hex.length === 7) {
                const r = parseInt(hex.substring(1, 3), 16);
                const g = parseInt(hex.substring(3, 5), 16);
                const b = parseInt(hex.substring(5, 7), 16);
                return `rgba(${r}, ${g}, ${b}, ${alpha})`;
            }
            return hex;
        }

        const drawCourt = () => {
            const gradient = ctx.createLinearGradient(0, CANVAS_HEIGHT, 0, CANVAS_HEIGHT - 100);
            gradient.addColorStop(0, '#0d0d1a');
            gradient.addColorStop(1, '#1a1a2e');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

            ctx.strokeStyle = varToRgb('--neon-blue');
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(100, CANVAS_HEIGHT, 150, Math.PI * 1.5, Math.PI * 0.5, true);
            ctx.stroke();

            ctx.strokeStyle = varToRgb('--neon-blue');
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(CANVAS_WIDTH / 2, 0);
            ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
            ctx.stroke();
        };

        const drawHoop = () => {
            ctx.fillStyle = varToRgb('--neon-pink');
            ctx.shadowColor = varToRgb('--neon-pink');
            ctx.shadowBlur = 15;
            ctx.fillRect(hoop.backboardX, hoop.backboardY, hoop.rimThickness, hoop.backboardH);

            ctx.fillStyle = varToRgb('--neon-blue');
            ctx.shadowColor = varToRgb('--neon-blue');
            ctx.fillRect(hoop.rimX, hoop.rimY, hoop.rimW, hoop.rimThickness);
            
            ctx.shadowBlur = 0;
        };

        const drawBall = () => {
            ctx.beginPath();
            ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
            ctx.fillStyle = ball.color;
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(ball.x - ball.radius, ball.y);
            ctx.lineTo(ball.x + ball.radius, ball.y);
            ctx.moveTo(ball.x, ball.y - ball.radius);
            ctx.lineTo(ball.x, ball.y + ball.radius);
            ctx.stroke();
        };
        
        const drawTrajectory = () => {
            if (isDragging) {
                // Draw line from start point to current mouse/touch position
                ctx.strokeStyle = varToRgb('--neon-pink', 0.8);
                ctx.lineWidth = 3;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.lineTo(endPoint.x, endPoint.y);
                ctx.stroke();
                ctx.setLineDash([]);
                
                // Draw predicted velocity vector (simple dots)
                const dx = startPoint.x - endPoint.x;
                const dy = startPoint.y - endPoint.y;
                const predictionVx = dx * shotVelocityScale;
                const predictionVy = dy * shotVelocityScale;
                
                let tempX = ball.x;
                let tempY = ball.y;
                let tempVx = predictionVx;
                let tempVy = predictionVy;
                
                ctx.fillStyle = varToRgb('--neon-blue', 0.8);
                
                for (let i = 0; i < 60; i += 5) {
                    tempVy += gravity * 5; 
                    tempX += tempVx * 5;
                    tempY += tempVy * 5;
                    
                    if (tempY > CANVAS_HEIGHT - ball.radius) break;
                    
                    ctx.beginPath();
                    ctx.arc(tempX, tempY, 2, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        };

        const updateBall = (deltaTime) => {
            if (!ball.isThrown) return;

            ball.vy += gravity * (deltaTime / (1000 / 60));
            
            ball.x += ball.vx * (deltaTime / (1000 / 60));
            ball.y += ball.vy * (deltaTime / (1000 / 60));
            
            // Collision with floor
            if (ball.y + ball.radius > CANVAS_HEIGHT) {
                ball.y = CANVAS_HEIGHT - ball.radius;
                ball.vy *= -0.7;
                ball.vx *= 0.95;
                if (Math.abs(ball.vy) < 2) {
                    ball.vy = 0;
                    ball.vx = 0;
                }
            }

            checkGoal();

            if (Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1 && ball.y === CANVAS_HEIGHT - ball.radius) {
                setTimeout(resetBall, 2000);
            }
        };
        
        const checkGoal = () => {
            // Backboard collision
            if (ball.x + ball.radius >= hoop.backboardX && ball.y > hoop.backboardY) {
                ball.x = hoop.backboardX - ball.radius;
                ball.vx *= -0.7;
            }

            // Rim collision
            const rimLeft = hoop.rimX;
            const rimRight = hoop.rimX + hoop.rimW;
            const rimTop = hoop.rimY;
            
            if (ball.y + ball.radius >= rimTop && ball.y - ball.radius <= rimTop + hoop.rimThickness) {
                if (ball.x + ball.radius > rimLeft && ball.x - ball.radius < rimRight) {
                    ball.vy *= -0.8; 
                    ball.y = rimTop - ball.radius;
                }
            }

            // Score detection
            if (ball.x > hoop.netZone.x && ball.x < hoop.netZone.x + hoop.netZone.w) {
                if (ball.y < hoop.netZone.y && ball.vy > 0 && !goalScored) {
                    quickPlayData.score += 2;
                    if (quickPlayData.score > quickPlayData.highScore) {
                        quickPlayData.highScore = quickPlayData.score;
                        saveGameData(); // Save new high score to Firebase
                    }
                    updateGameUI();
                    document.getElementById('game-message').textContent = "SWISH! +2 Points!";
                    goalScored = true;
                    canvas.classList.add('shake');
                    setTimeout(() => canvas.classList.remove('shake'), 500);
                }
            }
            
            if (ball.y > CANVAS_HEIGHT) {
                goalScored = false;
            }
        };

        const gameLoop = (timestamp) => {
            const deltaTime = timestamp - lastUpdateTime;
            lastUpdateTime = timestamp;

            if (document.getElementById('quick-play-game-screen').classList.contains('hidden')) {
                return; 
            }

            ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
            drawCourt();
            drawHoop();
            
            if (!ball.isThrown) {
                drawTrajectory();
            }
            
            updateBall(deltaTime);
            drawBall();

            requestAnimationFrame(gameLoop);
        };
        
        // --- Input Handling (Mouse and Touch) ---
        const getCanvasCoords = (e) => {
            const rect = canvas.getBoundingClientRect();
            let clientX, clientY;
            
            if (e.touches) {
                clientX = e.touches[0].clientX;
                clientY = e.touches[0].clientY;
            } else {
                clientX = e.clientX;
                clientY = e.clientY;
            }

            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;

            return {
                x: (clientX - rect.left) * scaleX,
                y: (clientY - rect.top) * scaleY,
            };
        };

        const handleStart = (e) => {
            if (ball.isThrown) return;
            e.preventDefault(); 
            
            const coords = getCanvasCoords(e);
            
            const distance = Math.sqrt(Math.pow(coords.x - ball.x, 2) + Math.pow(coords.y - ball.y, 2));
            if (distance < ball.radius * 2) {
                isDragging = true;
                startPoint = coords;
                endPoint = coords;
                document.getElementById('game-message').textContent = "Drag back to set power...";
            }
        };

        const handleMove = (e) => {
            if (!isDragging) return;
            e.preventDefault(); 
            endPoint = getCanvasCoords(e);
        };

        const handleEnd = (e) => {
            if (!isDragging || ball.isThrown) return;
            
            isDragging = false;
            ball.isThrown = true;
            quickPlayData.shots++;
            updateGameUI();
            
            const dx = startPoint.x - endPoint.x;
            const dy = startPoint.y - endPoint.y;
            
            ball.vx = dx * shotVelocityScale;
            ball.vy = dy * shotVelocityScale;
            
            document.getElementById('game-message').textContent = "Ball is in the air!";
        };

        const resizeCanvas = () => {
            const container = canvas.parentElement;
            if (container) {
                const targetWidth = container.clientWidth;
                canvas.style.height = `${targetWidth * (CANVAS_HEIGHT / CANVAS_WIDTH)}px`;
            }
        };
        

        // --- INITIALIZER ---
        window.onload = function () {
            // 1. Initialize Firebase for High Score persistence
            initializeFirebase();
            
            // 2. Load player mission state from localStorage
            loadGame();
            
            // 3. Set initial screen
            showMainMenu();
            
            // 4. Set up canvas event listeners for the game
            canvas.addEventListener('mousedown', handleStart);
            canvas.addEventListener('mousemove', handleMove);
            canvas.addEventListener('mouseup', handleEnd);

            canvas.addEventListener('touchstart', handleStart);
            canvas.addEventListener('touchmove', handleMove);
            canvas.addEventListener('touchend', handleEnd);
            
            window.addEventListener('resize', resizeCanvas);
            resizeCanvas();
        };

    </script>
</body>
</html>
