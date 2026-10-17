const tip = document.createElement('span');
tip.className = 'nv-shortcut-tip';
tip.popover = 'manual';
tip.setAttribute('aria-hidden', 'true');
document.body.append(tip);

let target: HTMLElement | null = null;
let focusTarget: HTMLElement | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let tabbing = false;

const hide = () => {
  clearTimeout(timer);
  target = null;
  tip.hidePopover();
};

const position = () => {
  if (!target || !tip.matches(':popover-open')) return;
  const view = window.visualViewport!;
  const anchor = target.getBoundingClientRect();
  const gap = 8;
  const leftEdge = view.offsetLeft + gap;
  const topEdge = view.offsetTop + gap;
  const rightEdge = view.offsetLeft + view.width - gap;
  const bottomEdge = view.offsetTop + view.height - gap;
  if (
    !target.getClientRects().length ||
    anchor.bottom < view.offsetTop ||
    anchor.top > view.offsetTop + view.height ||
    anchor.right < view.offsetLeft ||
    anchor.left > view.offsetLeft + view.width
  ) {
    hide();
    return;
  }
  tip.style.maxWidth = `${view.width - gap * 2}px`;
  const { width, height } = tip.getBoundingClientRect();
  const top =
    anchor.bottom + gap + height <= bottomEdge
      ? anchor.bottom + gap
      : anchor.top - height - gap;
  tip.style.left = `${Math.max(leftEdge, Math.min(anchor.left + (anchor.width - width) / 2, rightEdge - width))}px`;
  tip.style.top = `${Math.max(topEdge, Math.min(top, bottomEdge - height))}px`;
};

const show = (element: HTMLElement, delay: number) => {
  hide();
  target = element;
  timer = setTimeout(() => {
    if (!element.isConnected || !element.getClientRects().length) return;
    (element.closest('dialog, [popover]') ?? document.body).append(tip);
    tip.textContent = element.dataset.nvTip!;
    tip.showPopover();
    position();
  }, delay);
};

const hintTarget = (event: Event) =>
  event.target instanceof Element
    ? event.target.closest<HTMLElement>('[data-nv-tip]')
    : null;

document.addEventListener('pointerover', (event) => {
  if (event.pointerType === 'touch' || !matchMedia('(hover: hover)').matches)
    return;
  const element = hintTarget(event);
  if (element && element !== target) show(element, 300);
});
document.addEventListener('focusin', (event) => {
  const element = hintTarget(event);
  if (tabbing && element?.matches(':focus-visible')) {
    focusTarget = element;
    show(element, 0);
  }
});
for (const type of ['pointerout', 'focusout'])
  document.addEventListener(type, (event) => {
    if (type === 'focusout') focusTarget = null;
    if (
      !target ||
      !(
        target.contains(event.target as Node) ||
        tip.contains(event.target as Node)
      )
    )
      return;
    const related = (event as FocusEvent | PointerEvent).relatedTarget;
    if (
      related instanceof Node &&
      (target.contains(related) || tip.contains(related))
    )
      return;
    if (
      focusTarget === target ||
      (type === 'focusout' &&
        (target.matches(':hover') || tip.matches(':hover')))
    )
      return;
    hide();
  });
for (const type of ['pointerdown', 'click'])
  document.addEventListener(
    type,
    () => {
      tabbing = false;
      focusTarget = null;
      hide();
    },
    true,
  );
document.addEventListener('scroll', position, true);
document.addEventListener('close', hide, true);
document.addEventListener(
  'beforetoggle',
  (event) => {
    if (event.target !== tip) hide();
  },
  true,
);
document.addEventListener(
  'keydown',
  (event) => {
    tabbing = event.key === 'Tab';
    if (event.key === 'Escape') hide();
  },
  true,
);
window.addEventListener('resize', position);
window.visualViewport!.addEventListener('resize', position);
window.visualViewport!.addEventListener('scroll', position);
