document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions
    canvas.width = 1000;
    canvas.height = 400;

    // Game state
    let gameStarted = false;
    let gameOver = false;
    let score = 0;

    // Game objects
    const dino = {
        x: 50,
        y: canvas.height - 70,
        width: 60,
        height: 60,
        velocityY: 0,
        jumping: false
    };

    let obstacles = [];
    const GRAVITY = 0.4;
    const JUMP_FORCE = -12;
    const GROUND_HEIGHT = 50;

    // Simplified game parameters
    let obstacleSpeed = 5;
    let spawnInterval = 50;
    let frameCount = 0;

    // Load images with correct paths
    const dinoImg = new Image();
    const cactusImg = new Image();
    const firewallImg = new Image();
    const floorImg = new Image();
    let loadedImages = 0;
    const totalImages = 4;
    
    function loadImages() {
        function handleImageLoad() {
            loadedImages++;
            console.log('Loaded image:', loadedImages);
            if (loadedImages === totalImages) {
                imagesLoaded = true;
                draw();
            }
        }
    
        function handleImageError(e) {
            console.error('Error loading image:', e.target.src);
            loadingError = true;
            draw();
        }

        // Set up image handlers
        dinoImg.onload = handleImageLoad;
        cactusImg.onload = handleImageLoad;
        firewallImg.onload = handleImageLoad;
        floorImg.onload = handleImageLoad;
        
        dinoImg.onerror = handleImageError;
        cactusImg.onerror = handleImageError;
        firewallImg.onerror = handleImageError;
        floorImg.onerror = handleImageError;
        
        // Set correct image paths
        dinoImg.src = 'assets/img/image (1).png';  // Update with your dino image number
        cactusImg.src = 'assets/img/image (2).png'; // Update with your cactus image number
        firewallImg.src = 'assets/img/image (3).png'; // Update with your firewall image number
        floorImg.src = 'assets/img/image (4).png'; // Update with your floor image number
    }

    // Create basic shapes instead of loading images
    function drawDino() {
        ctx.fillStyle = '#333';
        ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
    }

    function drawObstacle(obstacle) {
        ctx.fillStyle = '#f00';
        ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    }

    function drawGround() {
        ctx.fillStyle = '#666';
        ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    }

    function update() {
        if (!gameStarted || gameOver) return;

        // Update score
        score++;

        // Update dino
        dino.velocityY += GRAVITY;
        dino.y += dino.velocityY;

        // Ground collision
        if (dino.y > canvas.height - GROUND_HEIGHT - dino.height) {
            dino.y = canvas.height - GROUND_HEIGHT - dino.height;
            dino.velocityY = 0;
            dino.jumping = false;
        }

        // Spawn obstacles
        frameCount++;
        if (frameCount >= spawnInterval) {
            frameCount = 0;
            obstacles.push({
                x: canvas.width,
                y: canvas.height - GROUND_HEIGHT - 40,
                width: 30,
                height: 40
            });
        }

        // Update obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= obstacleSpeed;
            
            // Remove off-screen obstacles
            if (obstacles[i].x + obstacles[i].width < 0) {
                obstacles.splice(i, 1);
                continue;
            }

            // Collision detection
            if (collision(dino, obstacles[i])) {
                gameOver = true;
            }
        }
    }

    function draw() {
        // Clear canvas
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw ground
        drawGround();

        // Draw dino
        drawDino();

        // Draw obstacles
        obstacles.forEach(drawObstacle);

        // Draw score
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${Math.floor(score/10)}`, 20, 30);

        // Draw game messages
        if (!gameStarted) {
            ctx.textAlign = 'center';
            ctx.fillText('Press SPACE or Click to Start', canvas.width / 2, canvas.height / 2);
            ctx.textAlign = 'left';
        }

        if (gameOver) {
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER', canvas.width / 2, canvas.height / 2);
            ctx.fillText('Press SPACE or Click to Restart', canvas.width / 2, canvas.height / 2 + 30);
            ctx.textAlign = 'left';
        }
    }

    function collision(dino, obstacle) {
        return dino.x < obstacle.x + obstacle.width &&
               dino.x + dino.width > obstacle.x &&
               dino.y < obstacle.y + obstacle.height &&
               dino.y + dino.height > obstacle.y;
    }

    function resetGame() {
        gameOver = false;
        score = 0;
        obstacles = [];
        dino.y = canvas.height - GROUND_HEIGHT - dino.height;
        dino.velocityY = 0;
        frameCount = 0;
    }

    // Controls
    function handleInput() {
        if (!gameStarted) {
            gameStarted = true;
        } else if (gameOver) {
            resetGame();
        } else if (!dino.jumping) {
            dino.velocityY = JUMP_FORCE;
            dino.jumping = true;
        }
    }

    document.addEventListener('keydown', (event) => {
        if (event.code === 'Space') {
            event.preventDefault();
            handleInput();
        }
    });

    canvas.addEventListener('click', handleInput);

    // Start loading images
    loadImages();

    // Game loop
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    // Start game loop
    gameLoop();
});