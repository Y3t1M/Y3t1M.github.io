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

// Ensure dino-game.js is loaded after the DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const dinoGameScript = document.createElement('script');
    dinoGameScript.src = 'dino-game.js';
    dinoGameScript.onload = () => {
        console.log('Dino Game script loaded successfully.');
    };
    dinoGameScript.onerror = () => {
        console.error('Failed to load Dino Game script.');
    };
    document.body.appendChild(dinoGameScript);
});

// Clicker game functionality
document.addEventListener('DOMContentLoaded', function() {
    const clickerArea = document.getElementById('clicker-area');
    const scoreDisplay = document.getElementById('score-display');
    const highScoreDisplay = document.getElementById('high-score');
    let clicks = 0;
    let timeLeft = 5;
    let gameActive = false;
    let timerInterval;
    let gameEndTimeout;
    let highScore = parseInt(localStorage.getItem('clickerHighScore')) || 0;
    highScoreDisplay.textContent = 'High Score: ' + highScore;

    function endGame() {
      gameActive = false;
      clearInterval(timerInterval);
      clearTimeout(gameEndTimeout);
      clickerArea.classList.add('disabled');
      scoreDisplay.textContent = 'Time is up!';
      
      setTimeout(function() {
        const cps = (clicks / 5).toFixed(1); // Calculate clicks per second
        if (clicks > highScore) {
          highScore = clicks;
          localStorage.setItem('clickerHighScore', highScore);
          highScoreDisplay.textContent = 'New High Score: ' + highScore;
          // Add rainbow effect if clicks are above 69
          if (clicks > 69) {
            highScoreDisplay.classList.add('rainbow');
          } else {
            highScoreDisplay.classList.remove('rainbow');
          }
        }
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
});