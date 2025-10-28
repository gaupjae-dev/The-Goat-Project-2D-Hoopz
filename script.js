// --- FIREBASE IMPORTS ---
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
    onSnapshot, 
    setLogLevel
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
let isLoading = true;

// Player Data State (Local)
let playerData = {
    overallRating: 75,
    highScore: 0,
    currentMission: 1, 
    missions: {
        1: { completed: false, ratingBonus: 5 },
        2: { completed: false, ratingBonus: 0 }
    },
};

const USER_DATA_PATH = (uid) => `artifacts/${appId}/users/${uid}/gameData/playerProfile`;

// --- THREE.JS & CANNON.JS SETUP ---
let scene, camera, renderer;
let world; // Cannon.js world
let basketballMesh, basketballBody;
let player, playerBody; // playerBody stores the Cannon.js physics body for the player
let inputState = { forward: false, backward: false, left: false, right: false, shoot: false };
let canShoot = true;
let score = 0;
let shotsFired = 0;
let mission1Interval = null;
let meterValue = 0;
let meterDirection = 1;

// Game Configuration
const PLAYER_SPEED = 5;
const SHOT_FORCE = 15;
const PLAYER_MASS = 50;

// --- CORE INITIALIZATION ---

async function initFirebase() {
    try {
        // setLogLevel('Debug'); // Uncomment for debugging Firestore
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);

        // Set local persistence (optional, but good practice)
        await setPersistence(auth, browserLocalPersistence);

        // Check for custom token, otherwise sign in anonymously
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
        } else {
            await signInAnonymously(auth);
        }

        // Auth state listener
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                document.getElementById('user-info').textContent = `User: ${userId.substring(0, 8)}...`;
                isAuthReady = true;
                initFirestoreListener();
            } else {
                // This should ideally not happen after forced sign-in
                userId = crypto.randomUUID(); 
                document.getElementById('user-info').textContent = `Guest: ${userId.substring(0, 8)}...`;
                isAuthReady = true;
                // For guest, initialize local data and show stats
                updateMissionUI();
                document.getElementById('stats-overall-rating').textContent = playerData.overallRating;
            }
        });
    } catch (error) {
        console.error("Firebase Initialization Error:", error);
        // Handle error gracefully for the user
        showModal('Failed to connect to game services. Playing offline.');
        isAuthReady = true; // Still allow game to start offline
        updateMissionUI();
        document.getElementById('stats-overall-rating').textContent = playerData.overallRating;
        hideLoading();
    }
}

function initFirestoreListener() {
    if (!isAuthReady || !db || !userId) return;

    const userDocRef = doc(db, USER_DATA_PATH(userId));

    // Set up real-time listener
    onSnapshot(userDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const fetchedData = docSnap.data();
            
            // Safely merge fetched data into local state
            playerData.overallRating = fetchedData.overallRating || 75;
            playerData.highScore = fetchedData.highScore || 0;
            playerData.currentMission = fetchedData.currentMission || 1;
            
            // Safely parse missions data (must be parsed from JSON string)
            if (fetchedData.missions && typeof fetchedData.missions === 'string') {
                 try {
                    playerData.missions = JSON.parse(fetchedData.missions);
                } catch (e) {
                    console.error("Error parsing missions JSON:", e);
                }
            } else if (fetchedData.missions && typeof fetchedData.missions === 'object') {
                // Handle case where missions might not have been stringified yet (first save)
                playerData.missions = fetchedData.missions;
            }

            console.log("Player data updated from Firestore:", playerData);
        } else {
            console.log("No profile found, creating new one.");
            savePlayerData(); // Create initial document
        }

        // Update UI based on loaded data
        updateScoreDisplays();
        updateMissionUI();
        document.getElementById('stats-overall-rating').textContent = playerData.overallRating;

        // Game can now safely start
        if (isLoading) {
            init3DEnvironment();
        }
    }, (error) => {
        console.error("Firestore Listener Error:", error);
        showModal('Lost connection to game server. Data may not save.');
    });
}

async function savePlayerData() {
    if (!isAuthReady || !db || !userId) {
        console.warn("Cannot save data: Auth not ready or user ID missing.");
        return;
    }

    const userDocRef = doc(db, USER_DATA_PATH(userId));
    const dataToSave = {
        overallRating: playerData.overallRating,
        highScore: playerData.highScore,
        currentMission: playerData.currentMission,
        // Serialize missions object for safe storage in Firestore
        missions: JSON.stringify(playerData.missions),
        updatedAt: new Date().toISOString()
    };

    try {
        await setDoc(userDocRef, dataToSave, { merge: true });
    } catch (error) {
        console.error("Error saving player data:", error);
        showModal('Could not save your progress.');
    }
}

function updateScoreDisplays() {
    // Check if elements exist before updating (safety check for game start)
    if (document.getElementById('high-score-display')) {
        document.getElementById('high-score-display').textContent = `BEST: ${playerData.highScore}`;
    }
    if (document.getElementById('score-display')) {
        document.getElementById('score-display').textContent = score;
    }
    if (document.getElementById('shots-fired')) {
        document.getElementById('shots-fired').textContent = `SHOTS: ${shotsFired}`;
    }
    if (document.getElementById('stats-high-score')) {
        document.getElementById('stats-high-score').textContent = playerData.highScore;
    }
}

function updateMissionUI() {
    const mission2Button = document.getElementById('mission-2-button');
    if (!mission2Button) return;

    const progress = (playerData.currentMission - 1) * 50; // Simple progress logic (50% per mission)
    const progressBar = document.getElementById('mission-progress-bar');
    if (progressBar) {
        progressBar.style.width = `${Math.min(100, progress)}%`;
    }

    if (playerData.currentMission > 1) {
        mission2Button.textContent = '2. The Rookie Contract (READY)';
        mission2Button.disabled = false;
    } else {
        mission2Button.textContent = '2. The Rookie Contract (LOCKED)';
        mission2Button.disabled = true;
    }
}

function init3DEnvironment() {
    // --- THREE.JS SETUP ---
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x333333); // Dark background for neon effect
    renderer.shadowMap.enabled = true;
    document.getElementById('game-container').appendChild(renderer.domElement);

    // --- CANNON.JS SETUP ---
    world = new CANNON.World();
    world.gravity.set(0, -9.82, 0);
    world.broadphase = new CANNON.NaiveBroadphase();
    world.solver.iterations = 10;

    // --- LIGHTING ---
    const ambient = new THREE.AmbientLight(0x404040, 10);
    scene.add(ambient);
    
    const spotLight = new THREE.SpotLight(0xffffff, 200, 100, Math.PI * 0.25, 0.5, 2);
    spotLight.position.set(0, 20, 0);
    spotLight.castShadow = true;
    spotLight.shadow.mapSize.width = 1024;
    spotLight.shadow.mapSize.height = 1024;
    spotLight.shadow.camera.near = 0.5;
    spotLight.shadow.camera.far = 50;
    scene.add(spotLight);

    // --- GROUND (CANNON & THREE) ---
    const groundShape = new CANNON.Plane();
    const groundBody = new CANNON.Body({ mass: 0, shape: groundShape });
    groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Rotate to horizontal
    world.addBody(groundBody);

    const groundMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(100, 100),
        new THREE.MeshStandardMaterial({ color: 0x228B22, side: THREE.DoubleSide })
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    // --- BACKBOARD & HOOP ---
    createBackboard(0, 3.0, -10);
    createHoop(0, 3.0, -10);

    // --- PLAYER CHARACTER (for reference/camera control) ---
    const playerShape = new CANNON.Sphere(0.5);
    playerBody = new CANNON.Body({ mass: PLAYER_MASS, shape: playerShape, position: new CANNON.Vec3(0, 0.5, 0) });
    world.addBody(playerBody);
    playerBody.linearDamping = 0.9;
    playerBody.angularDamping = 0.9;

    const playerMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.5, 16, 16),
        new THREE.MeshBasicMaterial({ color: 0x00ffff, wireframe: true, transparent: true, opacity: 0.3 })
    );
    scene.add(playerMesh);
    player = playerMesh;
    
    // --- BASKETBALL ---
    createBall();

    // --- CAMERA SETUP ---
    // Camera position relative to player (third-person view)
    camera.position.set(0, 3, 5); 
    
    // --- EVENT LISTENERS ---
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onKeyDown, false);
    document.addEventListener('keyup', onKeyUp, false);
    
    hideLoading();
    animate();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// --- 3D UTILITIES ---

function createBackboard(x, y, z) {
    // Backboard (Mesh)
    const backboardGeo = new THREE.BoxGeometry(2, 1.5, 0.1);
    const backboardMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, metalness: 0.8, roughness: 0.2 });
    const backboardMesh = new THREE.Mesh(backboardGeo, backboardMat);
    backboardMesh.position.set(x, y, z);
    backboardMesh.receiveShadow = true;
    backboardMesh.castShadow = true;
    scene.add(backboardMesh);

    // Backboard (Physics - Mass 0, static)
    const backboardShape = new CANNON.Box(new CANNON.Vec3(1, 0.75, 0.05));
    const backboardBody = new CANNON.Body({ mass: 0, shape: backboardShape, position: new CANNON.Vec3(x, y, z) });
    world.addBody(backboardBody);

    // Backboard Pole
    const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 8, 8);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    const poleMesh = new THREE.Mesh(poleGeo, poleMat);
    poleMesh.position.set(x, y - 4.0, z);
    poleMesh.receiveShadow = true;
    poleMesh.castShadow = true;
    scene.add(poleMesh);
}

function createHoop(x, y, z) {
    // Rim (Mesh)
    const rimGeo = new THREE.TorusGeometry(0.4, 0.05, 8, 32);
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xff4500 }); // Orange rim
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.rotation.x = Math.PI / 2;
    rimMesh.position.set(x, y - 0.5, z + 0.5);
    rimMesh.castShadow = true;
    scene.add(rimMesh);

    // Rim (Physics - Static Cylinder for collision)
    const rimShape = new CANNON.Cylinder(0.4, 0.4, 0.1, 16);
    const rimBody = new CANNON.Body({ mass: 0, shape: rimShape, position: new CANNON.Vec3(x, y - 0.5, z + 0.5) });
    rimBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2);
    world.addBody(rimBody);
    
    // Score sensor (Invisible Plane beneath the rim)
    const sensorShape = new CANNON.Box(new CANNON.Vec3(0.5, 0.01, 0.5));
    const sensorBody = new CANNON.Body({ mass: 0, shape: sensorShape, position: new CANNON.Vec3(x, y - 0.6, z + 0.5) });
    sensorBody.collisionResponse = false; // Doesn't affect ball physics
    world.addBody(sensorBody);

    // Set up collision event listener for scoring
    sensorBody.addEventListener('collide', (event) => {
        if (event.body === basketballBody) {
            handleScore();
        }
    });
}

function createBall() {
    // Basketball (Mesh)
    const ballRadius = 0.25;
    const ballGeo = new THREE.SphereGeometry(ballRadius, 32, 32);
    const ballMat = new THREE.MeshStandardMaterial({ color: 0xff8c00, roughness: 0.6, metalness: 0.1 });
    basketballMesh = new THREE.Mesh(ballGeo, ballMat);
    basketballMesh.castShadow = true;
    scene.add(basketballMesh);

    // Basketball (Physics)
    const ballShape = new CANNON.Sphere(ballRadius);
    basketballBody = new CANNON.Body({ 
        mass: 1, 
        shape: ballShape, 
        position: new CANNON.Vec3(0, 1, 5), // Initial position away from hoop
        material: new CANNON.Material("ballMaterial")
    });
    world.addBody(basketballBody);
    
    // Add some damping to prevent endless bouncing
    basketballBody.linearDamping = 0.1;
    basketballBody.angularDamping = 0.5;
}

function handleScore() {
    // Only score if the ball is currently moving through the hoop downwards
    const isMovingDown = basketballBody.velocity.y < -0.5;

    // This is a simple scoring mechanism. In a real game, you would use a more sophisticated method
    // (e.g., raycasting to detect movement direction and a flag to prevent multiple scores per shot)
    if (isMovingDown) {
        // Ensure the ball is not already marked as scored for this shot
        if (!basketballBody.userData || !basketballBody.userData.scored) {
            score += 2;
            basketballBody.userData = { scored: true }; // Mark the shot as scored
            updateScoreDisplays();
            showModal('SWISH! +2 Points!', 'neon-text-blue');
        }
    }
}

// --- INPUT HANDLING ---

function onKeyDown(event) {
    // Check if the game screen is active before processing inputs
    if (document.getElementById('quick-play-game-screen').classList.contains('hidden')) return;
    
    switch (event.code) {
        case 'KeyW': inputState.forward = true; break;
        case 'KeyS': inputState.backward = true; break;
        case 'KeyA': inputState.left = true; break;
        case 'KeyD': inputState.right = true; break;
        case 'Space': 
            if (canShoot) {
                inputState.shoot = true;
                shootBall();
            }
            break;
    }
}

function onKeyUp(event) {
     // Check if the game screen is active before processing inputs
     if (document.getElementById('quick-play-game-screen').classList.contains('hidden')) return;

    switch (event.code) {
        case 'KeyW': inputState.forward = false; break;
        case 'KeyS': inputState.backward = false; break;
        case 'KeyA': inputState.left = false; break;
        case 'KeyD': inputState.right = false; break;
        case 'Space': inputState.shoot = false; break;
    }
}

function shootBall() {
    if (!canShoot || !playerBody || !basketballBody) return;
    canShoot = false;
    
    shotsFired++;
    updateScoreDisplays();

    // Reset the 'scored' flag for the new shot
    basketballBody.userData = { scored: false }; 

    // Calculate shot direction (from player to hoop)
    const playerPos = playerBody.position;
    const hoopPos = new CANNON.Vec3(0, 3.0, -10); // Hoop center
    
    // Direction vector
    let direction = new CANNON.Vec3();
    hoopPos.vsub(playerPos, direction);
    direction.normalize();
    
    // Add a vertical component for the arc
    const shotDirection = new CANNON.Vec3(direction.x, direction.y + 0.5, direction.z);
    shotDirection.normalize();

    // Reset ball position to player's hands (a point in front of the player)
    const ballInitialPos = new CANNON.Vec3(
        playerPos.x + shotDirection.x * 0.5,
        playerPos.y + 1.5,
        playerPos.z + shotDirection.z * 0.5
    );

    // Stop the ball and reset its state before shooting
    basketballBody.velocity.set(0, 0, 0);
    basketballBody.angularVelocity.set(0, 0, 0);
    basketballBody.position.copy(ballInitialPos);
    
    // Apply impulse (force)
    basketballBody.applyImpulse(
        shotDirection.scale(SHOT_FORCE + (playerData.overallRating / 20)), // Scale force by player rating
        basketballBody.position
    );
    
    // Re-enable shooting after a short cooldown
    setTimeout(() => {
        canShoot = true;
    }, 1500); // 1.5 second cooldown
}

// --- GAME LOOP ---

let lastTime = performance.now();
const timeStep = 1 / 60;

function animate(time) {
    requestAnimationFrame(animate);

    // Only run physics and game logic if the Quick Play screen is active
    if (document.getElementById('quick-play-game-screen') && 
        document.getElementById('quick-play-game-screen').classList.contains('hidden')) {
        if (renderer) renderer.render(scene, camera);
        return;
    }
    
    if (!playerBody || !basketballBody || !world || !renderer || !camera) {
        // Do nothing until 3D environment is initialized
        return;
    }

    const deltaTime = (time - lastTime) / 1000;
    lastTime = time;

    // Step the physics world
    world.step(timeStep, deltaTime, 3);
    
    // --- MOVEMENT LOGIC (CANNON) ---
    
    // Player movement direction
    let moveVector = new THREE.Vector3(0, 0, 0);
    if (inputState.forward) moveVector.z -= 1;
    if (inputState.backward) moveVector.z += 1;
    if (inputState.left) moveVector.x -= 1;
    if (inputState.right) moveVector.x += 1;
    moveVector.normalize();
    
    // Apply movement force
    const currentVelocity = playerBody.velocity;
    
    // Calculate desired velocity
    const desiredVelocity = new CANNON.Vec3(
        moveVector.x * PLAYER_SPEED,
        currentVelocity.y, // Maintain gravity effect
        moveVector.z * PLAYER_SPEED
    );
    
    // Calculate force required to achieve desired velocity (simple approximation)
    let force = new CANNON.Vec3();
    desiredVelocity.vsub(currentVelocity, force);
    force.scale(playerBody.mass * 10, force); // Apply scaling force

    // Clear horizontal velocity before applying new force to prevent "sliding"
    playerBody.velocity.x *= 0.8;
    playerBody.velocity.z *= 0.8;

    playerBody.applyForce(force, playerBody.position);

    // --- RENDER UPDATES (THREE) ---

    // 1. Update Player Mesh position (if visualized)
    player.position.copy(playerBody.position);
    player.quaternion.copy(playerBody.quaternion);

    // 2. Update Basketball Mesh position
    basketballMesh.position.copy(basketballBody.position);
    basketballMesh.quaternion.copy(basketballBody.quaternion);
    
    // 3. Update Camera position (follow the player)
    camera.position.x = player.position.x;
    camera.position.z = player.position.z + 5;
    camera.position.y = player.position.y + 3;
    
    // Camera looks slightly forward, towards the hoop
    camera.lookAt(0, 2.5, -10); 

    // Check if ball is out of bounds (too far away)
    if (basketballBody.position.length() > 50) {
        resetBallPosition();
    }

    renderer.render(scene, camera);
}

function resetBallPosition() {
    if (!basketballBody || !playerBody) return; // Safety check
    // Reset ball to player's position
    basketballBody.velocity.set(0, 0, 0);
    basketballBody.angularVelocity.set(0, 0, 0);
    basketballBody.position.set(playerBody.position.x, playerBody.position.y + 1, playerBody.position.z);
    basketballBody.userData = { scored: false };
    canShoot = true; // Allow shooting immediately after reset
}

// --- UI & GAME FLOW FUNCTIONS ---

window.showScreen = function (id) {
    const screens = ['main-menu-container', 'quick-play-game-screen', 'my-hub-screen', 'my-stats-screen', 'missions-screen', 'options-screen', 'quit-screen', 'mission-1-screen', 'mission-2-screen'];
    screens.forEach(screenId => {
        const element = document.getElementById(screenId);
        if (element) {
            // Quick Play is the only screen that needs to be an 'overlay' 
            // and allow clicks to pass through if not interactive.
            if (screenId === 'quick-play-game-screen') {
                element.classList.toggle('hidden', screenId !== id);
                // Stop the meter animation if a menu other than the quick play screen is showing
                if (screenId !== id) stopMeter(true);
                
            } else {
                // All other screens are modal menus
                element.classList.toggle('hidden', screenId !== id);
            }
        }
    });
}

window.showMainMenu = function () {
    showScreen('main-menu-container');
}

window.quickPlay = function () {
    showScreen('quick-play-game-screen');
    // Reset game state for a new quick play session
    resetGame(false); 
}

window.resetGame = function (shouldShowModal) {
    // Check and update High Score upon ending the previous game
    if (score > playerData.highScore) {
        playerData.highScore = score;
        savePlayerData();
    }

    score = 0;
    shotsFired = 0;
    updateScoreDisplays();
    resetBallPosition();
    
    if (playerBody) {
        // Reset player position closer to the action
        playerBody.position.set(0, 0.5, 5); 
        playerBody.velocity.set(0, 0, 0);
        playerBody.angularVelocity.set(0, 0, 0);
    }

    if (shouldShowModal) showModal('Quick Play Reset!', 'neon-text-blue');
}

window.loadMyHub = function () {
    showScreen('my-hub-screen');
    document.getElementById('player-id-display').textContent = userId;
}

window.loadMyStats = function () {
    showScreen('my-stats-screen');
    // Data is updated via the Firestore listener
}

window.loadMissions = function () {
    showScreen('missions-screen');
    updateMissionUI();
}

window.loadOptions = function () {
    showScreen('options-screen');
}

window.quitGame = function () {
    showScreen('quit-screen');
}

// --- MISSION 1 LOGIC (Meter Challenge) ---

window.startMission = function (missionId) {
    if (missionId === 1) {
        showScreen('mission-1-screen');
        const feedbackEl = document.getElementById('mission-feedback');
        if (feedbackEl) feedbackEl.textContent = '';
        meterValue = 0;
        meterDirection = 1;
        const pointerEl = document.getElementById('meter-pointer');
        if (pointerEl) pointerEl.style.left = '0%';
        
        // Start or restart the meter animation
        if (mission1Interval) clearInterval(mission1Interval);
        mission1Interval = setInterval(updateMeter, 10); // 10ms update rate
    } else if (missionId === 2) {
        if (playerData.currentMission > 1) {
            showScreen('mission-2-screen');
        } else {
            showModal('Mission 2 is locked! Complete Mission 1 first.', 'neon-text-pink');
        }
    }
}

function updateMeter() {
    const displayEl = document.getElementById('meter-display');
    const pointerEl = document.getElementById('meter-pointer');
    if (!displayEl || !pointerEl) return;
    
    meterValue += meterDirection * 1; // Speed of meter
    
    if (meterValue >= 100) {
        meterDirection = -1;
        meterValue = 100;
    } else if (meterValue <= 0) {
        meterDirection = 1;
        meterValue = 0;
    }

    displayEl.textContent = Math.round(meterValue);
    pointerEl.style.left = `${meterValue}%`;
}

window.stopMeter = function () {
    if (!mission1Interval) return;
    clearInterval(mission1Interval);
    mission1Interval = null;
    
    const feedbackEl = document.getElementById('mission-feedback');
    if (!feedbackEl) return;
    
    // Sweet spot: 80% to 90% (inclusive)
    if (meterValue >= 80 && meterValue <= 90) {
        feedbackEl.textContent = 'PERFECT SHOT! Mission Complete!';
        feedbackEl.className = 'text-xl font-bold mt-4 neon-text-blue';
        completeMission(1);
    } else if (meterValue > 70 && meterValue < 95) {
         feedbackEl.textContent = 'Good Shot. Close, but no cigar. Try again.';
         feedbackEl.className = 'text-xl font-bold mt-4 text-yellow-500';
    } else {
        feedbackEl.textContent = 'Off Target. Practice makes perfect.';
        feedbackEl.className = 'text-xl font-bold mt-4 neon-text-pink';
    }
}

function completeMission(missionId) {
    if (playerData.missions[missionId] && !playerData.missions[missionId].completed) {
        playerData.missions[missionId].completed = true;
        // Ensure bonus value is calculated before increasing overallRating
        const bonus = playerData.missions[missionId].ratingBonus; 
        
        playerData.overallRating += bonus;
        playerData.currentMission = missionId + 1; // Unlock next mission
        savePlayerData();
        showModal(`Mission ${missionId} Completed! Overall Rating increased by ${bonus} to ${playerData.overallRating}!`, 'neon-text-blue');
    }
}

window.completeMission2 = function (option) {
    if (playerData.missions[2].completed) {
        showModal("Mission 2 is already complete!", 'text-yellow-500');
        loadMissions();
        return;
    }

    const bonus = option === 1 ? 5 : 1;
    playerData.missions[2].ratingBonus = bonus;
    
    // This is just a simulated choice; completion is handled the same way
    completeMission(2);
    showMainMenu();
}

// --- UTILITIES ---

function hideLoading() {
    isLoading = false;
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.opacity = '0';
        // Give time for opacity transition before hiding
        setTimeout(() => loadingOverlay.classList.add('hidden'), 300);
    }
}

function showModal(message, styleClass = 'neon-text-pink') {
    const modalEl = document.getElementById('message-modal');
    const boxEl = document.getElementById('message-box');
    const textEl = document.getElementById('modal-text');

    if (!modalEl || !boxEl || !textEl) return;

    textEl.textContent = message;
    textEl.className = `text-xl font-bold ${styleClass}`;
    boxEl.style.animation = 'pulse 1s infinite alternate';
    
    modalEl.classList.remove('hidden');
    modalEl.onclick = () => {
        modalEl.classList.add('hidden');
        boxEl.style.animation = 'none';
        modalEl.onclick = null;
    };

    // Auto-hide after 3 seconds if not clicked
    setTimeout(() => {
        if (!modalEl.classList.contains('hidden')) {
            modalEl.classList.add('hidden');
            boxEl.style.animation = 'none';
            modalEl.onclick = null;
        }
    }, 3000);
}

// --- START APP ---
window.onload = function () {
    // First, initialize Firebase and authentication
    initFirebase();
    // init3DEnvironment will be called after Firestore data is loaded
}
