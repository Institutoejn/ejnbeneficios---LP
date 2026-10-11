const icons = {
  book: '<path d="M12 6c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v15"/>',
  heart: '<path d="M20.8 4.6a5.6 5.6 0 0 0-8 0l-.8.9-.8-.9a5.6 5.6 0 0 0-8 8L12 22l8.8-9.4a5.6 5.6 0 0 0 0-8Z"/><path d="M7 12h3l2-3 2 6 2-3h2"/>',
  ticket: '<path d="M3 8V4h18v4a4 4 0 0 0 0 8v4H3v-4a4 4 0 0 0 0-8Z"/><path d="M15 4v3m0 3v4m0 3v3"/>',
  bus: '<rect x="5" y="3" width="14" height="17" rx="3"/><path d="M5 12h14M8 3V1m8 2V1M8 20v2m8-2v2M9 16h.01M15 16h.01M5 7h14"/>'
};
document.querySelectorAll('[data-icon]').forEach(element => {
  element.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[element.dataset.icon] || ''}</svg>`;
});
const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() {
  toggle.setAttribute('aria-expanded', 'false');
  toggle.setAttribute('aria-label', 'Abrir menu');
  navigation.classList.remove('is-open');
}
toggle.addEventListener('click', () => {
  const open = toggle.getAttribute('aria-expanded') !== 'true';
  toggle.setAttribute('aria-expanded', String(open));
  toggle.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  navigation.classList.toggle('is-open', open);
});
navigation.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { closeMenu(); toggle.focus(); }
});
document.addEventListener('click', event => { if (!event.target.closest('.header')) closeMenu(); });
matchMedia('(min-width: 901px)').addEventListener('change', closeMenu);
document.querySelector('#year').textContent = new Date().getFullYear();
