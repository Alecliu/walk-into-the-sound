"""Structural publication gates, shared by the release and daily writer."""
import datetime as dt
import hashlib
import json
import re
from pathlib import Path
from urllib.parse import urlparse

ORIGINAL_IDS = set('paris-amelie-cafe hong-kong-chungking-express hong-kong-mood-for-love dublin-once-piano tokorozawa-totoro liverpool-penny-lane london-waterloo-sunset rio-ipanema montreal-suzanne kyoto-phoebe-bridgers london-abbey-road dublin-u2-kitchen natori-sakamoto-piano london-bjork-vespertine sausalito-rumours liverpool-cavern havana-buena-vista montreux-nina-simone cologne-keith-jarrett lagos-fela-tony-allen'.split())
TAIPEI = dt.timezone(dt.timedelta(hours=8))

def require(condition, message):
    if not condition:
        raise ValueError(message)

def https(url):
    parsed = urlparse(url)
    return parsed.scheme == 'https' and bool(parsed.hostname) and not parsed.username and not parsed.password

def validate_story(story):
    require(re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', story['id']), 'Invalid story ID')
    for name in ('title', 'deck', 'artist', 'anchor', 'work', 'lens'):
        require(isinstance(story.get(name), str) and story[name].strip(), 'Missing ' + name)
    for name in ('publishedAt', 'reviewedAt'):
        dt.date.fromisoformat(story[name])
    require(isinstance(story.get('readingMinutes'), int) and 1 <= story['readingMinutes'] <= 30, 'Invalid reading time')
    require(len(story['sections']) >= 3 and len(story['timeline']) >= 2, 'Incomplete article')
    require(len({s['id'] for s in story['sections']}) == len(story['sections']), 'Duplicate section IDs')
    require(all(s['title'] and s['body'].strip() for s in story['sections']), 'Empty section')
    urls = {s['url'] for s in story['sources']}
    require(len(urls) >= 2 and all(https(u) for u in urls), 'Need at least two HTTPS sources')
    body = '\n'.join(s['body'] for s in story['sections'])
    require(any(u in body for u in urls), 'Missing inline source citation')
    require(not re.search(r'<\s*(script|iframe|object)|javascript:|data:text/html', body, re.I), 'Unsafe article markup')
    require(all(t['type'] in ('城市', '街區', '打卡點') for t in story['tags']), 'Only location tag types allowed')
    require(bool(story.get('topics') or story.get('lens')), 'Missing topics')
    listen = story['listen']
    require(bool(listen.get('title')), 'Missing listening title')
    if listen.get('youtubeUrl'):
        require(urlparse(listen['youtubeUrl']).hostname in ('www.youtube.com', 'youtube.com', 'youtu.be'), 'Unexpected listening host')
        require(https(listen['youtubeUrl']) and listen.get('verifiedAt') and https(listen.get('youtubeSource', '')), 'Unverified direct YouTube link')
    elif listen.get('youtubeLabel'):
        require(listen['youtubeLabel'] == 'YouTube 搜尋', 'Search link must be labelled')
    if story.get('photo'):
        photo = story['photo']
        require(all(photo.get(k) for k in ('id','alt','author','sourceUrl','license','licenseUrl')), 'Incomplete photo credits')
        require(https(photo['sourceUrl']) and https(photo['licenseUrl']), 'Invalid photo evidence')

def validate_collection(data):
    rows = data['queries']['cityStories']['rows']
    ids = [s['id'] for s in rows]
    require(len(set(ids)) == len(ids), 'Duplicate article route')
    require(ORIGINAL_IDS <= set(ids), 'An original article was removed')
    keys = [s['dailyKey'] for s in rows if s.get('dailyKey')]
    require(len(keys) == len(set(keys)), 'More than one automated article per day')
    for story in rows:
        validate_story(story)
    return rows

def validate_candidate(candidate, existing, day):
    require(candidate['status'] == 'ready', 'Writer skipped: ' + candidate.get('reason', ''))
    s = candidate['story']
    validate_story(s)
    require(s['publishedAt'] == day and s['reviewedAt'] == day, 'Wrong target date')
    require(not s.get('photo'), 'Automatic posts do not introduce unreviewed images')
    require(not any(r['id'] == s['id'] or r['title'] == s['title'] or (r['artist'].casefold() == s['artist'].casefold() and r['work'].casefold() == s['work'].casefold()) for r in existing), 'Duplicate article or work')
    body = '\n'.join(p['body'] for p in s['sections'])
    require(all(x['url'] in body for x in s['sources']), 'Daily sources must be cited inline')
    require(600 <= len(body) <= 12000, 'Article is too short or too long')
    evidence = candidate['evidence']
    require({e['url'] for e in evidence} == {x['url'] for x in s['sources']}, 'Source evidence mismatch')
    require(all(e['readAt'] == day and len(e['supports']) >= 20 for e in evidence), 'Incomplete source reading record')
    return s

def validate_site(root, directory='site'):
    root = Path(root)
    site = root / directory
    snapshots = list(site.glob('snapshot.*.json'))
    require(len(snapshots) == 1, 'Expected one complete snapshot')
    path = snapshots[0]
    require(hashlib.sha256(path.read_bytes()).hexdigest() == path.name.split('.')[1], 'Snapshot hash mismatch')
    data = json.loads(path.read_text())
    require(data['buildStatus'] == 'complete', 'Build not complete')
    rows = validate_collection(data)
    require(data == json.loads((root / 'src/data.json').read_text()), 'Published data differs from source')
    manifest = json.loads((site / 'data-app-build.json').read_text())
    require(manifest['kind'] == 'separate-data-v1', 'Unexpected build kind')
    for key, expected in (('html','index.html'),('snapshot',path.name)):
        item = manifest[key]
        require(item['path'] == expected, 'Unexpected manifest path')
        content = (site / expected).read_bytes()
        require(hashlib.sha256(content).hexdigest() == item['sha256'] and len(content) == item['bytes'], 'Manifest integrity mismatch: '+key)
    require(manifest['sourceSnapshotSha256'] == manifest['snapshot']['sha256'], 'Build source identity mismatch')
    require(path.name in (site / 'index.html').read_text(), 'Missing HTML snapshot reference')
    return len(rows)
