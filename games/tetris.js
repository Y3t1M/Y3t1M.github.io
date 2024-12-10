class Tetris {
    constructor() {
        this.canvas = document.getElementById('tetris');
        this.ctx = this.canvas.getContext('2d');
        this.nextPieces = Array.from(document.querySelectorAll('.next-piece'))
            .map(canvas => canvas.getContext('2d'));
        
        // Initialize game state
        this.init();
        
        // Start the game loop
        this.lastDrop = Date.now();
        requestAnimationFrame(this.gameLoop.bind(this));
    }

    init() {
        // Game board (12x20)
        this.board = Array(20).fill().map(() => Array(12).fill(0));
        
        // Tetris pieces in their rotations
        this.pieces = {
            'I': [[[1,1,1,1]], [[1],[1],[1],[1]]],
            'O': [[[1,1],[1,1]]],
            'T': [[[0,1,0],[1,1,1]], [[1,0],[1,1],[1,0]], [[1,1,1],[0,1,0]], [[0,1],[1,1],[0,1]]],
            'S': [[[0,1,1],[1,1,0]], [[1,0],[1,1],[0,1]]],
            'Z': [[[1,1,0],[0,1,1]], [[0,1],[1,1],[1,0]]],
            'J': [[[1,0,0],[1,1,1]], [[1,1],[1,0],[1,0]], [[1,1,1],[0,0,1]], [[0,1],[0,1],[1,1]]],
            'L': [[[0,0,1],[1,1,1]], [[1,0],[1,0],[1,1]], [[1,1,1],[1,0,0]], [[1,1],[0,1],[0,1]]]
        };
        
        this.colors = {
            'I': '#00FFFF', // Cyan
            'O': '#FFFF00', // Yellow
            'T': '#800080', // Purple
            'S': '#00FF00', // Green
            'Z': '#FF0000', // Red
            'J': '#0000FF', // Blue
            'L': '#FFA500'  // Orange
        };
        
        this.blockSize = 20;
        this.currentPiece = null;
        this.currentPiecePosition = { x: 0, y: 0 };
        this.currentRotation = 0;
        
        this.score = 0;
        this.level = 1;
        this.lines = 0;
        this.gameOver = false;
        this.isPaused = false;
        
        this.dropInterval = 1000;
        this.lastDrop = Date.now();
        
        this.bag = this.createShuffledBag();
        this.nextPiecesBag = this.drawFromBag(3); // Initialize next 3 pieces
        
        this.initializeGame();
        this.bindControls();
        this.gameLoop();
        
        // Ensure pieces are drawn immediately
        this.spawnPiece();
        this.renderNextPieces();
        this.draw();
    }

    initializeGame() {
        this.spawnPiece();
        this.updateScore();
        this.renderNextPieces(); // Render initial next pieces
    }

    spawnPiece() {
        this.currentPiece = this.nextPiecesBag.shift(); // Assign the first next piece to currentPiece
        this.nextPiecesBag.push(this.drawFromBag(1)[0]); // Draw one piece from the bag
        this.renderNextPieces(); // Update the next pieces display
        this.currentRotation = 0;
        this.currentPiecePosition = {
            x: Math.floor((12 - this.currentPiece.shape[0].length) / 2),
            y: 0
        };
        
        // Check for game over
        if (!this.isValidMove(this.currentPiecePosition.x, this.currentPiecePosition.y)) {
            this.gameOver = true;
        }
    }

    getRandomPiece() {
        if (this.bag.length === 0) {
            this.bag = this.createShuffledBag();
        }
        const pieceType = this.bag.pop();
        return this.createPiece(pieceType);
    }

    createShuffledBag() {
        const pieces = Object.keys(this.pieces);
        let bag = [];

        // Add two of each piece to the bag
        pieces.forEach(piece => {
            bag.push(piece);
            bag.push(piece);
        });

        // Shuffle the bag
        for (let i = bag.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [bag[i], bag[j]] = [bag[j], bag[i]];
        }

        return bag;
    }

    drawFromBag(count) {
        const drawnPieces = [];
        for (let i = 0; i < count; i++) {
            if (this.bag.length === 0) {
                this.bag = this.createShuffledBag(); // Refill and shuffle the bag when empty
            }
            const pieceType = this.bag.pop();
            const piece = this.createPiece(pieceType);
            drawnPieces.push(piece);
        }
        return drawnPieces;
    }

    createPiece(pieceType) {
        return {
            type: pieceType,
            shape: this.pieces[pieceType][0],
            color: this.colors[pieceType]
        };
    }

    renderNextPieces() {
        // Clear all next piece canvases
        this.nextPieces.forEach(ctx => {
            const canvas = ctx.canvas;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Set dark tan background
            ctx.fillStyle = '#D2B48C';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });

        // Draw next pieces
        this.nextPieces.forEach((ctx, index) => {
            if (index < this.nextPiecesBag.length) {
                const piece = this.nextPiecesBag[index];
                this.drawPieceInCanvas(ctx, piece);
            }
        });
    }

    drawPieceInCanvas(ctx, piece) {
        const canvas = ctx.canvas;
        const blockSize = 15;
        const shape = piece.shape;
        
        // Calculate centering offsets
        const xOffset = (canvas.width - shape[0].length * blockSize) / 2;
        const yOffset = (canvas.height - shape.length * blockSize) / 2;

        shape.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    ctx.fillStyle = piece.color;
                    ctx.fillRect(
                        xOffset + x * blockSize,
                        yOffset + y * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            });
        });
    }

    bindControls() {
        document.addEventListener('keydown', (e) => {
            if (this.gameOver || this.isPaused) return;
            
            switch(e.key) {
                case 'a': // Move left with 'a' key
                    if (this.isValidMove(this.currentPiecePosition.x - 1, this.currentPiecePosition.y)) {
                        this.currentPiecePosition.x--;
                    }
                    break;
                case 'd': // Move right with 'd' key
                    if (this.isValidMove(this.currentPiecePosition.x + 1, this.currentPiecePosition.y)) {
                        this.currentPiecePosition.x++;
                    }
                    break;
                case 'ArrowRight': // Rotate clockwise with right arrow key
                    this.rotateClockwise();
                    break;
                case 'ArrowLeft': // Rotate counter-clockwise with left arrow key
                    this.rotateCounterClockwise();
                    break;
                case 's': // Hard drop with 's' key
                    this.hardDrop();
                    break;
                case 'w': // Slow drop with 'w' key
                    if (this.isValidMove(this.currentPiecePosition.x, this.currentPiecePosition.y + 1)) {
                        this.currentPiecePosition.y++;
                        this.score += 1;
                        this.updateScore();
                    }
                    break;
                case 'ArrowDown': // Existing down arrow functionality
                    if (this.isValidMove(this.currentPiecePosition.x, this.currentPiecePosition.y + 1)) {
                        this.currentPiecePosition.y++;
                        this.score += 1;
                        this.updateScore();
                    }
                    break;
                case ' ': // Spacebar can remain for hard drop if desired
                    this.hardDrop();
                    break;
                case 'p': // Pause with 'p' key
                    this.togglePause();
                    break;
            }
            this.draw();
        });
    }

    rotateClockwise() {
        const piece = this.currentPiece;
        const pieceRotations = this.pieces[piece.type];
        const nextRotation = (this.currentRotation + 1) % pieceRotations.length;
        const nextShape = pieceRotations[nextRotation];
        
        // Try rotation
        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = nextShape;
        
        if (this.isValidMove(this.currentPiecePosition.x, this.currentPiecePosition.y)) {
            this.currentRotation = nextRotation;
        } else {
            // Revert if invalid
            this.currentPiece.shape = originalShape;
        }
    }

    rotateCounterClockwise() {
        const piece = this.currentPiece;
        const pieceRotations = this.pieces[piece.type];
        const nextRotation = (this.currentRotation - 1 + pieceRotations.length) % pieceRotations.length;
        const nextShape = pieceRotations[nextRotation];

        // Try rotation
        const originalShape = this.currentPiece.shape;
        this.currentPiece.shape = nextShape;

        if (this.isValidMove(this.currentPiecePosition.x, this.currentPiecePosition.y)) {
            this.currentRotation = nextRotation;
        } else {
            // Revert if invalid
            this.currentPiece.shape = originalShape;
        }
    }

    hardDrop() {
        while (this.isValidMove(this.currentPiecePosition.x, this.currentPiecePosition.y + 1)) {
            this.currentPiecePosition.y++;
            this.score += 2;
        }
        this.lockPiece();
        this.updateScore();
    }

    isValidMove(x, y) {
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const newX = x + col;
                    const newY = y + row;
                    
                    if (newX < 0 || newX >= 12 || newY >= 20) return false;
                    if (newY >= 0 && this.board[newY][newX]) return false;
                }
            }
        }
        return true;
    }

    lockPiece() {
        for (let row = 0; row < this.currentPiece.shape.length; row++) {
            for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                if (this.currentPiece.shape[row][col]) {
                    const boardY = this.currentPiecePosition.y + row;
                    if (boardY >= 0) {
                        this.board[boardY][this.currentPiecePosition.x + col] = this.currentPiece.color;
                    }
                }
            }
        }
        
        this.clearLines();
        this.spawnPiece();
    }

    clearLines() {
        let linesCleared = 0;
        
        for (let row = this.board.length - 1; row >= 0; row--) {
            if (this.board[row].every(cell => cell !== 0)) {
                this.board.splice(row, 1);
                this.board.unshift(Array(12).fill(0));
                linesCleared++;
                row++; // Check the same row again
            }
        }
        
        if (linesCleared > 0) {
            this.lines += linesCleared;
            this.score += [0, 100, 300, 500, 800][linesCleared] * this.level;
            this.level = Math.floor(this.lines / 10) + 1;
            this.dropInterval = Math.max(100, 1000 - ((this.level - 1) * 100));
            this.updateScore();
        }
    }

    updateScore() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lines').textContent = this.lines;
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.lastDrop = Date.now();
            this.gameLoop();
        }
    }

    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#000'; // Black background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw board
        for (let row = 0; row < 20; row++) {
            for (let col = 0; col < 12; col++) {
                if (this.board[row][col]) {
                    this.drawBlock(col, row, this.board[row][col]);
                }
            }
        }
        
        // Draw ghost piece
        if (this.currentPiece) {
            this.drawGhostPiece();
        }

        // Draw current piece
        if (this.currentPiece) {
            for (let row = 0; row < this.currentPiece.shape.length; row++) {
                for (let col = 0; col < this.currentPiece.shape[row].length; col++) {
                    if (this.currentPiece.shape[row][col]) {
                        this.drawBlock(
                            this.currentPiecePosition.x + col,
                            this.currentPiecePosition.y + row,
                            this.currentPiece.color
                        );
                    }
                }
            }
        }
        
        // Draw game over
        if (this.gameOver) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FF0000';
            this.ctx.font = `${this.blockSize * 1.2}px 'Press Start 2P'`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2);
        }
        
        // Draw pause
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
            this.ctx.fillStyle = '#FFFF00';
            this.ctx.font = `${this.blockSize * 1.2}px 'Press Start 2P'`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText('PAUSED', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    drawGhostPiece() {
        const ctx = this.ctx;
        const blockSize = this.blockSize;
        const piece = this.currentPiece.shape;
        const ghostColor = 'rgba(128, 128, 128, 0.4)'; // Semi-transparent gray

        // Calculate ghost position
        let ghostY = this.currentPiecePosition.y;
        while (this.isValidMove(this.currentPiecePosition.x, ghostY + 1)) {
            ghostY++;
        }

        // Draw ghost piece
        piece.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell) {
                    ctx.fillStyle = ghostColor;
                    ctx.fillRect(
                        (this.currentPiecePosition.x + x) * blockSize,
                        (ghostY + y) * blockSize,
                        blockSize - 1,
                        blockSize - 1
                    );
                }
            });
        });
    }

    drawBlock(x, y, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x * this.blockSize, y * this.blockSize, this.blockSize - 1, this.blockSize - 1);
        this.ctx.strokeStyle = '#000';
        this.ctx.strokeRect(x * this.blockSize, y * this.blockSize, this.blockSize - 1, this.blockSize - 1);
    }

    gameLoop() {
        if (!this.gameOver && !this.isPaused) {
            const now = Date.now();
            if (now - this.lastDrop > this.dropInterval) {
                if (this.isValidMove(this.currentPiecePosition.x, this.currentPiecePosition.y + 1)) {
                    this.currentPiecePosition.y++;
                } else {
                    this.lockPiece();
                }
                this.lastDrop = now;
            }
            this.draw();
            requestAnimationFrame(this.gameLoop.bind(this));
        }
    }
}

// Initialize Tetris when the script loads
if (document.readyState === 'complete') {
    new Tetris();
} else {
    window.addEventListener('load', () => new Tetris());
}