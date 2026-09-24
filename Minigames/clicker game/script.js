const countEl = document.getElementById('count');
const perClickEl = document.getElementById('perClick');
const perSecondEl = document.getElementById('perSecond');
const totalClicksEl = document.getElementById('totalClicks');
const clickBtn = document.getElementById('clickBtn');
const floaters = document.getElementById('floaters');
const upgradeGrid = document.getElementById('upgradeGrid');

let count = 0;
let perClick = 1;
let perSecond = 0;
let totalClicks = 0;
let lastRenderedCount = -1;

const upgrades = [
    {
        name: 'better finger',
        desc: '+1 per click',
        baseCost: 15,
        costMult: 1.4,
        owned: 0,
        type: 'click',
        value: 1
    },
    {
        name: 'helper',
        desc: '+1 per second',
        baseCost: 50,
        costMult: 1.5,
        owned: 0,
        type: 'auto',
        value: 1
    },
    {
        name: 'mechanical keyboard',
        desc: '+3 per click',
        baseCost: 200,
        costMult: 1.6,
        owned: 0,
        type: 'click',
        value: 3
    },
    {
        name: 'click farm',
        desc: '+5 per second',
        baseCost: 500,
        costMult: 1.55,
        owned: 0,
        type: 'auto',
        value: 5
    },
    {
        name: 'robot arm',
        desc: '+10 per click',
        baseCost: 2000,
        costMult: 1.7,
        owned: 0,
        type: 'click',
        value: 10
    },
    {
        name: 'server rack',
        desc: '+20 per second',
        baseCost: 5000,
        costMult: 1.6,
        owned: 0,
        type: 'auto',
        value: 20
    },
    {
        name: 'ai assistant',
        desc: '+50 per click',
        baseCost: 20000,
        costMult: 1.8,
        owned: 0,
        type: 'click',
        value: 50
    },
    {
        name: 'quantum computer',
        desc: '+100 per second',
        baseCost: 100000,
        costMult: 1.65,
        owned: 0,
        type: 'auto',
        value: 100
    }
];

function getCost(upgrade) {
    return Math.floor(upgrade.baseCost * Math.pow(upgrade.costMult, upgrade.owned));
}

function formatNum(n) {
    if (n >= 1e9) return (n / 1e9).toFixed(1) + 'b';
    if (n >= 1e6) return (n / 1e6).toFixed(1) + 'm';
    if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k';
    return Math.floor(n).toString();
}

function updateDisplay() {
    countEl.textContent = formatNum(count);
    perClickEl.textContent = formatNum(perClick);
    perSecondEl.textContent = formatNum(perSecond);
    totalClicksEl.textContent = formatNum(totalClicks);
}

function renderUpgrades() {
    upgradeGrid.innerHTML = '';
    for (let i = 0; i < upgrades.length; i++) {
        const u = upgrades[i];
        const cost = getCost(u);
        const locked = count < cost;
        const el = document.createElement('div');
        el.className = 'upgrade-item' + (locked ? ' locked' : '') + (u.owned > 0 ? ' owned' : '');
        el.innerHTML = `
            <div class="upgrade-info">
                <span class="upgrade-name">${u.name}</span>
                <span class="upgrade-desc">${u.desc}</span>
            </div>
            <div class="upgrade-right">
                <span class="upgrade-cost">${formatNum(cost)}</span>
                <span class="upgrade-count">${u.owned > 0 ? u.owned : ''}</span>
            </div>
        `;
        if (!locked) {
            el.addEventListener('click', (e) => {
                e.stopPropagation();
                buyUpgrade(i);
            });
        }
        upgradeGrid.appendChild(el);
    }
    lastRenderedCount = Math.floor(count);
}

function maybeRenderUpgrades() {
    if (Math.floor(count) !== lastRenderedCount) {
        renderUpgrades();
    }
}

function buyUpgrade(index) {
    const u = upgrades[index];
    const cost = getCost(u);
    if (count < cost) return;

    count -= cost;
    u.owned++;

    if (u.type === 'click') {
        perClick += u.value;
    } else {
        perSecond += u.value;
    }

    updateDisplay();
    renderUpgrades();
}

function spawnFloater(x, y, text) {
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    floaters.appendChild(el);
    setTimeout(() => el.remove(), 700);
}

function doClick(e) {
    e.stopPropagation();
    count += perClick;
    totalClicks++;

    countEl.classList.add('pop');
    setTimeout(() => countEl.classList.remove('pop'), 100);

    clickBtn.classList.add('pulse');
    setTimeout(() => clickBtn.classList.remove('pulse'), 300);

    const rect = clickBtn.getBoundingClientRect();
    const x = e.clientX - rect.left - 10;
    const y = e.clientY - rect.top - 20;
    spawnFloater(x, y, '+' + formatNum(perClick));

    updateDisplay();
    renderUpgrades();
}

clickBtn.addEventListener('click', doClick);

setInterval(() => {
    if (perSecond > 0) {
        count += perSecond / 10;
        updateDisplay();
        maybeRenderUpgrades();
    }
}, 100);

updateDisplay();
renderUpgrades();
