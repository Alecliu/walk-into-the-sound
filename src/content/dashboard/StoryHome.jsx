import React from 'react';
import { DataComponent } from '../../data-app-public.jsx';
import { StoryPhotoImage, StoryPhotoCredit } from './StoryPhoto.jsx';
import { storyLenses } from './story-model.js';

export function StoryHome({stories, onOpen, onBrowse, onNavigate}) {
  const featured = stories.find(s => s.id === 'paris-amelie-cafe') || stories[0];
  const picks = ['natori-sakamoto-piano', 'montreal-suzanne', 'havana-buena-vista'].map(id => stories.find(s => s.id === id)).filter(Boolean);
  return <div className="wis-home">
    <header className="wis-masthead"><div><span className="wis-eyebrow">音樂故事誌 · VOL. 01</span><h1>走到那首歌</h1><p className="wis-subtitle">Walk into the sound</p></div><div className="wis-manifesto"><p>歌響起以前，<br/>發生了什麼事？</p><small>從電影裡的咖啡館，到錄音室的一架鋼琴。<br/>寫人怎麼相遇，也寫一首歌怎麼留下來。</small><button onClick={() => onBrowse('')}>翻開 {stories.length} 篇故事 <span>↗</span></button></div></header>
    {featured && <DataComponent id="walk-featured-story" queryId="cityStories" title="本期故事" kind="custom" sourceRows={[featured]} displayRows={[featured]} variant="plain"><div className="wis-feature" data-reviewed-rows><figure><button aria-label={`閱讀：${featured.title}`} onClick={() => onOpen(featured.id)}><StoryPhotoImage photo={featured.photo}/></button><figcaption><StoryPhotoCredit photo={featured.photo} compact/></figcaption></figure><div className="wis-feature-copy"><span className="wis-eyebrow">01 / {featured.lens} · {featured.city}</span><p className="wis-anchor">從{featured.anchor}開始</p><h2><button onClick={() => onOpen(featured.id)}>{featured.title}</button></h2><p>{featured.deck}</p><div className="wis-feature-bottom"><span>{featured.work}<br/>{featured.readingMinutes} 分鐘閱讀</span><button onClick={() => onOpen(featured.id)} aria-label="閱讀本期故事">走進故事 ↗</button></div></div></div></DataComponent>}
    <section className="wis-paths" aria-label="故事分類"><div className="wis-section-title"><h2>循著什麼，走進一首歌？</h2><span>FOLLOW A CLUE</span></div><div>{storyLenses.map((lens,i) => <button key={lens.name} onClick={() => onBrowse(lens.name)}><span>0{i+1}</span><h3>{lens.name} ↗</h3><p>{lens.description}</p><small>{stories.filter(s => s.lens === lens.name).length} 篇故事</small></button>)}</div></section>
    <DataComponent id="walk-story-picks" queryId="cityStories" title="再走一段" kind="custom" sourceRows={picks} displayRows={picks} variant="plain"><div className="wis-picks" data-reviewed-rows>{picks.map(s => <article key={s.id}><button className="wis-pick-open" onClick={() => onOpen(s.id)}>{s.photo ? <StoryPhotoImage photo={s.photo} compact/> : <div className="wis-type-cover"><small>{s.category} / {s.cityEn}</small><strong>{s.listen.title || s.work || s.city}</strong><span>從{s.anchor}開始</span></div>}<span className="wis-eyebrow">{s.city} / {s.lens}</span><h3>{s.title}</h3><p>{s.deck}</p><small>讀故事 ↗</small></button><StoryPhotoCredit photo={s.photo} compact/></article>)}</div></DataComponent>
    <section className="wis-scanner"><div><span className="wis-eyebrow">THE LISTENING ROOM</span><h2>讀完故事，也聽聽現在。</h2><p>看看最近被聽見的歌，為下一次漫遊留一點線索。</p></div><div><button onClick={() => onNavigate('today')}><span>今日掃描<small>各平台的近期選曲</small></span>↗</button><button onClick={() => onNavigate('radar')}><span>潛力雷達<small>正在累積的聲音與訊號</small></span>↗</button></div></section>
  </div>;
}

export function AboutStories({onBrowse}) {
  return <section className="wis-about"><span className="wis-eyebrow">ABOUT THE JOURNAL</span><h1>關於這裡</h1><p className="wis-about-lead">同一首歌，知道故事以後，<br/>有時會聽見不同的地方。</p><p>我們從地點與物件寫音樂。咖啡館裡的電影場景、歌詞提到的街道、唱片封面外的幾步路，都可能牽出一段值得慢慢讀的往事。</p><p>這裡有歌手、樂手與團體，也有製作人和把演出辦起來的人。有些故事從一個人的回憶開始，有些得比較不同人的說法，才看得清楚。</p><h2>故事從哪裡來</h2><p>文章參考訪談、作品資料、報刊與音樂部落格，也用 Wikipedia 查對年代與版本。出處放在段落旁與文末，可以接著讀原文。電影場景與實際拍攝地分開標示；照片附上攝影者、年份和授權。</p><p>今日掃描與潛力雷達，是這本刊物旁邊的聆聽室：為閱讀補上正在發生的音樂，讓好奇繼續往前走。</p><button className="ms-primary" onClick={() => onBrowse('')}>從一篇故事開始 ↗</button></section>;
}
