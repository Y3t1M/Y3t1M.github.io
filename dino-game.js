document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    
    // Set fixed canvas size
    canvas.width = 800;
    canvas.height = 300;
    
    // Game state
    let gameStarted = false;
    let gameOver = false;
    let score = 0;
    let highScore = parseInt(localStorage.getItem('dinoHighScore')) || 0;
    let imagesLoaded = false;
    let loadingError = false;
    
    // Game objects
    const dino = {
    x: 50,
    y: canvas.height - 60,
    width: 50,
    height: 50,
    velocityY: 0,
    jumping: false
    };
    
    let obstacles = [];
    const GRAVITY = 0.4; // Reduced from 0.6 to make falling slower
    const JUMP_FORCE = -12; // Changed from -15 to make jump less high
    const GROUND_HEIGHT = 50;
    
    // Define minimum spacing between obstacles
    const MIN_OBSTACLE_SPACING = 200; // Minimum pixels between obstacles
    
    // Load images
    const dinoImg = new Image();
    const cactusImg = new Image();
    const firewallImg = new Image();
    const backgroundImg = new Image();
    let loadedImages = 0;
    const totalImages = 4;
    
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
    
    // Set image sources after setting up handlers
    try {
 
                dinoImg.src = 'assets/img/dino.png'; // Removed './'
                cactusImg.src = 'assets/img/cactus.png'; // Removed './'
                firewallImg.src = 'assets/img/firewall.jpg';
                backgroundImg.src = 'assets/img/background.jpg';
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
    
    // Draw ground (darker grey)
    ctx.fillStyle = '#a0a0a0';  // Darker grey for ground
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    
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
    ctx.fillText(`Score: ${Math.floor(score)}`, 20, 30);
    ctx.fillText(`High Score: ${Math.floor(highScore)}`, canvas.width - 240, 30);
    
    if (!gameStarted) {
    ctx.fillStyle = '#000000';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('Press SPACE to Start', canvas.width / 2, canvas.height / 2);
    ctx.textAlign = 'left';
    }
    
    if (gameOver) {
    ctx.fillStyle = '#000000';
    ctx.font = '40px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
    ctx.font = '20px "Press Start 2P"';
    ctx.fillText('Press SPACE to Restart', canvas.width / 2, canvas.height / 2 + 40);
    ctx.textAlign = 'left';
    }
    }
    
    // Update game state with slower speeds
    function update() {
    if (!gameStarted || gameOver) return;
    
    // Update score even more slowly
    score += 0.02;  // Reduced from 0.05
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('dinoHighScore', highScore);
    }
    
    // Update dino position with reduced gravity
    dino.velocityY += GRAVITY;  // Applied reduced gravity
    dino.y += dino.velocityY;
    
    // Ground collision
    if (dino.y > canvas.height - GROUND_HEIGHT - dino.height) {
    dino.y = canvas.height - GROUND_HEIGHT - dino.height;
    dino.velocityY = 0;
    dino.jumping = false;
    }
    
    // Spawn obstacles even less frequently
    if (Math.random() < 0.002) { // Changed from 0.005 to spawn enemies less frequently
        // Check spacing to prevent overlapping
        const lastObstacle = obstacles[obstacles.length - 1];
        if (!lastObstacle || lastObstacle.x < canvas.width - MIN_OBSTACLE_SPACING) {
            const isFirewall = Math.random() < 0.3; // 30% chance for firewall
            obstacles.push({
                x: canvas.width,
                y: canvas.height - GROUND_HEIGHT - (isFirewall ? 60 : 40),
                width: isFirewall ? 40 : 30,
                height: isFirewall ? 60 : 40,
                type: isFirewall ? 'firewall' : 'cactus'
            });
        }
    }
    
    // Update obstacles even more quickly
    obstacles.forEach((obstacle, index) => {
        obstacle.x -= 3; // Changed from 1 to 3 to move obstacles faster
    
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
    
    // Collision detection
    function collision(dino, obstacle) {
    return dino.x < obstacle.x + obstacle.width &&
    dino.x + dino.width > obstacle.x &&
    dino.y < obstacle.y + obstacle.height &&
    dino.y + dino.height > obstacle.y;
    }
    
    // Game loop
    function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
    }
    
    // Controls
    document.addEventListener('keydown', function(event) {
    if (event.code === 'Space') {
    event.preventDefault();
    if (!gameStarted) {
    gameStarted = true;
    } else if (gameOver) {
    // Reset game
    gameOver = false;
    score = 0;
    obstacles = [];
    dino.y = canvas.height - GROUND_HEIGHT - dino.height;
    dino.velocityY = 0;
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
    // Reset game
    gameOver = false;
    score = 0;
    obstacles = [];
    dino.y = canvas.height - GROUND_HEIGHT - dino.height;
    dino.velocityY = 0;
    } else if (!dino.jumping) {
    dino.velocityY = JUMP_FORCE;
    dino.jumping = true;
    }
    });
    
    // Start loading images
    loadImages();
    
    // Start game loop
    gameLoop();
    });