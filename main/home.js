/* Copyright (c) 2026 Nohuto */
(global => {
  'use strict';

  let commitsPromise;
  const dateFormatter = new Intl.DateTimeFormat('en', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  const loadCommits = () => commitsPromise ||= fetch('/main/data/commits.json')
    .then(response => response.ok ? response.json() : [])
    .catch(() => []);

  const commitRow = commit => {
    const link = document.createElement('a');
    link.className = 'commit-item';
    link.href = commit.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    const repo = document.createElement('span');
    repo.className = 'commit-repo';
    repo.textContent = commit.repo;
    const sha = document.createElement('span');
    sha.className = 'commit-sha';
    sha.textContent = commit.sha;
    repo.append(' ', sha);

    const message = document.createElement('span');
    message.className = 'commit-message';
    message.textContent = commit.message;

    const date = document.createElement('time');
    date.className = 'commit-date';
    date.dateTime = commit.date;
    date.textContent = dateFormatter.format(new Date(commit.date));
    link.append(repo, message, date);
    return link;
  };

  async function initHome() {
    const root = document.getElementById('home-commits');
    const list = root?.querySelector('.commit-list');
    if (!root || !list) return;

    const commits = await loadCommits();
    list.replaceChildren(...(commits.length ? commits.map(commitRow) : [Object.assign(document.createElement('p'), {
      className: 'home-status',
      textContent: 'No recent commits available.'
    })]));
    root.setAttribute('aria-busy', 'false');
  }

  global.initHome = initHome;
})(window);
