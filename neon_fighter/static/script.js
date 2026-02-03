const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const p1HealthEl = document.getElementById('p1-health');
const p2HealthEl = document.getElementById('p2-health');
const timerEl = document.getElementById('timer');
const startScreen = document.getElementById('start-screen');
const charSelectScreen = document.getElementById('char-select-screen');
const winScreen = document.getElementById('win-screen');
const winText = document.getElementById('win-text');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const confirmSelectBtn = document.getElementById('confirm-select-btn');
const finishHimEl = document.getElementById('finish-him');
const gameContainer = document.getElementById('game-container');
const p1Icons = document.querySelectorAll('#p1-grid .char-icon');
const p2Icons = document.querySelectorAll('#p2-grid .char-icon');

const GRAVITY = 0.5;
const GROUND_Y = canvas.height - 40;

let isGameRunning = false;
let gameTimer = 60;
let timerInterval;
let finishHimMode = false;
let selectedP1 = { name: 'NEON-ZERO', color: '#00f3ff' };
let selectedP2 = { name: 'STINGER', color: '#ffcc00' };

class Particle {
    constructor(x, y, color, size = 3) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.life = 1.0;
        this.size = size;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life -= 0.05;
    }
    draw() {
        ctx.globalAlpha = this.life;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

class Projectile {
    constructor(x, y, vx, color, owner) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.color = color;
        this.owner = owner;
        this.width = 20;
        this.height = 20;
        this.active = true;
    }
    update() {
        this.x += this.vx;
        if (this.x < 0 || this.x > canvas.width) this.active = false;
    }
    draw() {
        ctx.shadowBlur = 20;
        ctx.shadowColor = this.color;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 10, 0, Math.PI * 2);
        ctx.fill();
    }
}

let particles = [];
let projectiles = [];

class Sprite {
    constructor({ position, velocity, color, offset, name }) {
        this.position = position;
        this.velocity = velocity;
        this.height = 120;
        this.width = 50;
        this.color = color;
        this.name = name;
        this.lastKey;
        this.attackBox = {
            position: { x: this.position.x, y: this.position.y },
            offset: offset,
            width: 100,
            height: 50
        };
        this.isAttacking = false;
        this.health = 100;
        this.isCrouching = false;
        this.isDead = false;
        this.isFrozen = false;
        this.inputBuffer = [];
        this.facing = 1; // 1 for right, -1 for left
        this.animationFrame = 0;
    }

    draw() {
        this.animationFrame += 0.1;
        const bounce = Math.sin(this.animationFrame) * 3;
        const limbSwing = Math.sin(this.animationFrame * 1.5) * 15;

        ctx.save();
        // Fixed: Translate to the bottom of the player's collision box
        ctx.translate(this.position.x + this.width / 2, this.position.y + this.height);
        ctx.scale(this.facing, 1);

        ctx.shadowBlur = this.isFrozen ? 30 : 20;
        ctx.shadowColor = this.isFrozen ? '#fff' : this.color;
        ctx.fillStyle = this.isFrozen ? '#fff' : this.color;

        // Crouch math: Origin (0,0) is now the foot position.
        // Everything must be negative Y to be above ground.
        const legLen = this.isCrouching ? 20 : 45;
        const torsoHeight = 45;
        const torsoWidth = 24;
        const yOffset = this.isCrouching ? 0 : bounce;

        // Legs (Bottom)
        const legSwing = Math.abs(this.velocity.x) > 0 ? limbSwing : 0;

        // Back Leg
        ctx.save();
        ctx.translate(-7, -legLen);
        ctx.rotate((-legSwing * Math.PI) / 180);
        ctx.fillRect(-6, 0, 12, legLen);
        ctx.restore();

        // Front Leg
        ctx.save();
        ctx.translate(7, -legLen);
        ctx.rotate((legSwing * Math.PI) / 180);
        ctx.fillRect(-6, 0, 12, legLen);
        ctx.restore();

        // Torso (Middle) - Sits on top of legs
        const torsoY = -legLen - torsoHeight + yOffset;
        ctx.fillRect(-torsoWidth / 2, torsoY, torsoWidth, torsoHeight);

        // Head (Top)
        ctx.beginPath();
        ctx.arc(0, torsoY - 12, 12, 0, Math.PI * 2);
        ctx.fill();

        // Visor
        ctx.fillStyle = '#fff';
        ctx.fillRect(2, torsoY - 15, 12, 4);
        ctx.fillStyle = this.isFrozen ? '#fff' : this.color;

        // Arms (Sides of Torso)
        const armSwing = Math.abs(this.velocity.x) > 0 ? limbSwing : 0;

        // Back Arm
        ctx.save();
        ctx.translate(-torsoWidth / 2 - 2, torsoY + 10);
        ctx.rotate((armSwing * Math.PI) / 180);
        ctx.fillRect(-5, 0, 10, 30);
        ctx.restore();

        // Front Arm
        ctx.save();
        ctx.translate(torsoWidth / 2 + 2, torsoY + 10);
        if (this.isAttacking) {
            ctx.rotate(-Math.PI / 2);
            ctx.fillRect(-5, 0, 10, 45);
            ctx.fillStyle = '#fff';
            ctx.fillRect(-7, 35, 14, 14);
            ctx.fillStyle = this.isFrozen ? '#fff' : this.color;
        } else {
            ctx.rotate((-armSwing * Math.PI) / 180);
            ctx.fillRect(-5, 0, 10, 35);
        }
        ctx.restore();

        ctx.restore();
    }

    update() {
        // Update Facing based on opponent
        const opponent = (this === player1) ? player2 : player1;
        if (opponent) {
            this.facing = (opponent.position.x > this.position.x) ? 1 : -1;
        }

        this.draw();

        // Update Attack Box Position & Offset based on facing
        this.attackBox.offset.x = (this.facing === 1) ? 0 : -60;
        const attackY = this.isCrouching ? this.position.y + 60 : this.position.y + 30;
        this.attackBox.position.x = this.position.x + this.attackBox.offset.x;
        this.attackBox.position.y = attackY;

        if (!this.isFrozen) {
            this.position.x += this.velocity.x;
            this.position.y += this.velocity.y;
            if (this.position.y + this.height + this.velocity.y >= GROUND_Y) {
                this.velocity.y = 0;
                this.position.y = GROUND_Y - this.height;
            } else {
                this.velocity.y += GRAVITY;
            }
        }

        if (this.position.x < 0) this.position.x = 0;
        if (this.position.x + this.width > canvas.width) this.position.x = canvas.width - this.width;
    }

    attack() {
        if (this.isDead || this.isFrozen) return;
        this.isAttacking = true;
        setTimeout(() => { this.isAttacking = false; }, 100);
        this.checkSpecialMove();
    }

    checkSpecialMove() {
        const bufferStr = this.inputBuffer.join('');

        // Fatality Check (During Finish Him)
        if (finishHimMode) {
            const isP1Fatality = (this === player1 && bufferStr.includes('sss'));
            const isP2Fatality = (this === player2 && bufferStr.includes('arrowdownarrowdownarrowdown'));

            if (isP1Fatality || isP2Fatality) {
                determineWinner();
                return;
            }
        }

        const isP1Special = (this === player1 && bufferStr.includes('sd'));
        const isP2Special = (this === player2 && bufferStr.includes('arrowdownarrowright'));

        if (isP1Special || isP2Special) {
            this.performSpecial();
            this.inputBuffer = [];
        }
    }

    performSpecial() {
        if (this.isDead || this.isFrozen) return;
        const direction = this.facing;

        ctx.shadowBlur = 40;
        ctx.strokeStyle = '#fff';

        switch (this.name) {
            case 'NEON-ZERO':
                projectiles.push(new Projectile(this.position.x + 25, this.position.y + 50, 8 * direction, '#fff', this));
                break;
            case 'STINGER':
                projectiles.push(new Projectile(this.position.x + 25, this.position.y + 50, 10 * direction, '#ffcc00', this));
                break;
            case 'HEX-BOT':
                projectiles.push(new Projectile(this.position.x + 25, this.position.y + 50, 7 * direction, '#00ff00', this));
                break;
            case 'SOUL-GRID':
                projectiles.push(new Projectile(this.position.x + 25, this.position.y + 50, 9 * direction, '#ff0000', this));
                break;
        }
    }
}

let player1, player2;
const keys = {
    w: { pressed: false }, a: { pressed: false }, d: { pressed: false }, s: { pressed: false }, x: { pressed: false },
    arrowup: { pressed: false }, arrowleft: { pressed: false }, arrowright: { pressed: false }, arrowdown: { pressed: false }, l: { pressed: false }
};

function init() {
    player1 = new Sprite({
        position: { x: 150, y: 0 },
        velocity: { x: 0, y: 0 },
        color: selectedP1.color,
        offset: { x: 0, y: 20 },
        name: selectedP1.name
    });

    player2 = new Sprite({
        position: { x: 600, y: 0 },
        velocity: { x: 0, y: 0 },
        color: selectedP2.color,
        offset: { x: -60, y: 20 },
        name: selectedP2.name
    });

    document.querySelector('.p1-stats .name').textContent = selectedP1.name;
    document.querySelector('.p2-stats .name').textContent = selectedP2.name;

    timerEl.textContent = '∞';
    finishHimMode = false;
    finishHimEl.classList.add('hidden');
    particles = [];
    projectiles = [];
}

function rectangularCollision({ rectangle1, rectangle2 }) {
    return (
        rectangle1.attackBox.position.x + rectangle1.attackBox.width >= rectangle2.position.x &&
        rectangle1.attackBox.position.x <= rectangle2.position.x + rectangle2.width &&
        rectangle1.attackBox.position.y + rectangle1.attackBox.height >= (rectangle2.isCrouching ? rectangle2.position.y + 60 : rectangle2.position.y) &&
        rectangle1.attackBox.position.y <= rectangle2.position.y + rectangle2.height
    );
}

function determineWinner() {
    isGameRunning = false;
    winScreen.classList.remove('hidden');
    winText.textContent = "FATALITY";
    const winner = (player1.health > player2.health) ? selectedP1.name : selectedP2.name;
    document.getElementById('winner-banner').textContent = winner + " WINS";
}

function animate() {
    if (!isGameRunning) return;
    window.requestAnimationFrame(animate);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#111'; ctx.fillRect(0, GROUND_Y, canvas.width, 40);
    ctx.strokeStyle = '#8a0303'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, GROUND_Y); ctx.lineTo(canvas.width, GROUND_Y); ctx.stroke();

    player1.update();
    player2.update();

    projectiles.forEach((proj, i) => {
        proj.update();
        proj.draw();

        const target = (proj.owner === player1) ? player2 : player1;
        if (proj.active &&
            proj.x + 10 > target.position.x &&
            proj.x - 10 < target.position.x + target.width &&
            proj.y + 10 > target.position.y &&
            proj.y - 10 < target.position.y + target.height) {

            proj.active = false;
            if (proj.owner.name === 'NEON-ZERO') {
                target.isFrozen = true;
                setTimeout(() => target.isFrozen = false, 1500);
            } else if (proj.owner.name === 'STINGER') {
                target.position.x = proj.owner.position.x + (proj.owner.width * (proj.vx > 0 ? 1.5 : -1.5));
            } else {
                target.health -= 15;
            }

            p1HealthEl.style.width = Math.max(0, player1.health) + '%';
            p2HealthEl.style.width = Math.max(0, player2.health) + '%';
            if (player1.health <= 0 || player2.health <= 0) determineWinner();

            for (let j = 0; j < 10; j++) particles.push(new Particle(proj.x, proj.y, proj.color));
        }
        if (!proj.active) projectiles.splice(i, 1);
    });

    particles.forEach((p, i) => { p.update(); p.draw(); if (p.life <= 0) particles.splice(i, 1); });

    if (finishHimMode) return;

    // P1 Movement
    player1.velocity.x = 0;
    if (!player1.isFrozen && !player1.isCrouching) {
        if (keys.a.pressed && player1.lastKey === 'a') player1.velocity.x = -5;
        else if (keys.d.pressed && player1.lastKey === 'd') player1.velocity.x = 5;
    }
    player1.isCrouching = keys.s.pressed;

    // P2 Movement
    player2.velocity.x = 0;
    if (!player2.isFrozen && !player2.isCrouching) {
        if (keys.arrowleft.pressed && player2.lastKey === 'arrowleft') player2.velocity.x = -5;
        else if (keys.arrowright.pressed && player2.lastKey === 'arrowright') player2.velocity.x = 5;
    }
    player2.isCrouching = keys.arrowdown.pressed;

    // Hit detection
    if (player1.isAttacking && rectangularCollision({ rectangle1: player1, rectangle2: player2 })) {
        player2.health -= 5; player1.isAttacking = false; p2HealthEl.style.width = Math.max(0, player2.health) + '%';
        for (let j = 0; j < 15; j++) particles.push(new Particle(player2.position.x + 25, player2.position.y + 60, '#ff0055', 4));
        if (player2.health <= 10 && !finishHimMode) triggerFinishHim();
    }
    if (player2.isAttacking && rectangularCollision({ rectangle1: player2, rectangle2: player1 })) {
        player1.health -= 5; player2.isAttacking = false; p1HealthEl.style.width = Math.max(0, player1.health) + '%';
        for (let j = 0; j < 15; j++) particles.push(new Particle(player1.position.x + 25, player1.position.y + 60, '#ff0055', 4));
        if (player1.health <= 10 && !finishHimMode) triggerFinishHim();
    }
}

function triggerFinishHim() {
    finishHimMode = true;
    finishHimEl.classList.remove('hidden');
    // Give players 5 seconds to perform a fatality
    setTimeout(() => {
        if (finishHimMode) {
            finishHimMode = false;
            determineWinner(); // Default win if no fatality
        }
    }, 5000);
}

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (keys[key] !== undefined) keys[key].pressed = true;

    switch (key) {
        case 'd': player1.lastKey = 'd'; player1.inputBuffer.push('d'); break;
        case 'a': player1.lastKey = 'a'; player1.inputBuffer.push('a'); break;
        case 'w': if (player1.position.y + player1.height >= GROUND_Y) player1.velocity.y = -12; break;
        case 's': player1.inputBuffer.push('s'); break;
        case 'x': player1.attack(); break;

        case 'arrowright': player2.lastKey = 'arrowright'; player2.inputBuffer.push('arrowright'); break;
        case 'arrowleft': player2.lastKey = 'arrowleft'; player2.inputBuffer.push('arrowleft'); break;
        case 'arrowup': if (player2.position.y + player2.height >= GROUND_Y) player2.velocity.y = -12; break;
        case 'arrowdown': player2.inputBuffer.push('arrowdown'); break;
        case 'l': player2.attack(); break;

        case 'enter': if (!isGameRunning) startGame(); break;
    }

    if (player1.inputBuffer.length > 5) player1.inputBuffer.shift();
    if (player2.inputBuffer.length > 5) player2.inputBuffer.shift();
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (keys[key] !== undefined) keys[key].pressed = false;
});

function startGame() {
    startScreen.classList.add('hidden');
    charSelectScreen.classList.add('hidden');
    winScreen.classList.add('hidden');
    init();
    isGameRunning = true;
    animate();
}

p1Icons.forEach(icon => {
    icon.addEventListener('click', () => {
        p1Icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        selectedP1 = { name: icon.textContent, color: icon.dataset.color };
    });
});

p2Icons.forEach(icon => {
    icon.addEventListener('click', () => {
        p2Icons.forEach(i => i.classList.remove('active'));
        icon.classList.add('active');
        selectedP2 = { name: icon.textContent, color: icon.dataset.color };
    });
});

startBtn.addEventListener('click', () => {
    startScreen.classList.add('hidden');
    charSelectScreen.classList.remove('hidden');
});

confirmSelectBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
    winScreen.classList.add('hidden');
    charSelectScreen.classList.remove('hidden');
});

init();
ctx.fillStyle = '#000';
ctx.fillRect(0, 0, canvas.width, canvas.height);
player1.draw();
player2.draw();
