interface Commit {
  url: string;
  repo: string;
  sha: string;
  message: string;
  date: string;
}

let commitsPromise: Promise<Commit[]> | undefined;
const dateFormatter = new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' });

function isCommit(value: unknown): value is Commit {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  return ['url', 'repo', 'sha', 'message', 'date'].every(key => typeof row[key] === 'string');
}

function loadCommits(): Promise<Commit[]> {
  return commitsPromise ||= fetch('/main/data/commits.json')
    .then(async response => response.ok ? await response.json() as unknown : [])
    .then(value => Array.isArray(value) ? value.filter(isCommit) : [])
    .catch(() => []);
}

function commitRow(commit: Commit): HTMLAnchorElement {
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
}

async function initHome(): Promise<void> {
  const root = document.querySelector<HTMLElement>('#home-commits');
  const list = root?.querySelector<HTMLElement>('.commit-list');
  if (!root || !list) return;

  const commits = await loadCommits();
  const fallback = Object.assign(document.createElement('p'), {
    className: 'home-status', textContent: 'No recent commits available',
  });
  list.replaceChildren(...(commits.length ? commits.map(commitRow) : [fallback]));
  root.setAttribute('aria-busy', 'false');
}

document.addEventListener('DOMContentLoaded', initHome, { once: true });
