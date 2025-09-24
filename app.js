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
      requestAnimationFrame(() => newMain.classList.remove('fading'));
    }, 180);

    if (push) history.pushState({ url }, '', url);
  } catch (e) {
    main.classList.remove('fading');
    location.href = url;
  }
}

document.addEventListener('click', e => {
  const a = e.target.closest('a');
  if (!a) return;
  const href = a.getAttribute('href');
  if (!href) return;
  const same = href.endsWith('.html') && a.origin === location.origin;
  if (same) {
    e.preventDefault();
    loadPage(href, true);
  }
});

window.addEventListener('popstate', e => {
  const url = (e.state && e.state.url) || location.pathname.split('/').pop() || 'index.html';
  loadPage(url, false);
});

document.addEventListener('DOMContentLoaded', () => {
  setActive(location.pathname.split('/').pop() || 'index.html');
  initRepoDescriptions();
});

/* about text */
async function fetchRepoMeta(repo) {
  const url = `https://api.github.com/repos/${repo}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/vnd.github+json' },
    cache: 'no-store'
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${repo}`);
  }
  return res.json();
}

function initRepoDescriptions() {
  const cards = document.querySelectorAll('.project-card[data-repo]');
  if (!cards.length) {
    console.log('No .project-card[data-repo] found on this page');
    return;
  }
  console.log(`Found ${cards.length} cards`);

  cards.forEach(async card => {
    const repo = card.getAttribute('data-repo');
    const descEl = card.querySelector('.project-desc');
    if (!repo || !descEl) {
      console.warn('Missing repo or .project-desc', card);
      return;
    }

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
    } catch (e) {
      console.warn('Cache parse error', e);
    }

    try {
      console.log(`Fetching ${repo}`);
      const meta = await fetchRepoMeta(repo);
      const desc = (meta.description && meta.description.trim()) || 'No description yet.';
      descEl.textContent = desc;
      try {
        localStorage.setItem(cacheKey, JSON.stringify({ t: Date.now(), description: desc }));
      } catch {}
    } catch (err) {
      console.error('Fetch error:', repo, err);
    }
  });
}