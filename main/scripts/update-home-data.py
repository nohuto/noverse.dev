import json, os
from pathlib import Path
from urllib.request import Request, urlopen

OUT = Path(__file__).resolve().parents[1] / 'data' / 'commits.json'
REPOS = ('win-config', 'windbg-notes', 'regkit', 'noverse.dev')
LIMIT = 15


def load_old():
    try:
        return json.loads(OUT.read_text(encoding='utf-8'))
    except Exception:
        return []


def fetch(repo):
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'noverse.dev-home'}
    if token := os.getenv('GITHUB_TOKEN'):
        headers['Authorization'] = f'Bearer {token}'
    request = Request(f'https://api.github.com/repos/nohuto/{repo}/commits?per_page={LIMIT}', headers=headers)
    with urlopen(request, timeout=30) as response:
        data = json.load(response)
    return [{
        'repo': repo,
        'sha': item['sha'][:7],
        'message': item['commit']['message'].splitlines()[0],
        'date': item['commit']['committer']['date'],
        'url': item['html_url'],
    } for item in data]


def main():
    old = load_old()
    commits = []
    for repo in REPOS:
        try:
            commits.extend(fetch(repo))
        except Exception:
            commits.extend(item for item in old if item.get('repo') == repo)
    commits.sort(key=lambda item: item['date'], reverse=True)
    OUT.write_text(json.dumps(commits[:LIMIT], ensure_ascii=True, separators=(',', ':')), encoding='utf-8')


if __name__ == '__main__':
    main()
