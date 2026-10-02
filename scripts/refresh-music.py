#!/usr/bin/env python3
"""Refresh official public charts without API keys; keep reviewed history on failure."""
import argparse
import datetime as dt
import json
import re
import subprocess
from email.utils import parsedate_to_datetime
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
KKBOX = 'https://kma.kkbox.com/charts/daily/song?terr=tw&lang=tc&cate=297'
APPLE = 'https://rss.marketingtools.apple.com/api/v2/tw/music/most-played/100/songs.json'
TAIPEI = dt.timezone(dt.timedelta(hours=8))
SPOTIFY = {'全球': '37i9dQZEVXbMDoHDwVN2tF', '台灣': '37i9dQZEVXbMnZEatlMSiu'}
YOUTUBE = 'https://charts.youtube.com/charts/TopSongs/{region}/weekly'

def fetch(url):
    result = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--location', '--proto', '=https', '--max-time', '35', '--retry', '1', url], capture_output=True, text=True, check=True)
    if not result.stdout.strip():
        raise ValueError('來源回傳空白內容')
    return result.stdout

def validate_rows(rows, expected_platform=None):
    if not rows:
        raise ValueError('沒有有效歌曲，保留上次資料')
    seen = set()
    ranks = set()
    for row in rows:
        for name in ('id', 'platform', 'market', 'chart', 'date', 'title', 'artist', 'url', 'sourceUrl'):
            if not isinstance(row.get(name), str) or not row[name].strip():
                raise ValueError(f'缺少欄位 {name}')
        if expected_platform and row['platform'] != expected_platform:
            raise ValueError('來源平台不符')
        if type(row.get('rank')) is not int or row['rank'] < 1:
            raise ValueError('無效排名')
        previous = row.get('previousRank')
        if previous is not None and (type(previous) is not int or previous < 1):
            raise ValueError('無效前期排名')
        dt.date.fromisoformat(row['date'])
        key = (row['platform'], row['market'], row['chart'], row['date'], row['id'])
        rank_key = (*key[:4], row['rank'])
        if key in seen or rank_key in ranks:
            raise ValueError('重複歌曲或排名')
        seen.add(key)
        ranks.add(rank_key)
        for key in ('url', 'sourceUrl'):
            parsed = urlparse(row[key])
            if parsed.scheme != 'https' or parsed.username or parsed.password:
                raise ValueError('來源連結必須是 HTTPS 且不可含憑證')
    return rows

def parse_kkbox(html, observed_at, requested_date=None):
    match = re.search(r'var chart = (.*?);\s*\n', html)
    date_match = re.search(r'var chartDate = "([\d-]+)"', html)
    if not match or not date_match:
        raise ValueError('KKBOX 頁面結構改變或未回傳歌曲')
    date = date_match.group(1)
    if requested_date and date != requested_date:
        raise ValueError('KKBOX 回傳日期與請求不符')
    result = []
    for t in json.loads(match.group(1)):
        result.append(dict(id='kkbox:' + t['song_id'], platform='KKBOX', market='台灣', chart='華語單曲日榜', date=date,
            rank=t['rankings']['this_period'], previousRank=t['rankings']['last_period'], title=t['song_name'], artist=t['artist_name'],
            genre='華語榜・未細分', artists=[t.get('artist_roles') or t['artist_name']], cadence='daily', dateBasis='chart', rankStatus='new' if t['rankings']['last_period'] is None else 'ranked', releaseDate=dt.datetime.fromtimestamp(t['release_date'], dt.timezone.utc).date().isoformat() if t.get('release_date') else None,
            url=t['song_url'], sourceUrl=KKBOX + '&date=' + date, lyricsStatus='待閱讀', soundStatus='待聆聽', observedAt=observed_at))
    validate_rows(result, 'KKBOX')
    if len(result) != 50:
        raise ValueError('KKBOX 榜單不是預期的 50 筆，需人工檢查')
    return result

def parse_spotify(text, observed_at, market='全球'):
    match = re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', text, re.S)
    if not match:
        raise ValueError('Spotify 未回傳公開榜單歌單')
    entity = json.loads(match[1])['props']['pageProps']['state']['data']['entity']
    if entity['id'] != SPOTIFY[market] or entity.get('subtitle') != 'Spotify' or entity.get('format') != 'chart':
        raise ValueError('不是預期的 Spotify 官方榜單歌單')
    attributes = {a['key']: a['value'] for a in entity['attributes']}
    updated = dt.datetime.fromisoformat(attributes['last_updated'].replace('Z', '+00:00'))
    date = updated.astimezone(TAIPEI).date().isoformat()
    result = []
    for rank, t in enumerate(entity['trackList'], 1):
        track_id = t['uri'].split(':')[-1]
        if not re.fullmatch(r'[A-Za-z0-9]{22}', track_id):
            raise ValueError('Spotify 歌曲識別碼不符')
        result.append(dict(id='spotify:' + track_id, platform='Spotify', market=market, chart='官方 Top 50 歌單',
            date=date, dateBasis='playlistUpdated', sourceUpdatedAt=updated.isoformat(), cadence='snapshot',
            rank=rank, previousRank=None, rankStatus='unknown', title=t['title'], artist=t['subtitle'].replace('\u00a0', ' '),
            artists=[a.strip() for a in t['subtitle'].split(',')], genre='未提供', releaseDate=None,
            url='https://open.spotify.com/track/' + track_id, sourceUrl='https://open.spotify.com/playlist/' + entity['id'],
            lyricsStatus='待閱讀', soundStatus='待聆聽', observedAt=observed_at))
    validate_rows(result, 'Spotify')
    if len(result) != 50:
        raise ValueError('Spotify 官方歌單不是 50 首，需檢查')
    return result

def fetch_youtube(region='global', end_date=None):
    # Public chart-page request, no account, private token or API key required.
    page = fetch(YOUTUBE.format(region=region))
    match = re.search(r'ytcfg\.set\((\{)', page)
    if not match:
        raise ValueError('YouTube 官方頁面設定已改變')
    config = json.JSONDecoder().raw_decode(page[match.start(1):])[0]
    query = f'perspective=CHART_DETAILS&chart_params_country_code={region}&chart_params_chart_type=TRACKS&chart_params_period_type=WEEKLY'
    if end_date:
        dt.date.fromisoformat(end_date)
        query += '&chart_params_end_date=' + end_date.replace('-', '')
    payload = {'context': {'client': {'clientName': config['INNERTUBE_CLIENT_NAME'], 'clientVersion': config['INNERTUBE_CLIENT_VERSION'], 'hl': 'en', 'gl': 'US'}},
        'browseId': 'FEmusic_analytics_charts_home', 'query': query}
    response = subprocess.run(['curl', '--fail', '--silent', '--show-error', '--max-time', '35', '--retry', '1',
        '-H', 'Content-Type: application/json', '--data-binary', '@-', 'https://charts.youtube.com/youtubei/v1/browse?alt=json'],
        input=json.dumps(payload), text=True, capture_output=True, check=True)
    return response.stdout

def parse_youtube(text, observed_at, market='全球', requested_date=None):
    region = 'global' if market == '全球' else 'tw'
    content = json.loads(text)['contents']['sectionListRenderer']['contents'][0]['musicAnalyticsSectionRenderer']['content']
    params = content['perspectiveMetadata']['requestParams']['chartParams']
    if params['countryCode'].lower() != region or params['chartType'] != 'CHART_TYPE_TRACKS':
        raise ValueError('YouTube 市場或榜單類型不符')
    chart = content['trackTypes'][0]
    date = chart['endDate']
    if chart['chartPeriodType'] != 'CHART_PERIOD_TYPE_WEEKLY' or (requested_date and date != requested_date):
        raise ValueError('YouTube 週期或日期不符')
    result = []
    for t in chart['trackViews']:
        meta = t['chartEntryMetadata']
        artists = [a['name'] for a in t['artists']]
        release = t.get('releaseDate', {})
        previous = meta.get('previousPosition') or None
        result.append(dict(id='youtube:' + t['id'], platform='YouTube', market=market, chart='熱門歌曲週榜 Top 100',
            date=date, periodStart=(dt.date.fromisoformat(date)-dt.timedelta(days=6)).isoformat(), cadence='weekly', dateBasis='periodEnd',
            rank=meta['currentPosition'], previousRank=previous, rankStatus='new' if not previous and meta.get('periodsOnChart') == 1 else 'reentry' if not previous else 'ranked',
            title=t['name'], artist=', '.join(artists), artists=artists, genre='未提供',
            releaseDate=dt.date(release['year'], release['month'], release['day']).isoformat() if all(k in release for k in ['year','month','day']) else None,
            views=int(t['viewCount']), viewsChange=meta.get('percentViewsChange'), weeksOnChart=meta.get('periodsOnChart'),
            url='https://www.youtube.com/watch?v=' + t['encryptedVideoId'], sourceUrl=YOUTUBE.format(region=region) + '/' + date.replace('-', ''),
            lyricsStatus='待閱讀', soundStatus='待聆聽', observedAt=observed_at))
    validate_rows(result, 'YouTube')
    if len(result) != 100:
        raise ValueError('YouTube 歌曲週榜不是 100 首，需檢查')
    return result

def with_previous_snapshot(rows, old):
    """Only compare a genuine earlier snapshot of this exact chart, never another market."""
    if not rows or rows[0]['platform'] not in ['Spotify', 'Apple Music']:
        return rows
    head = rows[0]
    history = [r for r in old if (r['platform'], r['market'], r['chart']) == (head['platform'], head['market'], head['chart']) and r['date'] < head['date']]
    prior_date = max((r['date'] for r in history), default=None)
    prior = {r['id']: r['rank'] for r in history if r['date'] == prior_date}
    for row in rows:
        row['previousRank'] = prior.get(row['id'])
        row['comparisonDate'] = prior_date
        row['comparisonBasis'] = 'snapshot'
    return rows

def parse_apple(text, observed_at):
    feed = json.loads(text)['feed']
    if feed.get('country') != 'tw':
        raise ValueError('Apple Music 市場不符')
    updated = parsedate_to_datetime(feed['updated']).astimezone(TAIPEI)
    result = []
    for rank, t in enumerate(feed['results'], 1):
        result.append(dict(id='apple:' + t['id'], platform='Apple Music', market='台灣', chart='熱門歌曲 Top 100', date=updated.date().isoformat(),
            rank=rank, previousRank=None, cadence='snapshot', dateBasis='feedUpdated', title=t['name'], artist=t['artistName'], genre=next((g['name'] for g in t.get('genres', []) if g['name'] != '音樂'), '未分類'),
            releaseDate=t.get('releaseDate'), url=t['url'], sourceUrl=APPLE, lyricsStatus='待閱讀', soundStatus='待聆聽', observedAt=observed_at))
    validate_rows(result, 'Apple Music')
    if len(result) != 100:
        raise ValueError('Apple Music 榜單不是預期的 100 筆，需人工檢查')
    return result

def merge_snapshots(old, new):
    """Replace whole chart periods, not individual rows: a dropped song must disappear."""
    replaced = {(r['platform'], r['market'], r['chart'], r['date']) for r in new}
    result = [r for r in old if (r['platform'], r['market'], r['chart'], r['date']) not in replaced] + new
    return sorted(result, key=lambda r: (r['date'], r['platform'], r['rank']))

def atomic_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--snapshot', type=Path, default=ROOT / 'src/data.json')
    parser.add_argument('--validate-only', action='store_true')
    args = parser.parse_args()
    snapshot = json.loads(args.snapshot.read_text(encoding='utf-8'))
    original = snapshot['queries']['tracks']['rows']
    if args.validate_only:
        validate_rows(original)
        print(f'Validated {len(original)} chart observations.')
        return 0
    now = dt.datetime.now(dt.timezone.utc).isoformat()
    failures, successes = [], []
    jobs = [('KKBOX', '台灣', lambda: parse_kkbox(fetch(KKBOX), now)), ('Apple Music', '台灣', lambda: parse_apple(fetch(APPLE), now))]
    for market, playlist in SPOTIFY.items():
        jobs.append(('Spotify', market, lambda m=market,p=playlist: parse_spotify(fetch('https://open.spotify.com/embed/playlist/' + p), now, m)))
    for market, region in [('全球', 'global'), ('台灣', 'tw')]:
        jobs.append(('YouTube', market, lambda m=market,r=region: parse_youtube(fetch_youtube(r), now, m)))
    outcomes = {}
    for name, market, collect in jobs:
        state = next(s for s in snapshot['queries']['sources']['rows'] if s['platform'] == name)
        state['lastAttemptAt'] = now
        try:
            rows = with_previous_snapshot(collect(), original)
            newest = dt.date.fromisoformat(max(r['date'] for r in rows))
            age = (dt.datetime.now(TAIPEI).date() - newest).days
            if age < 0 or age > (14 if name == 'YouTube' else 4):
                raise ValueError('來源榜單日期超出合理更新範圍')
            old_latest = max((r['date'] for r in original if (r['platform'],r['market'],r['chart']) == (name,market,rows[0]['chart'])), default='')
            if rows[0]['date'] < old_latest:
                raise ValueError('來源日期較既有資料舊，未覆寫')
            original = merge_snapshots(original, rows)
            outcomes.setdefault(name, []).append({'market': market, 'date': rows[0]['date'], 'status': 'ready', 'count': len(rows)})
            state['lastSuccessAt'] = now
            successes.append(name + ' / ' + market)
        except (ValueError, KeyError, TypeError, subprocess.SubprocessError) as error:
            reason = str(error) if not isinstance(error, subprocess.SubprocessError) else '網路或來源讀取失敗'
            outcomes.setdefault(name, []).append({'market': market, 'status': 'blocked', 'reason': reason})
            failures.append(name + ' / ' + market)
    for name, results in outcomes.items():
        state = next(s for s in snapshot['queries']['sources']['rows'] if s['platform'] == name)
        healthy = [r for r in results if r['status'] == 'ready']
        state.update(status='ready' if len(healthy)==len(results) else 'partial' if healthy else 'blocked',
            label='榜單已取得' if len(healthy)==len(results) else '部分更新失敗' if healthy else '更新失敗・保留舊資料',
            market='、'.join(r['market'] for r in results), coverage=results)
        state['note'] = '；'.join(f'{r["market"]} {r["date"]} · {r["count"]} 首' if r['status']=='ready' else f'{r["market"]} 更新失敗，保留舊資料：{r["reason"]}' for r in results)
        if name=='Spotify': state['note'] += '。官方 Top 50 歌單順序；日期為歌單更新日，不是播放統計日。沒有提供播放次數。'
        elif name=='YouTube': state['note'] += '。歌曲週榜（不是單支 MV 榜）；日期為統計週結束日，觀看次數不可與每日串流量相加。'
    validate_rows(original)
    snapshot['queries']['tracks']['rows'] = original
    snapshot['lastAttemptAt'] = now
    if successes:
        snapshot['updatedAt'] = now
    snapshot['buildStatus'] = 'complete'
    atomic_json(args.snapshot, snapshot)
    archive = ROOT / 'snapshots' / (dt.datetime.now(TAIPEI).date().isoformat() + '.json')
    atomic_json(archive, {'observedAt': now, 'successes': successes, 'failures': failures, 'rows': [r for r in original if r.get('observedAt') == now]})
    print(json.dumps({'successes': successes, 'failures': failures, 'observations': len(original)}, ensure_ascii=False))
    # Nonzero alerts CI; the publish job may still publish explicit stale-source status.
    return 1 if failures else 0

if __name__ == '__main__':
    raise SystemExit(main())
