
class PixelEditor {
    constructor() {
        this.canvas = document.getElementById('pixelCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.isDrawing = false;
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.history = [];
        this.redoStack = [];
        this.maxHistory = 50;
        this.zoomLevel = 20; // Default zoom (pixels per cell)
        this.gridOverlay = document.getElementById('gridOverlay');
        this.gridCtx = this.gridOverlay.getContext('2d');
        this.minZoom = 4;
        this.maxZoom = 40;
        this.zoomLevel = 20;
        
        this.frames = [];
        this.currentFrameIndex = 0;
        this.isPlaying = false;
        this.isLooping = true;
        this.fps = 12;
        this.animationInterval = null;
        this.onionSkinEnabled = false;
        
        // Initialize with first frame
        this.addFrame();
        this.setupAnimationEventListeners();
        
        // Initialize canvas with default size
        this.setCanvasSize(32);
        this.setupEventListeners();
        this.setupExportEventListeners();
        this.setupWindowControlEventListeners();
    }

    initializeCanvas() {
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveState();
    }

    setupEventListeners() {
        // Drawing events
        this.canvas.addEventListener('mousedown', (e) => {
            this.isDrawing = true;
            this.handleDraw(e);
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) this.handleDraw(e);
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.isDrawing = false;
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.isDrawing = false;
        });

        // Tool buttons
        document.getElementById('brush').addEventListener('click', () => this.setTool('brush'));
        document.getElementById('eraser').addEventListener('click', () => this.setTool('eraser'));
        document.getElementById('fill').addEventListener('click', () => this.setTool('fill'));

        // Color picker
        document.getElementById('colorPicker').addEventListener('input', (e) => {
            this.currentColor = e.target.value;
        });

        // Clear canvas
        document.getElementById('clearCanvas').addEventListener('click', () => this.clearCanvas());

        // Add undo/redo listeners
        document.getElementById('undo').addEventListener('click', () => this.undo());
        document.getElementById('redo').addEventListener('click', () => this.redo());

        // Add canvas size control
        document.getElementById('canvasSize').addEventListener('change', (e) => {
            this.setCanvasSize(parseInt(e.target.value));
        });

        // Add zoom controls
        document.getElementById('zoomIn').addEventListener('click', () => this.zoom(1));
        document.getElementById('zoomOut').addEventListener('click', () => this.zoom(-1));
    }

    setupAnimationEventListeners() {
        document.getElementById('newFrame').addEventListener('click', () => this.addFrame());
        document.getElementById('duplicateFrame').addEventListener('click', () => this.duplicateFrame());
        document.getElementById('deleteFrame').addEventListener('click', () => this.deleteFrame());
        document.getElementById('playAnimation').addEventListener('click', () => this.playAnimation());
        document.getElementById('pauseAnimation').addEventListener('click', () => this.pauseAnimation());
        document.getElementById('loopAnimation').addEventListener('click', () => this.toggleLoop());
        document.getElementById('onionSkin').addEventListener('click', () => this.toggleOnionSkin());
        document.getElementById('fpsInput').addEventListener('change', (e) => {
            this.fps = parseInt(e.target.value);
            if (this.isPlaying) {
                this.pauseAnimation();
                this.playAnimation();
            }
        });
    }

    setupExportEventListeners() {
        document.getElementById('exportImage').addEventListener('click', () => this.exportImage());
        document.getElementById('exportGif').addEventListener('click', () => this.exportAnimation());
    }

    setupWindowControlEventListeners() {
        // Open PixOS Window
        document.getElementById('openPixOS').addEventListener('click', () => {
            const pixosWindow = document.getElementById('pixos-window');
            pixosWindow.classList.add('active');
        });

        // Minimize PixOS Window
        document.getElementById('minimizePixOS').addEventListener('click', () => {
            const pixosWindow = document.getElementById('pixos-window');
            pixosWindow.classList.toggle('minimized');
        });

        // Maximize PixOS Window
        document.getElementById('maximizePixOS').addEventListener('click', () => {
            const pixosWindow = document.getElementById('pixos-window');
            pixosWindow.classList.toggle('maximized');
        });

        // Close PixOS Window
        document.getElementById('closePixOS').addEventListener('click', () => {
            const pixosWindow = document.getElementById('pixos-window');
            pixosWindow.classList.remove('active');
        });
    }

    exportImage() {
        // Save current frame state
        const link = document.createElement('a');
        link.download = 'pixos-export.png';
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    async exportAnimation() {
        if (this.frames.length <= 1) {
            alert('Add more frames to export animation!');
            return;
        }

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');

        // Create GIF using gif.js library
        const gif = new GIF({
            workers: 2,
            quality: 10,
            width: this.canvas.width,
            height: this.canvas.height
        });

        // Add each frame to the GIF
        this.frames.forEach(frame => {
            tempCtx.putImageData(frame, 0, 0);
            gif.addFrame(tempCanvas, {delay: 1000 / this.fps});
        });

        // Render and download GIF
        gif.on('finished', blob => {
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.download = 'pixos-animation.gif';
            link.href = url;
            link.click();
            URL.revokeObjectURL(url);
        });

        gif.render();
    }

    setTool(tool) {
        this.currentTool = tool;
        document.querySelectorAll('.tool-group button').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(tool).classList.add('active');
    }

    saveState() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.push(imageData);
        this.redoStack = [];
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    handleDraw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scale = this.canvas.width / rect.width;
        const x = Math.floor((e.clientX - rect.left) * scale);
        const y = Math.floor((e.clientY - rect.top) * scale);

        if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) return;
        if (!this.isDrawing && this.currentTool !== 'fill') return;

        this.saveState();

        if (this.currentTool === 'fill') {
            this.floodFill(x, y);
        } else {
            const color = this.currentTool === 'eraser' ? '#FFFFFF' : this.currentColor;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }

    floodFill(startX, startY) {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const pixels = imageData.data;
        
        const startPos = (startY * this.canvas.width + startX) * 4;
        const startR = pixels[startPos];
        const startG = pixels[startPos + 1];
        const startB = pixels[startPos + 2];

        const fillColor = this.hexToRgb(this.currentColor);
        
        if (startR === fillColor.r && startG === fillColor.g && startB === fillColor.b) return;

        const stack = [[startX, startY]];

        while (stack.length > 0) {
            const [x, y] = stack.pop();
            const pos = (y * this.canvas.width + x) * 4;

            if (x < 0 || x >= this.canvas.width || y < 0 || y >= this.canvas.height) continue;
            if (pixels[pos] !== startR || pixels[pos + 1] !== startG || pixels[pos + 2] !== startB) continue;

            pixels[pos] = fillColor.r;
            pixels[pos + 1] = fillColor.g;
            pixels[pos + 2] = fillColor.b;
            pixels[pos + 3] = 255;

            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    undo() {
        if (this.history.length === 0) return;
        
        const currentState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.redoStack.push(currentState);
        
        const previousState = this.history.pop();
        this.ctx.putImageData(previousState, 0, 0);
    }

    redo() {
        if (this.redoStack.length === 0) return;
        
        const currentState = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.history.push(currentState);
        
        const nextState = this.redoStack.pop();
        this.ctx.putImageData(nextState, 0, 0);
    }

    clearCanvas() {
        this.saveState();
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.saveCurrentFrame();
        this.updateFramesDisplay();
    }

    redraw() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(imageData, 0, 0);
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        };
    }

    setCanvasSize(size) {
        // Store current content
        const oldContent = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        
        // Set new sizes for both canvases
        this.canvas.width = size;
        this.canvas.height = size;
        this.gridOverlay.width = size * this.zoomLevel;
        this.gridOverlay.height = size * this.zoomLevel;
        
        // Clear and fill main canvas
        this.ctx.fillStyle = '#FFFFFF';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Try to preserve content if resizing
        try {
            this.ctx.putImageData(oldContent, 0, 0);
        } catch(e) {
            // If error (e.g., new size is smaller), just leave the white canvas
        }
        
        this.updateCanvasDisplay();
        this.drawGrid();
        this.saveState();
    }

    zoom(direction) {
        const newZoom = this.zoomLevel + (direction * 4);
        if (newZoom >= this.minZoom && newZoom <= this.maxZoom) {
            this.zoomLevel = newZoom;
            this.updateCanvasDisplay();
            this.drawGrid();
        }
    }

    updateCanvasDisplay() {
        const displaySize = this.canvas.width * this.zoomLevel;
        this.canvas.style.width = `${displaySize}px`;
        this.canvas.style.height = `${displaySize}px`;
        
        // Update grid overlay size
        this.gridOverlay.width = displaySize;
        this.gridOverlay.height = displaySize;
        this.gridOverlay.style.width = `${displaySize}px`;
        this.gridOverlay.style.height = `${displaySize}px`;
    }

    drawGrid() {
        const gridCtx = this.gridCtx;
        const size = this.canvas.width * this.zoomLevel;
        
        gridCtx.clearRect(0, 0, size, size);
        gridCtx.strokeStyle = 'rgba(0, 0, 0, 0.1)';
        gridCtx.lineWidth = 1;

        // Draw vertical lines
        for (let x = 0; x <= size; x += this.zoomLevel) {
            gridCtx.beginPath();
            gridCtx.moveTo(x, 0);
            gridCtx.lineTo(x, size);
            gridCtx.stroke();
        }

        // Draw horizontal lines
        for (let y = 0; y <= size; y += this.zoomLevel) {
            gridCtx.beginPath();
            gridCtx.moveTo(0, y);
            gridCtx.lineTo(size, y);
            gridCtx.stroke();
        }
    }

    addFrame() {
        const frameData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        this.frames.push(frameData);
        this.currentFrameIndex = this.frames.length - 1;
        this.updateFramesDisplay();
    }

    duplicateFrame() {
        const currentFrame = this.frames[this.currentFrameIndex];
        const duplicateData = new ImageData(
            new Uint8ClampedArray(currentFrame.data),
            currentFrame.width,
            currentFrame.height
        );
        this.frames.splice(this.currentFrameIndex + 1, 0, duplicateData);
        this.currentFrameIndex++;
        this.updateFramesDisplay();
    }

    deleteFrame() {
        if (this.frames.length <= 1) return;
        this.frames.splice(this.currentFrameIndex, 1);
        this.currentFrameIndex = Math.min(this.currentFrameIndex, this.frames.length - 1);
        this.updateFramesDisplay();
        this.showFrame(this.currentFrameIndex);
    }

    updateFramesDisplay() {
        const container = document.getElementById('framesContainer');
        container.innerHTML = '';
        
        this.frames.forEach((frame, index) => {
            const canvas = document.createElement('canvas');
            canvas.width = this.canvas.width;
            canvas.height = this.canvas.height;
            canvas.className = 'frame-preview';
            if (index === this.currentFrameIndex) canvas.classList.add('selected');
            
            const ctx = canvas.getContext('2d');
            ctx.putImageData(frame, 0, 0);
            
            canvas.addEventListener('click', () => this.selectFrame(index));
            container.appendChild(canvas);
        });
    }

    selectFrame(index) {
        this.saveCurrentFrame();
        this.currentFrameIndex = index;
        this.showFrame(index);
        this.updateFramesDisplay();
    }

    saveCurrentFrame() {
        this.frames[this.currentFrameIndex] = this.ctx.getImageData(
            0, 0, this.canvas.width, this.canvas.height
        );
    }

    showFrame(index) {
        this.ctx.putImageData(this.frames[index], 0, 0);
        if (this.onionSkinEnabled) this.showOnionSkin();
    }

    showOnionSkin() {
        if (this.frames.length <= 1) return;
        
        const prevIndex = (this.currentFrameIndex - 1 + this.frames.length) % this.frames.length;
        const nextIndex = (this.currentFrameIndex + 1) % this.frames.length;
        
        // Create temporary canvas for onion skin
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        
        // Draw previous frame
        tempCtx.globalAlpha = 0.3;
        tempCtx.putImageData(this.frames[prevIndex], 0, 0);
        
        // Draw next frame
        tempCtx.putImageData(this.frames[nextIndex], 0, 0);
        
        // Overlay onion skin
        this.ctx.drawImage(tempCanvas, 0, 0);
    }

    playAnimation() {
        if (this.isPlaying) return;
        this.isPlaying = true;
        
        // Update button states
        document.getElementById('playAnimation').classList.add('active');
        document.getElementById('pauseAnimation').classList.remove('active');
        document.getElementById('playAnimation').classList.remove('inactive');
        document.getElementById('pauseAnimation').classList.add('inactive');
        
        this.animate();
    }

    pauseAnimation() {
        this.isPlaying = false;
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
        
        // Update button states
        document.getElementById('playAnimation').classList.remove('active');
        document.getElementById('pauseAnimation').classList.add('active');
        document.getElementById('playAnimation').classList.add('inactive');
        document.getElementById('pauseAnimation').classList.remove('inactive');
    }

    animate() {
        if (this.animationInterval) {
            clearInterval(this.animationInterval);
        }
        
        this.animationInterval = setInterval(() => {
            if (!this.isPlaying) return;
            
            this.currentFrameIndex++;
            if (this.currentFrameIndex >= this.frames.length) {
                if (this.isLooping) {
                    this.currentFrameIndex = 0;
                } else {
                    this.pauseAnimation();
                    return;
                }
            }
            
            this.showFrame(this.currentFrameIndex);
        }, 1000 / this.fps);
    }

    toggleLoop() {
        this.isLooping = !this.isLooping;
        const loopBtn = document.getElementById('loopAnimation');
        loopBtn.classList.toggle('active');
        
        // Add visual feedback
        if (this.isLooping) {
            loopBtn.textContent = "Loop ON";
        } else {
            loopBtn.textContent = "Loop OFF";
        }
    }

    toggleOnionSkin() {
        this.onionSkinEnabled = !this.onionSkinEnabled;
        const onionBtn = document.getElementById('onionSkin');
        onionBtn.classList.toggle('active');
        
        // Add visual feedback
        if (this.onionSkinEnabled) {
            onionBtn.textContent = "Onion ON";
        } else {
            onionBtn.textContent = "Onion OFF";
        }
        this.showFrame(this.currentFrameIndex);
    }
}

window.addEventListener('load', () => {
    new PixelEditor();
});

/* ...existing code... */
// Example: Adding the jump instruction dynamically
const gameContainer = document.querySelector('.game-container');
const jumpInstruction = document.createElement('div');
jumpInstruction.classList.add('jump-instruction');
jumpInstruction.innerHTML = '<p>Press Space or Click to Jump</p>';
gameContainer.appendChild(jumpInstruction);
/* ...existing code... */