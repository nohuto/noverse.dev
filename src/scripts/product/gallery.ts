export {};

const gallery = document.querySelector<HTMLElement>('#product-slides');
const status = document.querySelector('#product-gallery-status');

if (gallery) {
  const count = gallery.children.length;
  const current = () => Math.round(gallery.scrollLeft / gallery.clientWidth);
  const show = (index: number) =>
    gallery.scrollTo({
      left: index * gallery.clientWidth,
      behavior: 'instant',
    });
  const move = (direction: number) =>
    show((current() + direction + count) % count);

  document
    .querySelectorAll<HTMLButtonElement>('[data-gallery-direction]')
    .forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () =>
        move(Number(button.dataset.galleryDirection)),
      );
    });

  gallery.parentElement?.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });

  gallery.addEventListener('focusin', (event) => {
    const index = [...gallery.children].findIndex(
      (slide) => event.target instanceof Node && slide.contains(event.target),
    );
    if (index >= 0 && index !== current()) show(index);
  });

  gallery.addEventListener('scroll', () => {
    if (status) status.textContent = `Screenshot ${current() + 1} of ${count}`;
  });
}

function revealFragment(hash = location.hash) {
  if (!hash) return;
  let target: HTMLElement | null;
  try {
    target = document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return;
  }
  const disclosure = target?.closest('details');
  if (disclosure) disclosure.open = true;
}
revealFragment();
window.addEventListener('hashchange', () => revealFragment());
document.addEventListener('click', (event) => {
  const link =
    event.target instanceof Element ? event.target.closest('a') : null;
  if (link?.origin === location.origin && link.pathname === location.pathname)
    revealFragment(link.hash);
});
