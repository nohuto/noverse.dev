import json, os, shutil, subprocess, tempfile
from pathlib import Path

R = Path(__file__).resolve().parents[1]
ROOT = R.parent
OUT = R / 'data' / 'diff'
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
    modules = {}
    with tempfile.TemporaryDirectory() as tmp:
        repo = Path(tmp) / 'repo'
        subprocess.run([
            'git', 'clone', '--quiet', '--depth=1', '--filter=blob:none',
            '--single-branch', '--branch=main',
            '--no-checkout', f'https://github.com/{cfg["repo"]}.git', str(repo),
        ], check=True)
        process = subprocess.Popen([
            'git', '-C', str(repo), '-c', 'core.quotepath=false',
            'ls-tree', '-r', '--name-only', 'HEAD',
        ], stdout=subprocess.PIPE, text=True, encoding='utf-8')

        current = None
        files = []
        for path in process.stdout:
            parts = path.rstrip('\n').split('/')
            if len(parts) != 3 or not parts[2].lower().endswith(cfg['ext']) or parts[0].startswith('.'):
                continue
            key = (parts[0], parts[1])
            if current and key != current:
                save_names(base / 'names' / current[0] / f'{current[1]}.txt', sorted(files, key=str.lower))
                modules.setdefault(current[0], []).append(current[1])
                files = []
            current = key
            files.append(parts[2])

        if process.wait():
            raise subprocess.CalledProcessError(process.returncode, process.args)
        if current:
            save_names(base / 'names' / current[0] / f'{current[1]}.txt', sorted(files, key=str.lower))
            modules.setdefault(current[0], []).append(current[1])

    releases = sorted(modules, key=str.lower)
    modules = {release: sorted(modules[release], key=str.lower) for release in releases}
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
