export {};

const searchInput = document.querySelector<HTMLInputElement>('#project-search, #policy-search');

if (searchInput) {
  const isApple = /(Mac|iPhone|iPod|iPad)/i.test(navigator.userAgent);
  for (const box of document.querySelectorAll<HTMLElement>('.nv-search-box')) {
    const input = box.querySelector<HTMLInputElement>('input');
    const shortcut = box.querySelector<HTMLElement>('.nv-search-shortcut');
    if (!input || !shortcut) continue;
    const key = shortcut.querySelector('kbd');
    if (key) key.textContent = isApple ? '⌘' : 'Ctrl';
    input.setAttribute('aria-keyshortcuts', isApple ? 'Meta+K' : 'Control+K');
  }

  document.addEventListener('keydown', event => {
    if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey)) return;
    event.preventDefault();
    searchInput.focus({ preventScroll: true });
    searchInput.select();
  });
}
