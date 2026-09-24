const coin = document.getElementById('coin');
const coinImg = document.getElementById('coinImg');
const headBtn = document.getElementById('headBtn');
const tailBtn = document.getElementById('tailBtn');
const resultEl = document.getElementById('result');
const winsEl = document.getElementById('wins');
const lossesEl = document.getElementById('losses');
const streakEl = document.getElementById('streak');

let wins = 0;
let losses = 0;
let streak = 0;
let flipping = false;

function flip(choice) {
    if (flipping) return;
    flipping = true;

    headBtn.disabled = true;
    tailBtn.disabled = true;
    resultEl.textContent = '';
    resultEl.className = 'result';

    coin.className = 'coin';
    void coin.offsetWidth;
    coin.className = 'coin flip';

    const result = Math.random() < 0.5 ? 'heads' : 'tails';

    setTimeout(() => {
        coinImg.src = result === 'heads' ? 'head.png' : 'tail.png';

        if (choice === result) {
            wins++;
            streak++;
            winsEl.textContent = wins;
            resultEl.textContent = 'you win!';
            resultEl.className = 'result win';
            coin.className = 'coin win';
        } else {
            losses++;
            streak = 0;
            lossesEl.textContent = losses;
            resultEl.textContent = 'you lose.';
            resultEl.className = 'result lose';
            coin.className = 'coin lose';
        }

        streakEl.textContent = streak;
        flipping = false;
        headBtn.disabled = false;
        tailBtn.disabled = false;
    }, 600);
}

headBtn.addEventListener('click', () => flip('heads'));
tailBtn.addEventListener('click', () => flip('tails'));
