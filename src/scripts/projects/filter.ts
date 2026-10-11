export {};

const searchInput = document.querySelector<HTMLInputElement>('#project-search');
const cards = [...document.querySelectorAll<HTMLElement>('.project-card')];
const groups = [...document.querySelectorAll<HTMLElement>('.project-group')];
const sectionNav = document.querySelector<HTMLElement>(
  '.project-section-links',
);
const emptyState = document.querySelector<HTMLElement>('#project-empty');

if (searchInput && cards.length) {
  const cardData = cards.map((card) => ({
    card,
    title: (
      card.querySelector('.project-title')?.textContent || ''
    ).toLowerCase(),
    repo: (card.dataset.repo || '').toLowerCase(),
    description: card.querySelector('.project-desc'),
  }));

  function applyFilter() {
    const search = searchInput!.value.trim().toLowerCase();
    let visible = 0;
    for (const { card, title, repo, description } of cardData) {
      const text = (description?.textContent || '').toLowerCase();
      card.hidden =
        !!search &&
        !title.includes(search) &&
        !repo.includes(search) &&
        !text.includes(search);
      if (!card.hidden) visible++;
    }
    for (const group of groups) {
      group.hidden = !group.querySelector('.project-card:not([hidden])');
      const link = sectionNav?.querySelector<HTMLAnchorElement>(
        `a[href="#${group.getAttribute('aria-labelledby')}"]`,
      );
      if (link) link.hidden = group.hidden;
    }
    if (sectionNav) sectionNav.hidden = visible === 0;
    if (emptyState) emptyState.hidden = visible > 0;
  }

  searchInput.addEventListener('input', applyFilter);
  applyFilter();
}
