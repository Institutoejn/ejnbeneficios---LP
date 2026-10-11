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
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const activeAnimations = new Set();
let revealObserver;

// Visible without JavaScript. Re-entering the viewport replays the transition.
function animateElement(element, frames, options) {
  const animation = element.animate(frames, options);
  activeAnimations.add(animation);
  const dispose = () => activeAnimations.delete(animation);
  animation.addEventListener('finish', dispose, { once: true });
  animation.addEventListener('cancel', dispose, { once: true });
}
function configureReveals() {
  revealObserver?.disconnect();
  activeAnimations.forEach(animation => animation.cancel());
  activeAnimations.clear();
  if (reducedMotion.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;
  const visible = new WeakSet();
  revealObserver = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const element = entry.target;
      if (!entry.isIntersecting || entry.intersectionRatio < .12) { visible.delete(element); continue; }
      if (visible.has(element)) continue;
      visible.add(element);
      const offset = entry.boundingClientRect.top < innerHeight * .35 ? -20 : 24;
      if (element.hasAttribute('data-reveal')) {
        animateElement(element, [
          { opacity: .35, transform: `translateY(${offset}px)` },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 620, easing: 'cubic-bezier(.2,.65,.25,1)' });
      }
      element.querySelectorAll('.line-icon .bi, .category-ribbon .bi').forEach((svg, index) => {
        animateElement(svg, [
          { opacity: .2, transform: `translateY(${offset * .5}px) rotate(-12deg) scale(.85)` },
          { opacity: 1, transform: 'translateY(0) rotate(0deg) scale(1)' }
        ], { duration: 560, delay: Math.min(index * 55, 165), easing: 'cubic-bezier(.2,.65,.25,1)' });
      });
    }
  }, { threshold: .12, rootMargin: '0px 0px -24px 0px' });
  document.querySelectorAll('[data-reveal], .category-ribbon').forEach(element => revealObserver.observe(element));
}

// Pointer capture keeps drag stable; pan-y retains native vertical touch scrolling.
const card = document.querySelector('.club-card');
const stage = document.querySelector('.card-stage');
const status = document.querySelector('#card-status');
const current = { x: 0, rx: 0, ry: 0, rz: -8 };
const target = { ...current };
let frame = null;
let previousFrame = 0;
let pointerId = null;
let pointerStart = 0;
let dragStart = 0;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const travelLimit = () => Math.max(12, Math.min(60, (stage.clientWidth - card.offsetWidth) / 2 - 8));

function paintCard() {
  card.style.setProperty('--card-x', `${current.x.toFixed(2)}px`);
  card.style.setProperty('--card-rx', `${current.rx.toFixed(2)}deg`);
  card.style.setProperty('--card-ry', `${current.ry.toFixed(2)}deg`);
  card.style.setProperty('--card-rz', `${current.rz.toFixed(2)}deg`);
}
function tick(time) {
  frame = null;
  const delta = previousFrame ? Math.min(time - previousFrame, 40) : 16;
  previousFrame = time;
  const weight = 1 - Math.exp(-delta / (pointerId === null ? 75 : 35));
  let moving = false;
  for (const property of Object.keys(current)) {
    const difference = target[property] - current[property];
    if (Math.abs(difference) > .04) { current[property] += difference * weight; moving = true; }
    else current[property] = target[property];
  }
  paintCard();
  if (moving && !document.hidden) frame = requestAnimationFrame(tick);
  else { previousFrame = 0; card.classList.remove('is-moving'); }
}
function moveCard() {
  if (reducedMotion.matches || document.hidden) {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
    previousFrame = 0;
    Object.assign(current, target);
    paintCard();
    card.classList.remove('is-moving');
    return;
  }
  card.classList.add('is-moving');
  if (frame === null) frame = requestAnimationFrame(tick);
}
function neutralTilt() {
  target.rx = 0;
  target.ry = 0;
  target.rz = -8;
  moveCard();
}
function announcePosition() {
  status.textContent = Math.abs(target.x) < 1 ? 'Cartão centralizado.' : `Cartão movido para a ${target.x < 0 ? 'esquerda' : 'direita'}.`;
}
function positionCard(x) {
  target.x = clamp(x, -travelLimit(), travelLimit());
  neutralTilt();
  announcePosition();
}

card.addEventListener('pointerdown', event => {
  if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
  pointerId = event.pointerId;
  pointerStart = event.clientX;
  dragStart = current.x;
  card.setPointerCapture(pointerId);
  card.classList.add('is-dragging');
});
card.addEventListener('pointermove', event => {
  if (pointerId !== null) {
    if (event.pointerId !== pointerId) return;
    const distance = event.clientX - pointerStart;
    target.x = clamp(dragStart + distance, -travelLimit(), travelLimit());
    target.ry = reducedMotion.matches ? 0 : clamp(distance * .11, -14, 14);
    target.rz = reducedMotion.matches ? -8 : -8 + clamp(distance * .035, -4, 4);
    moveCard();
  } else if (finePointer.matches && event.pointerType === 'mouse' && !reducedMotion.matches) {
    const rect = stage.getBoundingClientRect();
    const horizontal = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const vertical = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    target.rx = (vertical - .5) * -16;
    target.ry = (horizontal - .5) * 24;
    card.style.setProperty('--shine-x', `${horizontal * 100}%`);
    card.style.setProperty('--shine-y', `${vertical * 100}%`);
    moveCard();
  }
});
function finishDrag(event) {
  if (pointerId === null || (event?.pointerId !== undefined && event.pointerId !== pointerId)) return;
  const releasedPointer = pointerId;
  pointerId = null;
  if (card.hasPointerCapture(releasedPointer)) card.releasePointerCapture(releasedPointer);
  card.classList.remove('is-dragging');
  neutralTilt();
  announcePosition();
}
card.addEventListener('pointerup', finishDrag);
card.addEventListener('pointercancel', finishDrag);
card.addEventListener('lostpointercapture', finishDrag);
card.addEventListener('pointerleave', () => { if (pointerId === null) neutralTilt(); });
card.addEventListener('dragstart', event => event.preventDefault());
card.addEventListener('keydown', event => {
  if (!['ArrowLeft', 'ArrowRight', 'Home', 'Escape'].includes(event.key)) return;
  event.preventDefault();
  if (event.key === 'Escape') finishDrag();
  positionCard(event.key === 'ArrowLeft' ? target.x - 20 : event.key === 'ArrowRight' ? target.x + 20 : 0);
});
document.querySelectorAll('[data-card-step]').forEach(button => {
  button.addEventListener('click', () => positionCard(target.x + Number(button.dataset.cardStep) * 24));
});
document.querySelector('.card-reset').addEventListener('click', () => positionCard(0));
window.addEventListener('blur', () => { finishDrag(); neutralTilt(); });
window.addEventListener('resize', () => { target.x = clamp(target.x, -travelLimit(), travelLimit()); moveCard(); }, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { finishDrag(); neutralTilt(); activeAnimations.forEach(animation => animation.cancel()); }
});
reducedMotion.addEventListener('change', () => { configureReveals(); finishDrag(); neutralTilt(); });
configureReveals();
document.querySelectorAll('.faq-list details').forEach(details => {
  details.addEventListener('toggle', () => {
    if (details.open && !reducedMotion.matches && Element.prototype.animate) {
      animateElement(details.querySelector('p'), [{ opacity: .35, transform: 'translateY(-5px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 250, easing: 'ease-out' });
    }
  });
});
