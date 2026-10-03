import React, { useEffect, useState } from 'react';
import { DataComponent, Dialog, Switch } from '../../data-app-public.jsx';
import { READER_KEY, INTERESTS, emptyPreferences, parsePreferences, recommendations } from './reader-model.js';
import './reader.css';

export function useReader() {
  const [preferences,setPreferences]=useState(()=>{
    try { return parsePreferences(localStorage.getItem(READER_KEY)); } catch { return emptyPreferences(); }
  });
  const [storageError,setStorageError]=useState(false);
  const [panel,setPanel]=useState(null);
  useEffect(()=>{
    const sync=event=>{if(event.key===READER_KEY) setPreferences(parsePreferences(event.newValue));};
    window.addEventListener('storage',sync);
    return ()=>window.removeEventListener('storage',sync);
  },[]);
  function save(next) {
    next=parsePreferences(next);setPreferences(next);
    try { localStorage.setItem(READER_KEY,JSON.stringify(next));setStorageError(false); } catch { setStorageError(true); }
  }
  function toggle(story) {
    const liked=preferences.likedIds.includes(story.id);
    save({...preferences,likedIds:liked ? preferences.likedIds.filter(id=>id!==story.id) : [story.id,...preferences.likedIds]});
    if (!liked && preferences.enabled) setPanel({kind:'recommendations',seedId:story.id});
  }
  function clear() {
    setPreferences(emptyPreferences());
    try { localStorage.removeItem(READER_KEY);setStorageError(false); } catch { setStorageError(true); }
  }
  return {preferences,save,toggle,clear,storageError,panel,setPanel};
}

export function HeartButton({story,reader}) {
  const liked=reader.preferences.likedIds.includes(story.id);
  return <button className="wis-heart" aria-pressed={liked} aria-label={`${liked ? '取消喜歡' : '喜歡'}：${story.title}`} onClick={()=>reader.toggle(story)}><span aria-hidden="true">{liked?'♥':'♡'}</span> {liked?'已喜歡':'喜歡這篇'}</button>;
}

function RecommendationCards({items,onOpen}) {
  return <div className="wis-recommendation-cards" data-reviewed-rows>{items.map(({story,reason})=><article key={story.id}>
    <p className="wis-recommendation-reason">{reason}</p>
    <a href={`#cities/${story.id}`} onClick={e=>{if(!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey){e.preventDefault();onOpen(story.id);}}}>{story.title}</a>
    <p>{story.deck}</p><span>{story.readingMinutes} 分鐘閱讀</span>
  </article>)}</div>;
}

export function ReaderShelf({stories,reader,onOpen}) {
  const items=recommendations(stories,reader.preferences);
  return <section className="wis-reader-shelf" aria-label="你的閱讀偏好">
    <div className="wis-reader-toolbar"><p>{items.length?'照你的喜歡，接著讀':'遇到喜歡的故事，按個愛心。'}</p><button className="ms-outline" onClick={()=>reader.setPanel({kind:'settings'})}>偏好與收藏{reader.preferences.likedIds.length?` · ${reader.preferences.likedIds.length}`:''}</button></div>
    {items.length>0 && <DataComponent id="reader-home-recommendations" queryId="cityStories" title="為你推薦" kind="custom" sourceRows={items.map(i=>i.story)} displayRows={items.map(i=>i.story)} variant="plain"><RecommendationCards items={items} onOpen={onOpen}/></DataComponent>}
    <p className="wis-reader-note">愛心與偏好只存在這個瀏覽器。{!reader.preferences.enabled?' 個人推薦已關閉。':''}</p>
    {reader.storageError && <p role="status">瀏覽器無法保存偏好，這次閱讀仍可使用；關閉後可能不會保留。</p>}
  </section>;
}

export function ReaderDialog({stories,reader,onOpen}) {
  const [artist,setArtist]=useState('');
  const settings=reader.panel?.kind==='settings';
  const seed=stories.find(s=>s.id===reader.panel?.seedId);
  const items=recommendations(stories,reader.preferences,{seedId:seed?.id});
  function open(id){reader.setPanel(null);onOpen(id);}
  function addArtist(event){event.preventDefault();if(artist.trim()){reader.save({...reader.preferences,artists:[...reader.preferences.artists,artist]});setArtist('');}}
  return <Dialog open={!!reader.panel} onClose={()=>reader.setPanel(null)} title={settings?'偏好與收藏':'你可能也會喜歡'}><div className="wis-reader-dialog">{settings ? <>
        <p>挑幾個想讀的主題，也可以直接在文章按愛心。不需要登入。</p>
        <Switch label="啟用個人推薦" checked={reader.preferences.enabled} onChange={enabled=>reader.save({...reader.preferences,enabled})}/>
        <div className="wis-reader-topics" aria-label="想讀的主題">{INTERESTS.map(topic=><button key={topic} aria-pressed={reader.preferences.topics.includes(topic)} onClick={()=>reader.save({...reader.preferences,topics:reader.preferences.topics.includes(topic)?reader.preferences.topics.filter(t=>t!==topic):[...reader.preferences.topics,topic]})}>{topic}</button>)}</div>
        <form onSubmit={addArtist}><label htmlFor="wis-reader-artist">喜歡的歌手、團體或製作人</label><div className="wis-reader-artist-input"><input id="wis-reader-artist" value={artist} maxLength={120} placeholder="例如 Björk、坂本龍一" onChange={e=>setArtist(e.target.value)}/><button type="submit" disabled={!artist.trim()}>加入</button></div></form>
        <div className="wis-reader-topics">{reader.preferences.artists.map(name=><button key={name} aria-label={`移除偏好：${name}`} onClick={()=>reader.save({...reader.preferences,artists:reader.preferences.artists.filter(a=>a!==name)})}>{name} ×</button>)}</div>
        <h3>喜歡的文章</h3>
        <div className="wis-reader-saved">{stories.filter(s=>reader.preferences.likedIds.includes(s.id)).map(s=><div key={s.id}><button onClick={()=>open(s.id)}>{s.title}</button><HeartButton story={s} reader={reader}/></div>)}</div>
        {!reader.preferences.likedIds.length&&<p>還沒有收藏。按下文章旁的愛心，就會收在這裡。</p>}
        <p className="wis-reader-note">只使用你主動選擇的偏好；不記錄閱讀歷史、不連結 YouTube 帳號，也不會上傳收藏。</p>
        {reader.storageError&&<p role="status">目前無法保存到瀏覽器，偏好僅在這次閱讀有效。</p>}
        <button className="wis-reader-clear" onClick={reader.clear}>清除所有偏好與愛心</button>
      </> : <>
        <p className="wis-reader-liked">♥ 已喜歡〈{seed?.title}〉</p>
        {items.length>0 ? <DataComponent id="reader-liked-recommendations" queryId="cityStories" title="接著讀這幾篇" kind="custom" sourceRows={items.map(i=>i.story)} displayRows={items.map(i=>i.story)} variant="plain"><RecommendationCards items={items} onOpen={open}/></DataComponent> : <p>目前的文章都已收進喜歡清單。新文章發布後，會再找適合你的內容。</p>}
        <p className="wis-reader-note">依主題與音樂人配對；不同主題的文章會標示為試讀。</p>
        <button className="wis-reader-clear" onClick={()=>reader.setPanel({kind:'settings'})}>調整我的閱讀偏好</button>
      </>}
    </div>
  </Dialog>;
}
