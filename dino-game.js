// Completely rewritten Dino Game Implementation

document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // Set canvas dimensions
    canvas.width = 800;
    canvas.height = 300;

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
    let obstacleTimer = 0;
    let obstacleInterval = 90; // frames
    let score = 0;
    let gameOver = false;

    // Ground properties
    const groundHeight = 5;

    // Preload Images
    const dinoImage = new Image();
    dinoImage.src = 'assets/img/dino.png';

    const cactusImage = new Image();
    cactusImage.src = 'assets/img/cactus.png';

    const birdImage = new Image(); // New enemy image
    birdImage.src = 'assets/img/bird.png';

    // Obstacle class
    class Obstacle {
        constructor() {
            this.type = Math.random() < 0.7 ? 'cactus' : 'bird'; // 70% cactus, 30% bird
            if (this.type === 'cactus') {
                this.width = 30 + Math.random() * 20; // Increased width
                this.height = 20 + Math.random() * 50;
                this.y = canvas.height - this.height - groundHeight;
            } else if (this.type === 'bird') {
                this.width = 40;
                this.height = 30;
                this.y = canvas.height - this.height - groundHeight - 50; // Flying height
            }
            this.x = canvas.width;
            this.speed = 6;
        }

        update() {
            this.x -= this.speed;
        }

        draw() {
            if (this.type === 'cactus') {
                ctx.drawImage(cactusImage, this.x, this.y, this.width, this.height);
            } else if (this.type === 'bird') {
                ctx.drawImage(birdImage, this.x, this.y, this.width, this.height);
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
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            player.jump();
        }
    });

    // Restart game on click if game over
    canvas.addEventListener('click', function() {
        if (gameOver) {
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

        // Draw ground
        ctx.fillStyle = '#555';
        ctx.fillRect(0, canvas.height - groundHeight, canvas.width, groundHeight);

        // Update and draw player
        player.update();
        player.draw();

        // Handle obstacles
        obstacleTimer++;
        if (obstacleTimer >= obstacleInterval) {
            obstacles.push(new Obstacle());
            obstacleTimer = 0;
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
                score++;
            }
        });

        // Draw score
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText('Score: ' + score, 10, 30);

        requestAnimationFrame(loop);
    }

    // Start the game loop
    loop();
});
