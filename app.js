const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
document.documentElement.classList.add('js');

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

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const activeAnimations = new Set();
const revealed = new WeakSet();
let revealObserver;

// One brief opacity entrance, never a moving section or a scroll-driven loop.
// Every section is readable even when JavaScript or animation support is absent.
function configureReveals() {
  revealObserver?.disconnect();
  activeAnimations.forEach(animation => animation.cancel());
  activeAnimations.clear();
  if (reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      const element = entry.target;
      revealObserver.unobserve(element);
      if (revealed.has(element)) continue;
      revealed.add(element);
      const animation = element.animate([{ opacity: .8 }, { opacity: 1 }], { duration: 180, easing: 'ease-out' });
      activeAnimations.add(animation);
      const clean = () => activeAnimations.delete(animation);
      animation.addEventListener('finish', clean, { once: true });
      animation.addEventListener('cancel', clean, { once: true });
    }
  }, { threshold: 0, rootMargin: '0px 0px 40px 0px' });
  document.querySelectorAll('[data-reveal]').forEach(element => {
    if (!revealed.has(element)) revealObserver.observe(element);
  });
}

const stage = document.querySelector('.card-stage');
const card = document.querySelector('.club-card');
let angle = 0;
let pointerId = null;
let startX = 0;
let startAngle = 0;
let frame = null;
let degreesPerPixel = 1;
const normalizedAngle = () => ((angle % 360) + 360) % 360;

function paintCard() {
  frame = null;
  card.style.setProperty('--card-angle', `${angle.toFixed(2)}deg`);
}
function schedulePaint() {
  // At most one transform write per browser frame; no perpetual spring/inertia.
  if (reducedMotion.matches) {
    if (frame !== null) cancelAnimationFrame(frame);
    paintCard();
  } else if (frame === null) frame = requestAnimationFrame(paintCard);
}
function announceFace() {
  const rotation = normalizedAngle();
  const back = rotation > 90 && rotation < 270;
  stage.setAttribute('aria-valuenow', String(Math.round(rotation)));
  stage.setAttribute('aria-valuetext', back ? 'Verso do cartão' : 'Frente do cartão');
}
function setAngle(value) {
  angle = value;
  schedulePaint();
  announceFace();
}

stage.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
  pointerId = event.pointerId;
  startX = event.clientX;
  startAngle = angle;
  // One card-width gesture turns the card halfway. Geometry is read only here.
  degreesPerPixel = 180 / card.offsetWidth;
  stage.setPointerCapture(pointerId);
  stage.classList.add('is-dragging');
  card.classList.add('is-moving');
});
stage.addEventListener('pointermove', event => {
  if (event.pointerId !== pointerId) return;
  angle = startAngle + (event.clientX - startX) * degreesPerPixel;
  schedulePaint();
});
function finishDrag(event) {
  if (pointerId === null || (event?.pointerId !== undefined && event.pointerId !== pointerId)) return;
  const releasedPointer = pointerId;
  pointerId = null;
  if (stage.hasPointerCapture(releasedPointer)) stage.releasePointerCapture(releasedPointer);
  stage.classList.remove('is-dragging');
  card.classList.remove('is-moving');
  // Keep the chosen orientation and never translate or snap the card sideways.
  angle = normalizedAngle();
  schedulePaint();
  announceFace();
}
stage.addEventListener('pointerup', finishDrag);
stage.addEventListener('pointercancel', finishDrag);
stage.addEventListener('lostpointercapture', finishDrag);
stage.addEventListener('dragstart', event => event.preventDefault());
stage.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter', ' ', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  finishDrag();
  if (event.key === 'ArrowLeft') setAngle(angle - 15);
  else if (event.key === 'ArrowRight') setAngle(angle + 15);
  else if (event.key === 'End') setAngle(180);
  else if (event.key === 'Enter' || event.key === ' ') setAngle(Math.round(angle / 180) * 180 + 180);
  else setAngle(0);
});
window.addEventListener('blur', () => finishDrag());
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) return;
  finishDrag();
  if (frame !== null) cancelAnimationFrame(frame);
  paintCard();
  activeAnimations.forEach(animation => animation.cancel());
});
reducedMotion.addEventListener('change', () => {
  configureReveals();
  finishDrag();
  if (frame !== null) cancelAnimationFrame(frame);
  paintCard();
});
configureReveals();
