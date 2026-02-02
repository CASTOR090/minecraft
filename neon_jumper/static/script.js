const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

// Game constants
const GRAVITY = 0.28;
const JUMP_FORCE = -10.5;
const PLATFORM_WIDTH = 70;
const PLATFORM_HEIGHT = 10;
const PLAYER_SIZE = 20;

let isGameRunning = false;
let score = 0;
let highScore = localStorage.getItem('neon_jumper_highscore') || 0;
highScoreEl.textContent = highScore;

let player = {
    x: canvas.width / 2 - PLAYER_SIZE / 2,
    y: canvas.height - 100,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    vx: 0,
    vy: 0,
    color: '#00f3ff'
};

let platforms = [];
let particles = [];
let keys = {};
let animationId;

function init() {
    score = 0;
    scoreEl.textContent = '0';

    // Position player directly on the first platform
    player.x = canvas.width / 2 - PLAYER_SIZE / 2;
    player.y = canvas.height - 70; // Positioned right above the platform at -50
    player.vx = 0;
    player.vy = 0;

    platforms = [];
    // Starting platform - Explicitly fixed and slightly wider for a better start
    platforms.push({
        x: canvas.width / 2 - 50, // Center it (100 width)
        y: canvas.height - 50,
        width: 100, // Wider base
        height: PLATFORM_HEIGHT,
        color: '#00f3ff', // Cyan for safety
        isBroken: false,
        moved: 0
    });

    // Initial platforms
    for (let i = 1; i < 7; i++) {
        spawnPlatform(canvas.height - i * 100);
    }
}

function spawnPlatform(y) {
    const x = Math.random() * (canvas.width - PLATFORM_WIDTH);
    platforms.push({
        x: x,
        y: y,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        color: '#bc13fe',
        isBroken: Math.random() < 0.1, // Some platforms break
        moved: Math.random() < 0.2 ? (Math.random() < 0.5 ? 2 : -2) : 0 // Some move
    });
}

function update() {
    if (!isGameRunning) return;

    // Player movement
    if (keys['arrowleft'] || keys['a']) player.vx = -6;
    else if (keys['arrowright'] || keys['d']) player.vx = 6;
    else player.vx *= 0.8;

    player.vy += GRAVITY;
    player.x += player.vx;
    player.y += player.vy;

    // Screen wrapping
    if (player.x + player.width < 0) player.x = canvas.width;
    if (player.x > canvas.width) player.x = -player.width;

    // Platform logic
    platforms.forEach((p, index) => {
        // Handle moving platforms
        if (p.moved !== 0) {
            p.x += p.moved;
            if (p.x <= 0 || p.x + p.width >= canvas.width) p.moved *= -1;
        }

        // Collision logic
        if (player.vy > 0 &&
            player.x + player.width > p.x &&
            player.x < p.x + p.width &&
            player.y + player.height > p.y &&
            player.y + player.height < p.y + p.height + player.vy) {

            player.vy = JUMP_FORCE;
            createJumpParticles(player.x + player.width / 2, player.y + player.height);

            if (p.isBroken) {
                platforms.splice(index, 1);
            }
        }
    });

    // Camera movement
    if (player.y < canvas.height / 2) {
        const diff = canvas.height / 2 - player.y;
        player.y = canvas.height / 2;
        score += Math.floor(diff);
        scoreEl.textContent = Math.floor(score / 10);

        platforms.forEach((p) => {
            p.y += diff;
        });
    }

    // Replace off-screen platforms
    for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].y > canvas.height) {
            platforms.splice(i, 1);

            // Find the current highest platform to spawn above it
            let highestY = platforms[0].y;
            platforms.forEach(p => { if (p.y < highestY) highestY = p.y; });

            // Spawn new platform 80-100 pixels above the highest one
            spawnPlatform(highestY - (80 + Math.random() * 20));
        }
    }

    // Death check
    if (player.y > canvas.height) {
        gameOver();
    }

    updateParticles();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw platforms
    platforms.forEach(p => {
        ctx.shadowBlur = 15;
        ctx.shadowColor = p.isBroken ? '#ff0055' : p.color;
        ctx.fillStyle = ctx.shadowColor;
        ctx.fillRect(p.x, p.y, p.width, p.height);

        // Inner detail
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(p.x + 2, p.y + 2, p.width - 4, 2);
    });

    // Draw player
    ctx.shadowBlur = 20;
    ctx.shadowColor = player.color;
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Player shine
    ctx.fillStyle = '#fff';
    ctx.fillRect(player.x + 4, player.y + 4, 4, 4);

    // Draw particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
}

function createJumpParticles(x, y) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2,
            size: Math.random() * 3 + 1,
            color: player.color,
            life: 1
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function gameOver() {
    isGameRunning = false;
    cancelAnimationFrame(animationId);

    const finalScore = Math.floor(score / 10);
    finalScoreEl.textContent = finalScore;

    if (finalScore > highScore) {
        highScore = finalScore;
        localStorage.setItem('neon_jumper_highscore', highScore);
        highScoreEl.textContent = highScore;
    }

    gameOverScreen.classList.remove('hidden');
}

function startGame() {
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    isGameRunning = true;
    init();
    loop();
}

function loop() {
    update();
    draw();
    if (isGameRunning) animationId = requestAnimationFrame(loop);
}

// Event Listeners
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if (!isGameRunning && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame();
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial draw
init();
draw();
