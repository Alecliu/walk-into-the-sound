"""Daily editorial slots and resumable, source-checked batch selection."""
import datetime as dt
import re
from blog_validation import TAIPEI, require, validate_candidate
from story_photos import validate_photo_review

FIVE_ARTICLE_START = '2026-10-04'
PREPARE_HOUR = 5
EDITORIAL_POLICY_VERSION = '2026-10-03-reader-v2'

def plan_for(day):
    if day < FIVE_ARTICLE_START:
        return [{'id':'story', 'topic':'', 'focus':'音樂故事', 'recent':False}]
    rotation = dt.date.fromisoformat(day).toordinal() % 4
    deep_dives = [
        ('MV 場景', 'MV 場景與導演：核對實景、片廠和虛構場景，從一首有辨識度的作品切入。'),
        ('製作幕後', '製作人、配樂、錄音或樂手：研究一個具體作品的合作與聲音決定，核對各人的職務。'),
        ('現場與相遇', '一次演出或合作如何留下作品：找有記錄的相遇、版本或現場細節。'),
        ('音樂人筆記', '有溫度的人物與歌曲故事：從訪談裡可查證的具體經歷切入，不捏造心理或對話。'),
    ]
    screen = ('經典電影', '動畫', '影集', '遊戲')[rotation]
    return [
        {'id':'new-release', 'topic':'新歌觀察', 'recent':True,
         'focus':'新歌與流量觀察：選近 60 天已發行的作品，研究創作或製作細節；如引用熱度，必須重新取得有日期與口徑的數據。不限音樂場景。'},
        {'id':'new-discovery', 'topic':'新歌觀察', 'recent':True,
         'focus':'另一首近 60 天新作品：不限語言與地區，與第一篇選不同音樂人及聲音方向；可由潛力雷達或新歌榜單找到線索，核實後寫成作品故事。'},
        # Keep stable slot IDs so an interrupted batch can resume after an editorial revision.
        {'id':'mv-location', 'topic':'影像與配樂', 'recent':False,
         'focus':screen+'裡的音樂故事：優先選讀者熟悉、仍值得研究的作品，找具體歌曲、配樂或製作細節；資料不足可換其他電影、動畫、影集或遊戲。'},
        {'id':'producer', 'topic':deep_dives[rotation][0], 'recent':False,
         'focus':deep_dives[rotation][1]},
        {'id':'artist-story', 'topic':'音樂人筆記', 'recent':False,
         'focus':'一首熟悉的歌，背後具體的人與關係：像 Suzanne、ADÉLA 那樣由訪談和作品找到情感，保留人的細節；題材多元，不設每日地區配額。'},
    ]

def published_count(rows, day):
    return sum(s['publishedAt'] == day for s in rows)

def remaining_slots(rows, day):
    slots = plan_for(day)
    keys = {s.get('dailyKey') for s in rows}
    remaining = max(0, len(slots) - published_count(rows, day))
    return [s for s in slots if day+':'+s['id'] not in keys][:remaining]

def validate_assignment(candidate, existing, day, slot):
    story = validate_candidate(candidate, existing, day)
    if slot['topic']:
        require(slot['topic'] in story.get('topics', []), 'Missing assigned topic')
    cutoff = (dt.date.fromisoformat(day)-dt.timedelta(days=3)).isoformat()
    require(not any(s['artist'].casefold()==story['artist'].casefold() and cutoff <= s['publishedAt'] <= day for s in existing), 'Primary artist repeated within three days')
    if slot['recent']:
        selection = candidate.get('selection', {})
        released = dt.date.fromisoformat(selection.get('releaseDate', ''))
        age = (dt.date.fromisoformat(day)-released).days
        require(0 <= age <= 60, 'New release must be published within 60 days')
        require(selection.get('releaseSource') in {s['url'] for s in story['sources']}, 'New release date needs a cited source')
    return story

def select_ready(rows, day, ready_by_slot):
    """Recheck cached drafts against latest main; isolate failed slots without republishing."""
    from copy import deepcopy
    selected, errors = [], {}
    existing = list(rows)
    for slot in remaining_slots(rows, day):
        ready = ready_by_slot.get(slot['id'])
        if ready is None:
            errors[slot['id']] = 'No reviewed draft available'
            continue
        try:
            require(ready['day']==day and ready['slot']==slot['id'], 'Draft belongs to another date or slot')
            require(ready.get('policyVersion') == EDITORIAL_POLICY_VERSION, 'Draft needs the current editorial policy review')
            require(dt.datetime.fromisoformat(ready['preparedAt']).astimezone(TAIPEI).date().isoformat()==day, 'Draft is stale')
            story = validate_assignment(ready['candidate'], existing, day, slot)
            review = ready['review']
            require(review['approved'] is True and review['issues']==[], 'Editorial review rejected')
            require(set(review['checkedUrls'])=={s['url'] for s in story['sources']}, 'Reviewer did not read all sources')
            validate_photo_review(ready['candidate'],review)
            story = deepcopy(story)
            story['dailyKey'] = day+':'+slot['id']
            require(re.fullmatch(r'\d{4}-\d{2}-\d{2}:[a-z0-9-]+',story['dailyKey']), 'Invalid daily slot key')
            selected.append((story, ready))
            existing.append(story)
        except (ValueError, KeyError, TypeError) as error:
            errors[slot['id']] = str(error)
    return selected, errors
