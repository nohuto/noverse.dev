import json, os, shutil
from pathlib import Path
from urllib.parse import quote
from urllib.request import Request, urlopen

R = Path(__file__).resolve().parents[1]
ROOT = R.parent
OUT = R / 'data' / 'diff'
GITHUB_API = 'https://api.github.com/repos'
TOKEN = os.getenv('GITHUB_TOKEN')

SOURCES = {
    'type-layouts': {
        'repo': 'nohuto/type-layouts',
        'env': 'TYPE_LAYOUTS_DIR',
        'fallbacks': [
            ROOT / 'sources' / 'type-layouts',
            ROOT.parent / 'type-layouts',
        ],
        'ext': '.cpp',
    },
    'decompiled-pseudocode': {
        'repo': 'nohuto/decompiled-pseudocode',
        'env': 'DECOMPILED_PSEUDOCODE_DIR',
        'fallbacks': [
            ROOT / 'sources' / 'decompiled-pseudocode',
            ROOT.parent / 'decompiled-pseudocode',
        ],
        'ext': '.c',
    },
}


def find_dir(cfg):
    paths = []
    if os.getenv(cfg['env']):
        paths.append(Path(os.getenv(cfg['env'])))
    paths.extend(cfg['fallbacks'])
    return next((p for p in paths if p.is_dir()), None)


def dirs(path):
    return sorted((p for p in path.iterdir() if p.is_dir() and not p.name.startswith('.')), key=lambda p: p.name.lower())


def github_json(url):
    headers = {
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'noverse.dev-diff-manifest',
        'X-GitHub-Api-Version': '2022-11-28',
    }
    if TOKEN:
        headers['Authorization'] = f'Bearer {TOKEN}'
    with urlopen(Request(url, headers=headers), timeout=60) as response:
        return json.load(response)


def github_contents(repo, parts):
    path = '/'.join(quote(part) for part in parts)
    suffix = f'/contents/{path}' if path else '/contents'
    return github_json(f'{GITHUB_API}/{repo}{suffix}?ref=main')


def github_tree(repo, sha):
    data = github_json(f'{GITHUB_API}/{repo}/git/trees/{sha}?recursive=1')
    if data.get('truncated'):
        raise RuntimeError(f'Truncated GitHub tree for {repo}:{sha}')
    return data.get('tree') if isinstance(data.get('tree'), list) else []


def save(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=True, separators=(',', ':')), encoding='utf-8')


def save_names(path, names):
    previous = ''
    rows = []
    for name in names:
        prefix = 0
        limit = min(len(previous), len(name))
        while prefix < limit and previous[prefix] == name[prefix]:
            prefix += 1
        rows.append(f'{prefix}\t{name[prefix:]}')
        previous = name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(rows), encoding='utf-8')


def build_local(base, src, cfg):
    releases = dirs(src)
    modules = {}
    for release in releases:
        module_names = []
        for module in dirs(release):
            files = sorted((p.name for p in module.iterdir() if p.is_file() and p.suffix.lower() == cfg['ext']), key=str.lower)
            if files:
                module_names.append(module.name)
                save_names(base / 'names' / release.name / f'{module.name}.txt', files)
        modules[release.name] = module_names
    return {'releases': [p.name for p in releases], 'modules': modules}


def build_remote(base, cfg):
    releases = sorted((entry['name'] for entry in github_contents(cfg['repo'], []) if entry.get('type') == 'dir' and not entry['name'].startswith('.')), key=str.lower)
    modules = {}
    for release in releases:
        module_entries = [entry for entry in github_contents(cfg['repo'], [release]) if entry.get('type') == 'dir']
        module_names = []
        for module in sorted(module_entries, key=lambda entry: entry['name'].lower()):
            files = sorted((entry['path'] for entry in github_tree(cfg['repo'], module['sha']) if entry.get('type') == 'blob' and '/' not in entry.get('path', '') and entry['path'].lower().endswith(cfg['ext'])), key=str.lower)
            if files:
                module_names.append(module['name'])
                save_names(base / 'names' / release / f'{module["name"]}.txt', files)
        modules[release] = module_names
    return {'releases': releases, 'modules': modules}


def build(name, cfg):
    src = find_dir(cfg)

    base = OUT / name
    tmp = OUT / f'.{name}.tmp'
    if tmp.is_dir():
        shutil.rmtree(tmp)

    index = build_local(tmp, src, cfg) if src else build_remote(tmp, cfg)
    save(tmp / 'index.json', index)
    if base.is_dir():
        shutil.rmtree(base)
    shutil.move(str(tmp), str(base))


if __name__ == '__main__':
    for name, cfg in SOURCES.items():
        build(name, cfg)
