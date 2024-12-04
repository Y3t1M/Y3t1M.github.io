document.addEventListener('DOMContentLoaded', function() {
    // Get DOM elements
    const profile1 = document.getElementById('profile1');
    const profile2 = document.getElementById('profile2');
    const clickerGame = document.querySelector('.clicker-game');
    
    // Initialize sequence tracking
    let clickSequence = [];
    const correctSequence = ['left', 'right', 'left', 'right', 'left'];
    let lastClickTime = Date.now();

    // Add click handlers to profile images
    profile1.addEventListener('click', function() {
        handleClick('left');
    });

    profile2.addEventListener('click', function() {
        handleClick('right');
    });

    function handleClick(direction) {
        const currentTime = Date.now();
        
        // Reset sequence if more than 3 seconds have passed
        if (currentTime - lastClickTime > 3000) {
            clickSequence = [];
            console.log('Sequence reset (timeout)');
        }
        lastClickTime = currentTime;

        // Add this click to the sequence
        clickSequence.push(direction);
        console.log('Click:', direction);
        console.log('Current sequence:', clickSequence);

        // Only keep the last 5 clicks
        if (clickSequence.length > 5) {
            clickSequence.shift();
        }

        // Check if sequence matches
        if (checkSequence()) {
            console.log('Correct sequence! Showing game.');
            showClickerGame();
        }
    }

    function checkSequence() {
        if (clickSequence.length !== correctSequence.length) {
            return false;
        }
        
        for (let i = 0; i < clickSequence.length; i++) {
            if (clickSequence[i] !== correctSequence[i]) {
                return false;
            }
        }
        return true;
    }

    function showClickerGame() {
        clickerGame.classList.remove('hidden');
        
        // Scroll to the game
        clickerGame.scrollIntoView({ behavior: 'smooth' });
        
        // Reset sequence
        clickSequence = [];
    }

    // Clicker game functionality
    const clickerArea = document.getElementById('clicker-area');
    const scoreDisplay = document.getElementById('score-display');
    let clicks = 0;
    let timeLeft = 5;
    let gameActive = false;
    let gameOver = false; // Initialize gameOver flag
    let timerInterval;

    // High Score Initialization
    let highScore = parseInt(localStorage.getItem('clickerHighScore')) || 0;

    // Update high score display on load
    updateHighScoreDisplay();

    // Add a cooldown flag
    let isCooldown = false;

    clickerArea.addEventListener('click', function() {
        if (isCooldown) return; // Ignore clicks during cooldown
        if (!gameActive && !gameOver) {
            startGame();
        } else if (!gameActive && gameOver) {
            resetGame(); // Reset the game when clicked after game over
        } else if (gameActive && timeLeft > 0) {
            clicks++;
            updateDisplay();
        }
    });

    function startGame() {
        gameActive = true;
        clicks = 0;
        timeLeft = 5;
        updateDisplay();

        timerInterval = setInterval(function() {
            timeLeft--;
            updateDisplay();
            
            if (timeLeft <= 0) {
                endGame();
            }
        }, 1000);
    }

    function updateDisplay() {
        scoreDisplay.textContent = `Time left: ${timeLeft}s | Clicks: ${clicks}`;
    }

    function endGame() {
        gameActive = false;
        gameOver = true; // Set gameOver to true when the game ends
        clearInterval(timerInterval);
        const cps = (clicks / 5).toFixed(1);

        // Check if the current clicks exceed the high score
        if (clicks > highScore) {
            highScore = clicks;
            localStorage.setItem('clickerHighScore', highScore);
        }

        // Display final score and high score together
        scoreDisplay.innerHTML = `
            Final Score: ${clicks} (${cps} clicks per second)<br>
            High Score: <span id="high-score-text" class="high-score">${highScore}</span>
        `;

        // Apply rainbow effect if high score is 69 or higher
        const highScoreText = document.getElementById('high-score-text');
        if (highScore >= 69) {
            highScoreText.classList.add('rainbow');
        } else {
            highScoreText.classList.remove('rainbow');
        }

        // Allow game to be reset on next click
        isCooldown = false;
        clickerGame.classList.remove('disabled');
    }

    // Function to update high score display
    function updateHighScoreDisplay() {
        const highScoreDisplay = document.getElementById('high-score');
        if (highScoreDisplay) {
            highScoreDisplay.textContent = `High Score: ${highScore}`;
            if (highScore > 69) {
                highScoreDisplay.classList.add('rainbow');
            } else {
                highScoreDisplay.classList.remove('rainbow');
            }
        }
    }

    // Reset game function
    function resetGame() {
        gameOver = false;
        clicks = 0;
        timeLeft = 5;
        gameActive = false;
        score = 0;
        updateDisplay();
        updateHighScoreDisplay();
    }

    // Update keydown event handler to respect cooldown and handle gameOver state
    document.addEventListener('keydown', function(event) {
        if (event.code === 'Space') {
            event.preventDefault();
            if (isCooldown) return; // Ignore key presses during cooldown
            if (!gameStarted) {
                gameStarted = true;
            } else if (gameOver) {
                resetGame();
            } else if (gameActive && !dino.jumping) {
                dino.velocityY = JUMP_FORCE;
                dino.jumping = true;
            }
        }
    });

    // Remove or comment out the following line:
    // document.body.style.backgroundColor = '#e0e0e0'; // Set to light grey
});