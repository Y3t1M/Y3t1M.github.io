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
    let highScore = 0;
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
    const GRAVITY = 0.6;
    const JUMP_FORCE = -15;
    const GROUND_HEIGHT = 50;

    // Load images
    const dinoImg = new Image();
    const cactusImg = new Image();
    let loadedImages = 0;
    const totalImages = 2;

    function loadImages() {
        function handleImageLoad() {
            loadedImages++;
            if (loadedImages === totalImages) {
                imagesLoaded = true;
                draw(); // Initial draw once images are loaded
            }
        }

        function handleImageError() {
            loadingError = true;
            draw(); // Show error message
        }

        dinoImg.onload = handleImageLoad;
        dinoImg.onerror = handleImageError;
        cactusImg.onload = handleImageLoad;
        cactusImg.onerror = handleImageError;

        // Set image sources after setting up handlers
        dinoImg.src = 'assets/img/dino.png';
        cactusImg.src = 'assets/img/cactus.png';
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

        // Clear canvas
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw ground
        ctx.fillStyle = '#333333';
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
            if (cactusImg.complete && cactusImg.naturalHeight !== 0) {
                ctx.drawImage(cactusImg, obstacle.x, obstacle.y, obstacle.width, obstacle.height);
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

    // Update game state
    function update() {
        if (!gameStarted || gameOver) return;

        // Update score
        score += 0.1;
        if (score > highScore) highScore = score;

        // Update dino position
        dino.velocityY += GRAVITY;
        dino.y += dino.velocityY;

        // Ground collision
        if (dino.y > canvas.height - GROUND_HEIGHT - dino.height) {
            dino.y = canvas.height - GROUND_HEIGHT - dino.height;
            dino.velocityY = 0;
            dino.jumping = false;
        }

        // Spawn obstacles
        if (Math.random() < 0.02) {
            obstacles.push({
                x: canvas.width,
                y: canvas.height - GROUND_HEIGHT - 40,
                width: 30,
                height: 40
            });
        }

        // Update obstacles
        obstacles.forEach((obstacle, index) => {
            obstacle.x -= 5;
            
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
