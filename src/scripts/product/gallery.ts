export {};

const gallery = document.querySelector<HTMLElement>('#product-slides');
const status = document.querySelector('#product-gallery-status');

if (gallery) {
  const count = gallery.children.length;
  const current = () => Math.round(gallery.scrollLeft / gallery.clientWidth);
  const move = (direction: number) => {
    const next = (current() + direction + count) % count;
    gallery.scrollTo({ left: next * gallery.clientWidth, behavior: 'instant' });
  };

  document
    .querySelectorAll<HTMLButtonElement>('[data-gallery-direction]')
    .forEach((button) => {
      button.hidden = false;
      button.addEventListener('click', () =>
        move(Number(button.dataset.galleryDirection)),
      );
    });

  gallery.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });

  gallery.addEventListener('scroll', () => {
    if (status) status.textContent = `Screenshot ${current() + 1} of ${count}`;
  });

  const viewer = document.querySelector<HTMLDialogElement>(
    '#product-image-viewer',
  );
  const image = document.querySelector<HTMLImageElement>(
    '#product-expanded-image',
  );
  if (viewer && image) {
    gallery.addEventListener('click', (event) => {
      const link = (event.target as Element).closest<HTMLAnchorElement>(
        '.product-slide',
      );
      if (
        !link ||
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      event.preventDefault();
      image.src = link.href;
      image.alt = link.querySelector('img')?.alt || '';
      viewer.showModal();
    });
    viewer
      .querySelector('button')
      ?.addEventListener('click', () => viewer.close());
    viewer.addEventListener('click', (event) => {
      if (event.target === viewer) viewer.close();
    });
  }
}
