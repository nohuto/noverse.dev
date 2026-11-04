export {};

const SEARCH_QUERY_PARAM = 'q';

const searchInput = document.querySelector<HTMLInputElement>('#project-search');
const cards = [...document.querySelectorAll<HTMLElement>('.project-card')];
const groups = [...document.querySelectorAll<HTMLElement>('.project-group')];
const emptyState = document.querySelector<HTMLElement>('#project-empty');

if (searchInput && cards.length) initProjectFilter(searchInput);

function initProjectFilter(input: HTMLInputElement) {
  const cardData = cards.map((card) => ({
    card,
    fields: [
      card.querySelector('.project-title')?.textContent,
      card.dataset.repo,
      card.querySelector('.project-desc')?.textContent,
    ].map((field) => (field || '').toLowerCase()),
  }));

  const applyFilter = () => {
    const search = input.value.trim().toLowerCase();
    let visible = 0;
    for (const { card, fields } of cardData) {
      card.hidden = !!search && !fields.some((field) => field.includes(search));
      if (!card.hidden) visible++;
    }
    for (const group of groups) {
      group.hidden = !group.querySelector('.project-card:not([hidden])');
    }
    if (emptyState) emptyState.hidden = visible > 0;
  };

  const updateUrl = () => {
    const url = new URL(location.href);
    const search = input.value.trim();
    if (search) url.searchParams.set(SEARCH_QUERY_PARAM, search);
    else url.searchParams.delete(SEARCH_QUERY_PARAM);
    history.replaceState(history.state, '', url);
  };

  input.value =
    new URLSearchParams(location.search).get(SEARCH_QUERY_PARAM) ?? '';
  input.addEventListener('input', () => {
    applyFilter();
    updateUrl();
  });
  applyFilter();
}
