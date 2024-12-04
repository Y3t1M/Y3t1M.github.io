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
    let timerInterval;

    clickerArea.addEventListener('click', function() {
        if (!gameActive) {
            startGame();
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
        clearInterval(timerInterval);
        const cps = (clicks / 5).toFixed(1);
        scoreDisplay.textContent = `Final Score: ${clicks} (${cps} clicks per second)`;
    }

    // Update any background color manipulations from dark grey to light grey if necessary
    // For example:
    document.body.style.backgroundColor = '#e0e0e0'; // Set to light grey

    // Remove or comment out any code that creates grey rectangles
    /*
    // Example of removing dynamic grey rectangle creation
    const greyRectangle = document.createElement('div');
    greyRectangle.classList.add('unwanted-grey-rectangle');
    document.body.appendChild(greyRectangle);
    */

    // Remove any background image settings
    /*
    document.body.style.backgroundImage = 'url("assets/img/some-background.jpg")';
    */

    // Ensure background color is set to light grey
    document.body.style.backgroundColor = '#e0e0e0'; // Set to light grey
});