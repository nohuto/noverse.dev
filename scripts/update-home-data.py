import json, os
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'site' / 'public' / 'main' / 'data' / 'commits.json'
OWNER = 'nohuto'
LIMIT = 15

def load_old():
    try:
        return json.loads(OUT.read_text(encoding='utf-8'))
    except Exception:
        return []

def fetch():
    headers = {'Accept': 'application/vnd.github+json', 'User-Agent': 'noverse.dev-home'}
    if token := os.getenv('GITHUB_TOKEN'):
        headers['Authorization'] = f'Bearer {token}'
    query = urlencode({'q': f'author:{OWNER}', 'sort': 'committer-date', 'order': 'desc', 'per_page': LIMIT})
    request = Request(f'https://api.github.com/search/commits?{query}', headers=headers)
    with urlopen(request, timeout=30) as response:
        items = json.load(response)['items']
    return [{
        'repo': item['repository']['name'],
        'sha': item['sha'][:7],
        'message': item['commit']['message'].splitlines()[0],
        'date': item['commit']['committer']['date'],
        'url': item['html_url'],
    } for item in items if (item.get('author') or {}).get('login', '').lower() == OWNER]

def main():
    try:
        commits = fetch()
    except Exception:
        commits = load_old()
    OUT.write_text(json.dumps(commits[:LIMIT], ensure_ascii=True, separators=(',', ':')), encoding='utf-8')

if __name__ == '__main__':
    main()
