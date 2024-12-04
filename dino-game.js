// Simple Dino Game Implementation

document.addEventListener('DOMContentLoaded', function() {
  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');

  // Adjust canvas height for better visibility
  canvas.height = 300;

  // Game variables
  let dino = {
    x: 50,
    y: 150,
    width: 50,
    height: 50,
    vy: 0,
    gravity: 2,
    jumpStrength: -25,
    grounded: true
  };

  let obstacles = [];
  let obstacleTimer = 0;
  let obstacleInterval = 60;
  let score = 0;
  let gameOver = false;

  function update() {
    if (gameOver) return;
    // Update Dino position
    dino.vy += dino.gravity;
    dino.y += dino.vy;

    // Check for ground collision
    if (dino.y + dino.height >= canvas.height) {
      dino.y = canvas.height - dino.height;
      dino.vy = 0;
      dino.grounded = true;
    }

    // Spawn obstacles
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
      obstacles.push({
        x: canvas.width,
        y: canvas.height - 50,
        width: 20,
        height: 50
      });
      obstacleTimer = 0;
    }

    // Move obstacles
    for (let i = 0; i < obstacles.length; i++) {
      obstacles[i].x -= 6;

      // Check for collision
      if (
        dino.x < obstacles[i].x + obstacles[i].width &&
        dino.x + dino.width > obstacles[i].x &&
        dino.y < obstacles[i].y + obstacles[i].height &&
        dino.y + dino.height > obstacles[i].y
      ) {
        // Collision detected
        gameOver = true;
        alert('Game Over! Your score: ' + score);
        document.location.reload();
      }

      // Remove off-screen obstacles
      if (obstacles[i].x + obstacles[i].width < 0) {
        obstacles.splice(i, 1);
        i--;
        score++;
      }
    }
  }

  function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw ground
    ctx.fillStyle = '#555';
    ctx.fillRect(0, canvas.height - 5, canvas.width, 5);

    // Draw Dino
    ctx.fillStyle = '#555';
    ctx.fillRect(dino.x, dino.y, dino.width, dino.height);

    // Draw obstacles
    ctx.fillStyle = '#888';
    for (let obs of obstacles) {
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    }

    // Draw score
    ctx.fillStyle = '#000';
    ctx.font = '20px Arial';
    ctx.fillText('Score: ' + score, 10, 30);
  }

  function loop() {
    update();
    draw();
    if (!gameOver) {
      requestAnimationFrame(loop);
    }
  }

  // Jump function
  document.addEventListener('keydown', function(e) {
    if ((e.code === 'Space' || e.code === 'ArrowUp') && dino.grounded) {
      dino.vy = dino.jumpStrength;
      dino.grounded = false;
    }
  });

  // Start the game loop
  loop();
});
