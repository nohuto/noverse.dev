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
      initQrModal();
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
  if (!searchInput) return;

  const search = searchInput.value.toLowerCase();
  const activeTags = Array.from(document.querySelectorAll('.tag-filter button.active')).map(btn => btn.textContent.toLowerCase());

  document.querySelectorAll('.project-card').forEach(card => {
    const title = card.querySelector('.project-title').textContent.toLowerCase();
    const desc = card.querySelector('.project-desc').textContent.toLowerCase();
    const tags = (card.dataset.tags || '').toLowerCase().split(',').map(tag => tag.trim());

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

function initQrModal() {
  const modal = document.getElementById('qr-modal');
  const overlay = document.querySelector('.overlay');
  if (!modal || !overlay) return;

  if (!modal.qrState) {
    const state = {
      open() {
        if (!modal.hasAttribute('hidden')) return;
        modal.removeAttribute('hidden');
        overlay.classList.add('is-visible');
        document.body.classList.add('modal-open');
        document.addEventListener('keydown', state.handleKeydown);
      },
      close() {
        if (modal.hasAttribute('hidden')) return;
        modal.setAttribute('hidden', '');
        overlay.classList.remove('is-visible');
        document.body.classList.remove('modal-open');
        document.removeEventListener('keydown', state.handleKeydown);
      },
      handleKeydown(event) {
        if (event.key === 'Escape') state.close();
      }
    };

    modal.qrState = state;
    overlay.addEventListener('click', state.close);
    modal.querySelector('[data-qr-close]')?.addEventListener('click', state.close);
  }

  const { open } = modal.qrState;
  document.querySelectorAll('[data-qr-open]').forEach(btn => {
    btn.addEventListener('click', open);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setActive(location.pathname.split('/').pop() || 'index.html');
  initRepoDescriptions();
  initFiltering();
  initQrModal();
});
