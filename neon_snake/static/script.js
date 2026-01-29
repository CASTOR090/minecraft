const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('high-score');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreElement = document.getElementById('final-score');
const restartBtn = document.getElementById('restart-btn');
const startBtn = document.getElementById('start-btn');

const GRID_SIZE = 20;
const TILE_COUNT = canvas.width / GRID_SIZE;
const GAME_SPEED = 100;

let snake = [];
let food = {};
let velocity = { x: 0, y: 0 };
let score = 0;
let highScore = 0;
let gameLoop;
let isGameRunning = false;
let particles = [];

// Initialize high score
fetch('/api/score')
    .then(r => r.json())
    .then(data => {
        highScore = data.highscore;
        highScoreElement.textContent = highScore;
    })
    .catch(err => console.log('Backend not available for high score'));

function initGame() {
    snake = [
        { x: 10, y: 10 },
        { x: 9, y: 10 },
        { x: 8, y: 10 }
    ];
    velocity = { x: 1, y: 0 };
    score = 0;
    scoreElement.textContent = score;
    spawnFood();
    particles = [];
}

function spawnFood() {
    food = {
        x: Math.floor(Math.random() * TILE_COUNT),
        y: Math.floor(Math.random() * TILE_COUNT)
    };
    // Check if food spawns on snake
    if (snake.some(segment => segment.x === food.x && segment.y === food.y)) {
        spawnFood();
    }
}

function update() {
    // Move snake
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    // Check collision with walls
    if (head.x < 0 || head.x >= TILE_COUNT || head.y < 0 || head.y >= TILE_COUNT) {
        gameOver();
        return;
    }

    // Check collision with self
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        gameOver();
        return;
    }

    snake.unshift(head);

    // Check collision with food
    if (head.x === food.x && head.y === food.y) {
        score += 10;
        scoreElement.textContent = score;
        scoreElement.style.textShadow = `0 0 20px #fff`; // Flash effect
        setTimeout(() => scoreElement.style.textShadow = '0 0 10px white', 200);

        createParticles(head.x * GRID_SIZE, head.y * GRID_SIZE, '#0aff00');
        spawnFood();
    } else {
        snake.pop();
    }

    draw();
    updateParticles();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid (handled by CSS background, but we can add dynamic effects here if needed)

    // Draw Food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    ctx.fillStyle = '#ff0055';
    ctx.beginPath();
    ctx.arc(
        food.x * GRID_SIZE + GRID_SIZE / 2,
        food.y * GRID_SIZE + GRID_SIZE / 2,
        GRID_SIZE / 2 - 2, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw Snake
    snake.forEach((segment, index) => {
        const x = segment.x * GRID_SIZE;
        const y = segment.y * GRID_SIZE;

        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00f3ff';
        ctx.fillStyle = index === 0 ? '#fff' : '#00f3ff'; // White head

        ctx.fillRect(x + 1, y + 1, GRID_SIZE - 2, GRID_SIZE - 2);
    });
    ctx.shadowBlur = 0; // Reset

    // Draw Particles
    particles.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x, p.y, p.size, p.size);
    });
    ctx.globalAlpha = 1;
}

function createParticles(x, y, color) {
    for (let i = 0; i < 10; i++) {
        particles.push({
            x: x + GRID_SIZE / 2,
            y: y + GRID_SIZE / 2,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            life: 1,
            color: color,
            size: Math.random() * 3 + 1
        });
    }
}

function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        if (p.life <= 0) particles.splice(i, 1);
    }
}

function gameOver() {
    clearInterval(gameLoop);
    isGameRunning = false;

    // Save score
    fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: score })
    })
        .then(r => r.json())
        .then(data => {
            if (data.is_new_record) {
                highScoreElement.textContent = data.highscore;
                alert("NEW HIGH SCORE!");
            }
        })
        .catch(err => console.log('Score save failed'));

    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
}

function startGame() {
    if (isGameRunning) return;

    initGame();
    isGameRunning = true;
    startScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');

    if (gameLoop) clearInterval(gameLoop);
    gameLoop = setInterval(update, GAME_SPEED);
}

// Controls
document.addEventListener('keydown', (e) => {
    if (!isGameRunning) {
        if (!gameOverScreen.classList.contains('hidden') && e.key === 'Enter') { // Allow restarting with enter
            startGame();
        } else if (!startScreen.classList.contains('hidden') && e.key === 'Enter') {
            startGame();
        }
        return;
    }

    const key = e.key.toLowerCase();
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'w', 'a', 's', 'd'].includes(key)) {
        e.preventDefault();
    }

    switch (key) {
        case 'arrowup':
        case 'w':
            if (velocity.y === 0) velocity = { x: 0, y: -1 };
            break;
        case 'arrowdown':
        case 's':
            if (velocity.y === 0) velocity = { x: 0, y: 1 };
            break;
        case 'arrowleft':
        case 'a':
            if (velocity.x === 0) velocity = { x: -1, y: 0 };
            break;
        case 'arrowright':
        case 'd':
            if (velocity.x === 0) velocity = { x: 1, y: 0 };
            break;
    }
});

restartBtn.addEventListener('click', startGame);
if (startBtn) startBtn.addEventListener('click', startGame);

// Initial draw
initGame();
draw();
