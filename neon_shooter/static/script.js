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
let isMultiplayer = false;
let score = 0;
let highScore = 0;
let currentLevel = 1;
let currentDifficulty = 'medium';
let players = [];
let bullets, enemies, particles, powerUps, bosses, animationId;
let keys = {};
let mouse = { x: 0, y: 0 };
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
    constructor(x, y, color, controls) {
        this.x = x;
        this.y = y;
        this.radius = 15;
        this.color = color;
        this.baseSpeed = 5;
        this.angle = 0;
        this.controls = controls;
        this.shootTimer = 0;
        this.effects = {
            rapidFire: 0,
            multiShot: 0,
            shield: 0,
            piercing: 0,
            bigBullets: 0,
            speedBoost: 0
        };
    }

    update() {
        let speed = this.baseSpeed;
        if (this.effects.speedBoost > 0) speed *= 1.8;

        if (keys[this.controls.up]) this.y -= speed;
        if (keys[this.controls.down]) this.y += speed;
        if (keys[this.controls.left]) this.x -= speed;
        if (keys[this.controls.right]) this.x += speed;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        if (this.controls.useMouse) {
            this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);
        } else {
            // For keyboard only player, aim in movement direction
            if (keys[this.controls.up] || keys[this.controls.down] || keys[this.controls.left] || keys[this.controls.right]) {
                let vx = 0, vy = 0;
                if (keys[this.controls.up]) vy -= 1;
                if (keys[this.controls.down]) vy += 1;
                if (keys[this.controls.left]) vx -= 1;
                if (keys[this.controls.right]) vx += 1;
                if (vx !== 0 || vy !== 0) this.angle = Math.atan2(vy, vx);
            }
        }

        // Update effects
        Object.keys(this.effects).forEach(k => {
            if (this.effects[k] > 0) this.effects[k]--;
        });

        this.handleShooting();
    }

    handleShooting() {
        this.shootTimer--;
        let isShooting = this.controls.useMouse ? keys.mousedown : keys[this.controls.shoot];

        if (isShooting && this.shootTimer <= 0) {
            this.shootTimer = this.effects.rapidFire > 0 ? 3 : 10;
            const bulletColor = this.effects.piercing > 0 ? '#0aff00' : '#ffff00';
            const bulletRadius = this.effects.bigBullets > 0 ? 10 : 4;

            if (this.effects.multiShot > 0) {
                this.fireBullet(this.angle, bulletColor, bulletRadius);
                this.fireBullet(this.angle + 0.3, bulletColor, bulletRadius);
                this.fireBullet(this.angle - 0.3, bulletColor, bulletRadius);
            } else {
                this.fireBullet(this.angle, bulletColor, bulletRadius);
            }
        }
    }

    fireBullet(angle, color, radius) {
        bullets.push(new Bullet(this.x, this.y, angle, color, false, radius, this.effects.piercing > 0));
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        if (this.effects.shield > 0) {
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
    constructor(x, y, angle, color = '#ffff00', isEnemy = false, radius = 4, isPiercing = false, type = 'bullet') {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.isEnemy = isEnemy;
        this.isPiercing = isPiercing;
        this.type = type;
        const speedMult = DIFFICULTY_CONFIG[currentDifficulty].speed;
        let speed = isEnemy ? 10 * speedMult : 28;
        if (type === 'meteor') speed = 5 * speedMult;

        this.velocity = {
            x: Math.cos(angle) * speed,
            y: Math.sin(angle) * speed
        };
    }
    update() {
        this.x += this.velocity.x;
        this.y += this.velocity.y;
        if (this.type === 'meteor' && Math.random() < 0.3) {
            particles.push(new Particle(this.x, this.y, '#ff8800'));
        }
    }
    draw() {
        ctx.shadowBlur = this.type === 'meteor' ? 20 : 10;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;

        if (this.type === 'meteor') {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
            // Core of meteor
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
            ctx.fill();
        }
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
        // Target nearest player
        let target = players[0];
        if (players.length > 1) {
            const d1 = Math.hypot(this.x - players[0].x, this.y - players[0].y);
            const d2 = Math.hypot(this.x - players[1].x, this.y - players[1].y);
            if (d2 < d1) target = players[1];
        }
        const angle = Math.atan2(target.y - this.y, target.x - this.x);
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
        const diff = DIFFICULTY_CONFIG[currentDifficulty];
        this.level = currentLevel;
        this.health = 80 * diff.bossHP * (1 + this.level * 0.2);
        this.maxHealth = this.health;
        this.x = canvas.width / 2;
        this.targetY = 120;
        this.vx = 2 * diff.speed;

        // Define boss types based on level
        const bossTypes = [
            { name: 'Star', color: '#ff0055', glow: '#00f3ff', sides: 12, pattern: 'star' },
            { name: 'Prism', color: '#0aff00', glow: '#ffffff', sides: 3, pattern: 'poly' },
            { name: 'Meteor Lord', color: '#ff4400', glow: '#ffff00', sides: 8, pattern: 'rock' },
            { name: 'Void Nova', color: '#bc13fe', glow: '#ff00ff', sides: 16, pattern: 'circle' }
        ];

        const typeIdx = Math.min(this.level - 1, bossTypes.length - 1);
        const config = bossTypes[typeIdx];

        this.radius = 85;
        this.color = config.color;
        this.glowColor = config.glow;
        this.sides = config.sides;
        this.pattern = config.pattern;
        this.y = -this.radius;

        // Custom behaviors based on level
        if (this.level >= 5) {
            // Randomize for high levels
            this.color = `hsl(${Math.random() * 360}, 100%, 50%)`;
            this.sides = Math.floor(Math.random() * 10) + 3;
        }
    }
    update() {
        if (this.y < this.targetY) this.y += 1;
        else {
            this.x += this.vx;
            if (this.x < this.radius || this.x > canvas.width - this.radius) this.vx *= -1;
        }
        if (isGameRunning && Math.random() < 0.1) {
            let target = players[Math.floor(Math.random() * players.length)];
            const bAngle = Math.atan2(target.y - this.y, target.x - this.x);
            let attackType = Math.random();

            // Level-based attack weighting
            if (this.level === 1) { // Lvl 1: Heavy Triple Shot
                if (attackType < 0.7) this.fireTriple(bAngle);
                else this.fireCircle();
            } else if (this.level === 2) { // Lvl 2: Heavy Sniper
                if (attackType < 0.6) this.fireSniper(bAngle);
                else this.fireTriple(bAngle);
            } else if (this.level === 3) { // Lvl 3: Heavy Meteor
                if (attackType < 0.7) this.fireMeteors();
                else this.fireCircle();
            } else { // Lvl 4+: Mixed
                if (attackType < 0.25) this.fireTriple(bAngle);
                else if (attackType < 0.5) this.fireCircle();
                else if (attackType < 0.75) this.fireMeteors();
                else this.fireSniper(bAngle);
            }
        }
    }

    fireTriple(angle) {
        bullets.push(new Bullet(this.x, this.y, angle, '#ff0000', true));
        bullets.push(new Bullet(this.x, this.y, angle + 0.2, '#ff0000', true));
        bullets.push(new Bullet(this.x, this.y, angle - 0.2, '#ff0000', true));
    }

    fireCircle() {
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            bullets.push(new Bullet(this.x, this.y, angle, '#ff00ff', true));
        }
    }

    fireMeteors() {
        for (let i = 0; i < 3; i++) {
            const spawnX = Math.random() * canvas.width;
            const meteorAngle = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
            bullets.push(new Bullet(spawnX, -50, meteorAngle, '#ff4400', true, 25, false, 'meteor'));
        }
    }

    fireSniper(angle) {
        const sniper = new Bullet(this.x, this.y, angle, '#ffffff', true);
        sniper.velocity.x *= 1.5; sniper.velocity.y *= 1.5;
        bullets.push(sniper);
    }
    draw() {
        const barWidth = 150;
        ctx.fillStyle = '#333'; ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 20, barWidth, 10);
        ctx.fillStyle = (this.health / this.maxHealth) > 0.3 ? '#ff0000' : '#ffff00';
        ctx.fillRect(this.x - barWidth / 2, this.y - this.radius - 20, (this.health / this.maxHealth) * barWidth, 10);

        ctx.save();
        ctx.shadowBlur = 30;
        ctx.shadowColor = this.glowColor;
        ctx.fillStyle = this.color;

        ctx.beginPath();
        if (this.pattern === 'star') {
            for (let i = 0; i < this.sides; i++) {
                const angle = (i / this.sides) * Math.PI * 2;
                const r = i % 2 === 0 ? this.radius : this.radius * 0.5;
                const px = this.x + Math.cos(angle) * r;
                const py = this.y + Math.sin(angle) * r;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        } else {
            for (let i = 0; i < this.sides; i++) {
                const angle = (i / this.sides) * Math.PI * 2;
                const px = this.x + Math.cos(angle) * this.radius;
                const py = this.y + Math.sin(angle) * this.radius;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
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
    players = [];
    // Player 1 (Blue) - Now using Arrows + Mouse
    players.push(new Player(canvas.width / 4, canvas.height / 2, '#00f3ff', {
        up: 'arrowup', down: 'arrowdown', left: 'arrowleft', right: 'arrowright', useMouse: true
    }));

    if (isMultiplayer) {
        // Player 2 (Red) - Now using WASD + Space
        players.push(new Player(3 * canvas.width / 4, canvas.height / 2, '#ff0055', {
            up: 'w', down: 's', left: 'a', right: 'd', shoot: ' ', useMouse: false
        }));
    }

    bullets = []; enemies = []; particles = []; powerUps = []; bosses = [];
    score = 0; lastLevelScore = 0; currentLevel = 1;
    scoreEl.textContent = score;
    levelEl.textContent = currentLevel;
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
    // Level up every 10,000 points
    const newLevel = Math.floor(score / 10000) + 1;
    if (newLevel > currentLevel) {
        currentLevel = newLevel;
        levelEl.textContent = currentLevel;
        showLevelOverlay();
    }

    const diff = DIFFICULTY_CONFIG[currentDifficulty];
    if (score >= lastLevelScore + diff.pointsToBoss && bosses.length === 0) {
        bosses.push(new Boss());
    }
}

function animate() {
    if (!isGameRunning) return;
    animationId = requestAnimationFrame(animate);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    players.forEach(p => {
        p.update();
        p.draw();
    });

    powerUps.forEach((pu, index) => {
        pu.draw();
        players.forEach(player => {
            if (Math.hypot(player.x - pu.x, player.y - pu.y) < player.radius + pu.radius) {
                applyPowerUp(pu.id, player); powerUps.splice(index, 1);
            }
        });
        bullets.forEach((bullet, bIdx) => {
            if (Math.hypot(bullet.x - pu.x, bullet.y - pu.y) < bullet.radius + pu.radius) {
                // If a bullet hits it, give benefit to a random player? Or nearest?
                let nearest = players[0];
                players.forEach(p => {
                    if (Math.hypot(p.x - pu.x, p.y - pu.y) < Math.hypot(nearest.x - pu.x, nearest.y - pu.y)) nearest = p;
                });
                applyPowerUp(pu.id, nearest);
                for (let i = 0; i < 10; i++) particles.push(new Particle(pu.x, pu.y, pu.color));
                powerUps.splice(index, 1); bullets.splice(bIdx, 1);
            }
        });
    });

    particles.forEach((p, i) => { if (p.alpha <= 0) particles.splice(i, 1); else { p.update(); p.draw(); } });

    bullets.forEach((bullet, bIdx) => {
        bullet.update(); bullet.draw();
        if (bullet.isEnemy) {
            players.forEach(player => {
                if (Math.hypot(player.x - bullet.x, player.y - bullet.y) < player.radius + bullet.radius) {
                    if (player.effects.shield > 0) { player.effects.shield = 0; bullets.splice(bIdx, 1); }
                    else gameOver();
                }
            });
        }
        if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) bullets.splice(bIdx, 1);
    });

    bosses.forEach((boss, index) => {
        boss.update(); boss.draw();
        players.forEach(player => {
            if (Math.hypot(player.x - boss.x, player.y - boss.y) < player.radius + boss.radius) {
                if (player.effects.shield > 0) { player.effects.shield = 0; boss.y -= 20; }
                else gameOver();
            }
        });
        bullets.forEach((bullet, bIdx) => {
            if (Math.hypot(bullet.x - boss.x, bullet.y - boss.y) < bullet.radius + boss.radius) {
                boss.health--;
                for (let i = 0; i < 3; i++) particles.push(new Particle(bullet.x, bullet.y, '#fff'));
                if (boss.health <= 0) {
                    for (let i = 0; i < 50; i++) particles.push(new Particle(boss.x, boss.y, boss.glowColor));
                    score += 500;
                    scoreEl.textContent = score;
                    checkLevelProgress();
                    lastLevelScore = score;
                    bosses.splice(index, 1);
                }
                bullets.splice(bIdx, 1);
            }
        });
    });

    enemies.forEach((enemy, eIdx) => {
        enemy.update(); enemy.draw();
        players.forEach(player => {
            if (Math.hypot(player.x - enemy.x, player.y - enemy.y) < player.radius + enemy.radius) {
                if (player.effects.shield > 0) { enemies.splice(eIdx, 1); player.effects.shield = 0; }
                else gameOver();
            }
        });
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
                if (!bullet.isPiercing) bullets.splice(bIdx, 1);
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

const modeButtons = document.querySelectorAll('.mode-btn');
const controlsHint = document.getElementById('controls-hint');

modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        modeButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        isMultiplayer = btn.dataset.mode === 'multi';
        controlsHint.innerHTML = isMultiplayer
            ? "P1 (Blue): Arrows + Mouse | P2 (Red): WASD + Space"
            : "Arrows to Move | Mouse to Aim & Shoot";
    });
});

function applyPowerUp(id, targetPlayer) {
    if (id === 'nuke') {
        enemies.forEach(e => { for (let i = 0; i < 10; i++) particles.push(new Particle(e.x, e.y, e.color)); });
        score += enemies.length * 10; enemies = [];
    } else if (id === 'freeze') {
        enemies.forEach(e => { e.velocity.x = 0; e.velocity.y = 0; });
    } else if (id === 'bonus') {
        score += 500;
    } else {
        targetPlayer.effects[id] = 600;
    }
    checkLevelProgress();
    scoreEl.textContent = score;
}

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    isGameRunning = true; init(); animate(); spawnEnemies(); spawnPowerUp(); showLevelOverlay();
});

restartBtn.addEventListener('click', () => {
    gameOverScreen.classList.add('hidden');
    isGameRunning = true; init(); animate(); spawnEnemies(); spawnPowerUp(); showLevelOverlay();
});

diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.diff;
    });
});

window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;

    if (!isGameRunning && (e.key === 'Enter' || e.key === ' ')) {
        const isGameOver = !gameOverScreen.classList.contains('hidden');
        if (isGameOver) {
            gameOverScreen.classList.add('hidden');
        } else {
            startScreen.classList.add('hidden');
        }
        e.preventDefault();
        isGameRunning = true;
        init();
        animate();
        spawnEnemies();
        spawnPowerUp();
        showLevelOverlay();
    }
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);
window.addEventListener('mousemove', e => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left; mouse.y = e.clientY - rect.top;
});
window.addEventListener('mousedown', () => keys.mousedown = true);
window.addEventListener('mouseup', () => keys.mousedown = false);
