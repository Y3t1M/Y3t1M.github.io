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
        y: canvas.height - 55 - 100, // Adjusted y-position for new floor height
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
    const GRAVITY = 0.6; // Increased gravity from 0.4 to 0.6
    const JUMP_FORCE = -12; // Decreased jump force from -15 to -12
    const GROUND_HEIGHT = 55; // Decreased from 70 to 55 to raise the floor by 15 pixels
    
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
    
    // Clear canvas with light grey background
    ctx.fillStyle = '#e0e0e0';  // Light grey background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Comment out the background image drawing to prevent any tint
    // ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height - GROUND_HEIGHT);

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
    score += 0.1; // Increased from 0.02 to make the score increment faster
    
    // Increase level every 100 points
    const newLevel = Math.floor(score / 100) + 1;
    if (newLevel > level) {
        level = newLevel;
        obstacleSpeed += 1; // Increase obstacle speed more significantly
        spawnInterval = Math.min(0.05, spawnInterval + 0.005); // Increase spawn probability up to a maximum
    }
    
    // Update dino position with gravity
    if (dino.jumping) {
        if (spacePressed && dino.velocityY < 0) {
            // While space is held and dino is moving upwards, apply reduced gravity
            dino.velocityY += GRAVITY / 2; // Reduced gravity for a higher jump
        } else {
            // Apply normal gravity
            dino.velocityY += GRAVITY;
        }
        dino.y += dino.velocityY;

        // Prevent dino from moving above the top of the canvas
        if (dino.y < 0) {
            dino.y = 0;
            dino.velocityY = 0;
        }
    }
    
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
        let spawnX = canvas.width;
        if (lastObstacle) {
            spawnX = Math.max(canvas.width, lastObstacle.x + lastObstacle.width + MIN_OBSTACLE_SPACING);
        }

        // Spawn a single obstacle
        const isFirewall = Math.random() < 0.3;
        obstacles.push({
            x: spawnX,
            y: canvas.height - GROUND_HEIGHT - (isFirewall ? 80 : 60), // Adjust based on new GROUND_HEIGHT
            width: isFirewall ? 80 : 60, // Increased width for enemies
            height: isFirewall ? 80 : 60, // Increased height for enemies
            type: isFirewall ? 'firewall' : 'cactus'
        });
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
    
    // Initialize obstacle speed and spawn interval with higher values
    let obstacleSpeed = 6; // Increased starting obstacle speed from 4 to 6
    let spawnInterval = 0.01; // Increased spawn probability from 0.005 to 0.01
    
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
        obstacleSpeed = 6; // Reset obstacle speed
        spawnInterval = 0.01; // Reset spawn interval
        obstacles = [];
        dino.y = canvas.height - GROUND_HEIGHT - dino.height;
        dino.velocityY = 0;
        // Reset floor position if necessary
    }
    
    // Variable to track if space is pressed
    let spacePressed = false;

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
    spacePressed = true;
    }
    });
    
    document.addEventListener('keyup', function(event) {
        if (event.code === 'Space') {
            event.preventDefault();
            spacePressed = false;
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