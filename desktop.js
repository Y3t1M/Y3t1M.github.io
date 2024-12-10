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

    // Add event listener for Tetris icon in Computer folder
    const tetrisIcon = document.querySelector('.folder[data-window="tetris-window"]');
    if (tetrisIcon) {
        tetrisIcon.addEventListener('dblclick', () => {
            openWindow('tetris-window');
        });
    }

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
        if (window.classList.contains('maximized')) {
            window.style.zIndex = zIndex++;
            return;
        }
        if (activeWindow) {
            activeWindow.classList.remove('active');
        }
        window.classList.add('active');
        window.style.zIndex = zIndex++;
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
                    document.body.classList.add('shutdown-active');
                    setTimeout(() => {
                        window.location.href = 'index.html';
                    }, 1200);
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
                    showContactError();
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
            playSound('assets/audio/Windows95ErrorSoundEffect.mp3');
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

    // Handle Loading Animation
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        // Remove loading overlay after animation duration (3s)
        setTimeout(() => {
            loadingOverlay.style.display = 'none';
        }, 3000); // Duration matches CSS animation
    }

    // Play Windows XP Startup Sound
    const startupSound = new Audio('assets/audio/MicrosoftWindowsXPstartupSound.mp3');
    startupSound.play().catch(err => console.error('Error playing startup sound:', err));

    // Add event listeners for PixOS window buttons
    const pixosWindow = document.getElementById('pixos-window');
    const pixosMinimizeBtn = pixosWindow.querySelector('.minimize-btn');
    const pixosMaximizeBtn = pixosWindow.querySelector('.maximize-btn');

    pixosMinimizeBtn.addEventListener('click', () => {
        pixosWindow.classList.toggle('minimized');
        if (pixosWindow.classList.contains('minimized')) {
            // Optionally, add PixOS to taskbar or hidden list
        } else {
            bringToFront(pixosWindow);
        }
    });

    pixosMaximizeBtn.addEventListener('click', () => {
        pixosWindow.classList.toggle('maximized');
        bringToFront(pixosWindow);
    });

    if (pixosWindow) {
        const maximizeBtn = pixosWindow.querySelector('.maximize-btn');
        let isMaximized = false;
        let originalDimensions = {};

        maximizeBtn.addEventListener('click', () => {
            if (!isMaximized) {
                // Store original dimensions
                originalDimensions = {
                    width: pixosWindow.style.width,
                    height: pixosWindow.style.height,
                    left: pixosWindow.style.left,
                    top: pixosWindow.style.top,
                    transform: pixosWindow.style.transform
                };

                // Apply maximized state
                pixosWindow.classList.add('maximized');
                pixosWindow.style.width = '100%';
                pixosWindow.style.height = 'calc(100vh - 44px)';
                pixosWindow.style.left = '0';
                pixosWindow.style.top = '0';
                pixosWindow.style.transform = 'none';
                
                // Ensure iframe fills the space
                const iframe = pixosWindow.querySelector('iframe');
                if (iframe) {
                    iframe.style.width = '100%';
                    iframe.style.height = 'calc(100% - 25px)'; // Account for titlebar
                }
            } else {
                // Restore original dimensions
                pixosWindow.classList.remove('maximized');
                Object.assign(pixosWindow.style, originalDimensions);
            }
            isMaximized = !isMaximized;
            bringToFront(pixosWindow);
        });
    }

    // Handle folder double-clicks
    document.querySelectorAll('.folder').forEach(folder => {
        folder.addEventListener('dblclick', () => {
            const windowId = folder.dataset.window;
            if (windowId) {
                openWindow(windowId);
            }
        });
    });

    // Update Tetris window controls
    const tetrisWindow = document.getElementById('tetris-window');
    if (tetrisWindow) {
        const minimizeBtn = tetrisWindow.querySelector('.minimize-btn');
        const maximizeBtn = tetrisWindow.querySelector('.maximize-btn');
        const closeBtn = tetrisWindow.querySelector('.close-btn');
        let isMaximized = false;
        let originalDimensions = {};

        minimizeBtn.addEventListener('click', () => {
            tetrisWindow.style.display = 'none';
            // Optionally, handle taskbar item creation
        });

        maximizeBtn.addEventListener('click', () => {
            if (!isMaximized) {
                // Store original dimensions
                originalDimensions = {
                    width: tetrisWindow.style.width,
                    height: tetrisWindow.style.height,
                    left: tetrisWindow.style.left,
                    top: tetrisWindow.style.top,
                    transform: tetrisWindow.style.transform
                };
                // Maximize window
                tetrisWindow.style.width = '100%';
                tetrisWindow.style.height = 'calc(100vh - 40px)';
                tetrisWindow.style.left = '0';
                tetrisWindow.style.top = '0';
                tetrisWindow.style.transform = 'none';
                isMaximized = true;
            } else {
                // Restore original dimensions
                Object.assign(tetrisWindow.style, originalDimensions);
                isMaximized = false;
            }
            bringToFront(tetrisWindow);
        });

        closeBtn.addEventListener('click', () => {
            tetrisWindow.style.display = 'none';
        });
    }

    function openWindow(windowId) {
        const windowElement = document.getElementById(windowId);
        if (windowElement) {
            windowElement.style.display = 'block';
            bringToFront(windowElement);
        }
    }
});

function initializeGames() {
    // Initialize existing games
    initEndlessDownload();
    
    // Initialize Tetris when games window is opened
    const tetrisCanvas = document.querySelector('#tetris');
    const nextPieces = document.querySelectorAll('.next-piece');
    
    if (tetrisCanvas && nextPieces.length > 0) {
        // Load Tetris script dynamically
        loadScript('games/tetris.js')
            .then(() => {
                // Initialize Tetris after script loads
                new Tetris();
            })
            .catch(err => console.error('Error loading Tetris:', err));
    }
}

// Add script loader utility
function loadScript(src) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
    });
}

class Tetris {
    constructor(mainCanvas, nextCanvas) {
        this.canvas = mainCanvas;
        this.nextCanvas = nextCanvas;
        this.ctx = mainCanvas.getContext('2d');
        this.nextCtx = nextCanvas.getContext('2d');
        this.blockSize = 20;
        this.init();
    }
    
    init() {
        // Initialize game board
        this.board = Array(20).fill().map(() => Array(12).fill(0));
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        
        // Start game loop
        this.spawnPiece();
        this.gameLoop();
        
        // Add keyboard controls
        document.addEventListener('keydown', this.handleInput.bind(this));
    }
    
    // Add rest of Tetris game logic here
    /* ...add methods for piece movement, rotation, collision detection, etc... */
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
    const startupSound = new Audio('assets/audio/MicrosoftWindowsXPstartupSound.mp3');
    startupSound.play();

    // Reload the page to restore content
    setTimeout(() => {
        location.reload();
    }, 2000);
}

// ...existing code...

// Create unified shutdown function
function triggerShutdown() {
    // Create black background
    const blackScreen = document.createElement('div');
    blackScreen.className = 'black-screen';
    document.body.appendChild(blackScreen);

    // Create CRT effect overlay
    const overlay = document.createElement('div');
    overlay.className = 'screen-overlay';
    document.body.appendChild(overlay);

    // Play shutdown sound and wait for it to finish
    playSound('assets/audio/MicrosoftWindowsXPShutdownSound.mp3')
        .then(() => {
            // Complete shutdown
            document.body.style.background = '#000';
            document.body.innerHTML = '';
            // Listen for mouse movement after shutdown
            setTimeout(() => {
                document.addEventListener('mousemove', handleWakeUp);
            }, 500);
        });

    // Add shutdown class to body
    document.body.classList.add('shutdown-active');
}

// Bind both shutdown buttons
document.querySelectorAll('.start-item[data-action="shutdown"], #shutdown-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        triggerShutdown();
        // Close start menu if open
        const startMenu = document.querySelector('.start-menu');
        if (startMenu) {
            startMenu.classList.remove('visible');
        }
    });
});

// Add event listeners for shutdown actions
document.querySelectorAll('.start-item[data-action="shutdown"]').forEach(item => {
    item.addEventListener('click', handleShutdown);
});

// If there are other shutdown buttons, add event listeners here
// For example, a shutdown button with ID 'shutdown-btn'
const shutdownBtn = document.getElementById('shutdown-btn');
if (shutdownBtn) {
    shutdownBtn.addEventListener('click', handleShutdown);
}

function handleShutdown() {
    // Play shutdown sound
    const shutdownSound = new Audio('assets/audio/MicrosoftWindowsXPShutdownSound.mp3');
    shutdownSound.play();

    // Add shutdown animation classes if applicable
    document.body.classList.add('shutdown-active');

    // Optionally, show a screen overlay for visual effect
    const screenOverlay = document.querySelector('.screen-overlay');
    if (screenOverlay) {
        screenOverlay.classList.add('shutting-down');
    }

    // Redirect to home page after 1.2 seconds
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 1200);
}

/* ...existing code... */

// Ensure that the data-window attribute and IDs use 'pixos-window' consistently

// Audio utility
const playSound = (soundPath) => {
    const sound = new Audio(soundPath);
    return sound.play().catch(err => console.error('Error playing sound:', err));
};

// Modify contact error window handling
function showContactError() {
    const contactWindow = document.getElementById('contact-error-window');
    if (contactWindow) {
        // Play error sound
        const errorSound = new Audio('assets/audio/WindowsXPErrorSound.mp3');
        errorSound.play().catch(err => console.error('Error playing error sound:', err));
        
        // Show and position the window
        contactWindow.style.display = 'block';
        contactWindow.style.left = '50%';
        contactWindow.style.top = '50%';
        contactWindow.style.transform = 'translate(-50%, -50%)';
        bringToFront(contactWindow);
    }
}

// Update contact action in start menu
document.querySelectorAll('.start-item[data-action="contact"]').forEach(item => {
    item.addEventListener('click', showContactError);
});

// ...existing code...

function initializeDesktop() {
    // Bind icon clicks to open respective windows
    document.querySelectorAll('.icon').forEach(icon => {
        icon.addEventListener('click', () => {
            const windowId = icon.getAttribute('data-window');
            const windowElement = document.getElementById(windowId);
            windowElement.classList.add('active');
        });
    });
}

function bindTaskbarControls() {
    // Bind taskbar buttons such as shutdown, restart, etc.
    document.getElementById('shutdown-btn').addEventListener('click', shutdownComputer);
    // ...other taskbar bindings...
}

function shutdownComputer() {
    // Implement shutdown logic, possibly triggering CSS animations
    document.body.classList.add('shutdown-active');
}

function openWindow(windowId) {
    const windowElement = document.getElementById(windowId);
    if (windowElement) {
        windowElement.style.display = 'block';
        bringToFront(windowElement);
    }
}

// Ensure folders open their corresponding windows
document.querySelectorAll('.folder').forEach(folder => {
    folder.addEventListener('dblclick', () => {
        const windowId = folder.dataset.window;
        if (windowId) {
            openWindow(windowId);
        }
    });
});

// Bind shutdown button
document.querySelector('.start-item[data-action="shutdown"]').addEventListener('click', () => {
    triggerShutdown();
});

/* Create unified shutdown function */
function triggerShutdown() {
    // ...existing shutdown logic...

    // Add CRT shutdown effect
    document.body.classList.add('shutdown-active');
}

// ...existing code...