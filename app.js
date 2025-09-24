function setActive(href) {
  document.querySelectorAll('.nav-tabs a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === href);
  });
}

async function loadPage(url, push = true) {
  const main = document.querySelector('main');
  try {
    main.classList.add('fading');
    const res = await fetch(url, { credentials: 'same-origin' });
    const html = await res.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const newMain = doc.querySelector('main');
    const newTitle = doc.querySelector('title')?.textContent || document.title;

    setTimeout(() => {
      main.replaceWith(newMain);
      document.title = newTitle;
      setActive(new URL(url, location.href).pathname.split('/').pop() || 'index.html');
      initRepoDescriptions();
      initFiltering();
      requestAnimationFrame(() => newMain.classList.remove('fading'));
    }, 180);

    if (push) history.pushState({ url }, '', url);
  } catch {
    main.classList.remove('fading');
    location.href = url;
  }
}

document.addEventListener('click', e => {
  const a = e.target.closest('a');
  const href = a?.getAttribute('href');
  if (a && href && href.endsWith('.html') && a.origin === location.origin) {
    e.preventDefault();
    loadPage(href);
  }
});

window.addEventListener('popstate', e => {
  const url = e.state?.url || location.pathname.split('/').pop() || 'index.html';
  loadPage(url, false);
});

function fetchRepoMeta(repo) {
  return fetch(`https://api.github.com/repos/${repo}`, {
    headers: { 'Accept': 'application/vnd.github+json' },
    cache: 'no-store'
  }).then(res => {
    if (!res.ok) throw new Error();
    return res.json();
  });
}

function initRepoDescriptions() {
  document.querySelectorAll('.project-card[data-repo]').forEach(async card => {
    const repo = card.getAttribute('data-repo');
    const descEl = card.querySelector('.project-desc');
    if (!repo || !descEl) return;

    const cacheKey = `ghmeta:${repo}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { t, description } = JSON.parse(cached);
        if (Date.now() - t < 6 * 60 * 60 * 1000 && description) {
          descEl.textContent = description;
          return;
        }
      }
    } catch {}

    try {
      const meta = await fetchRepoMeta(repo);
      const desc = (meta.description || 'No description yet.').trim();
      descEl.textContent = desc;
      localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), description: desc }));
    } catch {}
  });
}

function filterProjects() {
  const searchInput = document.getElementById('project-search');
  if (!searchInput) return; // Skip if not on the project page

  const search = searchInput.value.toLowerCase();
  const activeTags = Array.from(document.querySelectorAll('.tag-filter button.active')).map(btn => btn.textContent.toLowerCase());

  document.querySelectorAll('.project-card').forEach(card => {
    const title = card.querySelector('.project-title').textContent.toLowerCase();
    const desc = card.querySelector('.project-desc').textContent.toLowerCase();
    const tags = (card.dataset.tags || '').toLowerCase().split(',');

    const matchesSearch = title.includes(search) || desc.includes(search);
    const matchesTags = activeTags.length === 0 || activeTags.some(tag => tags.includes(tag));

    card.style.display = (matchesSearch && matchesTags) ? '' : 'none';
  });
}

function initFiltering() {
  const searchInput = document.getElementById('project-search');
  const tagButtons = document.querySelectorAll('.tag-filter button');

  if (!searchInput || tagButtons.length === 0) return;

  searchInput.addEventListener('input', filterProjects);
  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      filterProjects();
    });
  });

  filterProjects();
}

document.addEventListener('DOMContentLoaded', () => {
  setActive(location.pathname.split('/').pop() || 'index.html');
  initRepoDescriptions();
  initFiltering();
});