// Completely rewritten Dino Game Implementation

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size based on container width
    function resizeCanvas() {
        canvas.width = Math.min(800, canvas.parentElement.offsetWidth - 40);
        canvas.height = 300;
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Game variables
    let dino = {
        x: 50,
        y: canvas.height - 60, // 60 is the combined height of Dino and ground
        width: 40,
        height: 40,
        vy: 0,
        gravity: 1.5,
        jumpStrength: -20,
        grounded: true
    };

    let obstacles = [];
    let score = 0;
    let gameOver = false;
    let gameSpeed = 5;
    let lastObstacleTime = 0;

    // Ground properties
    const groundHeight = 5;

    // Preload Images
    const dinoImage = new Image();
    dinoImage.src = 'assets/img/dino.png';

    const cactusImage = new Image();
    cactusImage.src = 'assets/img/cactus.png';

    const birdImage = new Image(); // New enemy image
    birdImage.src = 'assets/img/bird.png';

    const newEnemyImage = new Image(); // New enemy image
    newEnemyImage.src = 'assets/img/new_enemy.png'; // Replace with actual image path

    // Add floor image
    const floorImage = new Image();
    floorImage.src = 'assets/img/floor.png';

    // Obstacle class
    class Obstacle {
        constructor() {
            this.type = Math.random() < 0.33 ? 'cactus' : (Math.random() < 0.5 ? 'bird' : 'newEnemy'); // 1/3 each

            this.width = 40; // Fixed width for all enemies
            this.height = 40; // Fixed height for all enemies

            if (this.type === 'cactus') {
                this.y = canvas.height - this.height - groundHeight;
            } else if (this.type === 'bird') {
                this.y = canvas.height - this.height - groundHeight - 50; // Flying height
            } else if (this.type === 'newEnemy') {
                this.y = canvas.height - this.height - groundHeight - 50; // Adjust as needed
            }

            this.x = canvas.width;
            this.speed = 4; // Reduced speed from 6 to 4 to slow down the game
        }

        update() {
            this.x -= this.speed;
        }

        draw() {
            if (this.type === 'cactus') {
                ctx.drawImage(cactusImage, this.x, this.y, this.width, this.height);
            } else if (this.type === 'bird') {
                ctx.drawImage(birdImage, this.x, this.y, this.width, this.height);
            } else if (this.type === 'newEnemy') {
                ctx.drawImage(newEnemyImage, this.x, this.y, this.width, this.height);
            }
        }
    }

    // Dino class
    class Dino {
        constructor() {
            this.x = dino.x;
            this.y = dino.y;
            this.width = dino.width;
            this.height = dino.height;
            this.vy = dino.vy;
            this.gravity = dino.gravity;
            this.jumpStrength = dino.jumpStrength;
            this.grounded = dino.grounded;
        }

        update() {
            this.vy += this.gravity;
            this.y += this.vy;

            if (this.y + this.height >= canvas.height - groundHeight) {
                this.y = canvas.height - this.height - groundHeight;
                this.vy = 0;
                this.grounded = true;
            }
        }

        jump() {
            if (this.grounded) {
                this.vy = this.jumpStrength;
                this.grounded = false;
            }
        }

        draw() {
            ctx.drawImage(dinoImage, this.x, this.y, this.width, this.height);
        }

        reset() {
            this.y = canvas.height - this.height - groundHeight;
            this.vy = 0;
            this.grounded = true;
        }
    }

    const player = new Dino();

    // Handle key press for jumping
    document.addEventListener('keydown', function(e) {
        if ((e.code === 'Space' || e.code === 'ArrowUp') && !gameOver) {
            player.jump();
            e.preventDefault();
        }
        if (e.code === 'Space' && gameOver) {
            resetGame();
            e.preventDefault();
        }
    });

    // Restart game on click if game over
    canvas.addEventListener('click', function() {
        if (!gameOver) {
            player.jump();
        } else {
            resetGame();
        }
    });

    // Collision detection between two rectangles
    function checkCollision(rect1, rect2) {
        return (
            rect1.x < rect2.x + rect2.width &&
            rect1.x + rect1.width > rect2.x &&
            rect1.y < rect2.y + rect2.height &&
            rect1.y + rect1.height > rect2.y
        );
    }

    // Reset game variables
    function resetGame() {
        obstacles = [];
        obstacleTimer = 0;
        score = 0;
        gameOver = false;
        player.reset();
        requestAnimationFrame(loop);
    }

    // Game loop
    function loop() {
        if (gameOver) {
            ctx.fillStyle = 'black';
            ctx.font = '40px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2 - 20);
            ctx.fillText('Score: ' + score, canvas.width / 2, canvas.height / 2 + 30);
            return;
        }

        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw repeating floor
        const floorPattern = ctx.createPattern(floorImage, 'repeat-x');
        ctx.fillStyle = floorPattern;
        ctx.save();
        ctx.translate(-performance.now() / 50 % floorImage.width, 0); // Scroll effect
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width + floorImage.width, groundHeight);
        ctx.restore();

        // Draw ground
        ctx.fillStyle = '#555';
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

        // Update and draw player
        player.update();
        player.draw();

        // Handle obstacles
        const now = performance.now();
        if (now - lastObstacleTime > 1500) {
            obstacles.push(new Obstacle());
            lastObstacleTime = now;
        }

        obstacles.forEach((obs, index) => {
            obs.update();
            obs.draw();

            // Check collision with Dino
            if (checkCollision(player, obs)) {
                gameOver = true;
            }

            // Remove off-screen obstacles and update score
            if (obs.x + obs.width < 0) {
                obstacles.splice(index, 1);
                score += 10;
                if (score % 100 === 0) {
                    gameSpeed += 0.5;
                }
            }
        });

        // Draw score
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText('Score: ' + Math.floor(score), 10, 30);

        requestAnimationFrame(loop);
    }

    // Start the game loop
    loop();
});
