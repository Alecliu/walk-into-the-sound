"""Daily editorial slots and resumable, source-checked batch selection."""
import datetime as dt
import re
from blog_validation import TAIPEI, require, validate_candidate

FIVE_ARTICLE_START = '2026-10-04'
PREPARE_HOUR = 5

def plan_for(day):
    if day < FIVE_ARTICLE_START:
        return [{'id':'story', 'topic':'', 'focus':'音樂故事', 'recent':False}]
    recent_scene, artist_scene = ('日本', '韓國') if dt.date.fromisoformat(day).toordinal() % 2 else ('韓國', '日本')
    return [
        {'id':'new-release', 'topic':'新歌觀察', 'recent':True,
         'focus':'新歌與流量觀察：選近 60 天已發行的作品，研究創作或製作細節；如引用熱度，必須重新取得有日期與口徑的數據。不限音樂場景。'},
        {'id':'new-discovery', 'topic':'新歌觀察', 'recent':True,
         'focus':recent_scene+'歌手或團體的近 60 天新作品：從有日期的榜單、演出或發行線索追蹤，寫成作品故事，不抄榜單、不把大廠牌藝人稱為未簽約新人。'},
        {'id':'mv-location', 'topic':'MV 場景', 'recent':False,
         'focus':'MV 場景：研究已確認的拍攝城市、場景設計或導演如何處理歌曲。實景與片廠／虛構場景要分清；不可看相似建築就猜地點，不能轉載未授權截圖。'},
        {'id':'producer', 'topic':'製作人', 'recent':False,
         'focus':'製作人、編曲或錄音幕後：從一首作品的具體聲音決策、合作過程或錄音紀錄切入，確認製作／編曲／詞曲職務，不把團隊成果全歸給一人。'},
        {'id':'artist-story', 'topic':'音樂人筆記', 'recent':False,
         'focus':artist_scene+'歌手或團體的歌曲故事：可以是新歌或舊作，找訪談、創作過程、成員合作或轉折；避免人物履歷與粉絲宣傳稿。'},
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
            require(dt.datetime.fromisoformat(ready['preparedAt']).astimezone(TAIPEI).date().isoformat()==day, 'Draft is stale')
            story = validate_assignment(ready['candidate'], existing, day, slot)
            review = ready['review']
            require(review['approved'] is True and review['issues']==[], 'Editorial review rejected')
            require(set(review['checkedUrls'])=={s['url'] for s in story['sources']}, 'Reviewer did not read all sources')
            story = deepcopy(story)
            story['dailyKey'] = day+':'+slot['id']
            require(re.fullmatch(r'\d{4}-\d{2}-\d{2}:[a-z0-9-]+',story['dailyKey']), 'Invalid daily slot key')
            selected.append((story, ready))
            existing.append(story)
        except (ValueError, KeyError, TypeError) as error:
            errors[slot['id']] = str(error)
    return selected, errors
