import webAssets from '../assets/web-assets.json';
import { StoryHome, AboutStories } from './StoryHome.jsx';
import './walk-into-sound.css';
import { platformCopy, chartLabel, sourceNote } from './platform-copy.js';
import React, { useEffect, useState } from 'react';
import { DataComponent, EvidenceChart, Dropdown, Dialog, SectionHeader, SortableRegion, SortableItem, useDataApp } from '../../data-app-public.jsx';
import { latestRows, filterRows, movement, summarizeArtists, genreCounts, compareRows, comparisonPlot, entryKey, crossPlatformSongs, periodLabel, movementBasis } from './music-model.js';
import './music.css';
import './record-store.css';
const recordSky = './' + webAssets['record-sky'].path;
const recordCoral = './' + webAssets['record-coral'].path;
const recordGreen = './' + webAssets['record-green'].path;
const goodMusic = './' + webAssets['good-music'].path;
import { MusicIcon } from './MusicIcon.jsx';
import { ListenLinks } from './ListenLinks.jsx';
import { PotentialRadar, ChinaFocus } from './PotentialRadar.jsx';
import './radar.css';
import { SpotifySelection } from './SpotifySelection.jsx';
import { WeeklyReview, MusicArchive } from './WeeklyReview.jsx';

const platforms = ['全部平台', '抖音', 'QQ 音樂', 'KKBOX', 'Apple Music', 'Spotify', 'YouTube'];
const tabs = [['home', '首頁'], ['about', '關於這裡'], ['today', '今日掃描'], ['radar', '潛力雷達'], ['cities', '故事選集'], ['china', 'QQ × 抖音'], ['weekly', '本週觀察'], ['archive', '歷史回顧'], ['cross', '跨平台比較'], ['explore', '榜單明細'], ['themes', '風格與主題'], ['saved', '我的收藏'], ['sources', '資料來源']];
const marks = { '抖音': '♪', 'QQ 音樂': 'Q', KKBOX: 'K', 'Apple Music': '♫', Spotify: '◉', YouTube: '▶' };
const recordImages = [recordSky, recordCoral, recordGreen];
function Disc({ index = 0, small = false }) { if (small) return null; return <figure className={`ms-artwork ${small ? 'ms-artwork-small' : ''}`}><img src={recordImages[index % 3]} alt="" loading={small ? 'lazy' : 'eager'}/>{!small && <figcaption>示意視覺</figcaption>}</figure>; }
function Empty({ title, children }) { return <div className="ms-empty"><span aria-hidden="true">◎</span><h3>{title}</h3><p>{children}</p></div>; }
function Delta({ row }) { const d = movement(row); return <span className={`ms-delta ${d.type}`}>{d.label}</span>; }
function Link({ href, children }) { return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>; }

export function DashboardContent() {
  const { reviewedRows } = useDataApp();
  const all = reviewedRows('tracks', ['id', 'date', 'platform']);
  const scouting = reviewedRows('scouting', ['id', 'artist']);
  const research = reviewedRows('research', ['id', 'url']);
  const sources = reviewedRows('sources', ['platform']);
  const stories = reviewedRows('cityStories', ['id', 'title']);
  const [storyLens, setStoryLens] = useState('');
  const [browseRevision, setBrowseRevision] = useState(0);
  function browseStories(lens = '') { setBrowseRevision(v => v + 1); setStoryLens(lens); openCity(null); }
  const [storyId, setStoryId] = useState(() => window.location.hash.startsWith('#cities/') ? window.location.hash.split('/')[1] : null);
  function openCity(id) { setStoryId(id); setTab(id ? 'cities' : 'home'); window.history.pushState(null, '', id ? '#cities/' + id : '#home'); window.scrollTo(0, 0); }
  const issues = reviewedRows('weekly', ['id', 'publishedAt']);
  const [tab, setTab] = useState(() => window.location.hash.startsWith('#cities/') ? 'cities' : window.location.hash.startsWith('#weekly/') ? 'weekly' : tabs.some(([id]) => '#' + id === window.location.hash) ? window.location.hash.slice(1) : 'home');
  const [issueId, setIssueId] = useState(() => window.location.hash.split('/')[1] || null);
  const [archiveDate, setArchiveDate] = useState(null);
  const [archivePlatform, setArchivePlatform] = useState('全部平台');
  useEffect(() => { const handle = () => { const hash = window.location.hash.slice(1); if(hash === 'cities' || hash.startsWith('cities/')) { setStoryId(hash.split('/')[1] || null); setTab('cities'); } else if(hash.startsWith('weekly/')) { setIssueId(hash.split('/')[1]); setTab('weekly'); } else if(tabs.some(([id])=>id===hash)) setTab(hash); else if(!hash) setTab('home'); }; window.addEventListener('hashchange', handle); return () => window.removeEventListener('hashchange', handle); }, []);
  function openWeekly(id) { setIssueId(id || issues[0]?.id); setTab('weekly'); window.history.replaceState(null, '', '#weekly/' + (id || issues[0]?.id || '')); }
  function openArchive(date, p='全部平台') { setArchiveDate(date || null); setArchivePlatform(p); setTab('archive'); window.history.replaceState(null, '', '#archive'); }
  function navigate(id) { if (id === 'cities') { openCity(null); return; } setTab(id); window.history.replaceState(null, '', id === 'weekly' ? '#weekly/' + (issueId || issues[0]?.id || '') : '#' + id); }
  const [platform, setPlatform] = useState('全部平台');
  const [market, setMarket] = useState('全部市場');
  const [search, setSearch] = useState('');
  const [date, setDate] = useState('各平台最新');
  const [sort, setSort] = useState('榜單排名');
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState(null);
  const [compare, setCompare] = useState([]);
  const [saved, setSaved] = useState(() => { try { const v=JSON.parse(localStorage.getItem('dms:saved:v1') || '[]'); return Array.isArray(v)?v:[]; } catch { return []; } });
  const [storageWarning, setStorageWarning] = useState(false);
  const [playlistOpen, setPlaylistOpen] = useState(false);
  useEffect(() => { try { localStorage.setItem('dms:saved:v1', JSON.stringify(saved)); } catch { setStorageWarning(true); } }, [saved]);
  useEffect(() => { setLimit(20); }, [platform, market, search, date, sort, tab]);
  useEffect(() => { window.scrollTo(0, 0); }, [tab]);
  const current = latestRows(all);
  const dates = [...new Set(all.map(r => r.date))].sort().reverse();
  const base = date === '各平台最新' ? current : all.filter(r => r.date === date);
  const scoped = filterRows(base, { platform, market, search });
  const coverageScope = filterRows(base, { platform, market });
  const rows = [...scoped].sort((a, b) => sort === '排名上升' ? (movement(b).value ?? -999) - (movement(a).value ?? -999) : sort === '最新發行' ? (b.releaseDate || '').localeCompare(a.releaseDate || '') : a.rank - b.rank || a.platform.localeCompare(b.platform));
  const visible = tab === 'saved' ? rows.filter(r => saved.includes(r.id)) : rows;
  const groups = crossPlatformSongs(scoped);
  const intersections = groups.filter(g=>g.platformCount > 1);
  const spotlight = ['Spotify','YouTube','KKBOX','Apple Music'].map(p=>current.filter(r=>r.platform===p).sort((a,b)=>p==='YouTube' ? (b.viewsChange??-999)-(a.viewsChange??-999) : a.rank-b.rank)[0]).filter(Boolean);
  const cards = spotlight.slice(0,3);
  const risers = scoped.filter(r => movement(r).value > 0);
  const selectedHistory = selected ? all.filter(r => entryKey(r) === selected && (!['explore','saved','cross'].includes(tab) || date === '各平台最新' || r.date <= date)).sort((a, b) => a.date.localeCompare(b.date)) : [];
  const selectedRow = selectedHistory.at(-1);
  const comparison = compareRows(all, compare);
  const comparable = scoped;
  const lyricQueue = current.filter(r => r.platform === 'KKBOX' && movement(r).type === 'new').slice(0,8);
  function toggleSaved(id) { setSaved(v => v.includes(id) ? v.filter(x => x !== id) : [...v, id]); }
  function toggleCompare(id) { setCompare(v => v.includes(id) ? v.filter(x => x !== id) : v.length < 3 ? [...v, id] : v); }
  function reset() { setPlatform('全部平台'); setMarket('全部市場'); setSearch(''); setDate('各平台最新'); setSort('榜單排名'); }
  const filters = <div className="ms-filters"><label className="ms-search"><MusicIcon name="search"/><input aria-label="搜尋歌曲或歌手" placeholder="搜尋所有語言的歌曲、歌手…" value={search} onChange={e => setSearch(e.target.value)}/>{search && <button aria-label="清除搜尋" onClick={() => setSearch('')}>×</button>}</label><Dropdown label="平台" value={platform} choices={platforms} onChange={setPlatform}/><Dropdown label="榜單日期" value={date} choices={['各平台最新', ...dates]} onChange={setDate}/><button className="ms-reset" onClick={reset}>重設</button></div>;
  const crossView = (id, max=12) => <DataComponent id={id} queryId="tracks" title="同時在多個平台被聽見" kind="custom" sourceRows={scoped} displayRows={intersections.map(g=>({歌曲:g.title,歌手:g.artist,上榜平台數:g.platformCount,紀錄:g.records.map(r=>`${r.platform} / ${chartLabel(r)} / 第 ${r.rank} 名 / ${periodLabel(r)}`).join('；')}))} variant="card">
    <p className="ms-note">「3 個平台」＝同一首歌在 3 個已接入的平台有上榜紀錄。同平台的不同榜單分開保留，每個平台只計一次。這是跨平台曝光線索，不是音樂品質或爆紅機率。</p>
    <div className="ms-cross-list" data-reviewed-rows>{intersections.slice(0,max).map(g=><div className="ms-cross-row" key={g.key}><div className="ms-cross-identity"><span className="ms-platform-count">{g.platformCount}<small>個平台</small></span><div><strong>{g.title}</strong><small>{g.artist}</small><ListenLinks row={g.records[0]} all={all}/></div></div><div className="ms-cross-platforms">{['Spotify','YouTube','Apple Music','KKBOX'].map(p=><div className={g.records.some(r=>r.platform===p)?'has-record':''} key={p}><b>{marks[p]} {p}</b>{g.records.filter(r=>r.platform===p).map(r=><button key={entryKey(r)} onClick={()=>setSelected(entryKey(r))}><span>{chartLabel(r)} · 第 <strong>{r.rank}</strong> 名</span><small>{r.cadence==='weekly'?'週榜截至':r.dateBasis==='playlistUpdated'?'歌單更新':'日榜'} {r.date}</small></button>)}{!g.records.some(r=>r.platform===p)&&<small>{coverageScope.some(r=>r.platform===p)?'未在已收錄榜單找到':'此範圍尚無榜單資料'}</small>}</div>)}</div></div>)}</div>
    {!intersections.length&&<Empty title="這個範圍沒有跨平台交集">請選擇全部平台或放寬篩選。未配對也可能是歌名、藝名或版本寫法不同。</Empty>}
    <p className="ms-note">只合併標準化後歌名與完整歌手名單相同的紀錄，保留 Remix、Live 等版本字樣；不同寫法可能漏配。各平台日期、榜單長度不同，不加總名次或播放量。</p>
    {intersections.length>max&&<button className="ms-more" onClick={()=>{setTab('cross');setLimit(v=>v+30);}}>查看更多跨平台歌曲 ↓</button>}
  </DataComponent>;
  const table = (id, data) => <DataComponent id={id} queryId="tracks" title={tab === 'saved' ? '收藏的歌曲' : '歌曲與訊號'} kind="table" displayRows={data} sourceRows={data} variant="card" headerControls={<Dropdown label="排序" value={sort} choices={['榜單排名', '排名上升', '最新發行']} onChange={setSort}/>}>
    <div className="ms-number-guide"><span><b>第 1 名</b>＝這張榜的最高名次</span><span><b>↑ 上升 4 名</b>＝例如第 12 → 8 名</span><span><b>— 無前期資料</b>＝無法判斷升降</span></div>
    <p className="ms-note">{data.length} 筆上榜紀錄，同首歌曲可能出現在不同平台／榜單。Spotify 顯示官方榜單歌單順序；日期是更新日。所有歌曲語言一起顯示。</p>
    {data.length ? <><div className="ms-table-wrap"><table className="ms-table" data-reviewed-rows><thead><tr><th scope="col">原榜名次<small>越小越前面</small></th><th scope="col">歌曲 / 歌手</th><th scope="col">平台・榜單・統計期間</th><th scope="col">排名變化<small>比較基準見下方</small></th><th scope="col">走勢</th><th scope="col">收藏</th></tr></thead><tbody>{data.slice(0, limit).map((r, i) => <tr key={`${entryKey(r)}:${r.date}`}><td className="ms-rank"><small>第</small> {r.rank} <small>名</small></td><td><button className="ms-song-button" onClick={() => setSelected(entryKey(r))}><Disc title={r.title} index={i} small/><span><strong>{r.title}</strong><small>{r.artist}</small>{r.views!=null&&<small className="ms-volume">本週 {new Intl.NumberFormat('zh-TW').format(r.views)} 次觀看</small>}</span></button><ListenLinks row={r} all={all}/></td><td><span className="ms-source-label">{marks[r.platform]} {r.platform}</span><small className="ms-cell-date">{chartLabel(r)}</small><small className="ms-cell-date">{periodLabel(r)}</small></td><td><Delta row={r}/><small className="ms-cell-date">{movementBasis(r)}</small>{Number.isFinite(r.previousRank)&&<small className="ms-cell-date">第 {r.previousRank} → {r.rank} 名</small>}</td><td><input type="checkbox" aria-label={`比較 ${r.title} ${r.platform} ${chartLabel(r)}`} checked={compare.includes(entryKey(r))} disabled={!compare.includes(entryKey(r)) && compare.length >= 3} onChange={() => toggleCompare(entryKey(r))}/></td><td><button className={`ms-save ${saved.includes(r.id) ? 'is-saved' : ''}`} aria-label={`${saved.includes(r.id) ? '取消收藏' : '收藏'} ${r.title}`} aria-pressed={saved.includes(r.id)} onClick={() => toggleSaved(r.id)}><MusicIcon name="heart"/></button></td></tr>)}</tbody></table></div>{data.length > limit && <button className="ms-more" onClick={() => setLimit(v => v + 30)}>再看 {Math.min(30, data.length - limit)} 筆 ↓</button>}</> : <Empty title={tab === 'saved' ? '這個範圍還沒有收藏' : '這個範圍尚無已驗證的歌曲'}>{tab === 'saved' ? '在歌曲旁點選愛心，建立自己的觀察清單。收藏保存在目前瀏覽器。' : '可以切回全部平台，或到資料來源查看接入進度。缺資料不代表沒有趨勢。'}</Empty>}
  </DataComponent>;
  return <article className="page ms-page">
    <div className="wis-topline">
      <span className="wis-edition">MUSIC NOTES <small>聽歌，也查資料</small></span>
      <nav className="wis-nav" aria-label="網站導覽">
        <button aria-current={['home', 'cities'].includes(tab) ? 'page' : undefined} onClick={() => browseStories('')}>所有文章</button>
        <button aria-current={tab === 'about' ? 'page' : undefined} onClick={() => navigate('about')}>關於這裡</button>
        <details className="ms-nav-more"><summary>音樂探索 ↗</summary><div>{tabs.filter(([id]) => !['home','cities','about'].includes(id)).map(([id,label]) => <button key={id} aria-current={tab === id ? 'page' : undefined} onClick={e => {navigate(id);e.currentTarget.closest('details').open=false;}}>{label}</button>)}</div></details>
      </nav>
    </div>
    {!['home','cities','about'].includes(tab) && <div className="wis-secondary-banner"><span>音樂探索 / {tabs.find(([id]) => id === tab)?.[1]} · 故事之外的聆聽線索</span><button onClick={() => navigate('home')}>← 回到故事首頁</button></div>}
    {['home', 'cities'].includes(tab) && <StoryHome key={browseRevision} stories={stories} storyId={tab === 'cities' ? storyId : null} onOpen={openCity} initialLens={storyLens}/>}
    {tab === 'about' && <AboutStories onBrowse={browseStories}/>}
    {storageWarning && <p role="status" className="ms-notice">目前瀏覽器無法儲存收藏；關閉頁面後可能不保留。</p>}
    {['cross', 'explore', 'saved'].includes(tab) && filters}
    {tab === 'weekly' && <WeeklyReview all={all} key={issueId || 'latest'} issues={issues} initialIssue={issueId} onArchive={openArchive}/>}
    {tab === 'archive' && <MusicArchive key={archiveDate || 'latest'} all={all} issues={issues} initialDate={archiveDate} initialPlatform={archivePlatform} onRead={openWeekly} onExplore={(d,p)=>{setDate(d);setPlatform(p);setMarket('全部市場');setSearch('');setTab('explore');}}/>}
    {tab === 'radar' && <PotentialRadar all={all} scouting={scouting} research={research} onSelect={setSelected} onSave={toggleSaved} saved={saved}/>}
    {tab === 'china' && <><div className="ms-library-head"><div><span className="ms-kicker">QQ × DOUYIN / PRIORITY WATCH</span><h2>把耳朵，靠近新的聲音。</h2><p>抖音找傳播線索，QQ 看完整作品的後續表現。</p></div></div><ChinaFocus sources={sources} onExplore={p=>{reset();setPlatform(p);navigate('explore');}}/><button className="ms-outline" onClick={()=>navigate('radar')}>打開潛力雷達 →</button></>}
    {tab === 'today' && <>
      <header className="ms-record-intro"><div><h1>今天，先聽這幾首。</h1><p>從不同榜單，找到下一首想收藏的歌。</p></div><img className="ms-record-motto" src={goodMusic} alt="Good Music Lives Here"/></header>
      {cards.length ? <DataComponent id="daily-observations" queryId="tracks" title="本期觀察歌曲" kind="custom" displayRows={cards} sourceRows={cards} variant="plain"><div className="ms-record-grid" data-reviewed-rows>{cards.map((r,i)=><section className={`ms-record-pick ${i===0?'ms-featured-pick':''}`} key={entryKey(r)}><Disc index={i}/><div className="ms-pick-copy"><button className="ms-pick-title" onClick={()=>setSelected(entryKey(r))}>{r.title}</button><p className="ms-pick-artist">{r.artist}</p><p className="ms-pick-rank">{r.platform} · 第 {r.rank} 名</p><p className="ms-pick-date">{r.cadence==='weekly'?'週榜截至':r.dateBasis==='playlistUpdated'?'歌單更新':'榜單日期'} {r.date}</p><div className="ms-pick-actions"><ListenLinks row={r} all={all}/><button className={`ms-save ${saved.includes(r.id)?'is-saved':''}`} aria-label={`${saved.includes(r.id)?'取消收藏':'收藏'} ${r.title}`} aria-pressed={saved.includes(r.id)} onClick={()=>toggleSaved(r.id)}><MusicIcon name="heart"/></button></div></div></section>)}</div></DataComponent>:<Empty title="這個範圍沒有選曲">請清除搜尋，或在榜單明細選擇其他範圍。</Empty>}
      <p className="ms-note ms-listen-note">Spotify 優先。精確配對可開啟歌曲；未配對則搜尋歌名與歌手，另保留原平台連結。能否播放完整歌曲依平台與帳號而定。</p><div className="ms-listen-bar"><div><MusicIcon name="spotify"/><span><strong>把今天的發現，帶進 Spotify。</strong><small>每首都有聆聽入口 · 未配對曲目提供搜尋</small></span></div><button className="ms-primary" disabled={!cards.length} onClick={()=>setPlaylistOpen(true)}>Spotify 選曲 <MusicIcon name="external"/></button></div>
      <button className="ms-city-home" onClick={()=>openCity(null)}><span><small>STORY COLLECTION</small><strong>讀一篇音樂故事</strong><p>從一個地方、一件物品，走進音樂的故事。</p></span><span>走進故事 →</span></button>
      <ChinaFocus compact sources={sources} onExplore={()=>navigate('china')}/>
      <button className="ms-radar-entry" onClick={()=>navigate('radar')}><span><small>DISCOVER EARLIER</small><strong>哪些歌曲，值得提前注意？</strong></span><span>打開潛力雷達 →</span></button>
      {issues[0] && <button className="ms-weekly-ribbon" onClick={()=>openWeekly()}><MusicIcon name="record"/><span><small>本週觀察 · {issues[0].id}</small><strong>{platformCopy(issues[0].title)}</strong></span><MusicIcon name="arrow"/></button>}
      <div className="ms-edition"><span>資料截至 {dates[0]?.replaceAll('-', '.')} · 跨平台觀察 · 不限歌曲語言</span><span>圖片為風格示意，非歌曲封面</span></div>
      <details className="ms-selection-method"><summary>這幾首，怎麼選的？</summary><p>Spotify 取最新已收錄榜單的最前名次；YouTube 取觀看增幅最高者；KKBOX 取最前名次。各榜日期分開標示，排名不代表音樂品質。</p></details>
      <section className="ms-below-fold"><div className="ms-section-top"><h2>再往音樂裡走一點。</h2><button onClick={()=>navigate('explore')}>探索完整榜單 <MusicIcon name="arrow"/></button></div>
      <div className="ms-summary" data-reviewed-rows><div><small>跨平台交集</small><strong>{intersections.length}<em> 首</em></strong><span>至少在 2 個平台上榜</span></div><div><small>排名上升</small><strong>{risers.length}<em> 筆</em></strong><span>同一榜單有可比前期名次</span></div><div><small>本次比較範圍</small><strong>{scoped.length}<em> 筆</em></strong><span>上榜紀錄，同首歌可能重複</span></div><div><small>資料覆蓋</small><strong>{new Set(scoped.map(r => r.platform)).size}<em> / 6</em></strong><span>有歌曲資料的平台，不是評分</span></div></div>
      <div className="ms-coverage-strip">{['Spotify','YouTube','Apple Music','KKBOX'].map(p=>{const list=current.filter(r=>r.platform===p);const state=sources.find(s=>s.platform===p);return <button key={p} onClick={()=>{setPlatform(p);setTab('explore');}}><b>{marks[p]} {p}</b><span>{list.length} 筆 · {p==='YouTube'?'歌曲週榜':p==='Spotify'?'官方 Top 50':'日榜'}</span><small>{state?.status==='blocked'?'更新失敗・保留上次資料':p==='YouTube'?`統計截至 ${list[0]?.date}`:p==='Spotify'?`歌單更新 ${list[0]?.date}`:`日期 ${list[0]?.date}`}</small></button>})}</div>
      {crossView('today-cross-platform',6)}
      </section>
      <div className="ms-observation-banner"><MusicIcon name="record"/><div><strong>新的音樂，從抖音開始觀察</strong><p>QQ 與抖音列為優先觀察來源；目前尚無可比較的榜單資料，接入狀態與缺口可在專區查看。</p></div><button onClick={() => navigate('sources')}>查看來源狀態 ↗</button></div>
      <SortableRegion id="music:overview:charts" variant="freeform" className="ms-chart-grid">
        <SortableItem id="artist-presence" label="歌手榜單出現次數" kind="chart"><EvidenceChart id="artist-presence" queryId="tracks" title="誰的作品正在榜上出現？" variant="card" rows={summarizeArtists(scoped).slice(0,6)} sourceRows={scoped} spec={{ type: 'horizontalBar', x: '歌手', y: '榜單筆數', colors: { 榜單筆數: 'var(--chart-1)' }, stackable: false, valueDecimals: 0 }} height={240}><p className="ms-note">所選榜單中的紀錄數；不是獨立歌曲數或聽眾數。歌手名稱僅合併括號英文別名。</p></EvidenceChart></SortableItem>
        <SortableItem id="genre-composition" label="Apple Music 類型分布" kind="chart"><EvidenceChart id="genre-composition" queryId="tracks" title="Apple Music 榜單的類型分布" variant="card" rows={genreCounts(scoped.filter(r => r.platform === 'Apple Music'))} sourceRows={scoped.filter(r => r.platform === 'Apple Music')} spec={{ type: 'horizontalBar', x: '類型', y: '歌曲數', colors: { 歌曲數: 'var(--chart-2)' }, stackable: false, valueDecimals: 0 }} height={240}><p className="ms-note">Apple Music 第一個非「音樂」分類；是目前組成，不代表風格正在增長。</p></EvidenceChart></SortableItem>
      </SortableRegion>
      <div className="ms-section-top"><SectionHeader id="daily-table-heading" title="完整榜單，慢慢挖"/><button onClick={() => setTab('explore')}>探索與比較 ↗</button></div>{table('today-tracks', visible)}
    </>}
    {tab === 'cross' && <><SectionHeader id="cross-heading" title="跨平台交集，保留各自的名次"/><p className="ms-section-note">各平台收錄不同語言的歌曲；同平台有多份榜單時以 A／B 區分，名次仍各自計算。</p>{crossView('cross-platform-full',limit)}</>}
    {tab === 'explore' && <>
      <SectionHeader id="comparison-heading" title="把歌曲放在一起看"/>
      <p className="ms-section-note">勾選最多 3 筆榜單紀錄，比較同一首或不同歌曲的歷史名次。每條線保留平台與原榜識別；名次是原榜位置，不是跨平台分數。</p>
      <div className="ms-compare-picker">{compare.map(id => { const r = all.find(x => entryKey(x) === id); return r && <button key={id} onClick={() => toggleCompare(id)}>{r.title} · {r.platform} · {chartLabel(r)} ×</button>; })}{compare.length > 0 ? <button onClick={() => setCompare([])}>清除比較</button> : <button onClick={() => setCompare(comparable.filter(r => movement(r).value > 0).sort((a,b) => (movement(b).value ?? -999) - (movement(a).value ?? -999)).slice(0,3).map(entryKey))} disabled={!comparable.some(r => movement(r).value > 0)}>選入目前上升歌曲</button>}</div>
      {compare.length > 0 ? <EvidenceChart id="rank-comparison" queryId="tracks" title="各原榜名次走勢（名次越小越前）" variant="card" rows={comparisonPlot(all, compare)} sourceRows={comparison} spec={{ type: 'line', x: '日期', y: '名次', series: '歌曲', stackable: false, valueDecimals: 0 }} height={300}><p className="ms-note">比較清單保留全部已取得歷史，獨立於下方篩選。日榜與週榜各依原始日期繪圖；單點表示只有一期，斷線表示缺資料。不同榜單名次不等於相同播放量。</p></EvidenceChart> : <Empty title="選幾首歌，看看它們的路徑">有持續的排名變化，才有判斷升溫的依據。</Empty>}
      <div className="ms-table-section">{table('explore-tracks', visible)}</div>
    </>}
    {tab === 'saved' && <><SectionHeader id="saved-heading" title="留給下一次聆聽"/><p className="ms-section-note">收藏保存在這台裝置的瀏覽器；只在目前資料與篩選範圍內顯示，不會傳到 GitHub。</p>{table('saved-tracks', visible)}</>}
    {tab === 'themes' && <>
      <SectionHeader id="themes-heading" title="聲音、歌詞，和正在改變的情緒"/>
      <p className="ms-section-note">從榜單找到線索，再靠實際聆聽與歌詞閱讀驗證。這裡不把歌名當成主題證據。</p>
      <div className="ms-research-grid">{[{n:'01',t:'風格萌芽',d:'觀察節奏、音色、唱法與編曲，是否出現在多位不同歌手的新作中。',tag:'待音訊分析'},{n:'02',t:'歌詞主題',d:'閱讀可取得的歌詞，分析生活情境、敘事視角與意象，附上原文來源。',tag:'待歌詞驗證'},{n:'03',t:'潛力歌手',d:'比較歌手自己的歷史表現、多首作品與跨平台擴散，而不是只看某首副歌。',tag:'待累積證據'}].map(x => <div className="ms-research-card" key={x.n}><span>{x.n}</span><h3>{x.t}</h3><p>{x.d}</p><b>{x.tag}</b></div>)}</div>
      <DataComponent id="lyric-reading-queue" queryId="tracks" title="歌詞閱讀候選清單" variant="card" displayRows={lyricQueue} sourceRows={lyricQueue} kind="custom"><p className="ms-note">依本期新進榜建立；尚未取得歌詞，不提供主題結論。</p><div className="ms-reading-list" data-reviewed-rows>{lyricQueue.map(r => <div key={r.id}><div><strong>{r.title}</strong><small>{r.artist}</small></div><span>待閱讀</span><ListenLinks row={r} all={all}/></div>)}</div></DataComponent>
      <details className="ms-method"><summary>怎麼判斷「值得提前注意」？</summary><p>先記錄第一次發現日期，再追蹤是否持續上升、有不同創作者採用、跨平台出現，以及歌手其他作品是否獲得關注。沒有足夠資料時保留待驗證，不產生虛構的潛力分數。</p><p>抖音推薦頁只作為觀察樣本；翻唱、加速版、DJ 版分開辨識。編輯推薦與聽眾熱度分開記錄。</p></details>
    </>}
    {tab === 'sources' && <>
      <SectionHeader id="sources-heading" title="每一個發現，都有出處"/><p className="ms-section-note">「網站可讀」和「本次歌曲資料已取得」是兩回事。</p>
      <DataComponent id="source-health" queryId="sources" title="六個來源的接入狀態" kind="custom" displayRows={sources} sourceRows={sources} variant="plain"><div className="ms-sources" data-reviewed-rows>{sources.map(s => <div className="ms-source-card" key={s.platform}><div className="ms-source-head"><div className={`ms-platform-icon platform-${s.status}`}>{marks[s.platform]}</div><div><h3>{s.platform}</h3></div><span className={`ms-status ${s.status}`}>{s.label}</span></div><p>{sourceNote(s)}</p><div className="ms-source-foot"><span>{current.filter(r => r.platform === s.platform).length ? `${current.filter(r => r.platform === s.platform).length} 筆最新榜單紀錄` : '尚無本次歌曲資料'}</span><Link href={s.url}>開啟來源 ↗</Link></div></div>)}</div></DataComponent>
      <details className="ms-method" open><summary>更新方式與資料邊界</summary><p>先擷取並驗證資料，保留歷史快照，再提交 GitHub，由 GitHub Pages 發布網站。</p><p>擷取器支援 KKBOX、Apple Music、Spotify 官方榜單歌單與 YouTube 官方歌曲週榜。抖音與 QQ 音樂待接入；榜單擷取目前未排程，與每日文章發布分開處理。失敗時保留上次成功資料與失敗標記。</p><p>YouTube 提供每週觀看次數及週變化；Spotify 公開歌單未提供播放量。不同平台的計數不加總。歌曲語言尚未逐首驗證，不依歌名或歌手推測；各平台收錄不同語言，KKBOX 目前為華語榜。</p></details>
    </>}
    <footer className="ms-footer"><span>音樂故事、聆聽筆記 <i>·</i> {stories.length} 篇文章</span><button onClick={() => navigate('sources')}>來源與更新說明 ↗</button></footer>
    <SpotifySelection open={playlistOpen} onClose={()=>setPlaylistOpen(false)} cards={cards} all={all}/>
    <Dialog open={!!selectedRow} onClose={() => setSelected(null)} title={selectedRow?.title || '歌曲觀察'} expanded>
      {selectedRow && <div className="ms-detail"><div className="ms-detail-head"><Disc title={selectedRow.title}/><div><span className="ms-source-label">{selectedRow.platform} · {chartLabel(selectedRow)}</span><h2>{selectedRow.title}</h2><p>{selectedRow.artist}</p><span>原榜第 {selectedRow.rank} 名 · {periodLabel(selectedRow)} <Delta row={selectedRow}/></span><div className="ms-detail-actions"><ListenLinks row={selectedRow} all={all}/><button onClick={() => toggleSaved(selectedRow.id)}>{saved.includes(selectedRow.id) ? '已收藏' : '加入收藏'}</button></div></div></div>
        {selectedHistory.length > 1 ? <EvidenceChart id="song-rank-history" queryId="tracks" title="歷史名次數字（越低越前）" rows={comparisonPlot(all, [entryKey(selectedRow)])} sourceRows={selectedHistory} spec={{type:'line',x:'日期',y:'名次',stackable:false,valueDecimals:0}} height={220}/> : <p className="ms-notice">目前只有一個日期，尚不足以判斷增長。</p>}
        <div className="ms-detail-facts">{selectedRow.views!=null&&<><div><small>本週觀看次數</small><strong>{new Intl.NumberFormat('zh-TW').format(selectedRow.views)} 次</strong></div><div><small>觀看次數較上週</small><strong>{Number.isFinite(selectedRow.viewsChange)?`${selectedRow.viewsChange>=0?'+':''}${(selectedRow.viewsChange*100).toFixed(1)}%`:'未提供'}</strong></div></>}<div><small>發行日期</small><strong>{selectedRow.releaseDate || '未提供'}</strong></div><div><small>來源分類</small><strong>{platformCopy(selectedRow.genre)}</strong></div><div><small>歌詞閱讀</small><strong>尚未驗證</strong></div><div><small>潛力判斷</small><strong>證據不足，持續觀察</strong></div></div><p className="ms-note">折線顯示的是名次数字：例如從 6 降到 4，表示名次上升 2 名。此頁依所選榜單日期顯示紀錄；選擇「各平台最新」時顯示最新一期。榜單上升不代表即將爆紅。</p><Link href={selectedRow.sourceUrl}>查看原始榜單 ↗</Link>
      </div>}
    </Dialog>
  </article>;
}
