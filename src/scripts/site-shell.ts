import {
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MIN_WIDTH,
  sidebarMaxWidth,
  sidebarWidth,
} from '../utils/sidebar-width';
import { withZenMode } from '../utils/zen-mode';
import { storageGet, storageSet } from './shell/storage';

const root = document.documentElement;
const pane = document.getElementById('starlight__sidebar');
const resizer = document.querySelector<HTMLElement>('.sidebar-resizer');
const toggles = document.querySelectorAll<HTMLButtonElement>(
  '[data-sidebar-toggle]',
);
let width = Number(storageGet('nv-sidebar-width', ''));
let collapsed = root.hasAttribute('data-sidebar-collapsed');

const updateSidebar = () => {
  const currentWidth = sidebarWidth(width, innerWidth);
  root.style.setProperty('--nv-sidebar-saved-width', `${currentWidth}px`);
  root.toggleAttribute('data-sidebar-collapsed', collapsed);
  toggles.forEach((button) => {
    button.setAttribute('aria-expanded', String(!collapsed));
    button.setAttribute(
      'aria-label',
      `${collapsed ? 'Expand' : 'Collapse'} sidebar`,
    );
  });
  resizer?.setAttribute('aria-valuenow', String(currentWidth));
  resizer?.setAttribute('aria-valuemax', String(sidebarMaxWidth(innerWidth)));
};
const setCollapsed = (value: boolean) => {
  collapsed = value;
  updateSidebar();
  storageSet('nv-sidebar-collapsed', String(value));
};
const setWidth = (value: number) => {
  width = sidebarWidth(value, innerWidth);
  updateSidebar();
  storageSet('nv-sidebar-width', String(width));
};
updateSidebar();
window.addEventListener('resize', updateSidebar);
toggles.forEach((button) =>
  button.addEventListener('click', () => setCollapsed(!collapsed)),
);
document.addEventListener('nv-sidebar-expand', () => setCollapsed(false));
resizer?.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  resizer.setPointerCapture(event.pointerId);
  root.toggleAttribute('data-sidebar-resizing', true);
  event.preventDefault();
});
resizer?.addEventListener('pointermove', (event) => {
  if (resizer.hasPointerCapture(event.pointerId)) setWidth(event.clientX);
});
resizer?.addEventListener('lostpointercapture', () =>
  root.removeAttribute('data-sidebar-resizing'),
);
resizer?.addEventListener('pointerup', (event) => {
  if (resizer.hasPointerCapture(event.pointerId))
    resizer.releasePointerCapture(event.pointerId);
});
resizer?.addEventListener('dblclick', () => setWidth(SIDEBAR_DEFAULT_WIDTH));
resizer?.addEventListener('keydown', (event) => {
  const currentWidth = sidebarWidth(width, innerWidth);
  const widths: Record<string, number> = {
    ArrowLeft: currentWidth - 10,
    ArrowRight: currentWidth + 10,
    Home: SIDEBAR_MIN_WIDTH,
    End: sidebarMaxWidth(innerWidth),
  };
  const nextWidth = widths[event.key];
  if (nextWidth === undefined) return;
  event.preventDefault();
  event.stopPropagation();
  setWidth(nextWidth);
});

const preserveLinkMode = (link: HTMLAnchorElement) => {
  if (link.download || (link.target && link.target !== '_self')) return;
  const original = link.getAttribute('href');
  if (!original) return;
  const href = withZenMode(original, new URL(location.href));
  if (href !== original) link.setAttribute('href', href);
};
const updateZen = () => {
  const active = new URL(location.href).searchParams.get('view') === 'zen';
  root.toggleAttribute('data-zen', active);
  document
    .querySelectorAll<HTMLButtonElement>('[data-zen-toggle]')
    .forEach((button) => {
      button.setAttribute(
        'aria-label',
        `${active ? 'Exit' : 'Enter'} Zen mode`,
      );
      button.setAttribute('aria-pressed', String(active));
    });
};
const toggleZen = () => {
  if (
    pane instanceof HTMLElement &&
    pane.popover &&
    pane.matches(':popover-open')
  )
    pane.hidePopover();
  const url = new URL(location.href);
  if (url.searchParams.get('view') === 'zen') url.searchParams.delete('view');
  else url.searchParams.set('view', 'zen');
  history.replaceState(history.state, '', url);
  updateZen();
  document
    .querySelector<HTMLButtonElement>(
      root.hasAttribute('data-zen') ? '.zen-exit' : '[data-zen-toggle]',
    )
    ?.focus();
};
const scrollTop = document.querySelector<HTMLButtonElement>(
  '.scroll-to-top-button',
)!;
const updateScrollTop = () =>
  scrollTop.classList.toggle('visible', scrollY > 300);
updateScrollTop();
window.addEventListener('scroll', updateScrollTop, { passive: true });
scrollTop.addEventListener('click', () => window.scrollTo({ top: 0 }));

updateZen();
window.addEventListener('popstate', updateZen);
window.addEventListener('pageshow', updateZen);
document
  .querySelectorAll('[data-zen-toggle]')
  .forEach((button) => button.addEventListener('click', toggleZen));
for (const type of ['click', 'auxclick', 'contextmenu'])
  document.addEventListener(
    type,
    (event) => {
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>('a[href]')
          : null;
      if (link) preserveLinkMode(link);
    },
    { capture: true },
  );
