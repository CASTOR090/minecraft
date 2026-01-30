const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const playerScoreEl = document.getElementById('player-score');
const aiScoreEl = document.getElementById('ai-score');
const startScreen = document.getElementById('start-screen');
const soloBtn = document.getElementById('solo-btn');
const multiBtn = document.getElementById('multi-btn');
const soloText = document.getElementById('solo-text');
const multiText = document.getElementById('multi-text');

const p1NameInput = document.getElementById('p1-name-input');
const p2NameInput = document.getElementById('p2-name-input');
const p1InputGroup = document.getElementById('p1-input-group');
const p2InputGroup = document.getElementById('p2-input-group');
const p1NameDisplay = document.getElementById('p1-name-display');
const p2NameDisplay = document.getElementById('p2-name-display');

// Game Objects
const paddleWidth = 15;
const paddleHeightDefault = 80;
const ballSizeDefault = 10;
const paddleSpeedDefault = 12;

let player = {
    x: 20,
    y: canvas.height / 2 - paddleHeightDefault / 2,
    h: paddleHeightDefault,
    score: 0,
    color: '#00f3ff', // Neon Blue
    speed: paddleSpeedDefault,
    lastHit: false,
    name: "PLAYER 1"
};

let p2 = {
    x: canvas.width - 20 - paddleWidth,
    y: canvas.height / 2 - paddleHeightDefault / 2,
    h: paddleHeightDefault,
    score: 0,
    speed: 6, // Base AI Speed
    pSpeed: paddleSpeedDefault, // For multiplayer
    color: '#ff0055', // Neon Pink
    lastHit: false,
    name: "PLAYER 2"
};

let ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 5,
    vy: 5,
    size: ballSizeDefault,
    speed: 7,
    color: '#ffff00' // Yellow
};

// Power Up Config
const POWERUP_TYPES = [
    { name: 'BIG PADDLE', color: '#00ff00', action: (owner) => owner.h = 150 },
    { name: 'SMALL PADDLE', color: '#ff0000', action: (target) => target.h = 40 },
    { name: 'FAST PADDLE', color: '#ffff00', action: (owner) => owner.speed *= 1.5 },
    { name: 'SLOW BALL', color: '#ffffff', action: () => ball.speed = 5 },
    { name: 'FAST BALL', color: '#ff8800', action: () => ball.speed = 15 },
    { name: 'GHOST BALL', color: '#888888', action: () => ball.color = 'rgba(255,255,255,0.2)' },
    { name: 'SMALL BALL', color: '#00ffff', action: () => ball.size = 4 },
    { name: 'BIG BALL', color: '#ff00ff', action: () => ball.size = 25 },
    { name: 'INVERT', color: '#aa00ff', action: (target) => target.speed *= -1 },
    { name: 'SHAKE', color: '#ffffff', action: () => { /* Visual effect handled in draw */ } }
];

let activePowerUps = []; // Power-ups floating on screen
let powerUpTimer = 0;
let effectTimers = []; // Active effects currently running

let particles = [];
let isGameRunning = false;
let gameMode = 'solo';
let animationId;
let keys = {};

// Input Handling
canvas.addEventListener('mousemove', (e) => {
    if (!isGameRunning || gameMode !== 'solo') return;
    const rect = canvas.getBoundingClientRect();
    player.y = e.clientY - rect.top - player.h / 2;
});

window.addEventListener('keydown', (e) => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function startGame(mode) {
    gameMode = mode;

    // Set names
    player.name = p1NameInput.value.trim() || "PLAYER 1";
    p1NameDisplay.textContent = player.name;

    if (mode === 'solo') {
        p2.name = "AI";
        p2NameDisplay.textContent = "AI";
    } else {
        p2.name = p2NameInput.value.trim() || "PLAYER 2";
        p2NameDisplay.textContent = p2.name;
    }

    isGameRunning = true;
    startScreen.classList.add('hidden');
    clearEffects();
    player.score = 0; p2.score = 0;
    resetGameObjects();
    updateScore();
    animate();
}

function resetGameObjects() {
    player.y = canvas.height / 2 - paddleHeightDefault / 2;
    p2.y = canvas.height / 2 - paddleHeightDefault / 2;
    activePowerUps = [];
    resetStats();
    resetBall();
}

function resetStats() {
    player.h = paddleHeightDefault;
    p2.h = paddleHeightDefault;
    player.speed = paddleSpeedDefault;
    p2.pSpeed = paddleSpeedDefault;
    ball.size = ballSizeDefault;
    ball.color = '#ffff00';
    ball.size = ballSizeDefault;
}

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.speed = 7;
    ball.vx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.vy = (Math.random() * 2 - 1) * ball.speed;
    player.lastHit = false;
    p2.lastHit = false;
}

function spawnPowerUp() {
    const type = POWERUP_TYPES[Math.floor(Math.random() * POWERUP_TYPES.length)];
    activePowerUps.push({
        x: 100 + Math.random() * (canvas.width - 200),
        y: 50 + Math.random() * (canvas.height - 100),
        type: type,
        size: 45,
        pulse: 0
    });
}

function applyPowerUp(type) {
    const lastHitter = player.lastHit ? player : (p2.lastHit ? p2 : null);
    const other = lastHitter === player ? p2 : player;

    // Apply special logic
    type.action(lastHitter || player, other);

    // Set 15 second reset timer
    effectTimers.push(setTimeout(() => {
        resetStats();
    }, 15000));
}

function clearEffects() {
    effectTimers.forEach(t => clearTimeout(t));
    effectTimers = [];
}

function update() {
    // 1. Move Ball
    ball.x += ball.vx;
    ball.y += ball.vy;

    // 2. Ball Wall Collision
    if (ball.y < 0 || ball.y + ball.size > canvas.height) {
        ball.vy = -ball.vy;
        createParticles(ball.x, ball.y, '#fff');
    }

    // 3. Paddle Movement
    if (gameMode === 'multi') {
        if (keys['w']) player.y -= player.speed;
        if (keys['s']) player.y += player.speed;
        if (keys['arrowup']) p2.y -= (p2.pSpeed || p2.speed);
        if (keys['arrowdown']) p2.y += (p2.pSpeed || p2.speed);
    } else {
        const p2Center = p2.y + p2.h / 2;
        if (p2Center < ball.y - 10) p2.y += p2.speed;
        else if (p2Center > ball.y + 10) p2.y -= p2.speed;
    }

    // Clamp
    [player, p2].forEach(p => {
        if (p.y < 0) p.y = 0;
        if (p.y > canvas.height - p.h) p.y = canvas.height - p.h;
    });

    // 4. PowerUp Spawning & Collision
    powerUpTimer++;
    if (powerUpTimer > 180) { // Every ~3 seconds
        spawnPowerUp();
        powerUpTimer = 0;
    }

    for (let i = activePowerUps.length - 1; i >= 0; i--) {
        let pu = activePowerUps[i];
        pu.pulse += 0.1;

        // Easier collision: check if ball is close to powerup center
        let distX = Math.abs((ball.x + ball.size / 2) - (pu.x + pu.size / 2));
        let distY = Math.abs((ball.y + ball.size / 2) - (pu.y + pu.size / 2));

        if (distX < (pu.size / 2 + ball.size) && distY < (pu.size / 2 + ball.size)) {
            applyPowerUp(pu.type);
            createParticles(pu.x + pu.size / 2, pu.y + pu.size / 2, pu.type.color, 20);
            activePowerUps.splice(i, 1);
        }
    }

    // 5. Paddle Collision
    if (ball.x < player.x + paddleWidth && ball.x + ball.size > player.x &&
        ball.y < player.y + player.h && ball.y + ball.size > player.y) {
        ball.vx = Math.abs(ball.vx);
        increaseSpeed();
        ball.vx = ball.speed;
        ball.vy = (ball.y - (player.y + player.h / 2)) * 0.2;
        player.lastHit = true; p2.lastHit = false;
        createParticles(ball.x, ball.y, player.color);
    }

    if (ball.x < p2.x + paddleWidth && ball.x + ball.size > p2.x &&
        ball.y < p2.y + p2.h && ball.y + ball.size > p2.y) {
        ball.vx = -Math.abs(ball.vx);
        increaseSpeed();
        ball.vx = -ball.speed;
        ball.vy = (ball.y - (p2.y + p2.h / 2)) * 0.2;
        p2.lastHit = true; player.lastHit = false;
        createParticles(ball.x + ball.size, ball.y, p2.color);
    }

    // 6. Scoring
    if (ball.x < 0) {
        p2.score++; updateScore(); resetBall();
    } else if (ball.x > canvas.width) {
        player.score++; updateScore(); resetBall();
    }

    updateParticles();
}

function increaseSpeed() { if (ball.speed < 20) ball.speed += 0.4; }
function updateScore() { playerScoreEl.textContent = player.score; aiScoreEl.textContent = p2.score; }

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    activePowerUps.forEach(pu => {
        ctx.shadowBlur = 10 + Math.sin(pu.pulse) * 5;
        ctx.shadowColor = pu.type.color;
        ctx.fillStyle = pu.type.color;
        ctx.fillRect(pu.x, pu.y, pu.size, pu.size);
        ctx.shadowBlur = 0;
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Orbitron";
        ctx.fillText("?", pu.x + pu.size / 2 - 7, pu.y + pu.size / 2 + 8);
    });

    drawRect(player.x, player.y, paddleWidth, player.h, player.color);
    drawRect(p2.x, p2.y, paddleWidth, p2.h, p2.color);

    ctx.shadowBlur = 15;
    ctx.shadowColor = ball.color;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x + ball.size / 2, ball.y + ball.size / 2, ball.size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

function drawRect(x, y, w, h, color) {
    ctx.shadowBlur = 20; ctx.shadowColor = color;
    ctx.fillStyle = color; ctx.fillRect(x, y, w, h);
    ctx.shadowBlur = 0;
}

function createParticles(x, y, color, count = 10) {
    for (let i = 0; i < count; i++) {
        particles.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 5, vy: (Math.random() - 0.5) * 5,
            life: 1, color: color, size: Math.random() * 3 + 1
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.x += p.vx; p.y += p.vy; p.life -= 0.03;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function animate() {
    if (!isGameRunning) return;
    update(); draw(); requestAnimationFrame(animate);
}

// Hover effects reveal inputs
soloBtn.addEventListener('mouseenter', () => {
    soloText.classList.remove('hidden');
    multiText.classList.add('hidden');
    p1InputGroup.classList.remove('hidden');
    p2InputGroup.classList.add('hidden');
});

multiBtn.addEventListener('mouseenter', () => {
    multiText.classList.remove('hidden');
    soloText.classList.add('hidden');
    p1InputGroup.classList.remove('hidden');
    p2InputGroup.classList.remove('hidden');
});

soloBtn.addEventListener('click', () => startGame('solo'));
multiBtn.addEventListener('click', () => startGame('multi'));

draw();
