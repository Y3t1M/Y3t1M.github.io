document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Could not get 2D context');
        return;
    }

    // Set canvas dimensions explicitly
    canvas.width = 1000;
    canvas.height = 400;
    
    // Preload floor image
    const floorImg = new Image();
    floorImg.onload = function() {
        console.log('Floor image loaded successfully');
    };
    floorImg.onerror = function() {
        console.error('Error loading floor image');
    };
    floorImg.src = 'assets/img/new_floor.png';

    // Game state
    let gameStarted = false;
    let gameOver = false;
    let score = 0;
    // let highScore = parseInt(localStorage.getItem('dinoHighScore')) || 0; // Removed high score
    let level = 1; // Added level tracking
    let imagesLoaded = false;
    let loadingError = false;
    
    // Game objects
    const dino = {
        x: 50,
        y: canvas.height - 70, // Adjusted y-position for larger height
        width: 100, // Increased width from 80 to 100
        height: 100, // Increased height from 80 to 100
        hitboxWidth: 40, // Reduced from 60 to 40
        hitboxHeight: 40, // Reduced from 60 to 40
        hitboxOffsetX: 30, // Adjusted to center the smaller hitbox
        hitboxOffsetY: 30, // Adjusted to center the smaller hitbox
        velocityY: 0,
        jumping: false
    };
    
    let obstacles = [];
    const GRAVITY = 0.4; // Reduced from 0.6 to make falling slower
    const JUMP_FORCE = -15; // Adjusted jump force for larger dino
    const GROUND_HEIGHT = 70; // Increased from 50 to accommodate larger dino
    
    // Define minimum spacing between obstacles
    const MIN_OBSTACLE_SPACING = 250; // Increased from 200 to prevent overlap with larger obstacles
    
    // Load images
    const dinoImg = new Image();
    const cactusImg = new Image();
    const firewallImg = new Image();
    const backgroundImg = new Image();
    // const floorImg = new Image(); // Updated floor image
    let loadedImages = 0;
    const totalImages = 5; // Updated total images to include new floor
    
    function loadImages() {
    function handleImageLoad() {
    loadedImages++;
    console.log('Loaded image:', loadedImages);
    if (loadedImages === totalImages) {
    imagesLoaded = true;
    draw(); // Initial draw once images are loaded
    }
    }
    
    function handleImageError(e) {
    console.error('Error loading image:', e.target.src);
    loadingError = true;
    draw(); // Show error message
    }
    
    // Create backup images if the detailed ones fail to load
    const backupDino = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const backupCactus = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const backupFirewall = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const backupBackground = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    dinoImg.onload = handleImageLoad;
    dinoImg.onerror = (e) => {
    console.warn('Using backup dino image');
    dinoImg.src = backupDino;
    };
    
    cactusImg.onload = handleImageLoad;
    cactusImg.onerror = (e) => {
    console.warn('Using backup cactus image');
    cactusImg.src = backupCactus;
    };
    
    firewallImg.onload = handleImageLoad;
    firewallImg.onerror = (e) => {
    console.warn('Using backup firewall image');
    firewallImg.src = backupFirewall;
    };
    
    backgroundImg.onload = handleImageLoad;
    backgroundImg.onerror = (e) => {
    console.warn('Using backup background image');
    backgroundImg.src = backupBackground;
    };
    
    floorImg.onload = handleImageLoad; // Added load handler for floor
    floorImg.onerror = (e) => {
    console.warn('Using backup floor image');
    floorImg.src = 'assets/img/new_floor.png'; // Ensure only the primary floor image is loaded
    };
    
    // Set image sources after setting up handlers
    try {
 
                dinoImg.src = 'assets/img/dino.png'; // Removed './'
                cactusImg.src = 'assets/img/cactus.png'; // Removed './'
                firewallImg.src = 'assets/img/firewall.jpg';
                backgroundImg.src = 'assets/img/background.jpg';
                floorImg.src = 'assets/img/new_floor.png'; // Updated floor image source
    } catch (error) {
    console.error('Error setting image sources:', error);
    }
    }
    
    // Draw loading screen or error message
    function drawLoadingScreen() {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000000';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'center';
    
    if (loadingError) {
    ctx.fillText('Error loading game assets!', canvas.width / 2, canvas.height / 2);
    ctx.fillText('Please check console for details', canvas.width / 2, canvas.height / 2 + 40);
    } else {
    ctx.fillText('Loading...', canvas.width / 2, canvas.height / 2);
    }
    ctx.textAlign = 'left';
    }
    
    // Modified draw function
    function draw() {
    if (!imagesLoaded) {
    drawLoadingScreen();
    return;
    }
    
    // Clear canvas with dark grey background
    ctx.fillStyle = '#151617';  // Dark grey background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw background image
    if (backgroundImg.complete && backgroundImg.naturalHeight !== 0) {
        ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height - GROUND_HEIGHT);
    } else {
        // Fallback if background image fails
        ctx.fillStyle = '#e0e0e0';
        ctx.fillRect(0, 0, canvas.width, canvas.height - GROUND_HEIGHT);
    }

    // Draw floor image - stretch to fit
    if (floorImg.complete && floorImg.naturalHeight !== 0) {
        ctx.drawImage(floorImg, 0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    } else {
        // Fallback rectangle if floor image fails
        ctx.fillStyle = '#a0a0a0';  // Darker grey for ground
        ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    }
    
    // Draw dino (with error handling)
    if (dinoImg.complete && dinoImg.naturalHeight !== 0) {
    ctx.drawImage(dinoImg, dino.x, dino.y, dino.width, dino.height);
    } else {
    // Fallback rectangle if image fails
    ctx.fillStyle = '#000000';
    ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
    }
    
    // Draw obstacles
    obstacles.forEach(obstacle => {
    const obstacleImg = obstacle.type === 'firewall' ? firewallImg : cactusImg;
    if (obstacleImg.complete && obstacleImg.naturalHeight !== 0) {
    ctx.drawImage(obstacleImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    } else {
    // Fallback rectangle if image fails
    ctx.fillStyle = '#000000';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }
    });
    
    // Draw score
    ctx.fillStyle = '#000000';
    ctx.font = '20px "Press Start 2P"';
    
    if (!gameStarted) {
        // ctx.fillText(`High Score: ${Math.floor(highScore)}`, canvas.width / 2, 50); // Removed high score
        ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2);
    } else {
        ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);
    }
    
    if (gameOver) {
        // ctx.fillText(`High Score: ${Math.floor(highScore)}`, canvas.width / 2, canvas.height / 2 + 80); // Removed high score
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
        ctx.fillText(`Your Score: ${Math.floor(score)}`, canvas.width / 2, canvas.height / 2 + 40);
    }
    
    ctx.textAlign = 'left';
    }
    
    // Update game state with dynamic enemy spawning
    function update() {
    if (!gameStarted || gameOver) return;
    
    // Update score
    score += 0.02;
    
    // Increase level every 100 points
    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel > level) {
        level = newLevel;
        // Increase obstacle speed
        obstacleSpeed += 1; // Define and initialize obstacleSpeed
        // Decrease spawn interval
        spawnInterval = Math.max(0.001, spawnInterval - 0.0005); // Prevent spawnInterval from becoming too low
        // Determine number of obstacles to spawn per interval based on level
        obstaclesPerSpawn = Math.min(level, 5); // Cap the number of obstacles per spawn to 5
    }
    
    // Update dino position with gravity
    dino.velocityY += GRAVITY;
    dino.y += dino.velocityY;
    
    // Ground collision
    if (dino.y > canvas.height - GROUND_HEIGHT - dino.height) {
    dino.y = canvas.height - GROUND_HEIGHT - dino.height;
    dino.velocityY = 0;
    dino.jumping = false;
    }
    
    // Spawn obstacles based on dynamic spawnInterval
    if (Math.random() < spawnInterval) {
        // Check spacing to prevent overlapping
        const lastObstacle = obstacles[obstacles.length - 1];
        if (!lastObstacle || lastObstacle.x < canvas.width - MIN_OBSTACLE_SPACING) {
            for (let i = 0; i < obstaclesPerSpawn; i++) {
                const isFirewall = Math.random() < 0.3;
                obstacles.push({
                    x: canvas.width + i * 70, // Offset position for multiple obstacles
                    y: canvas.height - GROUND_HEIGHT - (isFirewall ? 80 : 60), // Increased height for larger obstacles
                    width: isFirewall ? 80 : 60, // Increased width for enemies
                    height: isFirewall ? 80 : 60, // Increased height for enemies
                    type: isFirewall ? 'firewall' : 'cactus'
                });
            }
        }
    }
    
    // Update obstacles
    obstacles.forEach((obstacle, index) => {
        obstacle.x -= obstacleSpeed; // Use dynamic obstacleSpeed
    
        // Remove off-screen obstacles
        if (obstacle.x + obstacle.width < 0) {
            obstacles.splice(index, 1);
        }
    
        // Collision detection
        if (collision(dino, obstacle)) {
            gameOver = true;
        }
    });
    }
    
    // Initialize obstacle speed and spawn interval
    let obstacleSpeed = 3; // Starting obstacle speed
    let spawnInterval = 0.002; // Starting spawn probability
    let obstaclesPerSpawn = 1; // Starting with one obstacle per spawn
    
    // Collision detection
    function collision(dino, obstacle) {
    // Use hitbox dimensions for collision
    return (dino.x + dino.hitboxOffsetX) < (obstacle.x + obstacle.width) &&
           (dino.x + dino.hitboxOffsetX + dino.hitboxWidth) > obstacle.x &&
           (dino.y + dino.hitboxOffsetY) < (obstacle.y + obstacle.height) &&
           (dino.y + dino.hitboxOffsetY + dino.hitboxHeight) > obstacle.y;
    }
    
    // Game loop
    function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
    }
    
    // Reset game function
    function resetGame() {
        gameOver = false;
        score = 0;
        level = 1;
        obstacleSpeed = 3;
        spawnInterval = 0.002;
        obstaclesPerSpawn = 1; // Reset obstaclesPerSpawn
        obstacles = [];
        dino.y = canvas.height - GROUND_HEIGHT - dino.height;
        dino.velocityY = 0;
        // Reset floor position if necessary
    }
    
    // Controls
    document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
    event.preventDefault();
    if (!gameStarted) {
    gameStarted = true;
    } else if (gameOver) {
    resetGame(); // Use resetGame to reset parameters
    } else if (!dino.jumping) {
    dino.velocityY = JUMP_FORCE;
    dino.jumping = true;
    }
    }
    });
    
    // Mouse/touch controls
    canvas.addEventListener('click', function() {
    if (!gameStarted) {
    gameStarted = true;
    } else if (gameOver) {
    resetGame(); // Use resetGame to reset parameters
    } else if (!dino.jumping) {
    dino.velocityY = JUMP_FORCE;
    dino.jumping = true;
    }
    });
    
    // Update jump instruction text styling
    const instructions = document.querySelector('.game-instructions');
    if (instructions) {
        instructions.style.color = '#ffffff'; // White text
        instructions.style.fontFamily = "'Press Start 2P', cursive"; // 'Press Start 2P' font
    }

    // Start loading images
    loadImages();
    
    // Start game loop
    gameLoop();
    });
// Ensure the game functions correctly on the Projects page