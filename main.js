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

    // Remove the duplicated 'icons.forEach' block and ensure single event listener setup
    // Make windows draggable
    const windows = document.querySelectorAll('.window');
    windows.forEach(window => {
        let isDragging = false;
        let startX, startY, initialX, initialY;

        const titleBar = window.querySelector('.window-titlebar');
        titleBar.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Prevent default behavior

            isDragging = true;
            window.style.zIndex = getNextZIndex(); // Bring window to front

            // Record the initial mouse position
            startX = e.clientX;
            startY = e.clientY;

            // Record the initial window position
            const rect = window.getBoundingClientRect();
            initialX = rect.left;
            initialY = rect.top;

            function onMouseMove(e) {
                if (isDragging) {
                    // Calculate the distance moved
                    const dx = e.clientX - startX;
                    const dy = e.clientY - startY;

                    // Update window position
                    window.style.left = (initialX + dx) + 'px';
                    window.style.top = (initialY + dy) + 'px';
                }
            }

            function onMouseUp() {
                isDragging = false;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        });

        // Bring window to front when clicked
        window.addEventListener('mousedown', () => {
            window.style.zIndex = getNextZIndex();
        });

        // Window control buttons
        const closeButton = window.querySelector('.close');
        closeButton.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            window.style.display = 'none';
        });

        // Remove functionality for minimize and maximize buttons as they no longer exist
    });

    // Open windows when icons are double-clicked
    const icons = document.querySelectorAll('.icon');
    icons.forEach(icon => {
        icon.addEventListener('dblclick', () => {
            const windowId = icon.getAttribute('data-window');
            const windowElement = document.getElementById(windowId);
            if (windowElement) {
                windowElement.style.display = 'block';
                windowElement.style.zIndex = getNextZIndex(); // Bring window to front
            }
        });
    });

    // zIndex management
    let zIndexCounter = 1000;
    function getNextZIndex() {
        return ++zIndexCounter;
    }

    // Audio utility
    const playSound = (soundPath) => {
        const sound = new Audio(soundPath);
        sound.play().catch(err => console.error('Error playing sound:', err));
    };

    // Update profile click handlers with proper audio handling
    function handleProfileClick() {
        const startupSound = new Audio('assets/audio/MicrosoftWindowsXPstartupSound.mp3');
        startupSound.play()
            .then(() => {
                // Wait for sound to start playing before redirecting
                setTimeout(() => {
                    window.location.href = 'desktop.html';
                }, 500);
            })
            .catch(err => {
                console.error('Error playing startup sound:', err);
                // Fallback - redirect even if sound fails
                window.location.href = 'desktop.html';
            });
    }

    // Add click handlers to both profile images
    const profile1 = document.getElementById('profile1');
    const profile2 = document.getElementById('profile2');

    if (profile1) {
        profile1.addEventListener('click', handleProfileClick);
    }

    if (profile2) {
        profile2.addEventListener('click', handleProfileClick);
    }
});