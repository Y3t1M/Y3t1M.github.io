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

// Clicker game functionality
document.addEventListener('DOMContentLoaded', function() {
  const clickerArea = document.getElementById('clicker-area');
  const scoreDisplay = document.getElementById('score-display');
  let clicks = 0;
  let timeLeft = 5;
  let gameActive = false;
  let timerInterval;
  let gameEndTimeout;

  function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    clearTimeout(gameEndTimeout);
    clickerArea.classList.add('disabled');
    scoreDisplay.textContent = 'Time is up!';

    setTimeout(function() {
      const cps = (clicks / 5).toFixed(1);
      scoreDisplay.textContent = 'Your score: ' + clicks + ' (CPS: ' + cps + ')';
      setTimeout(() => clickerArea.classList.remove('disabled'), 500);
    }, 1000);
  }

  clickerArea.addEventListener('click', function() {
    if (!gameActive) {
      gameActive = true;
      clicks = 0;
      timeLeft = 5;
      clickerArea.classList.remove('disabled');
      scoreDisplay.textContent = 'Time left: ' + timeLeft + 's | Clicks: ' + clicks;

      // Set exact end time
      const gameEndTime = Date.now() + (timeLeft * 1000);

      timerInterval = setInterval(function() {
        const remaining = Math.ceil((gameEndTime - Date.now()) / 1000);
        if (remaining <= 0) {
          endGame();
        } else {
          timeLeft = remaining;
          scoreDisplay.textContent = 'Time left: ' + timeLeft + 's | Clicks: ' + clicks;
        }
      }, 100);

      // Force end game after exact duration
      gameEndTimeout = setTimeout(endGame, timeLeft * 1000);

    } else if (gameActive && timeLeft > 0) {
      clicks++;
      scoreDisplay.textContent = 'Time left: ' + timeLeft + 's | Clicks: ' + clicks;
    }
  });

  // Enhanced Click Sequence Logic
  const profile1 = document.getElementById('profile1');
  const profile2 = document.getElementById('profile2');
  const clickerGame = document.querySelector('.clicker-game');
  
  const requiredSequence = ['left', 'right', 'left', 'right', 'left'];
  let userSequence = [];
  let lastClickTime = 0;
  const SEQUENCE_TIMEOUT = 2000; // 2 seconds timeout between clicks

  function handleProfileClick(side) {
    const currentTime = Date.now();
    
    // Reset sequence if too much time has passed
    if (currentTime - lastClickTime > SEQUENCE_TIMEOUT) {
      userSequence = [];
      console.log('Sequence reset due to timeout'); // Debug logging
    }
    lastClickTime = currentTime;

    userSequence.push(side);
    console.log('Current sequence:', userSequence); // Debug logging

    // Keep only the last 5 clicks
    if (userSequence.length > 5) {
      userSequence.shift();
    }

    // Check if sequence matches
    const isMatch = userSequence.every((click, index) => click === requiredSequence[index]);
    
    if (isMatch && userSequence.length === requiredSequence.length) {
      clickerGame.classList.remove('hidden');
      userSequence = []; // Reset sequence
      console.log('Correct sequence! Showing clicker game.'); // Debug logging
    }
  }

  profile1.addEventListener('click', () => handleProfileClick('left'));
  profile2.addEventListener('click', () => handleProfileClick('right'));
});

// Enhanced Click Sequence Logic
document.addEventListener('DOMContentLoaded', function() {
  const profile1 = document.getElementById('profile1');
  const profile2 = document.getElementById('profile2');
  const clickerGame = document.querySelector('.clicker-game');
  
  const requiredSequence = ['left', 'right', 'left', 'right', 'left'];
  let userSequence = [];
  let lastClickTime = 0;
  const SEQUENCE_TIMEOUT = 2000; // 2 seconds timeout between clicks

  function handleProfileClick(side) {
    const currentTime = Date.now();
    
    // Reset sequence if too much time has passed
    if (currentTime - lastClickTime > SEQUENCE_TIMEOUT) {
      userSequence = [];
      console.log('Sequence reset due to timeout'); // Debug logging
    }
    lastClickTime = currentTime;

    userSequence.push(side);
    console.log('Current sequence:', userSequence); // Debug logging

    // Keep only the last 5 clicks
    if (userSequence.length > 5) {
      userSequence.shift();
    }

    // Check if sequence matches
    const isMatch = userSequence.every((click, index) => click === requiredSequence[index]);
    
    if (isMatch && userSequence.length === requiredSequence.length) {
      clickerGame.classList.remove('hidden');
      userSequence = []; // Reset sequence
      console.log('Correct sequence! Showing clicker game.'); // Debug logging
    }
  }

  // Add click event listeners to profile images
  profile1.addEventListener('click', function() {
    handleProfileClick('left');
  });
  
  profile2.addEventListener('click', function() {
    handleProfileClick('right');
  });
});