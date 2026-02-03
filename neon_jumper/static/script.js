const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

const singleBtn = document.getElementById('single-btn');
const multiBtn = document.getElementById('multi-btn');
const p1Controls = document.getElementById('p1-controls');
const p2Controls = document.getElementById('p2-controls');

// Game constants
const GRAVITY = 0.28;
const JUMP_FORCE = -10.5;
const PLATFORM_WIDTH = 70;
const PLATFORM_HEIGHT = 10;
const PLAYER_SIZE = 20;

let isGameRunning = false;
let isMultiplayer = false;
let score = 0;
let highScore = localStorage.getItem('neon_jumper_highscore') || 0;
highScoreEl.textContent = highScore;

let players = [];
let platforms = [];
let particles = [];
let keys = {};
let animationId;

function init() {
    score = 0;
    scoreEl.textContent = '0';

    players = [];
    // Player 1 (Cyan)
    players.push({
        x: canvas.width / 2 - PLAYER_SIZE - 10,
        y: canvas.height - 70,
        width: PLAYER_SIZE,
        height: PLAYER_SIZE,
        vx: 0,
        vy: 0,
        color: '#00f3ff',
        isDead: false,
        id: 'P1'
    });

    if (isMultiplayer) {
        // Player 2 (Purple/Pink)
        players.push({
            x: canvas.width / 2 + 10,
            y: canvas.height - 70,
            width: PLAYER_SIZE,
            height: PLAYER_SIZE,
            vx: 0,
            vy: 0,
            color: '#ff0055',
            isDead: false,
            id: 'P2'
        });
    }

    platforms = [];
    // Starting platform
    platforms.push({
        x: canvas.width / 2 - 60,
        y: canvas.height - 50,
        width: 120,
        height: PLATFORM_HEIGHT,
        color: '#00f3ff',
        isBroken: false,
        moved: 0
    });

    // Initial platforms
    for (let i = 1; i < 7; i++) {
        spawnPlatform(canvas.height - i * 100);
    }
}

function spawnPlatform(y) {
    const currentScore = Math.floor(score / 10);
    const dynamicWidth = Math.max(40, PLATFORM_WIDTH - Math.floor(currentScore / 200));
    const moveChance = Math.min(0.6, 0.2 + (currentScore / 1000));
    const breakChance = Math.min(0.4, 0.1 + (currentScore / 1500));
    const x = Math.random() * (canvas.width - dynamicWidth);

    platforms.push({
        x: x,
        y: y,
        width: dynamicWidth,
        height: PLATFORM_HEIGHT,
        color: '#bc13fe',
        isBroken: Math.random() < breakChance,
        moved: Math.random() < moveChance ? (Math.random() < 0.5 ? (2 + currentScore / 500) : -(2 + currentScore / 500)) : 0
    });
}

function update() {
    if (!isGameRunning) return;

    players.forEach(p => {
        if (p.isDead) return;

        // movement
        if (p.id === 'P1') {
            if (keys['arrowleft']) p.vx = -6;
            else if (keys['arrowright']) p.vx = 6;
            else p.vx *= 0.8;
        } else {
            if (keys['a']) p.vx = -6;
            else if (keys['d']) p.vx = 6;
            else p.vx *= 0.8;
        }

        p.vy += GRAVITY;
        p.x += p.vx;
        p.y += p.vy;

        // Screen wrapping
        if (p.x + p.width < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = -p.width;

        // Platform collision
        platforms.forEach((plat, index) => {
            if (p.vy > 0 &&
                p.x + p.width > plat.x &&
                p.x < plat.x + plat.width &&
                p.y + p.height > plat.y &&
                p.y + p.height < plat.y + plat.height + p.vy) {

                p.vy = JUMP_FORCE;
                createJumpParticles(p.x + p.width / 2, p.y + p.height, p.color);

                if (plat.isBroken) {
                    platforms.splice(index, 1);
                }
            }
        });

        // Death check
        if (p.y > canvas.height) {
            p.isDead = true;
        }
    });

    // Handle moving platforms
    platforms.forEach(p => {
        if (p.moved !== 0) {
            p.x += p.moved;
            if (p.x <= 0 || p.x + p.width >= canvas.width) p.moved *= -1;
        }
    });

    // Camera movement - follow the highest ALIVE player
    let highestAliveY = canvas.height;
    let anyAlive = false;
    players.forEach(p => {
        if (!p.isDead) {
            anyAlive = true;
            if (p.y < highestAliveY) highestAliveY = p.y;
        }
    });

    if (!anyAlive) {
        gameOver();
        return;
    }

    if (highestAliveY < canvas.height / 2) {
        const diff = canvas.height / 2 - highestAliveY;
        score += Math.floor(diff);
        scoreEl.textContent = Math.floor(score / 10);

        platforms.forEach(p => p.y += diff);
        players.forEach(p => p.y += diff);
    }

    // Replace off-screen platforms
    for (let i = platforms.length - 1; i >= 0; i--) {
        if (platforms[i].y > canvas.height) {
            platforms.splice(i, 1);
            let highestPlatY = canvas.height;
            if (platforms.length > 0) {
                highestPlatY = platforms[0].y;
                platforms.forEach(p => { if (p.y < highestPlatY) highestPlatY = p.y; });
            }
            const currentScore = Math.floor(score / 10);
            const gap = 85 + Math.random() * 25 + Math.min(20, currentScore / 500);
            spawnPlatform(highestPlatY - gap);
        }
    }

    if (platforms.length < 7) {
        let hY = platforms.length > 0 ? platforms[0].y : canvas.height;
        platforms.forEach(p => { if (p.y < hY) hY = p.y; });
        spawnPlatform(hY - 100);
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
        ctx.fillStyle = 'rgba(255,255,255,0.3)';
        ctx.fillRect(p.x + 2, p.y + 2, p.width - 4, 2);
    });

    // Draw players
    players.forEach(p => {
        if (p.isDead) return;
        ctx.shadowBlur = 20;
        ctx.shadowColor = p.color;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.width, p.height);
        ctx.fillStyle = '#fff';
        ctx.fillRect(p.x + 4, p.y + 4, 4, 4);
    });

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

function createJumpParticles(x, y, color) {
    for (let i = 0; i < 8; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 4,
            vy: Math.random() * 2,
            size: Math.random() * 3 + 1,
            color: color,
            life: 1
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy;
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

singleBtn.addEventListener('click', () => {
    isMultiplayer = false;
    singleBtn.classList.add('active');
    multiBtn.classList.remove('active');
    p2Controls.classList.add('hidden');
});

multiBtn.addEventListener('click', () => {
    isMultiplayer = true;
    multiBtn.classList.add('active');
    singleBtn.classList.remove('active');
    p2Controls.classList.remove('hidden');
});

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);

// Initial draw
init();
