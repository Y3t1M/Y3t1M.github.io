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

    // Window management
    windows.forEach(window => {
        const titlebar = window.querySelector('.window-titlebar');
        const closeBtn = window.querySelector('.close-btn');
        
        // Set initial position
        window.style.left = '50%';
        window.style.top = '50%';
        window.style.transform = 'translate(-50%, -50%)';

        // Make window draggable
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
                    location.reload();
                    break;
                    
                case 'lock':
                    lockScreen.classList.add('visible');
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
        
        if (password === 'password') {
            lockScreen.classList.remove('visible');
            passwordField.value = '';
            errorMessage.textContent = '';
        } else {
            errorMessage.textContent = 'X incorrect';
            passwordField.value = '';
        }
    }
});