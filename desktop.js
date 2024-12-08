document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.querySelector('.desktop');
    const windows = document.querySelectorAll('.window');
    let activeWindow = null;
    let zIndex = 1000;

    // Icon double-click handler
    document.querySelectorAll('.icon').forEach(icon => {
        icon.addEventListener('dblclick', () => {
            const windowId = icon.dataset.window;
            const window = document.getElementById(windowId);
            if (window) {
                showWindow(window);
            }
        });
    });

    document.querySelectorAll('.folder').forEach(folder => {
        folder.addEventListener('dblclick', () => {
            const windowId = folder.dataset.window;
            const window = document.getElementById(windowId);
            if (windowId === 'games-window') {
                initializeGames();
            }
            if (window) {
                window.style.display = 'block';
                window.style.left = '50%';
                window.style.top = '50%';
                window.style.transform = 'translate(-50%, -50%)';
                bringToFront(window);
            }
        });
    });

    // Window management
    windows.forEach(window => {
        const titlebar = window.querySelector('.window-titlebar');
        const closeBtn = window.querySelector('.close-btn');
        
        // Set initial position
        window.style.left = '50%';
        window.style.top = '50%';
        window.style.transform = 'translate(-50%, -50%)';

        // Make window dragable needs work still
        let isDragging = false;
        let currentX;
        let currentY;
        let initialX;
        let initialY;

        titlebar.addEventListener('mousedown', dragStart);

        document.addEventListener('mousemove', drag);
        document.addEventListener('mouseup', dragEnd);

        // Bring window to front when clicked
        window.addEventListener('mousedown', () => {
            bringToFront(window);
        });

        // Close button
        closeBtn.addEventListener('click', () => {
            window.style.display = 'none';
        });

        function dragStart(e) {
            initialX = e.clientX - window.offsetLeft;
            initialY = e.clientY - window.offsetTop;

            if (e.target === titlebar) {
                isDragging = true;
                bringToFront(window);
            }
        }

        function drag(e) {
            if (isDragging) {
                e.preventDefault();
                currentX = e.clientX - initialX;
                currentY = e.clientY - initialY;

                window.style.left = `${currentX}px`;
                window.style.top = `${currentY}px`;
                window.style.transform = 'none';
            }
        }

        function dragEnd() {
            isDragging = false;
        }
    });

    function showWindow(window) {
        window.style.display = 'block';
        bringToFront(window);
    }

    function bringToFront(window) {
        window.style.zIndex = ++zIndex;
        activeWindow = window;
    }

    // Start Menu functionality
    const startBtn = document.querySelector('.start-btn');
    const startMenu = document.querySelector('.start-menu');
    const lockScreen = document.querySelector('.lock-screen');
    const passwordField = document.getElementById('password-field');
    const loginBtn = document.getElementById('login-btn');
    const errorMessage = document.querySelector('.error-message');
    const errorSound = new Audio('assets/sounds/error.wav');

    // Toggle start menu
    startBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startMenu.classList.toggle('visible');
    });

    // Close start menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!startMenu.contains(e.target) && !startBtn.contains(e.target)) {
            startMenu.classList.remove('visible');
        }
    });

    // Handle start menu actions
    document.querySelectorAll('.start-item').forEach(item => {
        item.addEventListener('click', () => {
            const action = item.dataset.action;
            startMenu.classList.remove('visible');
            
            switch(action) {
                case 'shutdown':
                    document.body.classList.add('shutting-down');
                    setTimeout(() => {
                        document.body.style.background = '#000000';
                        document.body.innerHTML = '';
                    }, 2000);
                    break;
                    
                case 'restart':
                    document.body.classList.add('restarting');
                    setTimeout(() => {
                        location.reload();
                    }, 2000);
                    break;
                    
                case 'lock':
                    lockScreen.classList.add('visible');
                    passwordField.value = '';
                    errorMessage.textContent = '';
                    break;
            }
        });
    });

    // Lock screen functionality
    loginBtn.addEventListener('click', handleLogin);
    passwordField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });

    function handleLogin() {
        const password = passwordField.value;
        const validPasswords = ['password', 'Password', 'PASSWORD'];
        
        if (validPasswords.includes(password)) {
            lockScreen.classList.remove('visible');
            errorMessage.textContent = '';
            passwordField.value = ''; // Clear password field
        } else {
            errorMessage.textContent = 'Please try Password again';
            passwordField.value = ''; // Clear password field on error
        }
    }

    // Add window control handlers
    windows.forEach(window => {
        const minimizeBtn = window.querySelector('.minimize-btn');
        const maximizeBtn = window.querySelector('.maximize-btn');
        const taskbarItems = document.querySelector('.taskbar-items');
        let isMaximized = false;
        let originalDimensions = {};

        minimizeBtn.addEventListener('click', () => {
            window.style.display = 'none';
            
            // Create taskbar item with proper styling
            const taskbarItem = document.createElement('div');
            taskbarItem.classList.add('taskbar-item');
            taskbarItem.innerHTML = `
                <img src="assets/icons/window.png" alt="Window">
                <span>${window.querySelector('.window-titlebar span').textContent}</span>
            `;
            taskbarItem.addEventListener('click', () => {
                window.style.display = 'block';
                taskbarItem.remove();
                bringToFront(window);
            });
            
            taskbarItems.appendChild(taskbarItem);
        });

        maximizeBtn.addEventListener('click', () => {
            if (!isMaximized) {
                // Store original dimensions
                originalDimensions = {
                    width: window.style.width,
                    height: window.style.height,
                    left: window.style.left,
                    top: window.style.top,
                    transform: window.style.transform
                };

                // Maximize to full screen except taskbar
                window.style.width = '100%';
                window.style.height = 'calc(100vh - 40px)'; // Account for taskbar
                window.style.left = '0';
                window.style.top = '0';
                window.style.transform = 'none';
                isMaximized = true;
            } else {
                // Restore original dimensions
                Object.assign(window.style, originalDimensions);
                isMaximized = false;
            }
        });
    });

    // Add game launch handlers
    document.querySelectorAll('.game-item').forEach(item => {
        item.addEventListener('dblclick', () => {
            const gameType = item.dataset.game;
            switch(gameType) {
                case 'endless-download':
                    window.location.href = 'projects.html#endless-download';
                    break;
                case 'clicker':
                    // Show clicker game in a new window
                    const clickerGame = document.querySelector('.clicker-game');
                    if (clickerGame) {
                        clickerGame.classList.remove('hidden');
                    }
                    break;
            }
        });
    });

    // Remove the initial lock screen display
    // lockScreen.classList.add('visible');
});

function initializeGames() {
    // Initialize Endless Download game
    initEndlessDownload();

    // Initialize Clicker game
    const clickerArea = document.querySelector('.clicker-area');
    const scoreDisplay = document.querySelector('#current-score');
    const highScoreDisplay = document.querySelector('#high-score');
    let clicks = 0;
    let highScore = parseInt(localStorage.getItem('clickerHighScore')) || 0;
    let gameActive = false;
    let timeLeft = 5;
    let timer;

    highScoreDisplay.textContent = `High Score: ${highScore}`;

    clickerArea.addEventListener('click', () => {
        if (!gameActive) {
            startClickerGame();
        } else if (gameActive && timeLeft > 0) {
            clicks++;
            scoreDisplay.textContent = `Time: ${timeLeft}s | Clicks: ${clicks}`;
        }
    });

    function startClickerGame() {
        gameActive = true;
        clicks = 0;
        timeLeft = 5;
        scoreDisplay.textContent = `Time: ${timeLeft}s | Clicks: 0`;
        
        timer = setInterval(() => {
            timeLeft--;
            scoreDisplay.textContent = `Time: ${timeLeft}s | Clicks: ${clicks}`;
            
            if (timeLeft <= 0) {
                endClickerGame();
            }
        }, 1000);
    }

    function endClickerGame() {
        clearInterval(timer);
        gameActive = false;
        if (clicks > highScore) {
            highScore = clicks;
            localStorage.setItem('clickerHighScore', highScore);
            highScoreDisplay.textContent = `High Score: ${highScore}`;
        }
        scoreDisplay.textContent = `Game Over! Clicks: ${clicks}`;
    }
}

// Add this function to initialize the Endless Download game
function initEndlessDownload() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let gameStarted = false;
    let gameOver = false;
    let score = 0;
    let playerY = canvas.height - 60;
    let playerVelocity = 0;
    const gravity = 0.5;
    const jumpStrength = -10;
    const obstacles = [];

    function update() {
        if (!gameStarted || gameOver) return;

        // Update player
        playerVelocity += gravity;
        playerY += playerVelocity;
        if (playerY > canvas.height - 60) {
            playerY = canvas.height - 60;
            playerVelocity = 0;
        }

        // Update obstacles
        if (Math.random() < 0.02) {
            obstacles.push({
                x: canvas.width,
                width: 30,
                height: 50
            });
        }

        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= 5;
            if (obstacles[i].x < -30) {
                obstacles.splice(i, 1);
                score++;
            }

            // Collision detection
            if (checkCollision(obstacles[i])) {
                gameOver = true;
            }
        }
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw player
        ctx.fillStyle = '#000';
        ctx.fillRect(50, playerY, 30, 30);

        // Draw obstacles
        obstacles.forEach(obstacle => {
            ctx.fillRect(obstacle.x, canvas.height - obstacle.height, obstacle.width, obstacle.height);
        });

        // Draw score
        ctx.fillStyle = '#000';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 10, 30);

        if (!gameStarted) {
            ctx.fillText('Press SPACE to Start', canvas.width/2 - 100, canvas.height/2);
        }
        if (gameOver) {
            ctx.fillText('Game Over! Press SPACE to restart', canvas.width/2 - 150, canvas.height/2);
        }
    }

    function checkCollision(obstacle) {
        return (50 < obstacle.x + obstacle.width &&
                80 > obstacle.x &&
                playerY < canvas.height - obstacle.height + 30 &&
                playerY + 30 > canvas.height - obstacle.height);
    }

    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }

    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            e.preventDefault();
            if (!gameStarted) {
                gameStarted = true;
            } else if (gameOver) {
                gameOver = false;
                score = 0;
                obstacles.length = 0;
                playerY = canvas.height - 60;
            } else {
                playerVelocity = jumpStrength;
            }
        }
    });

    canvas.addEventListener('click', () => {
        if (!gameStarted) {
            gameStarted = true;
        } else if (gameOver) {
            gameOver = false;
            score = 0;
            obstacles.length = 0;
            playerY = canvas.height - 60;
        } else {
            playerVelocity = jumpStrength;
        }
    });

    gameLoop();
}