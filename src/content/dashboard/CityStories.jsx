import React, { useState } from 'react';
import { DataComponent, RichNarrative, Dropdown } from '../../data-app-public.jsx';
import './city-stories.css';
import { artistName, storyTags, tagKey, tagTypes, storyLenses, tagOptions, updateSelections, filterStories } from './story-model.js';
import { StoryPhoto, StoryPhotoImage, StoryPhotoCredit } from './StoryPhoto.jsx';

function External({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>; }
export function CityStories({ stories, storyId, onOpen, initialLens = '' }) {
  const [selections, setSelections] = useState({});
  const [search, setSearch] = useState('');
  const [lens, setLens] = useState(initialLens);
  const scopedStories = lens ? stories.filter(s => s.lens === lens) : stories;
  const active = stories.find(s => s.id === storyId);
  const list = filterStories(scopedStories, { search, selections });
  function selectTag(value) { setLens(''); setSelections({[value.split(':')[0]]:value}); setSearch(''); if (storyId) onOpen(null); }
  function resetFilters() { setSelections({}); setSearch(''); setLens(''); }
  const tagButtons = story => <div className="ms-story-tags" aria-label="故事標籤">{storyTags(story).map(t => <button key={tagKey(t)} aria-label={`${t.type}：${t.label}`} onClick={() => selectTag(tagKey(t))}>#{t.label}</button>)}</div>;
  if (storyId && !active) return <section className="ms-empty"><h2>找不到這篇故事</h2><button className="ms-outline" onClick={() => onOpen(null)}>回到所有故事</button></section>;
  if (active) return <article className={`ms-city-article city-${active.accent}`}>
    <button className="ms-outline" onClick={() => onOpen(null)}>← 故事選集</button>
    <header className="ms-city-article-head"><span className="ms-kicker">{active.cityEn} / {active.category}</span><p className="ms-city-location">{active.city} · {artistName(active)}</p><h1>{active.title}</h1><p className="ms-city-deck">{active.deck}</p><div className="ms-article-meta"><span>{active.publishedAt} 發布</span><span>約 {active.readingMinutes} 分鐘閱讀</span></div>{tagButtons(active)}</header>
    <DataComponent id={`city-story-${active.id}`} queryId="cityStories" title={`${active.city} · ${artistName(active)}`} kind="custom" sourceRows={[active]} displayRows={[active]} variant="plain">
      <div className="wis-story-context"><span>故事線索：{active.anchor || active.city}</span><span>相關作品：{active.work || active.listen.title}</span></div>
      <StoryPhoto photo={active.photo}/>
      <div className="ms-city-reading-layout"><div className="ms-city-prose">{active.sections.map(section => <section key={section.id}><h2>{section.title}</h2><RichNarrative id={`city-${active.id}-${section.id}`} value={section.body}/></section>)}</div>
        <aside className="ms-city-aside"><h2>把時間接起來</h2><ol data-reviewed-rows>{active.timeline.map(t => <li key={t.date}><strong>{t.date}</strong><p>{t.event}</p></li>)}</ol><div className="ms-city-listen"><span className="ms-kicker">LISTEN ALONG</span><h3>{active.listen.title}</h3><p>{active.listen.note}</p><div className="wis-listen-links"><External href={active.listen.youtubeUrl || `https://www.youtube.com/results?search_query=${encodeURIComponent((active.listen.artist || artistName(active)) + ' ' + active.listen.title)}`}>{active.listen.youtubeLabel || 'YouTube 搜尋'}</External><External href={`https://open.spotify.com/search/${encodeURIComponent((active.listen.artist || artistName(active)) + ' ' + active.listen.title)}`}>Spotify 搜尋</External></div></div></aside>
      </div>
      <section className="ms-city-places" data-reviewed-rows><span className="ms-kicker">PLACES IN THE STORY</span><h2>故事裡的地方</h2><div>{active.places.map(place => <section key={place.name}><h3>{place.name}</h3><p>{place.detail}</p><External href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.query)}`}>在地圖上看</External></section>)}</div></section>
      <section className="ms-city-sources" data-reviewed-rows><h2>故事的出處</h2><p>查閱日期 {active.reviewedAt} · 依作品、創作者與地點公開記錄整理</p>{active.sources.map(s => <External key={s.url} href={s.url}>{s.title}</External>)}</section>
    </DataComponent>
    <nav className="ms-city-next" aria-label="接著讀">{[...stories.filter(s => s.id !== active.id && s.lens === active.lens).slice(0, 1), ...stories.filter(s => s.lens !== active.lens).slice(0, 1)].map(s => <button key={s.id} onClick={() => onOpen(s.id)}><small>接著讀 · {artistName(s)}</small><strong>{s.title} →</strong></button>)}</nav>
  </article>;
  return <section className="ms-city-library">
    <header className="ms-city-intro"><span className="ms-kicker">THE STORY COLLECTION</span><h1>{lens || '故事選集'}</h1><p className="ms-story-subtitle">{lens ? storyLenses.find(l => l.name === lens)?.description : '二十段音樂往事，從這裡慢慢讀。'}</p><p>選一個專欄，或從城市、街區與地點找起。</p></header>
    <div className="ms-city-tools"><label className="ms-search"><input aria-label="搜尋音樂故事" placeholder="搜尋作品、物件、音樂人或地點…" value={search} onChange={e => setSearch(e.target.value)}/></label>{(Object.values(selections).some(Boolean) || search || lens) && <button className="ms-outline" onClick={resetFilters}>清除篩選</button>}</div>
    <div className="ms-story-dropdowns"><Dropdown label="故事線索" showLabel value={lens || '__all__'} choices={['__all__', ...storyLenses.map(l => l.name)]} choiceLabels={{__all__:'全部故事'}} onChange={value => {setLens(value === '__all__' ? '' : value); setSelections({});}}/>{tagTypes.map(type => { const options = tagOptions(scopedStories, type, selections); return <Dropdown key={type} label={type} showLabel value={selections[type] || '__all__'} choices={['__all__', ...options.map(tagKey)]} choiceLabels={{__all__: `全部${type}`, ...Object.fromEntries(options.map(t => [tagKey(t), t.label]))}} onChange={value => setSelections(current => updateSelections(scopedStories, current, type, value === '__all__' ? '' : value))}/>; })}</div>
    <p className="ms-note" role="status">{list.length} 篇故事</p>
    <DataComponent id="city-stories-library" queryId="cityStories" title="故事選集" kind="custom" sourceRows={list} displayRows={list} variant="plain"><div className="ms-city-grid" data-reviewed-rows>{list.map((s) => <article className={`ms-city-card city-${s.accent}`} key={s.id}><button className="ms-story-card-open" onClick={() => onOpen(s.id)}>{s.photo ? <StoryPhotoImage photo={s.photo} compact/> : <div className="ms-city-poster"><span>{s.category} / {s.year}</span><strong>{s.cityEn}</strong><div className="ms-city-record" aria-hidden="true"/><b>{s.city}<small>{artistName(s)}</small></b></div>}<div className="ms-city-card-copy"><div className="ms-story-card-meta">{s.lens || s.category} · {s.city} · {s.anchor}</div><h2>{s.title}</h2><p>{s.deck}</p><span>讀這段故事 <b>↗</b></span></div></button>{tagButtons(s)}<StoryPhotoCredit photo={s.photo} compact/></article>)}</div></DataComponent>
    {!list.length && <div className="ms-empty"><h2>還沒有符合的故事</h2><p>試試作品、物件、街區或地點，或清除篩選。</p><button className="ms-outline" onClick={resetFilters}>清除篩選</button></div>}
  </section>;
}
