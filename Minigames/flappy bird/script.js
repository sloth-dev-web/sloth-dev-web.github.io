const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startOverlay = document.getElementById('startOverlay');
const restartBtn = document.getElementById('restartBtn');

const bgImg = new Image();
const birdImg = new Image();
const pipeImg = new Image();
bgImg.src = 'PNGs/flappy-bird-background.png';
birdImg.src = 'PNGs/flappy-bird.png';
pipeImg.src = 'PNGs/flappy-bird-pipe.png';

let bird, pipes, score, highScore, gravity, flapPower, pipeSpeed, pipeGap, gameLoop, running, started, frameCount;

const PIPE_WIDTH = 52;
const BIRD_SIZE = 34;
const GROUND_HEIGHT = 60;

highScore = localStorage.getItem('flappyHighScore') || 0;
highScoreEl.textContent = highScore;

function init() {
    bird = { x: 80, y: 200, vel: 0, rotation: 0 };
    pipes = [];
    score = 0;
    gravity = 0.4;
    flapPower = -7;
    pipeSpeed = 2.5;
    pipeGap = 140;
    running = false;
    started = false;
    frameCount = 0;
    scoreEl.textContent = 0;
    gameOverEl.classList.add('hidden');
    startOverlay.classList.remove('hidden');
}

function flap() {
    if (!running && !started) {
        started = true;
        running = true;
        startOverlay.classList.add('hidden');
        bird.vel = flapPower;
        gameLoop = setInterval(update, 1000 / 60);
        return;
    }
    if (running) {
        bird.vel = flapPower;
    }
}

function addPipe() {
    const minTop = 60;
    const maxTop = canvas.height - GROUND_HEIGHT - pipeGap - 60;
    const topH = Math.floor(Math.random() * (maxTop - minTop)) + minTop;
    pipes.push({ x: canvas.width, topH: topH, scored: false });
}

function update() {
    frameCount++;

    bird.vel += gravity;
    bird.y += bird.vel;
    bird.rotation = Math.min(Math.max(bird.vel * 4, -25), 90);

    if (bird.y < 0) {
        endGame();
        return;
    }

    if (bird.y + BIRD_SIZE > canvas.height - GROUND_HEIGHT) {
        endGame();
        return;
    }

    if (frameCount % 90 === 0 || (pipes.length === 0 && frameCount > 30)) {
        addPipe();
    }

    for (let i = pipes.length - 1; i >= 0; i--) {
        pipes[i].x -= pipeSpeed;

        if (pipes[i].x + PIPE_WIDTH < -10) {
            pipes.splice(i, 1);
            continue;
        }

        const p = pipes[i];
        const bLeft = bird.x + 12;
        const bRight = bird.x + BIRD_SIZE - 12;
        const bTop = bird.y + 10;
        const bBottom = bird.y + BIRD_SIZE - 10;

        if (bRight > p.x + 10 && bLeft < p.x + PIPE_WIDTH - 10) {
            if (bTop < p.topH + 6 || bBottom > p.topH + pipeGap - 6) {
                endGame();
                return;
            }
        }

        if (!p.scored && p.x + PIPE_WIDTH < bird.x) {
            p.scored = true;
            score++;
            scoreEl.textContent = score;
        }
    }

    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#ded895';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, GROUND_HEIGHT);
    ctx.fillStyle = '#6aa84f';
    ctx.fillRect(0, canvas.height - GROUND_HEIGHT, canvas.width, 5);

    pipes.forEach(p => {
        const topPipeH = p.topH;
        if (topPipeH > 0) {
            ctx.drawImage(pipeImg, 0, 0, pipeImg.width, pipeImg.height, p.x, 0, PIPE_WIDTH, topPipeH);
        }

        const bottomY = p.topH + pipeGap;
        const bottomH = canvas.height - GROUND_HEIGHT - bottomY;
        if (bottomH > 0) {
            ctx.save();
            ctx.translate(p.x + PIPE_WIDTH / 2, bottomY + bottomH / 2);
            ctx.scale(1, -1);
            ctx.drawImage(pipeImg, 0, 0, pipeImg.width, pipeImg.height, -PIPE_WIDTH / 2, -bottomH / 2, PIPE_WIDTH, bottomH);
            ctx.restore();
        }
    });

    ctx.save();
    ctx.translate(bird.x + BIRD_SIZE / 2, bird.y + BIRD_SIZE / 2);
    ctx.rotate(bird.rotation * Math.PI / 180);
    ctx.drawImage(birdImg, -BIRD_SIZE / 2, -BIRD_SIZE / 2, BIRD_SIZE, BIRD_SIZE);
    ctx.restore();
}

function endGame() {
    clearInterval(gameLoop);
    running = false;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('flappyHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

function handleKey(e) {
    if (e.code === 'Space' || e.key === 'ArrowUp' || e.key === 'w') {
        e.preventDefault();
        flap();
    }
}

restartBtn.addEventListener('click', () => {
    clearInterval(gameLoop);
    init();
    draw();
});
document.addEventListener('keydown', handleKey);
canvas.addEventListener('mousedown', (e) => { e.preventDefault(); flap(); });
canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); });

function waitImages() {
    if (bgImg.complete && birdImg.complete && pipeImg.complete) {
        init();
        draw();
    } else {
        setTimeout(waitImages, 50);
    }
}

waitImages();
