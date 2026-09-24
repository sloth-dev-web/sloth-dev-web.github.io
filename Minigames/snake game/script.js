const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const finalScoreEl = document.getElementById('finalScore');
const gameOverEl = document.getElementById('gameOver');
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake, food, dx, dy, score, highScore, gameLoop, speed, running, paused;

highScore = localStorage.getItem('snakeHighScore') || 0;
highScoreEl.textContent = highScore;

function init() {
    snake = [{ x: 10, y: 10 }];
    dx = 1;
    dy = 0;
    score = 0;
    speed = 115;
    running = false;
    paused = false;
    scoreEl.textContent = score;
    placeFood();
    gameOverEl.classList.add('hidden');
    startOverlay.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    pauseBtn.textContent = 'pause';
}

function placeFood() {
    food = {
        x: Math.floor(Math.random() * tileCount),
        y: Math.floor(Math.random() * tileCount)
    };
    for (let s of snake) {
        if (s.x === food.x && s.y === food.y) {
            placeFood();
            return;
        }
    }
}

function update() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };

    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
        endGame();
        return;
    }

    for (let s of snake) {
        if (head.x === s.x && head.y === s.y) {
            endGame();
            return;
        }
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
        score++;
        scoreEl.textContent = score;
        if (speed > 55) speed -= 2;
        placeFood();
        clearInterval(gameLoop);
        gameLoop = setInterval(update, speed);
    } else {
        snake.pop();
    }

    draw();
}

function draw() {
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#161616';
    ctx.lineWidth = 1;
    for (let i = 0; i <= tileCount; i++) {
        ctx.beginPath();
        ctx.moveTo(i * gridSize, 0);
        ctx.lineTo(i * gridSize, canvas.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, i * gridSize);
        ctx.lineTo(canvas.width, i * gridSize);
        ctx.stroke();
    }

    for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        const t = i / snake.length;
        const alpha = 0.9 - t * 0.45;
        const size = gridSize - 3;
        const offset = 1.5;

        ctx.fillStyle = `rgba(180, 200, 160, ${alpha})`;
        ctx.beginPath();
        const radius = 4;
        const x = s.x * gridSize + offset;
        const y = s.y * gridSize + offset;
        ctx.roundRect(x, y, size, size, radius);
        ctx.fill();

        if (i === 0) {
            const eyeSize = 2.5;
            ctx.fillStyle = '#111';
            if (dx === 1) {
                ctx.fillRect(s.x * gridSize + 12, s.y * gridSize + 5, eyeSize, eyeSize);
                ctx.fillRect(s.x * gridSize + 12, s.y * gridSize + 12, eyeSize, eyeSize);
            } else if (dx === -1) {
                ctx.fillRect(s.x * gridSize + 5, s.y * gridSize + 5, eyeSize, eyeSize);
                ctx.fillRect(s.x * gridSize + 5, s.y * gridSize + 12, eyeSize, eyeSize);
            } else if (dy === -1) {
                ctx.fillRect(s.x * gridSize + 5, s.y * gridSize + 5, eyeSize, eyeSize);
                ctx.fillRect(s.x * gridSize + 12, s.y * gridSize + 5, eyeSize, eyeSize);
            } else {
                ctx.fillRect(s.x * gridSize + 5, s.y * gridSize + 12, eyeSize, eyeSize);
                ctx.fillRect(s.x * gridSize + 12, s.y * gridSize + 12, eyeSize, eyeSize);
            }
        }
    }

    ctx.fillStyle = '#c45c4a';
    ctx.beginPath();
    const fx = food.x * gridSize + gridSize / 2;
    const fy = food.y * gridSize + gridSize / 2;
    ctx.arc(fx, fy, gridSize / 2 - 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#d4756a';
    ctx.beginPath();
    ctx.arc(fx - 1.5, fy - 1.5, 2, 0, Math.PI * 2);
    ctx.fill();
}

function endGame() {
    clearInterval(gameLoop);
    running = false;
    paused = false;
    finalScoreEl.textContent = score;
    gameOverEl.classList.remove('hidden');
    pauseBtn.classList.add('hidden');
    pauseBtn.textContent = 'pause';

    if (score > highScore) {
        highScore = score;
        localStorage.setItem('snakeHighScore', highScore);
        highScoreEl.textContent = highScore;
    }
}

function changeDirection(e) {
    if (!running || paused) return;
    const key = e.key;

    if ((key === 'ArrowUp' || key === 'w') && dy === 0) {
        dx = 0; dy = -1;
    } else if ((key === 'ArrowDown' || key === 's') && dy === 0) {
        dx = 0; dy = 1;
    } else if ((key === 'ArrowLeft' || key === 'a') && dx === 0) {
        dx = -1; dy = 0;
    } else if ((key === 'ArrowRight' || key === 'd') && dx === 0) {
        dx = 1; dy = 0;
    }

    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','w','a','s','d'].includes(key)) {
        e.preventDefault();
    }
}

function pauseGame() {
    if (!running || paused) return;
    paused = true;
    clearInterval(gameLoop);
    pauseBtn.textContent = 'resume';
}

function resumeGame() {
    if (!paused) return;
    paused = false;
    pauseBtn.textContent = 'pause';
    gameLoop = setInterval(update, speed);
}

function togglePause(e) {
    if (e.code === 'Space' || e.key === 'p') {
        e.preventDefault();
        if (paused) {
            resumeGame();
        } else {
            pauseGame();
        }
    }
}

function startGame() {
    clearInterval(gameLoop);
    init();
    running = true;
    startOverlay.classList.add('hidden');
    pauseBtn.classList.remove('hidden');
    gameLoop = setInterval(update, speed);
    draw();
}

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', startGame);
pauseBtn.addEventListener('click', () => paused ? resumeGame() : pauseGame());
document.addEventListener('keydown', changeDirection);
document.addEventListener('keydown', togglePause);

init();
draw();
