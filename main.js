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

  // Add Click Sequence Logic
  const profile1 = document.getElementById('profile1');
  const profile2 = document.getElementById('profile2');
  const clickerGame = document.querySelector('.clicker-game');

  const requiredSequence = ['left', 'right', 'left', 'right', 'left'];
  let userSequence = [];

  function handleProfileClick(side) {
    userSequence.push(side);
    // Limit the userSequence length to the required sequence length
    if (userSequence.length > requiredSequence.length) {
      userSequence.shift();
    }

    // Check if the current userSequence matches the requiredSequence so far
    for (let i = 0; i < userSequence.length; i++) {
      if (userSequence[i] !== requiredSequence[i]) {
        // Incorrect sequence, reset
        userSequence = [];
        return;
      }
    }

    // If the entire sequence is matched
    if (userSequence.length === requiredSequence.length) {
      clickerGame.classList.remove('hidden'); // Reveal the Clicker Game
      userSequence = []; // Reset the sequence
    }
  }

  profile1.addEventListener('click', function() {
    handleProfileClick('left');
  });

  profile2.addEventListener('click', function() {
    handleProfileClick('right');
  });
});