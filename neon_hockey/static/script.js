const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const p1ScoreEl = document.getElementById('player-score');
const p2ScoreEl = document.getElementById('ai-score');
const startScreen = document.getElementById('start-screen');
const soloBtn = document.getElementById('solo-btn');
const multiBtn = document.getElementById('multi-btn');
const p1NameInput = document.getElementById('p1-name-input');
const p2NameInput = document.getElementById('p2-name-input');
const p1NameDisplay = document.getElementById('p1-name-display');
const p2NameDisplay = document.getElementById('p2-name-display');

// Physics Constants
const FRICTION = 0.998; // Faster (less friction)
const PADDLE_RADIUS = 45;
const PUCK_RADIUS = 18;
const GOAL_WIDTH = 180;

let isGameRunning = false;
let gameMode = 'solo'; // 'solo' or 'multi'
let keys = {};

let p1 = {
    x: canvas.width / 2,
    y: canvas.height - 100,
    radius: PADDLE_RADIUS,
    color: '#00f3ff',
    score: 0,
    name: "PLAYER 1",
    lastX: 0,
    lastY: 0,
    idleFrames: 0
};

let p2 = {
    x: canvas.width / 2,
    y: 100,
    radius: PADDLE_RADIUS,
    color: '#ff0055',
    score: 0,
    name: "PLAYER 2",
    speed: 5, // for AI
    lastX: 0,
    lastY: 0,
    idleFrames: 0
};

let puck = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    vx: 0,
    vy: 0,
    radius: PUCK_RADIUS,
    color: '#fff'
};

// Input
window.addEventListener('mousemove', (e) => {
    if (!isGameRunning) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Control P1 (Bottom half)
    p1.x = mouseX;
    p1.y = mouseY;
});

window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;

    if (!isGameRunning && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        startGame('solo');
    }
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

function startGame(mode) {
    gameMode = mode;
    p1.name = p1NameInput.value.trim() || "PLAYER 1";
    p1NameDisplay.textContent = p1.name;

    if (mode === 'solo') {
        p2.name = "AI";
        p2NameDisplay.textContent = "AI";
    } else {
        p2.name = p2NameInput.value.trim() || "PLAYER 2";
        p2NameDisplay.textContent = p2.name;
    }

    startScreen.classList.add('hidden');
    isGameRunning = true;
    resetGame();
    animate();
}

function resetGame() {
    puck.x = canvas.width / 2;
    puck.y = canvas.height / 2;
    puck.vx = 0;
    puck.vy = 0;
}

function update() {
    if (!isGameRunning) return;

    // AI or P2 movement
    if (gameMode === 'multi') {
        if (keys['w']) p2.y -= 25;
        if (keys['s']) p2.y += 25;
        if (keys['a']) p2.x -= 25;
        if (keys['d']) p2.x += 25;
    } else {
        // Simple AI - now much faster and more abrupt
        let dx = puck.x - p2.x;
        let dy = puck.y - p2.y;
        if (puck.y < canvas.height / 2) {
            p2.x += dx * 0.35;
            p2.y += (puck.y - 100 - p2.y) * 0.35;
        } else {
            p2.x += (canvas.width / 2 - p2.x) * 0.2;
            p2.y += (100 - p2.y) * 0.2;
        }
    }

    // Anti-idle logic
    [p1, p2].forEach(p => {
        if (Math.abs(p.x - p.lastX) < 0.5 && Math.abs(p.y - p.lastY) < 0.5) {
            p.idleFrames++;
        } else {
            p.idleFrames = 0;
        }
        p.lastX = p.x;
        p.lastY = p.y;

        // If idle for more than 3 seconds (180 frames)
        if (p.idleFrames > 180) {
            // Extremamente brusco e direcional
            if (p === p1) {
                // Azul (P1) joga para a DIREITA
                p.x += 150;
                p.y += (Math.random() - 0.5) * 50;
            } else {
                // Vermelho (P2) joga para a ESQUERDA
                p.x -= 150;
                p.y += (Math.random() - 0.5) * 50;
            }

            // Força um movimento contínuo e caótico
            p.idleFrames -= 30;
        }
    });

    // Constraint P2 to top half
    if (p2.y < p2.radius) p2.y = p2.radius;
    if (p2.y > canvas.height / 2 - p2.radius) p2.y = canvas.height / 2 - p2.radius;
    if (p2.x < p2.radius) p2.x = p2.radius;
    if (p2.x > canvas.width - p2.radius) p2.x = canvas.width - p2.radius;

    // Move Puck
    puck.vx *= FRICTION;
    puck.vy *= FRICTION;
    puck.x += puck.vx;
    puck.y += puck.vy;

    // Wall Collision
    if (puck.x < puck.radius || puck.x > canvas.width - puck.radius) {
        puck.vx = -puck.vx;
        puck.x = puck.x < puck.radius ? puck.radius : canvas.width - puck.radius;
    }

    // Top/Bottom Collision (if not goal)
    const inGoalX = puck.x > (canvas.width - GOAL_WIDTH) / 2 && puck.x < (canvas.width + GOAL_WIDTH) / 2;

    if (puck.y < puck.radius) {
        if (inGoalX) {
            p1.score++;
            updateScore();
            resetGame();
        } else {
            puck.vy = -puck.vy;
            puck.y = puck.radius;
        }
    }

    if (puck.y > canvas.height - puck.radius) {
        if (inGoalX) {
            p2.score++;
            updateScore();
            resetGame();
        } else {
            puck.vy = -puck.vy;
            puck.y = canvas.height - puck.radius;
        }
    }

    checkPaddleCollision(p1);
    checkPaddleCollision(p2);

    // Constraint paddles after collisions
    [p1, p2].forEach((p, i) => {
        if (p.x < p.radius) p.x = p.radius;
        if (p.x > canvas.width - p.radius) p.x = canvas.width - p.radius;
        if (i === 0) { // P1 Bottom
            if (p.y < canvas.height / 2 + p.radius) p.y = canvas.height / 2 + p.radius;
            if (p.y > canvas.height - p.radius) p.y = canvas.height - p.radius;
        } else { // P2 Top
            if (p.y < p.radius) p.y = p.radius;
            if (p.y > canvas.height / 2 - p.radius) p.y = canvas.height / 2 - p.radius;
        }
    });
}

function checkPaddleCollision(paddle) {
    let dx = puck.x - paddle.x;
    let dy = puck.y - paddle.y;
    let distance = Math.sqrt(dx * dx + dy * dy);
    let minDistance = puck.radius + paddle.radius;

    if (distance < minDistance) {
        // Resolve overlap
        let overlap = minDistance - distance;
        let nx = dx / distance;
        let ny = dy / distance;
        puck.x += nx * overlap;
        puck.y += ny * overlap;

        // Bounce physics with MUCH higher power for abrupt movement
        puck.vx = nx * 30;
        puck.vy = ny * 30;
    }
}

function updateScore() {
    p1ScoreEl.textContent = p1.score;
    p2ScoreEl.textContent = p2.score;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw Rink Markings
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;

    // Center Line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Center Circle
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
    ctx.stroke();

    // Goals
    ctx.lineWidth = 6;
    // Top Goal (P2's side)
    ctx.strokeStyle = p2.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p2.color;
    ctx.beginPath();
    ctx.moveTo((canvas.width - GOAL_WIDTH) / 2, 0);
    ctx.lineTo((canvas.width + GOAL_WIDTH) / 2, 0);
    ctx.stroke();

    // Bottom Goal (P1's side)
    ctx.strokeStyle = p1.color;
    ctx.shadowBlur = 15;
    ctx.shadowColor = p1.color;
    ctx.beginPath();
    ctx.moveTo((canvas.width - GOAL_WIDTH) / 2, canvas.height);
    ctx.lineTo((canvas.width + GOAL_WIDTH) / 2, canvas.height);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw Puck
    drawCircle(puck.x, puck.y, puck.radius, puck.color, true);

    // Draw Paddles
    drawCircle(p1.x, p1.y, p1.radius, p1.color, false);
    drawCircle(p2.x, p2.y, p2.radius, p2.color, false);
}

function drawCircle(x, y, r, color, glow) {
    if (glow) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = color;
    }
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function varToHex(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function animate() {
    update();
    draw();
    if (isGameRunning) requestAnimationFrame(animate);
}

soloBtn.addEventListener('click', () => {
    startGame('solo');
});

multiBtn.addEventListener('click', () => {
    startGame('multi');
});

draw();
