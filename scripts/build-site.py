"""Build with the installed Data plugin; optionally stage the full verified release."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
from blog_validation import validate_site

def build(root, node, plugin, publish=False):
    root, plugin = Path(root).resolve(), Path(plugin).resolve()
    entry = plugin / 'scripts/data-app.mjs'
    if not entry.is_file():
        raise RuntimeError('Installed Data plugin not found: ' + str(entry))
    env = os.environ.copy()
    for name in ('CODEX_SESSION_ID', 'CODEX_THREAD_ID'):
        env.pop(name, None)
    subprocess.run([node, str(entry), 'build', '--project-dir', str(root), '--separate-data'], env=env, check=True)
    # Copy unchanged, content-addressed approved images after the official compiler.
    # Authored source refers to these URLs; generated HTML is never patched.
    for asset in json.loads((root/'src/content/assets/web-assets.json').read_text()).values():
        source=root/'src/content/assets'/asset['source']
        target=root/'dist'/asset['path']
        if (root/'src/content/assets').resolve() not in source.resolve().parents or (root/'dist').resolve() not in target.resolve().parents:
            raise ValueError('Asset path must remain inside the authored and publication directories')
        target.parent.mkdir(parents=True,exist_ok=True)
        if hashlib.sha256(source.read_bytes()).hexdigest()!=asset['sha256']:
            raise ValueError('Approved source asset changed: '+asset['source'])
        shutil.copyfile(source,target)
    validate_site(root, 'dist')
    if publish:
        site = root / 'site'
        # Keep a recoverable backup outside Git before replacing generated artifacts.
        import tempfile
        backup = Path(tempfile.mkdtemp(prefix='walk-into-sound-site-'))
        if site.exists():
            shutil.copytree(site, backup / 'site')
            shutil.rmtree(site)
        shutil.copytree(root / 'dist', site)
        (site / '.nojekyll').touch()
        validate_site(root)
        print('Previous release backup: ' + str(backup))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--project-dir', default=str(Path(__file__).resolve().parents[1]))
    parser.add_argument('--node', default=shutil.which('node'))
    parser.add_argument('--plugin', default=str(Path(os.environ.get('CODEX_HOME', str(Path.home()/'.codex'))) / 'plugins/cache/openai-curated-remote/data-analytics/1.0.11'))
    parser.add_argument('--publish', action='store_true', help='Replace site with the complete verified dist build')
    args = parser.parse_args()
    build(args.project_dir, args.node, args.plugin, args.publish)
