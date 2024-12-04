// Header scroll effect and Clicker game functionality

// Header scroll effect
window.addEventListener('scroll', function() {
  const header = document.querySelector('header');
  if (window.scrollY > 0) {
    header.classList.add('header-scrolled');
  } else {
    header.classList.remove('header-scrolled');
  }
});

// Ensure 'endless-download.js' is loaded after the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  const gameScript = document.createElement('script');
  gameScript.src = 'endless-download.js'; // Updated script source
  gameScript.onload = () => {
    console.log('The Endless Download script loaded successfully.');
  };
  gameScript.onerror = () => {
    console.error('Failed to load The Endless Download script.');
  };
  document.body.appendChild(gameScript);
});

// Clicker game and sequence detection
document.addEventListener('DOMContentLoaded', function() {
    const profile1 = document.getElementById('profile1');
    const profile2 = document.getElementById('profile2');
    const clickerGame = document.querySelector('.clicker-game');
    
    // Sequence variables
    const CORRECT_SEQUENCE = ['left', 'right', 'left', 'right', 'left'];
    let currentSequence = [];
    let lastClickTime = Date.now();
    const SEQUENCE_TIMEOUT = 2000; // 2 seconds timeout

    // Profile click handlers
    profile1.addEventListener('click', () => handleProfileClick('left'));
    profile2.addEventListener('click', () => handleProfileClick('right'));

    function handleProfileClick(direction) {
        const currentTime = Date.now();
        
        // Reset sequence if too much time has passed
        if (currentTime - lastClickTime > SEQUENCE_TIMEOUT) {
            currentSequence = [];
            console.log('Sequence reset (timeout)');
        }
        lastClickTime = currentTime;

        // Add click to sequence
        currentSequence.push(direction);
        console.log('Current sequence:', currentSequence);

        // Keep only the last 5 clicks
        if (currentSequence.length > 5) {
            currentSequence.shift();
        }

        // Check if sequence matches
        if (arraysEqual(currentSequence, CORRECT_SEQUENCE)) {
            console.log('Correct sequence! Showing game.');
            clickerGame.classList.remove('hidden');
            currentSequence = []; // Reset sequence
        }
    }

    function arraysEqual(arr1, arr2) {
        if (arr1.length !== arr2.length) return false;
        return arr1.every((value, index) => value === arr2[index]);
    }

    // Clicker game functionality
    const clickerArea = document.getElementById('clicker-area');
    const scoreDisplay = document.getElementById('score-display');
    let clicks = 0;
    let timeLeft = 5;
    let gameActive = false;
    let timerInterval;
    let gameEndTimeout;

    clickerArea.addEventListener('click', function() {
        if (!gameActive) {
            startGame();
        } else if (gameActive && timeLeft > 0) {
            incrementClicks();
        }
    });

    function startGame() {
        gameActive = true;
        clicks = 0;
        timeLeft = 5;
        clickerArea.classList.remove('disabled');
        updateDisplay();
        
        const gameEndTime = Date.now() + (timeLeft * 1000);
        
        timerInterval = setInterval(() => {
            const remaining = Math.ceil((gameEndTime - Date.now()) / 1000);
            if (remaining <= 0) {
                endGame();
            } else {
                timeLeft = remaining;
                updateDisplay();
            }
        }, 100);

        gameEndTimeout = setTimeout(endGame, timeLeft * 1000);
    }

    function incrementClicks() {
        clicks++;
        updateDisplay();
    }

    function updateDisplay() {
        scoreDisplay.textContent = `Time left: ${timeLeft}s | Clicks: ${clicks}`;
    }

    function endGame() {
        gameActive = false;
        clearInterval(timerInterval);
        clearTimeout(gameEndTimeout);
        clickerArea.classList.add('disabled');
        scoreDisplay.textContent = 'Time is up!';

        setTimeout(() => {
            const cps = (clicks / 5).toFixed(1);
            scoreDisplay.textContent = `Your score: ${clicks} (CPS: ${cps})`;
            setTimeout(() => clickerArea.classList.remove('disabled'), 500);
        }, 1000);
    }
});