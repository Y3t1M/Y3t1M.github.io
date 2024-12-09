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
        
        // Remove initial transform and use specific coordinates
        window.style.left = '50%';
        window.style.top = '50%';
        window.style.transform = 'translate(-50%, -50%)';

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
            // Reset offset when closing windows
            folderOffset = {x: 0, y: 0};
        });

        function dragStart(e) {
            if (e.target === titlebar) {
                // Calculate offset from current position
                const rect = window.getBoundingClientRect();
                initialX = e.clientX - rect.left;
                initialY = e.clientY - rect.top;
                
                // Store current transform
                const transform = window.style.transform;
                
                // Remove transform temporarily to get true position
                window.style.transform = 'none';
                window.style.left = rect.left + 'px';
                window.style.top = rect.top + 'px';
                
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
            }
        }

        function dragEnd() {
            isDragging = false;
        }
    });

    // Add folder creation offset tracking
    let folderOffset = {x: 0, y: 0};
    const OFFSET_INCREMENT = 20;

    function showWindow(window) {
        window.style.display = 'block';
        
        // Add offset to new windows
        window.style.left = `calc(50% + ${folderOffset.x}px)`;
        window.style.top = `calc(50% + ${folderOffset.y}px)`;
        
        // Increment offset for next window
        folderOffset.x += OFFSET_INCREMENT;
        folderOffset.y += OFFSET_INCREMENT;
        
        // Reset offset if it gets too large
        if (folderOffset.x > 100 || folderOffset.y > 100) {
            folderOffset = {x: 0, y: 0};
        }
        
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
                    // Create black background
                    const blackScreen = document.createElement('div');
                    blackScreen.className = 'black-screen';
                    document.body.appendChild(blackScreen);

                    // Create CRT effect overlay
                    const overlay = document.createElement('div');
                    overlay.className = 'screen-overlay';
                    document.body.appendChild(overlay);

                    // Play shutdown sound
                    const shutdownSound = new Audio('assets/audio/Microsoft Windows XP Shutdown Sound.mp3');
                    shutdownSound.play();

                    // Add shutdown class to body
                    document.body.classList.add('shutdown-active');

                    // Redirect to index.html after animation
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1500);
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
                case 'contact':
                    const contactWindow = document.getElementById('contact-error-window');
                    if (contactWindow) {
                        showWindow(contactWindow);
                    }
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

    // Add trash button functionality
    const trashBtn = document.getElementById('trash-btn');
    if (trashBtn) {
        trashBtn.addEventListener('click', () => {
            const errorSound = new Audio('assets/audio/Windows XP Error Sound.mp3');
            errorSound.play();
        });
    }

    // Ensure the contact-error-window is draggable and closable
    const contactWindowElement = document.getElementById('contact-error-window');
    if (contactWindowElement) {
        const titlebar = contactWindowElement.querySelector('.window-titlebar');
        const closeBtn = contactWindowElement.querySelector('.close-btn');

        titlebar.addEventListener('mousedown', dragStart);
        closeBtn.addEventListener('click', () => {
            contactWindowElement.style.display = 'none';
        });
    }

    // Handle OK button in contact error window
    const okButton = document.querySelector('#contact-error-window .ok-button');
    const contactWindow = document.getElementById('contact-error-window');

    if (okButton && contactWindow) {
        okButton.addEventListener('click', () => {
            contactWindow.style.display = 'none';
        });
    } else {
        console.error('OK button or contact error window not found!');
    }
});

function initializeGames() {
    // Initialize Endless Download game first
    initEndlessDownload();

    // Initialize Clicker game with proper styling
    const clickerArea = document.querySelector('.clicker-area');
    const scoreDisplay = document.querySelector('#current-score');
    const highScoreDisplay = document.querySelector('#high-score');
    
    // Reset game state
    let clicks = 0;
    let highScore = parseInt(localStorage.getItem('clickerHighScore')) || 0;
    let gameActive = false;
    let timeLeft = 5;
    let timer;

    // Update initial display
    highScoreDisplay.textContent = `High Score: ${highScore}`;
    scoreDisplay.textContent = 'Click to start new game';

    // Make sure click area is enabled
    clickerArea.style.pointerEvents = 'auto';
    
    // Reset event listeners
    clickerArea.replaceWith(clickerArea.cloneNode(true));
    const newClickerArea = document.querySelector('.clicker-area');
    
    newClickerArea.addEventListener('click', () => {
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
        newClickerArea.style.pointerEvents = 'none';
        
        setTimeout(() => {
            scoreDisplay.textContent = 'Click to start new game';
            newClickerArea.style.pointerEvents = 'auto';
        }, 3000);
    }
}

function initEndlessDownload() {
    const script = document.createElement('script');
    script.src = 'endless-download.js';
    document.body.appendChild(script);
}

/* Add wake up handler */
function handleWakeUp(e) {
    document.removeEventListener('mousemove', handleWakeUp);
    
    // Create boot elements
    const bootOverlay = document.createElement('div');
    bootOverlay.className = 'screen-overlay';
    document.body.appendChild(bootOverlay);
    
    // Play startup sound
    const startupSound = new Audio('assets/audio/Microsoft Windows XP Startup Sound.mp3');
    startupSound.play();

    // Reload the page to restore content
    setTimeout(() => {
        location.reload();
    }, 2000);
}

// ...existing code...

function handleShutdown() {
    // Trigger shutdown animation
    const overlay = document.querySelector('.screen-overlay');
    overlay.classList.add('shutting-down');

    // Listen for animation end to redirect
    overlay.addEventListener('animationend', () => {
        window.location.href = 'index.html';
    }, { once: true });
}

// Example shutdown button handler
document.getElementById('shutdown-btn').addEventListener('click', handleShutdown);

// ...existing code...