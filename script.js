const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const GameState = {
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAMEOVER: 'gameover',
    VICTORY: 'victory',
    LEVEL_COMPLETE: 'levelComplete'
};

const COLORS = {
    cyan: '#00ffff',
    magenta: '#ff00ff',
    purple: '#9d00ff',
    lime: '#39ff14',
    pink: '#ff6ec7',
    orange: '#ff6600',
    blue: '#4488ff',
    red: '#ff4444'
};

const POWERUP_TYPES = {
    MULTIBALL: { name: 'multiball', color: COLORS.cyan, duration: 0 },
    WIDE: { name: 'wide', color: COLORS.purple, duration: 10000 },
    SLOW: { name: 'slow', color: COLORS.blue, duration: 8000 },
    LIFE: { name: 'life', color: COLORS.magenta, duration: 0 },
    FIRE: { name: 'fire', color: COLORS.orange, duration: 6000 }
};

class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = (Math.random() - 0.5) * 8;
        this.alpha = 1;
        this.decay = 0.02 + Math.random() * 0.02;
        this.size = 2 + Math.random() * 4;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += 0.1;
        this.alpha -= this.decay;
        this.size *= 0.98;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    isDead() {
        return this.alpha <= 0;
    }
}

class Trail {
    constructor() {
        this.points = [];
        this.maxPoints = 15;
    }

    addPoint(x, y) {
        this.points.push({ x, y, alpha: 1 });
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    update() {
        for (let i = 0; i < this.points.length; i++) {
            this.points[i].alpha = (i + 1) / this.points.length;
        }
    }

    draw(ctx, color) {
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            ctx.save();
            ctx.globalAlpha = point.alpha * 0.5;
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5 * point.alpha, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    }

    clear() {
        this.points = [];
    }
}

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.width = 30;
        this.height = 15;
        this.vy = 2;
        this.pulsePhase = 0;
    }

    update() {
        this.y += this.vy;
        this.pulsePhase += 0.1;
    }

    draw(ctx) {
        const pulse = 1 + Math.sin(this.pulsePhase) * 0.2;
        ctx.save();
        ctx.fillStyle = this.type.color;
        ctx.shadowColor = this.type.color;
        ctx.shadowBlur = 15 * pulse;
        
        const w = this.width * pulse;
        const h = this.height * pulse;
        
        ctx.fillRect(this.x - w / 2, this.y - h / 2, w, h);
        
        ctx.fillStyle = '#fff';
        ctx.font = '10px Orbitron';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(this.type.name.charAt(0).toUpperCase(), this.x, this.y);
        ctx.restore();
    }

    isOffScreen() {
        return this.y > canvas.height + 20;
    }

    collidesWith(paddle) {
        return this.x > paddle.x - paddle.width / 2 &&
               this.x < paddle.x + paddle.width / 2 &&
               this.y + this.height / 2 > paddle.y - paddle.height / 2 &&
               this.y - this.height / 2 < paddle.y + paddle.height / 2;
    }
}

class Brick {
    constructor(x, y, width, height, color, hits = 1, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.color = color;
        this.hits = hits;
        this.maxHits = hits;
        this.type = type;
        this.alive = true;
        this.pulsePhase = Math.random() * Math.PI * 2;
        this.hasPowerUp = Math.random() < 0.15;
    }

    update() {
        this.pulsePhase += 0.05;
    }

    draw(ctx) {
        if (!this.alive) return;

        const pulse = 1 + Math.sin(this.pulsePhase) * 0.1;
        const alpha = 0.5 + (this.hits / this.maxHits) * 0.5;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = this.color;
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10 * pulse;

        const w = this.width * pulse;
        const h = this.height * pulse;

        ctx.fillRect(this.x - w / 2, this.y - h / 2, w, h);

        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1;
        ctx.strokeRect(this.x - w / 2 + 2, this.y - h / 2 + 2, w - 4, h - 4);

        if (this.type === 'tough') {
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px Orbitron';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(this.hits.toString(), this.x, this.y);
        }

        ctx.restore();
    }

    hit() {
        this.hits--;
        if (this.hits <= 0) {
            this.alive = false;
            return true;
        }
        return false;
    }

    getPowerUpType() {
        if (!this.hasPowerUp) return null;
        const types = Object.values(POWERUP_TYPES);
        return types[Math.floor(Math.random() * types.length)];
    }
}

class Ball {
    constructor(x, y, radius = 8, speed = 4) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.baseSpeed = speed;
        this.speed = this.baseSpeed;
        this.vx = 0;
        this.vy = 0;
        this.attached = true;
        this.trail = new Trail();
        this.color = COLORS.cyan;
        this.isFire = false;
        this.isSlow = false;
    }

    launch(angle = -Math.PI / 2 + (Math.random() - 0.5) * 0.5) {
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
        this.attached = false;
    }

    update(paddle) {
        if (this.attached) {
            this.x = paddle.x;
            this.y = paddle.y - paddle.height / 2 - this.radius - 5;
            return;
        }

        this.trail.addPoint(this.x, this.y);
        this.trail.update();

        this.x += this.vx;
        this.y += this.vy;

        if (this.x - this.radius < 0) {
            this.x = this.radius;
            this.vx *= -1;
        }
        if (this.x + this.radius > canvas.width) {
            this.x = canvas.width - this.radius;
            this.vx *= -1;
        }
        if (this.y - this.radius < 0) {
            this.y = this.radius;
            this.vy *= -1;
        }
    }

    draw(ctx) {
        this.trail.draw(ctx, this.isFire ? COLORS.orange : (this.isSlow ? COLORS.blue : COLORS.cyan));

        ctx.save();
        ctx.fillStyle = this.isFire ? COLORS.orange : (this.isSlow ? COLORS.blue : COLORS.cyan);
        ctx.shadowColor = this.isFire ? COLORS.orange : (this.isSlow ? COLORS.blue : COLORS.cyan);
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(this.x - 2, this.y - 2, this.radius / 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    collidesWithBrick(brick) {
        if (!brick.alive) return false;

        const closestX = Math.max(brick.x - brick.width / 2, Math.min(this.x, brick.x + brick.width / 2));
        const closestY = Math.max(brick.y - brick.height / 2, Math.min(this.y, brick.y + brick.height / 2));

        const dx = this.x - closestX;
        const dy = this.y - closestY;

        return (dx * dx + dy * dy) < (this.radius * this.radius);
    }

    collidesWithPaddle(paddle) {
        return this.y + this.radius > paddle.y - paddle.height / 2 &&
               this.y - this.radius < paddle.y + paddle.height / 2 &&
               this.x > paddle.x - paddle.width / 2 &&
               this.x < paddle.x + paddle.width / 2;
    }

    bounceOffPaddle(paddle) {
        const hitPos = (this.x - paddle.x) / (paddle.width / 2);
        const angle = hitPos * (Math.PI / 3);
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        
        this.vx = Math.sin(angle) * speed;
        this.vy = -Math.abs(Math.cos(angle) * speed);
        this.y = paddle.y - paddle.height / 2 - this.radius;
    }

    bounceOffBrick(brick, horizontal) {
        if (this.isFire) return;
        
        if (horizontal) {
            this.vx *= -1;
        } else {
            this.vy *= -1;
        }
    }

    isOffScreen() {
        return this.y - this.radius > canvas.height;
    }
}

class Paddle {
    constructor() {
        this.width = 100;
        this.baseWidth = 100;
        this.height = 15;
        this.x = canvas.width / 2;
        this.y = canvas.height - 40;
        this.targetX = this.x;
        this.velocity = 0;
        this.isWide = false;
    }

    update() {
        if (this.velocity !== 0) {
            this.x += this.velocity;
        }
        
        if (this.x - this.width / 2 < 0) {
            this.x = this.width / 2;
        }
        if (this.x + this.width / 2 > canvas.width) {
            this.x = canvas.width - this.width / 2;
        }
    }

    draw(ctx) {
        ctx.save();
        
        const gradient = ctx.createLinearGradient(
            this.x - this.width / 2, this.y,
            this.x + this.width / 2, this.y
        );
        gradient.addColorStop(0, COLORS.magenta);
        gradient.addColorStop(0.5, this.isWide ? COLORS.purple : COLORS.magenta);
        gradient.addColorStop(1, COLORS.magenta);

        ctx.fillStyle = gradient;
        ctx.shadowColor = COLORS.magenta;
        ctx.shadowBlur = 20;

        ctx.beginPath();
        ctx.roundRect(
            this.x - this.width / 2,
            this.y - this.height / 2,
            this.width,
            this.height,
            5
        );
        ctx.fill();

        ctx.fillStyle = '#fff';
        ctx.globalAlpha = 0.5;
        ctx.beginPath();
        ctx.roundRect(
            this.x - this.width / 2 + 5,
            this.y - this.height / 2 + 2,
            this.width - 10,
            4,
            2
        );
        ctx.fill();

        ctx.restore();
    }

    moveTo(x) {
        this.targetX = x;
        this.velocity = 0;
    }

    setVelocity(v) {
        this.velocity = v;
    }

    setWide(wide) {
        this.isWide = wide;
        this.width = wide ? this.baseWidth * 1.5 : this.baseWidth;
    }

    reset() {
        this.x = canvas.width / 2;
        this.targetX = this.x;
        this.velocity = 0;
        this.setWide(false);
    }
}

class Game {
    constructor() {
        this.state = GameState.MENU;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.maxLevel = 5;
        
        this.paddle = new Paddle();
        this.balls = [];
        this.bricks = [];
        this.particles = [];
        this.powerUps = [];
        this.activePowerUps = {};
        
        this.screenShake = { x: 0, y: 0, intensity: 0 };
        this.keyLeft = false;
        this.keyRight = false;
        this.touchLeft = false;
        this.touchRight = false;
        
        this.settings = this.loadSettings();
        
        this.audioCtx = null;
        this.setupAudio();
        this.setupEventListeners();
        this.setupUI();
        this.applySettings();
        
        this.lastTime = 0;
        this.animationId = null;
    }

    loadSettings() {
        const saved = localStorage.getItem('brickBreakerSettings');
        if (saved) {
            return JSON.parse(saved);
        }
        return {
            paddleSpeed: 5,
            ballSpeed: 4,
            soundEnabled: true,
            touchControlsEnabled: false
        };
    }

    saveSettings() {
        localStorage.setItem('brickBreakerSettings', JSON.stringify(this.settings));
    }

    applySettings() {
        document.getElementById('paddleSpeed').value = this.settings.paddleSpeed;
        document.getElementById('paddleSpeedValue').textContent = this.settings.paddleSpeed;
        document.getElementById('ballSpeed').value = this.settings.ballSpeed;
        document.getElementById('ballSpeedValue').textContent = this.settings.ballSpeed;
        document.getElementById('soundToggle').checked = this.settings.soundEnabled;
        document.getElementById('touchToggle').checked = this.settings.touchControlsEnabled;
        this.updateTouchControls();
    }

    updateTouchControls() {
    }

    showSettings() {
        this.applySettings();
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
        document.getElementById('settingsScreen').classList.add('active');
    }

    hideSettings() {
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
        if (this.showSettingsFromPause) {
            this.showSettingsFromPause = false;
            document.getElementById('pauseScreen').classList.add('active');
        } else {
            document.getElementById('startScreen').classList.add('active');
        }
    }

    setupAudio() {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    playSound(type) {
        if (!this.audioCtx || !this.settings.soundEnabled) return;
        
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        
        switch (type) {
            case 'hit':
                oscillator.frequency.setValueAtTime(400, this.audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.1);
                gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.1);
                oscillator.start();
                oscillator.stop(this.audioCtx.currentTime + 0.1);
                break;
            case 'brick':
                oscillator.frequency.setValueAtTime(600, this.audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(300, this.audioCtx.currentTime + 0.15);
                gainNode.gain.setValueAtTime(0.15, this.audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.15);
                oscillator.start();
                oscillator.stop(this.audioCtx.currentTime + 0.15);
                break;
            case 'powerup':
                oscillator.type = 'sine';
                oscillator.frequency.setValueAtTime(400, this.audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.2);
                gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.2);
                oscillator.start();
                oscillator.stop(this.audioCtx.currentTime + 0.2);
                break;
            case 'lose':
                oscillator.type = 'sawtooth';
                oscillator.frequency.setValueAtTime(300, this.audioCtx.currentTime);
                oscillator.frequency.exponentialRampToValueAtTime(100, this.audioCtx.currentTime + 0.5);
                gainNode.gain.setValueAtTime(0.1, this.audioCtx.currentTime);
                gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioCtx.currentTime + 0.5);
                oscillator.start();
                oscillator.stop(this.audioCtx.currentTime + 0.5);
                break;
        }
    }

    setupEventListeners() {
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            this.paddle.moveTo((e.clientX - rect.left) * scaleX);
        });

        canvas.addEventListener('click', () => {
            if (this.state === GameState.PLAYING) {
                this.balls.forEach(ball => {
                    if (ball.attached) {
                        ball.launch();
                    }
                });
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space') {
                e.preventDefault();
                if (this.state === GameState.PLAYING) {
                    this.balls.forEach(ball => {
                        if (ball.attached) {
                            ball.launch();
                        }
                    });
                }
            }
            
            if (e.code === 'KeyP' && this.state === GameState.PLAYING) {
                this.pause();
            } else if (e.code === 'KeyP' && this.state === GameState.PAUSED) {
                this.resume();
            }

            if (e.code === 'KeyR') {
                this.restart();
            }

            if (e.code === 'ArrowLeft') {
                this.keyLeft = true;
                this.updatePaddleVelocity();
            }
            if (e.code === 'ArrowRight') {
                this.keyRight = true;
                this.updatePaddleVelocity();
            }
        });

        document.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft') {
                this.keyLeft = false;
                this.updatePaddleVelocity();
            }
            if (e.code === 'ArrowRight') {
                this.keyRight = false;
                this.updatePaddleVelocity();
            }
        });
    }

    updatePaddleVelocity() {
        const left = this.keyLeft || this.touchLeft;
        const right = this.keyRight || this.touchRight;
        
        if (left && right) {
            this.paddle.setVelocity(0);
        } else if (left) {
            this.paddle.setVelocity(-this.settings.paddleSpeed);
        } else if (right) {
            this.paddle.setVelocity(this.settings.paddleSpeed);
        } else {
            this.paddle.setVelocity(0);
        }
    }

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const touch = e.touches[0];
            this.paddle.moveTo((touch.clientX - rect.left) * scaleX);
        }, { passive: false });

        canvas.addEventListener('touchstart', (e) => {
            if (this.state === GameState.PLAYING) {
                this.balls.forEach(ball => {
                    if (ball.attached) {
                        ball.launch();
                    }
                });
            }
        });
    }

    setupUI() {
        document.getElementById('startButton').onclick = () => this.start();
        document.getElementById('settingsButton').onclick = () => this.showSettings();
        document.getElementById('backButton').onclick = () => this.hideSettings();
        document.getElementById('resumeButton').onclick = () => this.resume();
        document.getElementById('restartButton').onclick = () => this.restart();
        document.getElementById('menuButton').onclick = () => this.showMenu();
        document.getElementById('playAgainButton').onclick = () => this.restart();
        document.getElementById('victoryMenuButton').onclick = () => this.showMenu();
        document.getElementById('nextLevelButton').onclick = () => this.nextLevel();
        document.getElementById('hudPauseButton').onclick = () => this.pause();
        document.getElementById('pauseSettingsButton').onclick = () => this.openPauseSettings();
        document.getElementById('pauseMenuButton').onclick = () => this.showMenu();
        
        document.getElementById('paddleSpeed').oninput = (e) => {
            this.settings.paddleSpeed = parseInt(e.target.value);
            document.getElementById('paddleSpeedValue').textContent = this.settings.paddleSpeed;
            this.saveSettings();
        };
        
        document.getElementById('ballSpeed').oninput = (e) => {
            this.settings.ballSpeed = parseInt(e.target.value);
            document.getElementById('ballSpeedValue').textContent = this.settings.ballSpeed;
            this.saveSettings();
        };
        
        document.getElementById('soundToggle').onchange = (e) => {
            this.settings.soundEnabled = e.target.checked;
            this.saveSettings();
        };
        
        document.getElementById('touchToggle').onchange = (e) => {
            this.settings.touchControlsEnabled = e.target.checked;
            this.saveSettings();
            this.updateTouchControls();
        };
        
        const touchLeft = document.getElementById('touchLeft');
        const touchRight = document.getElementById('touchRight');
        
        const startLeft = (e) => {
            e.preventDefault();
            touchLeft.classList.add('active');
            this.touchLeft = true;
            this.updatePaddleVelocity();
        };
        const stopLeft = (e) => {
            e.preventDefault();
            touchLeft.classList.remove('active');
            this.touchLeft = false;
            this.updatePaddleVelocity();
        };
        
        const startRight = (e) => {
            e.preventDefault();
            touchRight.classList.add('active');
            this.touchRight = true;
            this.updatePaddleVelocity();
        };
        const stopRight = (e) => {
            e.preventDefault();
            touchRight.classList.remove('active');
            this.touchRight = false;
            this.updatePaddleVelocity();
        };
        
        touchLeft.addEventListener('touchstart', startLeft);
        touchLeft.addEventListener('touchend', stopLeft);
        touchLeft.addEventListener('touchcancel', stopLeft);
        touchLeft.addEventListener('mousedown', startLeft);
        touchLeft.addEventListener('mouseup', stopLeft);
        touchLeft.addEventListener('mouseleave', stopLeft);
        
        touchRight.addEventListener('touchstart', startRight);
        touchRight.addEventListener('touchend', stopRight);
        touchRight.addEventListener('touchcancel', stopRight);
        touchRight.addEventListener('mousedown', startRight);
        touchRight.addEventListener('mouseup', stopRight);
        touchRight.addEventListener('mouseleave', stopRight);
    }

    showMenu() {
        this.state = GameState.MENU;
        this.showOverlay('startScreen');
    }

    openPauseSettings() {
        this.showSettingsFromPause = true;
        this.showSettings();
    }

    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('level').textContent = this.level;
        document.getElementById('lives').textContent = this.lives;

        const powerupIcons = document.getElementById('powerup-icons');
        powerupIcons.innerHTML = '';
        
        for (const [name, powerUp] of Object.entries(this.activePowerUps)) {
            if (powerUp.remaining > 0) {
                const icon = document.createElement('div');
                icon.className = `powerup-icon ${name}`;
                icon.textContent = name.charAt(0).toUpperCase();
                powerupIcons.appendChild(icon);
            }
        }
    }

    showOverlay(id) {
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
        document.getElementById(id).classList.add('active');
    }

    hideOverlays() {
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
    }

    createLevel() {
        this.bricks = [];
        
        const brickColors = [COLORS.cyan, COLORS.magenta, COLORS.purple, COLORS.lime, COLORS.pink];
        const rows = Math.min(4 + Math.floor(this.level / 2), 7);
        const cols = 10;
        const brickWidth = 70;
        const brickHeight = 25;
        const padding = 5;
        const startX = (canvas.width - (cols * (brickWidth + padding) - padding)) / 2;
        const startY = 80;

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * (brickWidth + padding) + brickWidth / 2;
                const y = startY + row * (brickHeight + padding);
                const color = brickColors[row % brickColors.length];
                
                let hits = 1;
                let type = 'normal';
                
                if (row < 2 && this.level > 1) {
                    hits = 2;
                    type = 'tough';
                }
                if (row < 1 && this.level > 3) {
                    hits = 3;
                }

                this.bricks.push(new Brick(x, y, brickWidth, brickHeight, color, hits, type));
            }
        }
    }

    start() {
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        
        this.state = GameState.PLAYING;
        this.score = 0;
        this.lives = 3;
        this.level = 1;
        this.balls = [new Ball(this.paddle.x, this.paddle.y, 8, this.settings.ballSpeed)];
        this.particles = [];
        this.powerUps = [];
        this.activePowerUps = {};
        this.paddle.reset();
        
        this.createLevel();
        this.hideOverlays();
        this.updateUI();
        
        if (!this.animationId) {
            this.lastTime = performance.now();
            this.gameLoop(this.lastTime);
        }
    }

    restart() {
        this.start();
    }

    pause() {
        this.state = GameState.PAUSED;
        this.showOverlay('pauseScreen');
    }

    resume() {
        this.state = GameState.PLAYING;
        this.hideOverlays();
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    nextLevel() {
        this.level++;
        if (this.level > this.maxLevel) {
            this.victory();
            return;
        }
        
        this.balls = [new Ball(this.paddle.x, this.paddle.y, 8, this.settings.ballSpeed)];
        this.particles = [];
        this.powerUps = [];
        this.activePowerUps = {};
        this.paddle.reset();
        this.createLevel();
        this.hideOverlays();
        this.updateUI();
        this.state = GameState.PLAYING;
        this.lastTime = performance.now();
        this.gameLoop(this.lastTime);
    }

    gameOver() {
        this.state = GameState.GAMEOVER;
        this.balls = [];
        document.getElementById('finalScore').textContent = this.score;
        document.querySelectorAll('.overlay').forEach(o => o.classList.remove('active'));
        document.getElementById('gameoverScreen').classList.add('active');
        this.playSound('lose');
    }

    victory() {
        this.state = GameState.VICTORY;
        document.getElementById('victoryScore').textContent = this.score;
        this.showOverlay('victoryScreen');
    }

    levelComplete() {
        this.state = GameState.LEVEL_COMPLETE;
        document.getElementById('completedLevel').textContent = this.level;
        document.getElementById('levelScore').textContent = this.score;
        this.showOverlay('levelCompleteScreen');
    }

    loseLife() {
        this.lives--;
        this.updateUI();
        this.playSound('lose');
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            this.balls = [new Ball(this.paddle.x, this.paddle.y, 8, this.settings.ballSpeed)];
            this.paddle.reset();
            this.activePowerUps = {};
        }
    }

    addScreenShake(intensity) {
        this.screenShake.intensity = Math.min(this.screenShake.intensity + intensity, 15);
    }

    createExplosion(x, y, color, count = 15) {
        for (let i = 0; i < count; i++) {
            this.particles.push(new Particle(x, y, color));
        }
    }

    activatePowerUp(type) {
        this.playSound('powerup');
        
        switch (type.name) {
            case 'multiball':
                const newBalls = [];
                this.balls.forEach(ball => {
                    if (!ball.attached) {
                        for (let i = 0; i < 2; i++) {
                            const newBall = new Ball(ball.x, ball.y);
                            newBall.attached = false;
                            newBall.speed = ball.speed;
                            newBall.vx = ball.vx + (Math.random() - 0.5) * 4;
                            newBall.vy = ball.vy + (Math.random() - 0.5) * 2;
                            newBalls.push(newBall);
                        }
                    }
                });
                this.balls.push(...newBalls);
                break;
                
            case 'wide':
                this.paddle.setWide(true);
                this.activePowerUps.wide = { remaining: type.duration, total: type.duration };
                break;
                
            case 'slow':
                this.balls.forEach(ball => {
                    ball.isSlow = true;
                    ball.speed = ball.baseSpeed * 0.6;
                    const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                    if (currentSpeed > 0) {
                        ball.vx *= 0.6;
                        ball.vy *= 0.6;
                    }
                });
                this.activePowerUps.slow = { remaining: type.duration, total: type.duration };
                break;
                
            case 'life':
                this.lives++;
                this.updateUI();
                break;
                
            case 'fire':
                this.balls.forEach(ball => {
                    ball.isFire = true;
                    ball.color = COLORS.orange;
                });
                this.activePowerUps.fire = { remaining: type.duration, total: type.duration };
                break;
        }
    }

    updatePowerUps(deltaTime) {
        for (const [name, powerUp] of Object.entries(this.activePowerUps)) {
            powerUp.remaining -= deltaTime;
            
            if (powerUp.remaining <= 0) {
                switch (name) {
                    case 'wide':
                        this.paddle.setWide(false);
                        break;
                    case 'slow':
                        this.balls.forEach(ball => {
                            ball.isSlow = false;
                            ball.speed = ball.baseSpeed;
                            const currentSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
                            if (currentSpeed > 0) {
                                ball.vx *= ball.baseSpeed / currentSpeed;
                                ball.vy *= ball.baseSpeed / currentSpeed;
                            }
                        });
                        break;
                    case 'fire':
                        this.balls.forEach(ball => {
                            ball.isFire = false;
                        });
                        break;
                }
                delete this.activePowerUps[name];
            }
        }
        this.updateUI();
    }

    update(deltaTime) {
        if (this.state !== GameState.PLAYING) return;

        this.paddle.update();
        
        this.balls.forEach(ball => {
            ball.update(this.paddle);
            
            if (!ball.attached && ball.collidesWithPaddle(this.paddle)) {
                ball.bounceOffPaddle(this.paddle);
                this.playSound('hit');
                this.addScreenShake(2);
            }
        });

        this.balls.forEach(ball => {
            if (ball.attached) return;
            
            for (const brick of this.bricks) {
                if (brick.alive && ball.collidesWithBrick(brick)) {
                    const destroyed = brick.hit();
                    
                    if (destroyed) {
                        this.score += 100 * this.level;
                        this.createExplosion(brick.x, brick.y, brick.color, 20);
                        this.addScreenShake(5);
                        
                        const powerUpType = brick.getPowerUpType();
                        if (powerUpType) {
                            this.powerUps.push(new PowerUp(brick.x, brick.y, powerUpType));
                        }
                    } else {
                        this.createExplosion(ball.x, ball.y, brick.color, 5);
                        this.addScreenShake(2);
                    }
                    
                    const dx = ball.x - brick.x;
                    const dy = ball.y - brick.y;
                    const horizontal = Math.abs(dx) > Math.abs(dy);
                    
                    if (!ball.isFire) {
                        ball.bounceOffBrick(brick, horizontal);
                    }
                    
                    this.playSound('brick');
                    break;
                }
            }
        });

        this.balls = this.balls.filter(ball => !ball.isOffScreen());
        
        if (this.balls.length === 0 && this.state === GameState.PLAYING) {
            this.loseLife();
        }

        this.powerUps.forEach(powerUp => {
            powerUp.update();
            if (powerUp.collidesWith(this.paddle)) {
                this.activatePowerUp(powerUp.type);
                powerUp.y = canvas.height + 100;
            }
        });
        this.powerUps = this.powerUps.filter(p => !p.isOffScreen());

        this.particles.forEach(p => p.update());
        this.particles = this.particles.filter(p => !p.isDead());

        this.bricks.forEach(b => b.update());

        this.updatePowerUps(deltaTime);

        if (this.screenShake.intensity > 0) {
            this.screenShake.x = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.y = (Math.random() - 0.5) * this.screenShake.intensity;
            this.screenShake.intensity *= 0.9;
            if (this.screenShake.intensity < 0.5) {
                this.screenShake.intensity = 0;
                this.screenShake.x = 0;
                this.screenShake.y = 0;
            }
        }

        const allBricksDestroyed = this.bricks.every(b => !b.alive);
        if (allBricksDestroyed) {
            this.levelComplete();
        }

        this.updateUI();
    }

    draw() {
        ctx.save();
        ctx.translate(this.screenShake.x, this.screenShake.y);

        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        for (let x = 0; x < canvas.width; x += 40) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = 0; y < canvas.height; y += 40) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }

        this.bricks.forEach(brick => brick.draw(ctx));
        this.powerUps.forEach(powerUp => powerUp.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
        this.paddle.draw(ctx);
        this.balls.forEach(ball => ball.draw(ctx));

        ctx.restore();
    }

    gameLoop(currentTime) {
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (this.state === GameState.PLAYING) {
            this.update(deltaTime);
        }
        
        this.draw();

        if (this.state !== GameState.MENU) {
            this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
        }
    }
}

const game = new Game();
game.draw();
