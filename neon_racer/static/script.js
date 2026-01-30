const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const speedEl = document.getElementById('speed');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Mode Selection Elements
const singleBtn = document.getElementById('single-btn');
const multiBtn = document.getElementById('multi-btn');
const controlsP2 = document.getElementById('controls-p2');

// Game State
let isGameRunning = false;
let isMultiplayer = false;
let score = 0;
let gameSpeed = 10;
let players = [];
let obstacles = [];
let roadMarkers = [];
let animationId;
let particles = [];
let windLines = [];

const PLAYER_WIDTH = 45; // Increased from 40
const PLAYER_HEIGHT = 75; // Increased from 70
const OBSTACLE_WIDTH = 60; // Increased from 50
const OBSTACLE_HEIGHT = 60; // Increased from 50
const LANES = [100, 250, 400];

class Player {
    constructor(id, lane, color) {
        this.id = id;
        this.lane = lane;
        this.x = LANES[this.lane] - PLAYER_WIDTH / 2;
        this.y = canvas.height - 150;
        this.targetX = this.x;
        this.color = color;
        this.tilt = 0;
        this.exhaustTimer = 0;
        this.isCrashed = false;
    }

    update() {
        if (this.isCrashed) return;

        this.targetX = LANES[this.lane] - PLAYER_WIDTH / 2;
        const dx = this.targetX - this.x;
        this.x += dx * 0.12; // Slower movement (from 0.15) for more difficulty

        // Dynamic Tilt
        this.tilt = dx * 0.05;

        // Exhaust Particles
        this.exhaustTimer++;
        if (this.exhaustTimer % 2 === 0) {
            const px = this.x + PLAYER_WIDTH / 2 + (Math.random() - 0.5) * 10;
            const py = this.y + PLAYER_HEIGHT;
            particles.push(new Particle(px, py, '#ff0055', Math.random() * 2 + 1));
            particles.push(new Particle(px, py, this.color, Math.random() * 1.5 + 0.5));
        }
    }

    draw() {
        if (this.isCrashed) return;

        ctx.save();
        ctx.translate(this.x + PLAYER_WIDTH / 2, this.y + PLAYER_HEIGHT / 2);
        ctx.rotate(this.tilt);
        ctx.translate(-(this.x + PLAYER_WIDTH / 2), -(this.y + PLAYER_HEIGHT / 2));

        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        // Car body
        ctx.fillRect(this.x, this.y, PLAYER_WIDTH, PLAYER_HEIGHT);

        // Windows
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.fillRect(this.x + 5, this.y + 10, PLAYER_WIDTH - 10, 15);

        // Rear Thruster Glow
        const glowSize = 5 + Math.random() * 5;
        ctx.shadowBlur = 20;
        ctx.shadowColor = '#ff0055';
        ctx.fillStyle = '#ff0055';
        ctx.fillRect(this.x + 5, this.y + PLAYER_HEIGHT - 2, 10, glowSize);
        ctx.fillRect(this.x + PLAYER_WIDTH - 15, this.y + PLAYER_HEIGHT - 2, 10, glowSize);

        // Headlights
        ctx.shadowColor = '#ffff00';
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 3, this.y - 4, 12, 6);
        ctx.fillRect(this.x + PLAYER_WIDTH - 15, this.y - 4, 12, 6);

        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color, size) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = size;
        this.alpha = 1;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = Math.random() * 2 + 2;
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.05;
    }

    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Obstacle {
    constructor(lane) {
        this.lane = lane !== undefined ? lane : Math.floor(Math.random() * 3);
        this.x = LANES[this.lane] - OBSTACLE_WIDTH / 2;
        this.y = -OBSTACLE_HEIGHT;
        this.color = '#ff0055';
        this.type = Math.random() < 0.2 ? 'spike' : 'block';
    }

    update() {
        this.y += gameSpeed;
    }

    draw() {
        ctx.save();
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        if (this.type === 'spike') {
            ctx.beginPath();
            ctx.moveTo(this.x + OBSTACLE_WIDTH / 2, this.y);
            ctx.lineTo(this.x + OBSTACLE_WIDTH, this.y + OBSTACLE_HEIGHT);
            ctx.lineTo(this.x, this.y + OBSTACLE_HEIGHT);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(this.x, this.y, OBSTACLE_WIDTH, OBSTACLE_HEIGHT);
            ctx.strokeStyle = '#fff';
            ctx.strokeRect(this.x + 5, this.y + 5, OBSTACLE_WIDTH - 10, OBSTACLE_HEIGHT - 10);
        }

        ctx.restore();
    }
}

function init() {
    players = [];
    players.push(new Player(1, 1, '#00f3ff')); // P1 Start in Middle

    if (isMultiplayer) {
        players[0].lane = 0; // P1 Left
        players.push(new Player(2, 2, '#0aff00')); // P2 Right
    }

    obstacles = [];
    roadMarkers = [];
    particles = [];
    windLines = [];
    score = 0;
    gameSpeed = 10;
    scoreEl.textContent = '0';
    speedEl.textContent = '200';

    // Create initial road markers
    for (let i = 0; i < 10; i++) {
        roadMarkers.push({ y: i * 100 });
    }

    // Create initial wind lines
    for (let i = 0; i < 20; i++) {
        windLines.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            length: Math.random() * 30 + 10
        });
    }
}

function spawnObstacle() {
    if (!isGameRunning) return;

    // Randomly spawn in multiple lanes
    const chance = Math.random();
    if (chance < 0.3) { // 30% chance for double obstacles
        const lane1 = Math.floor(Math.random() * 3);
        let lane2 = Math.floor(Math.random() * 3);
        while (lane2 === lane1) lane2 = Math.floor(Math.random() * 3);
        obstacles.push(new Obstacle(lane1));
        obstacles.push(new Obstacle(lane2));
    } else {
        obstacles.push(new Obstacle());
    }

    const timeout = Math.max(300, 1500 - (score / 80)); // Faster spawning
    setTimeout(spawnObstacle, timeout);
}

function animate() {
    if (!isGameRunning) return;
    animationId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Road Background
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Road Edges
    ctx.strokeStyle = '#bc13fe';
    ctx.lineWidth = 5;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#bc13fe';
    ctx.beginPath();
    ctx.moveTo(50, 0); ctx.lineTo(50, canvas.height);
    ctx.moveTo(450, 0); ctx.lineTo(450, canvas.height);
    ctx.stroke();

    // Road Markers
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.setLineDash([40, 40]);
    ctx.beginPath();
    ctx.moveTo(175, 0); ctx.lineTo(175, canvas.height);
    ctx.moveTo(325, 0); ctx.lineTo(325, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Wind Lines (Speed effect)
    ctx.strokeStyle = 'rgba(0, 243, 255, 0.1)';
    ctx.lineWidth = 1;
    windLines.forEach(line => {
        ctx.beginPath();
        ctx.moveTo(line.x, line.y);
        ctx.lineTo(line.x, line.y + line.length);
        ctx.stroke();
        line.y += gameSpeed * 2.5;
        if (line.y > canvas.height) {
            line.y = -line.length;
            line.x = Math.random() * canvas.width;
        }
    });

    // Update & Draw Particles
    for (let i = particles.length - 1; i >= 0; i--) {
        particles[i].update();
        particles[i].draw();
        if (particles[i].alpha <= 0) particles.splice(i, 1);
    }

    // Update & Draw Players
    players.forEach(player => {
        player.update();
        player.draw();
    });

    // Update & Draw Obstacles
    for (let i = obstacles.length - 1; i >= 0; i--) {
        obstacles[i].update();
        obstacles[i].draw();

        // Collision Detection for each player
        players.forEach(player => {
            if (!player.isCrashed &&
                player.x < obstacles[i].x + OBSTACLE_WIDTH &&
                player.x + PLAYER_WIDTH > obstacles[i].x &&
                player.y < obstacles[i].y + OBSTACLE_HEIGHT &&
                player.y + PLAYER_HEIGHT > obstacles[i].y
            ) {
                if (isMultiplayer) {
                    player.isCrashed = true;
                    // Check if all players crashed
                    if (players.every(p => p.isCrashed)) {
                        gameOver();
                    }
                } else {
                    gameOver();
                }
            }
        });

        // Remove off-screen obstacles
        if (obstacles[i].y > canvas.height) {
            obstacles.splice(i, 1);
            score += 10;
            scoreEl.textContent = score;
            gameSpeed += 0.2; // Even faster acceleration
            speedEl.textContent = Math.floor(gameSpeed * 20);
        }
    }

    ctx.shadowBlur = 0;
}

function gameOver() {
    isGameRunning = false;
    cancelAnimationFrame(animationId);
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.textContent = score;
}

window.addEventListener('keydown', (e) => {
    if (!isGameRunning) return;

    // Player 1 Controls (A/D)
    if (e.key.toLowerCase() === 'a') {
        if (players[0] && !players[0].isCrashed && players[0].lane > 0) players[0].lane--;
    }
    if (e.key.toLowerCase() === 'd') {
        if (players[0] && !players[0].isCrashed && players[0].lane < 2) players[0].lane++;
    }

    // Player 2 Controls (Arrows)
    if (e.key === 'ArrowLeft') {
        if (isMultiplayer && players[1] && !players[1].isCrashed && players[1].lane > 0) players[1].lane--;
        // If single player, Arrows also work for P1
        else if (!isMultiplayer && players[0] && players[0].lane > 0) players[0].lane--;
    }
    if (e.key === 'ArrowRight') {
        if (isMultiplayer && players[1] && !players[1].isCrashed && players[1].lane < 2) players[1].lane++;
        else if (!isMultiplayer && players[0] && players[0].lane < 2) players[0].lane++;
    }
});

// Mode Selection
singleBtn.addEventListener('click', () => {
    isMultiplayer = false;
    singleBtn.classList.add('active');
    multiBtn.classList.remove('active');
    controlsP2.classList.add('hidden');
});

multiBtn.addEventListener('click', () => {
    isMultiplayer = true;
    multiBtn.classList.add('active');
    singleBtn.classList.remove('active');
    controlsP2.classList.remove('hidden');
});

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    isGameRunning = true;
    init();
    animate();
    spawnObstacle();
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    isGameRunning = true;
    init();
    animate();
    spawnObstacle();
});

// Initial scene
init();
players.forEach(p => p.draw());
