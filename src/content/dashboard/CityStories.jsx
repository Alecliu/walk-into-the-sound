import React, { useState } from 'react';
import { DataComponent, RichNarrative, Dropdown } from '../../data-app-public.jsx';
import './city-stories.css';
import { artistName, storyTags, tagKey, tagTypes, storyTopics, availableTopics, newestStories, tagOptions, updateSelections, filterStories } from './story-model.js';
import { StoryPhoto, StoryPhotoImage, StoryPhotoCredit } from './StoryPhoto.jsx';
import { useReader, HeartButton, ReaderShelf, ReaderDialog } from './ReaderRecommendations.jsx';

function External({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>; }
export function CityStories({ stories, storyId, onOpen, initialLens = '' }) {
  const reader = useReader();
  const readerDialog = <ReaderDialog stories={stories} reader={reader} onOpen={onOpen}/>;
  const [selections, setSelections] = useState({});
  const [search, setSearch] = useState('');
  const [lens, setLens] = useState(initialLens);
  const [limit, setLimit] = useState(10);
  const scopedStories = filterStories(stories, {topic: lens});
  const active = stories.find(s => s.id === storyId);
  const list = newestStories(filterStories(scopedStories, { search, selections }));
  const visible = list.slice(0, limit);
  function selectTopic(topic) { setLens(topic); setSelections({}); setSearch(''); setLimit(10); if (storyId) onOpen(null); }
  function selectTag(value) { setLimit(10); setLens(''); setSelections({[value.split(':')[0]]:value}); setSearch(''); if (storyId) onOpen(null); }
  function resetFilters() { setSelections({}); setSearch(''); setLens(''); setLimit(10); }
  const tagButtons = story => <div className="ms-story-tags" aria-label="故事標籤">{storyTopics(story).map(topic => <button key={topic} onClick={() => selectTopic(topic)}>#{topic}</button>)}{storyTags(story).filter(t => t.type === '城市').map(t => <button key={tagKey(t)} aria-label={`${t.type}：${t.label}`} onClick={() => selectTag(tagKey(t))}>#{t.label}</button>)}</div>;
  if (storyId && !active) return <section className="ms-empty"><h2>找不到這篇故事</h2><button className="ms-outline" onClick={() => onOpen(null)}>回到所有故事</button></section>;
  if (active) return <><article className={`ms-city-article city-${active.accent}`}>
    <button className="ms-outline" onClick={() => onOpen(null)}>← 所有文章</button>
    <header className="ms-city-article-head"><span className="ms-kicker">{[active.cityEn, active.category].filter(Boolean).join(' / ')}</span><p className="ms-city-location">{[active.city, artistName(active)].filter(Boolean).join(' · ')}</p><h1>{active.title}</h1><p className="ms-city-deck">{active.deck}</p><div className="ms-article-meta"><span>{active.publishedAt} 發布</span><span>約 {active.readingMinutes} 分鐘閱讀</span></div>{tagButtons(active)}<HeartButton story={active} reader={reader}/></header>
    <DataComponent id={`city-story-${active.id}`} queryId="cityStories" title="閱讀筆記" kind="custom" sourceRows={[active]} displayRows={[active]} variant="plain">
      <div className="wis-story-context"><span>故事線索：{active.anchor || active.city}</span><span>相關作品：{active.work || active.listen.title}</span></div>
      {!active.places.some(place=>place.photo?.id===active.photo?.id) && <StoryPhoto photo={active.photo}/>}
      <div className="ms-city-reading-layout"><div className="ms-city-prose">{active.sections.map(section => <section key={section.id}><h2>{section.title}</h2><RichNarrative id={`city-${active.id}-${section.id}`} value={section.body}/></section>)}</div>
        <aside className="ms-city-aside"><h2>相關時間線</h2><ol data-reviewed-rows>{active.timeline.map(t => <li key={t.date}><strong>{t.date}</strong><p>{t.event}</p></li>)}</ol><div className="ms-city-listen"><span className="ms-kicker">LISTEN ALONG</span><h3>{active.listen.title}</h3><p>{active.listen.note}</p><div className="wis-listen-links"><External href={active.listen.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent((active.listen.artist || artistName(active)) + ' ' + active.listen.title)}`}>{active.listen.youtubeLabel || 'YouTube 搜尋'}</External><External href={`https://open.spotify.com/search/${encodeURIComponent((active.listen.artist || artistName(active)) + ' ' + active.listen.title)}`}>Spotify 搜尋</External></div></div></aside>
      </div>
      {active.places.length > 0 && <section className="ms-city-places" data-reviewed-rows><span className="ms-kicker">PLACES IN THE STORY</span><h2>故事裡的地方</h2><div>{active.places.map(place => <section key={place.name}><h3>{place.name}</h3><StoryPhoto photo={place.photo}/><p>{place.detail}</p><External href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.query)}`}>在地圖上看</External></section>)}</div></section>}
      <section className="ms-city-sources" data-reviewed-rows><h2>故事的出處</h2><p>查閱日期 {active.reviewedAt} · 依作品、創作者與地點公開記錄整理</p>{active.sources.map(s => <External key={s.url} href={s.url}>{s.title}</External>)}</section>
    </DataComponent>
    <nav className="ms-city-next" aria-label="接著讀">{[...stories.filter(s => s.id !== active.id && s.lens === active.lens).slice(0, 1), ...stories.filter(s => s.lens !== active.lens).slice(0, 1)].map(s => <button key={s.id} onClick={() => onOpen(s.id)}><small>接著讀 · {artistName(s)}</small><strong>{s.title} →</strong></button>)}</nav>
  </article>{readerDialog}</>;
  return <><section className="ms-city-library wis-blog-library" aria-label="文章列表">
    <ReaderShelf stories={stories} reader={reader} onOpen={onOpen}/>
    <div className="wis-topic-tags" aria-label="主題標籤"><button aria-pressed={!lens} onClick={() => selectTopic('')}>全部</button>{availableTopics(stories).map(topic => <button key={topic} aria-pressed={lens === topic} onClick={() => selectTopic(topic)}>#{topic}</button>)}</div>
    <div className="ms-city-tools"><label className="ms-search"><input aria-label="搜尋音樂故事" placeholder="找歌名、音樂人或地點…" value={search} onChange={e => {setSearch(e.target.value); setLimit(10);}}/></label>{(Object.values(selections).some(Boolean) || search || lens) && <button className="ms-outline" onClick={resetFilters}>清除篩選</button>}</div>
    <details className="wis-location-filter"><summary>從城市、街區找文章{Object.values(selections).some(Boolean) ? ' · 已篩選' : ''}</summary><div className="ms-story-dropdowns">{tagTypes.map(type => { const options = tagOptions(scopedStories, type, selections); return <Dropdown key={type} label={type} showLabel value={selections[type] || '__all__'} choices={['__all__', ...options.map(tagKey)]} choiceLabels={{__all__: `全部${type}`, ...Object.fromEntries(options.map(t => [tagKey(t), t.label]))}} onChange={value => {setSelections(current => updateSelections(scopedStories, current, type, value === '__all__' ? '' : value)); setLimit(10);}}/>; })}</div></details>
    <p className="ms-note" role="status">{list.length} 篇文章{list.length > visible.length ? ` · 顯示前 ${visible.length} 篇` : ''}</p>
    <DataComponent id="city-stories-library" queryId="cityStories" title="文章列表" kind="custom" sourceRows={visible} displayRows={visible} variant="plain"><div className="wis-post-list" data-reviewed-rows>{visible.map(s => <article className="wis-post" key={s.id}>
      <div className="wis-post-copy"><div className="wis-post-meta"><time dateTime={s.publishedAt}>{s.publishedAt}</time><span>{s.readingMinutes} 分鐘閱讀</span></div><h2><a href={`#cities/${s.id}`} onClick={e => {if (e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey) {e.preventDefault(); onOpen(s.id);}}}>{s.title}</a></h2><p>{s.deck}</p>{tagButtons(s)}<HeartButton story={s} reader={reader}/></div>
      {s.photo && <figure className="wis-post-photo"><a href={`#cities/${s.id}`} aria-label={`閱讀：${s.title}`}><StoryPhotoImage photo={s.photo} compact/></a><figcaption><StoryPhotoCredit photo={s.photo} compact/></figcaption></figure>}
    </article>)}</div></DataComponent>
    {list.length > limit && <button className="ms-more" onClick={() => setLimit(n => n + 10)}>再讀 {Math.min(10, list.length - limit)} 篇 ↓</button>}
    {!list.length && <div className="ms-empty"><h2>還沒有符合的文章</h2><p>試試作品、音樂人或地點，或清除篩選。</p><button className="ms-outline" onClick={resetFilters}>清除篩選</button></div>}
  </section>{readerDialog}</>;
}
