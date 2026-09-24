if (history.scrollRestoration) {
  history.scrollRestoration = 'manual';
}
window.scrollTo(0, 0);

const menuBtn = document.getElementById('menuBtn');
const sidebar = document.getElementById('sidebar');
const searchInput = document.querySelector('.search-input');
const cards = document.querySelectorAll('.card');
const helpBtn = document.getElementById('helpBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');

function toggleMenu() {
  menuBtn.classList.toggle('active');
  sidebar.classList.toggle('open');
}

function closeMenu() {
  menuBtn.classList.remove('active');
  sidebar.classList.remove('open');
}

menuBtn.addEventListener('click', toggleMenu);

document.addEventListener('click', (e) => {
  if (!sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
    closeMenu();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

helpBtn.addEventListener('click', () => {
  closeMenu();
  modalOverlay.classList.add('open');
});

modalClose.addEventListener('click', () => {
  modalOverlay.classList.remove('open');
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.classList.remove('open');
  }
});

searchInput.addEventListener('input', () => {
  const query = searchInput.value.toLowerCase();
  cards.forEach(card => {
    const name = card.dataset.name.toLowerCase();
    card.style.display = name.includes(query) ? '' : 'none';
  });
});
