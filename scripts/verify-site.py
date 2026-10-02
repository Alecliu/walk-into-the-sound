import hashlib
import json
from pathlib import Path

root = Path(__file__).resolve().parents[1]
site = root / 'site'
snapshots = list(site.glob('snapshot.*.json'))
assert len(snapshots) == 1, 'Expected one complete snapshot'
path = snapshots[0]
assert hashlib.sha256(path.read_bytes()).hexdigest() == path.name.split('.')[1]
data = json.loads(path.read_text())
rows = data['queries']['cityStories']['rows']
assert len(rows) == 20
assert data['buildStatus'] == 'complete'
assert len({row['lens'] for row in rows}) == 4
assert all(sum(row['lens'] == lens for row in rows) == 5 for lens in {row['lens'] for row in rows})
assert (site / 'index.html').is_file()
assert path.name in (site / 'index.html').read_text()
print('Verified 20 stories across four columns and their published data reference.')
