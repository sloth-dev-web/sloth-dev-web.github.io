const boardEl = document.getElementById('board');
const scoreEl = document.getElementById('score');
const highScoreEl = document.getElementById('highScore');
const gameOverEl = document.getElementById('gameOver');
const winOverlay = document.getElementById('winOverlay');
const newGameBtn = document.getElementById('newGameBtn');
const restartBtn = document.getElementById('restartBtn');
const restartBtn2 = document.getElementById('restartBtn2');
const keepBtn = document.getElementById('keepBtn');
const titleEl = document.querySelector('h1');

let grid, score, highScore, won, over;
let nextId = 0;

const BOARD_SIZE = 340;
const PADDING = 8;
const GAP = 8;
const CELL = (BOARD_SIZE - PADDING * 2 - GAP * 3) / 4;

const tileColors = {
    2: '#888888',
    4: '#999999',
    8: '#c45c4a',
    16: '#d45a4a',
    32: '#e04a3a',
    64: '#f04a3a',
    128: '#c4b44a',
    256: '#d4c44a',
    512: '#e4d44a',
    1024: '#f4e44a',
    2048: '#f4f44a'
};

highScore = localStorage.getItem('2048HighScore') || 0;
highScoreEl.textContent = highScore;

function cellPos(i) {
    return PADDING + i * (CELL + GAP);
}

function createTileEl(val, r, c) {
    const el = document.createElement('div');
    el.className = 'tile tile-new tile-' + (val <= 2048 ? val : 'super');
    el.textContent = val;
    el.style.width = CELL + 'px';
    el.style.height = CELL + 'px';
    el.style.left = cellPos(c) + 'px';
    el.style.top = cellPos(r) + 'px';
    return el;
}

function updateTitleColor() {
    const vals = new Set();
    for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++)
            if (grid[r][c]) vals.add(grid[r][c].val);

    if (vals.size === 0) {
        titleEl.style.color = '#e0e0e0';
        titleEl.style.background = 'none';
        titleEl.style.webkitBackgroundClip = 'unset';
        return;
    }

    const sorted = [...vals].sort((a, b) => a - b);
    const colors = sorted.map(v => tileColors[v] || '#f4a4f4');

    if (colors.length === 1) {
        titleEl.style.color = colors[0];
        titleEl.style.background = 'none';
        titleEl.style.webkitBackgroundClip = 'unset';
    } else {
        const gradient = `linear-gradient(90deg, ${colors.join(', ')})`;
        titleEl.style.background = gradient;
        titleEl.style.webkitBackgroundClip = 'text';
        titleEl.style.webkitTextFillColor = 'transparent';
        titleEl.style.backgroundClip = 'text';
        titleEl.style.color = 'transparent';
    }
}

function init() {
    grid = Array.from({ length: 4 }, () => Array(4).fill(null));
    score = 0;
    won = false;
    over = false;
    nextId = 0;
    scoreEl.textContent = 0;
    gameOverEl.classList.add('hidden');
    winOverlay.classList.add('hidden');
    boardEl.innerHTML = '<div class="grid-bg">' + '<div class="grid-cell"></div>'.repeat(16) + '</div>';
    addRandom();
    addRandom();
    updateTitleColor();
}

function addRandom() {
    const empty = [];
    for (let r = 0; r < 4; r++)
        for (let c = 0; c < 4; c++)
            if (!grid[r][c]) empty.push([r, c]);
    if (!empty.length) return;
    const [r, c] = empty[Math.floor(Math.random() * empty.length)];
    const val = Math.random() < 0.9 ? 2 : 4;
    const el = createTileEl(val, r, c);
    boardEl.appendChild(el);
    grid[r][c] = { id: nextId++, r, c, val, el };
}

function move(dir) {
    if (over) return false;

    let moved = false;
    let totalScore = 0;
    let toRemove = [];
    let toMerge = [];

    for (let i = 0; i < 4; i++) {
        let cells;
        if (dir === 'left') cells = [0,1,2,3].map(c => grid[i][c]);
        else if (dir === 'right') cells = [3,2,1,0].map(c => grid[i][c]);
        else if (dir === 'up') cells = [0,1,2,3].map(r => grid[r][i]);
        else if (dir === 'down') cells = [3,2,1,0].map(r => grid[r][i]);

        const oldIds = cells.map(t => t ? t.id : -1).join(',');
        const tiles = cells.filter(t => t !== null);
        const newCells = [];

        for (let j = 0; j < tiles.length; j++) {
            if (j + 1 < tiles.length && tiles[j].val === tiles[j + 1].val) {
                const newVal = tiles[j].val * 2;
                totalScore += newVal;
                tiles[j].val = newVal;
                toMerge.push(tiles[j]);
                toRemove.push(tiles[j + 1]);
                newCells.push(tiles[j]);
                j++;
            } else {
                newCells.push(tiles[j]);
            }
        }
        while (newCells.length < 4) newCells.push(null);

        const newIds = newCells.map(t => t ? t.id : -1).join(',');
        if (oldIds !== newIds) moved = true;

        newCells.forEach((t, idx) => {
            let r, c;
            if (dir === 'left') { r = i; c = idx; }
            else if (dir === 'right') { r = i; c = 3 - idx; }
            else if (dir === 'up') { r = idx; c = i; }
            else if (dir === 'down') { r = 3 - idx; c = i; }
            if (t) {
                t.r = r;
                t.c = c;
                t.el.style.left = cellPos(c) + 'px';
                t.el.style.top = cellPos(r) + 'px';
            }
            grid[r][c] = t;
        });
    }

    if (!moved) return false;

    score += totalScore;
    scoreEl.textContent = score;
    updateTitleColor();

    setTimeout(() => {
        toRemove.forEach(t => {
            if (t.el && t.el.parentNode) t.el.remove();
            if (grid[t.r] && grid[t.r][t.c] && grid[t.r][t.c].id === t.id) {
                grid[t.r][t.c] = null;
            }
        });

        toMerge.forEach(t => {
            t.el.textContent = t.val;
            t.el.className = 'tile tile-merged tile-' + (t.val <= 2048 ? t.val : 'super');
        });

        addRandom();

        if (!won) {
            for (let r = 0; r < 4; r++)
                for (let c = 0; c < 4; c++)
                    if (grid[r][c] && grid[r][c].val === 2048) won = true;
            if (won) winOverlay.classList.remove('hidden');
        }

        if (isGameOver()) {
            over = true;
            gameOverEl.classList.remove('hidden');
        }

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('2048HighScore', highScore);
            highScoreEl.textContent = highScore;
        }
    }, 120);

    return true;
}

function isGameOver() {
    for (let r = 0; r < 4; r++) {
        for (let c = 0; c < 4; c++) {
            if (!grid[r][c]) return false;
            if (c < 3 && grid[r][c].val === grid[r][c + 1].val) return false;
            if (r < 3 && grid[r][c].val === grid[r + 1][c].val) return false;
        }
    }
    return true;
}

function handleKey(e) {
    const map = {
        'ArrowLeft': 'left', 'ArrowRight': 'right',
        'ArrowUp': 'up', 'ArrowDown': 'down',
        'a': 'left', 'd': 'right', 'w': 'up', 's': 'down'
    };
    if (map[e.key]) {
        e.preventDefault();
        move(map[e.key]);
    }
}

newGameBtn.addEventListener('click', init);
restartBtn.addEventListener('click', init);
restartBtn2.addEventListener('click', init);
keepBtn.addEventListener('click', () => winOverlay.classList.add('hidden'));
document.addEventListener('keydown', handleKey);

let touchStartX, touchStartY;
boardEl.addEventListener('touchstart', e => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
});
boardEl.addEventListener('touchend', e => {
    if (!touchStartX || !touchStartY) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    move(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
    touchStartX = touchStartY = null;
});

init();
