const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('high-score');
const levelEl = document.getElementById('level');
const startScreen = document.getElementById('start-screen');
const gameOverScreen = document.getElementById('game-over-screen');
const finalScoreEl = document.getElementById('final-score');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const levelOverlay = document.getElementById('level-overlay');
const diffButtons = document.querySelectorAll('.diff-btn');

// Game State
let isGameRunning = false;
let score = 0;
let highScore = 0;
let currentLevel = 1;
let currentDifficulty = 'medium';
let player, bullets, enemies, particles, powerUps, bosses, animationId;
let keys = {};
let mouse = { x: 0, y: 0 };
let shootTimer = 0;
let lastLevelScore = 0;

const DIFFICULTY_CONFIG = {
    easy: { speed: 0.8, spawn: 0.8, bossHP: 0.6, pointsToBoss: 800 },
    medium: { speed: 1.0, spawn: 1.0, bossHP: 1.0, pointsToBoss: 1000 },
    hard: { speed: 1.3, spawn: 1.3, bossHP: 1.5, pointsToBoss: 1200 },
    extreme: { speed: 1.7, spawn: 1.7, bossHP: 2.2, pointsToBoss: 1500 }
};

// Power-up States
let activeEffects = {
    rapidFire: 0,
    multiShot: 0,
    shield: 0,
    piercing: 0,
    bigBullets: 0,
    speedBoost: 0
};

class Player {
    constructor() {
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.radius = 15;
        this.color = '#00f3ff';
        this.baseSpeed = 5;
        this.angle = 0;
    }

    update() {
        let speed = this.baseSpeed;
        if (activeEffects.speedBoost > 0) speed *= 1.8;

        if (keys['w']) this.y -= speed;
        if (keys['s']) this.y += speed;
        if (keys['a']) this.x -= speed;
        if (keys['d']) this.x += speed;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        if (activeEffects.shield > 0) {
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 10, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.moveTo(15, 0);
        ctx.lineTo(-10, 10);
        ctx.lineTo(-10, -10);
        ctx.fill();
        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, angle, color = '#ffff00', isEnemy = false) {
        this.x = x;
        this.y = y;
        this.radius = activeEffects.bigBullets > 0 && !isEnemy ? 10 : 4;
        this.color = activeEffects.piercing > 0 && !isEnemy ? '#0aff00' : color;
        this.isEnemy = isEnemy;
        const speedMult = DIFFICULTY_CONFIG[currentDifficulty].speed;
        this.velocity = {
            x: Math.cos(angle) * (isEnemy ? 10 * speedMult : 28),
            y: Math.sin(angle) * (isEnemy ? 10 * speedMult : 28)
        };
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; }
    draw() {
        ctx.shadowBlur = 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
    }
}

class Enemy {
    constructor(tier = 3, x, y) {
        this.tier = tier;
        this.radius = tier === 3 ? 35 : (tier === 2 ? 22 : 12);
        const diff = DIFFICULTY_CONFIG[currentDifficulty];
        this.speed = (tier === 3 ? 1.5 : (tier === 2 ? 2.8 : 4.5)) * diff.speed * (1 + currentLevel * 0.1);
        this.color = tier === 3 ? '#bc13fe' : (tier === 2 ? '#ff0055' : '#ff8800');
        if (x !== undefined && y !== undefined) {
            this.x = x; this.y = y;
        } else {
            if (Math.random() < 0.5) {
                this.x = Math.random() < 0.5 ? -this.radius : canvas.width + this.radius;
                this.y = Math.random() * canvas.height;
            } else {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() < 0.5 ? -this.radius : canvas.height + this.radius;
            }
        }
        const angle = Math.atan2(player.y - this.y, player.x - this.x);
        this.velocity = { x: Math.cos(angle) * this.speed, y: Math.sin(angle) * this.speed };
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; }
    draw() {
        ctx.shadowBlur = 15; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
        ctx.beginPath();
        const sides = 6 + this.tier;
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * Math.PI * 2;
            const x = this.x + Math.cos(angle) * this.radius;
            const y = this.y + Math.sin(angle) * this.radius;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0;
    }
}

class PowerUp {
    constructor() {
        const types = [
            { id: 'rapidFire', color: '#ffff00', label: '🚀' },
            { id: 'multiShot', color: '#00ff00', label: '🔱' },
            { id: 'shield', color: '#ffffff', label: '🛡️' },
            { id: 'piercing', color: '#0aff00', label: '🏹' },
            { id: 'bigBullets', color: '#bc13fe', label: '💣' },
            { id: 'speedBoost', color: '#00f3ff', label: '⚡' },
            { id: 'nuke', color: '#ff0000', label: '💥' },
            { id: 'freeze', color: '#00ffff', label: '❄️' },
            { id: 'bonus', color: '#ff8800', label: '💎' },
            { id: 'slowMo', color: '#aa00ff', label: '⏱️' }
        ];
        const type = types[Math.floor(Math.random() * types.length)];
        this.id = type.id; this.color = type.color; this.label = type.label;
        this.radius = 20;
        this.x = Math.random() * (canvas.width - 100) + 50;
        this.y = Math.random() * (canvas.height - 100) + 50;
    }
    draw() {
        ctx.save(); ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000'; ctx.font = '16px Arial'; ctx.textAlign = 'center'; ctx.fillText(this.label, this.x, this.y + 6);
        ctx.restore();
    }
}

class Boss {
    constructor() {
        this.radius = 85;
        this.color = '#ff0055';
        this.glowColor = '#00f3ff';
        const diff = DIFFICULTY_CONFIG[currentDifficulty];
        this.health = 80 * diff.bossHP * (1 + currentLevel * 0.2);
        this.maxHealth = this.health;
        this.x = canvas.width / 2;
        this.y = -this.radius;
        this.targetY = 120;
        this.vx = 2 * diff.speed;
    }
    update() {
        if (this.y < this.targetY) this.y += 1;
        else {
            this.x += this.vx;
            if (this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;
        }
        if (isGameRunning && Math.random() < 0.08) {
            const bAngle = Math.atan2(player.y - this.y, player.x - this.x);
            const powerType = Math.random();
            if (powerType < 0.6) {
                bullets.push(new Bullet(this.x, this.y, bAngle, '#ff0000', true));
                bullets.push(new Bullet(this.x, this.y, bAngle + 0.2, '#ff0000', true));
                bullets.push(new Bullet(this.x, this.y, bAngle - 0.2, '#ff0000', true));
            } else if (powerType < 0.85) {
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    bullets.push(new Bullet(this.x, this.y, angle, '#ff00ff', true));
                }
            } else {
                const sniper = new Bullet(this.x, this.y, bAngle, '#ffffff', true);
                sniper.velocity.x *= 1.5; sniper.velocity.y *= 1.5;
                bullets.push(sniper);
            }
        }
    }
    draw() {
        const barWidth = 150;
        ctx.fillStyle = '#333'; ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 20, barWidth, 10);
        ctx.fillStyle = '#ff0000'; ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 20, (this.health / this.maxHealth) * barWidth, 10);
        ctx.save(); ctx.shadowBlur = 30; ctx.shadowColor = this.glowColor; ctx.fillStyle = this.color;
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const r = i % 2 === 0 ? this.radius : this.radius * 0.7;
            const px = this.x + Math.cos(angle) * r;
            const py = this.y + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        this.radius = Math.random() * 3;
        this.velocity = { x: (Math.random() - 0.5) * 6, y: (Math.random() - 0.5) * 6 };
        this.alpha = 1;
    }
    update() { this.x += this.velocity.x; this.y += this.velocity.y; this.alpha -= 0.02; }
    draw() { ctx.save(); ctx.globalAlpha = this.alpha; ctx.fillStyle = this.color; ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }
}

function init() {
    player = new Player();
    bullets = []; enemies = []; particles = []; powerUps = []; bosses = [];
    score = 0; lastLevelScore = 0; currentLevel = 1;
    scoreEl.textContent = score;
    levelEl.textContent = currentLevel;
    Object.keys(activeEffects).forEach(k => activeEffects[k] = 0);
}

function showLevelOverlay() {
    levelOverlay.textContent = `LEVEL ${currentLevel}`;
    levelOverlay.classList.remove('hidden');
    // Restart animation
    levelOverlay.style.animation = 'none';
    levelOverlay.offsetHeight; // trigger reflow
    levelOverlay.style.animation = null;
    setTimeout(() => levelOverlay.classList.add('hidden'), 2000);
}

function spawnEnemies() {
    if (!isGameRunning) return;
    if (bosses.length === 0) {
        enemies.push(new Enemy(Math.random() < 0.3 ? 3 : (Math.random() < 0.6 ? 2 : 1)));
    }
    const diff = DIFFICULTY_CONFIG[currentDifficulty];
    const spawnRate = Math.max(300, (2000 - currentLevel * 100) / diff.spawn);
    setTimeout(spawnEnemies, spawnRate);
}

function spawnPowerUp() {
    if (!isGameRunning) return;
    powerUps.push(new PowerUp());
    setTimeout(spawnPowerUp, 10000 + Math.random() * 10000);
}

function handleShooting() {
    shootTimer--;
    if (keys.mousedown && shootTimer <= 0) {
        shootTimer = activeEffects.rapidFire > 0 ? 3 : 10;
        if (activeEffects.multiShot > 0) {
            bullets.push(new Bullet(player.x, player.y, player.angle));
            bullets.push(new Bullet(player.x, player.y, player.angle + 0.3));
            bullets.push(new Bullet(player.x, player.y, player.angle - 0.3));
        } else {
            bullets.push(new Bullet(player.x, player.y, player.angle));
        }
    }
}

function applyPowerUp(id) {
    if (id === 'nuke') {
        enemies.forEach(e => { for (let i = 0; i < 10; i++) particles.push(new Particle(e.x, e.y, e.color)); });
        score += enemies.length * 10; enemies = [];
    } else if (id === 'freeze') {
        enemies.forEach(e => { e.velocity.x = 0; e.velocity.y = 0; });
    } else if (id === 'bonus') {
        score += 500;
    } else {
        activeEffects[id] = 600;
    }
    checkLevelProgress();
    scoreEl.textContent = score;
}

function checkLevelProgress() {
    const diff = DIFFICULTY_CONFIG[currentDifficulty];
    if (score >= lastLevelScore + diff.pointsToBoss && bosses.length === 0) {
        bosses.push(new Boss());
    }
}

function animate() {
    if (!isGameRunning) return;
    animationId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    player.update(); player.draw(); handleShooting();
    Object.keys(activeEffects).forEach(k => { if (activeEffects[k] > 0) activeEffects[k]--; });

    powerUps.forEach((pu, index) => {
        pu.draw();
        if (Math.hypot(player.x - pu.x, player.y - pu.y) < player.radius + pu.radius) {
            applyPowerUp(pu.id); powerUps.splice(index, 1);
        }
        bullets.forEach((bullet, bIdx) => {
            if (Math.hypot(bullet.x - pu.x, bullet.y - pu.y) < bullet.radius + pu.radius) {
                applyPowerUp(pu.id);
                for (let i = 0; i < 10; i++) particles.push(new Particle(pu.x, pu.y, pu.color));
                powerUps.splice(index, 1); bullets.splice(bIdx, 1);
            }
        });
    });

    particles.forEach((p, i) => { if (p.alpha <= 0) particles.splice(i, 1); else { p.update(); p.draw(); } });

    bullets.forEach((bullet, bIdx) => {
        bullet.update(); bullet.draw();
        if (bullet.isEnemy) {
            if (Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + bullet.radius) {
                if (activeEffects.shield > 0) { activeEffects.shield = 0; bullets.splice(bIdx, 1); }
                else gameOver();
            }
        }
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) bullets.splice(bIdx, 1);
    });

    bosses.forEach((boss, index) => {
        boss.update(); boss.draw();
        if (Math.hypot(player.x - boss.x, player.y - boss.y) < player.radius + boss.radius) {
            if (activeEffects.shield > 0) { activeEffects.shield = 0; boss.y -= 20; }
            else gameOver();
        }
        bullets.forEach((bullet, bIdx) => {
            if (Math.hypot(bullet.x - boss.x, bullet.y - boss.y) < bullet.radius + boss.radius) {
                boss.health--;
                for (let i = 0; i < 3; i++) particles.push(new Particle(bullet.x, bullet.y, '#fff'));
                if (boss.health <= 0) {
                    for (let i = 0; i < 50; i++) particles.push(new Particle(boss.x, boss.y, boss.glowColor));
                    score += 500;
                    currentLevel++;
                    lastLevelScore = score;
                    levelEl.textContent = currentLevel;
                    showLevelOverlay();
                    bosses.splice(index, 1);
                }
                bullets.splice(bIdx, 1);
            }
        });
    });

    enemies.forEach((enemy, eIdx) => {
        enemy.update(); enemy.draw();
        if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius) {
            if (activeEffects.shield > 0) { enemies.splice(eIdx, 1); activeEffects.shield = 0; }
            else gameOver();
        }
        bullets.forEach((bullet, bIdx) => {
            if (Math.hypot(bullet.x - enemy.x, bullet.y - enemy.y) < bullet.radius + enemy.radius) {
                if (enemy.tier > 1) {
                    enemies.push(new Enemy(enemy.tier - 1, enemy.x, enemy.y));
                    enemies.push(new Enemy(enemy.tier - 1, enemy.x, enemy.y));
                }
                for (let i = 0; i < 10; i++) particles.push(new Particle(enemy.x, enemy.y, enemy.color));
                score += 10; scoreEl.textContent = score;
                checkLevelProgress();
                enemies.splice(eIdx, 1);
                if (activeEffects.piercing === 0) bullets.splice(bIdx, 1);
            }
        });
    });
}

function gameOver() {
    isGameRunning = false; cancelAnimationFrame(animationId);
    gameOverScreen.classList.remove('hidden');
    finalScoreEl.textContent = score;
    if (score > highScore) { highScore = score; highScoreEl.textContent = highScore; }
}

diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.diff;
    });
});

window.addEventListener('keydown', e => keys[e.key.toLowerCase()] = true);
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
});
window.addEventListener('mousedown', () => keys.mousedown = true);
window.addEventListener('mouseup', () => keys.mousedown = false);

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    isGameRunning = true; init(); animate(); spawnEnemies(); spawnPowerUp(); showLevelOverlay();
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    isGameRunning = true; init(); animate(); spawnEnemies(); spawnPowerUp(); showLevelOverlay();
});
