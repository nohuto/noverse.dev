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
  const move = (direction: number) => {
    const index = (current() + direction + count) % count;
    show(index);
    return index;
  };

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
    const index = move(event.key === 'ArrowLeft' ? -1 : 1);
    const slide = gallery.children[index];
    if (
      event.target instanceof Node &&
      gallery.contains(event.target) &&
      slide instanceof HTMLElement
    )
      slide.focus({ preventScroll: true });
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
