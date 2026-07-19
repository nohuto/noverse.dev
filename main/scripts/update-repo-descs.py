import html, json, os, re, shutil, time, urllib.error, urllib.request
from pathlib import Path

R = Path(__file__).resolve().parents[1]
P = R.parent / 'projects.html'
O = R / 'data' / 'repos.json'
MS = R / 'data' / 'media-sources.json'
MC = R / 'data' / 'media-cache.json'
H = {'User-Agent': 'Mozilla/5.0'}


def jload(p, d):
    try:
        return json.loads(p.read_text(encoding='utf-8'))
    except Exception:
        return d


def jsave(p, d):
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(d, indent=2, ensure_ascii=True), encoding='utf-8')


def ndesc(v, r):
    if not v:
        return ''
    t = html.unescape(str(v).strip())
    t = t.split(' Contribute to ', 1)[0].strip()
    s = f' - {r}'
    if t.endswith(s):
        t = t[:-len(s)].rstrip()
    return t


def md_desc(v):
    text = re.sub(r'<!--.*?-->', '', v, flags=re.S)
    blocks = re.split(r'\n\s*\n', text)
    for block in blocks:
        lines = [line.strip() for line in block.splitlines()]
        lines = [line for line in lines if line and not line.startswith('#') and not line.startswith('![')]
        if not lines:
            continue
        text = ' '.join(lines)
        text = re.sub(r'[`*_]', '', text)
        text = re.sub(r'!\[([^\]]*)\]\([^)]+\)', r'\1', text)
        text = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', text)
        return html.unescape(text).strip()
    return ''


def fetch_readme(r):
    for branch in ('main', 'master'):
        try:
            q = urllib.request.Request(f'https://raw.githubusercontent.com/{r}/{branch}/README.md', headers=H)
            with urllib.request.urlopen(q, timeout=20) as x:
                text = x.read().decode('utf-8', 'ignore')
            desc = md_desc(text)
            if desc:
                return desc
        except Exception:
            pass
    return ''


def fetch(r):
    hh = dict(H)
    hh['Accept'] = 'application/vnd.github+json'
    tok = os.getenv('GITHUB_TOKEN')
    if tok:
        hh['Authorization'] = f'Bearer {tok}'
    try:
        q = urllib.request.Request(f'https://api.github.com/repos/{r}', headers=hh)
        with urllib.request.urlopen(q, timeout=20) as x:
            p = json.loads(x.read().decode('utf-8', 'ignore'))
        if isinstance(p, dict) and 'description' in p:
            return ndesc(p.get('description'), r)
    except Exception:
        pass
    try:
        q = urllib.request.Request(f'https://github.com/{r}', headers=H)
        with urllib.request.urlopen(q, timeout=20) as x:
            t = x.read().decode('utf-8', 'ignore')
        m = re.search(r'<meta name="description" content="([^"]+)"', t)
        desc = ndesc(m.group(1), r) if m else ''
        return desc or fetch_readme(r)
    except Exception:
        return fetch_readme(r)


def upd_repos():
    repos = list(dict.fromkeys(
        re.findall(r'''data-repo=["']([^"']+)["']''', P.read_text(encoding='utf-8'))
    ))
    old = jload(O, {})
    out = {}
    for r in repos:
        out[r] = fetch(r) or old.get(r, '')
        time.sleep(0.3)
    jsave(O, out)


def pull(url, dst, cache):
    hh = dict(H)
    p = R / dst
    e = cache.get(url, {})
    if p.is_file() and e.get('etag'):
        hh['If-None-Match'] = e['etag']
    if p.is_file() and e.get('last_modified'):
        hh['If-Modified-Since'] = e['last_modified']
    try:
        req = urllib.request.Request(url, headers=hh)
        with urllib.request.urlopen(req, timeout=60) as resp:
            p.parent.mkdir(parents=True, exist_ok=True)
            t = p.with_suffix(p.suffix + '.tmp')
            with open(t, 'wb') as f:
                shutil.copyfileobj(resp, f)
            t.replace(p)
            ce = cache.setdefault(url, {})
            if resp.headers.get('ETag'):
                ce['etag'] = resp.headers['ETag']
            if resp.headers.get('Last-Modified'):
                ce['last_modified'] = resp.headers['Last-Modified']
    except urllib.error.HTTPError as e:
        if e.code != 304:
            return
    except Exception:
        return


def upd_media():
    src = jload(MS, [])
    if not src:
        return
    cache = jload(MC, {})
    for it in src:
        u = it.get('url')
        p = it.get('path')
        if u and p:
            pull(u, p, cache)
            time.sleep(0.2)
    jsave(MC, cache)


if __name__ == '__main__':
    upd_repos()
    upd_media()
