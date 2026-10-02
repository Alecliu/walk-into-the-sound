import { platformCopy, chartLabel } from './platform-copy.js';
import React, {useState} from 'react';
import {DataComponent, Dropdown, EvidenceChart} from '../../data-app-public.jsx';
import {radarSignals,radarArtists,chartCoverage} from './radar-model.js';
import {ListenLinks} from './ListenLinks.jsx';
import {latestRows,genreCounts,entryKey} from './music-model.js';

export function ChinaFocus({sources,onExplore,compact=false}) {
  const priority=sources.filter(s=>['QQ 音樂','抖音'].includes(s.platform));
  return <DataComponent id={compact?'china-priority-home':'china-priority-detail'} queryId="sources" title="QQ × 抖音 · 優先觀察" sourceRows={priority} displayRows={priority} kind="custom" variant="plain">
    <div className="ms-priority-grid" data-reviewed-rows>{priority.map(s=><section key={s.platform}>
      <span className="ms-kicker">{s.platform==='抖音'?'SHORT VIDEO / DISCOVERY':'STREAMING / VALIDATION'}</span><h3>{s.platform}</h3>
      <p>{s.platform==='抖音'?'先找被不同創作者採用的聲音。分開記錄原曲、翻唱、加速版與 DJ 版。':'追蹤歌曲是否從飆升訊號延續到收聽熱度，特別留意原創作品與歌手的第二首歌。'}</p>
      <b className="ms-priority-status">{s.label}</b><p className="ms-note">{s.note}</p>
      <div className="ms-radar-actions"><a href={s.url} target="_blank" rel="noopener noreferrer">開啟官方來源 ↗</a><button onClick={()=>onExplore(s.platform)}>{compact?'查看接入狀態':'查看已收錄資料'}</button></div>
    </section>)}</div>
    {!compact&&<p className="ms-notice">接入目標：QQ 歌曲 ID、榜單日期與名次；抖音音源 ID、每日新增使用影片、獨立創作者及連續快照。資料未取得前保留空缺，推薦頁、個別影片按讚數與名稱含「熱歌榜」的歌單均不當作全站歌曲榜。</p>}
  </DataComponent>;
}

export function PotentialRadar({all,research,scouting=[],onSelect,onSave,saved}) {
  const [view,setView]=useState('歌曲');
  const [platform,setPlatform]=useState('全部平台');
  const [kind,setKind]=useState('全部訊號');
  const [limit,setLimit]=useState(12);
  const coverage=chartCoverage(all);
  const signals=radarSignals(all).filter(r=>(platform==='全部平台'||r.platform===platform)&&(kind==='全部訊號'||r.kind===kind));
  const artists=radarArtists(signals);
  const profiles=scouting.filter(p=>artists.some(a=>a.artist===p.artist));
  const apple=latestRows(all).filter(r=>r.platform==='Apple Music');
  return <section className="ms-radar">
    <div className="ms-library-head"><div><span className="ms-kicker">SCOUTING / NEXT 28 DAYS</span><h2>在更多人聽見之前。</h2><p>從歌曲升溫找到人，再驗證作品、風格與合作可能。</p></div><span className="ms-radar-stage">觀察版 · 尚未訓練預測模型</span></div>
    <p className="ms-notice">目前列出已收錄期間的上升線索。榜單僅有 {Math.min(...coverage.map(c=>c.periods))}～{Math.max(...coverage.map(c=>c.periods))} 個日期，沒有完整的 28 天後驗證資料，因此不顯示爆紅機率或「超級新人」認證。</p>
    <div className="ms-radar-tabs" role="group" aria-label="潛力觀察類別">{['歌曲','歌手','樂風','預測方法'].map(t=><button key={t} aria-pressed={view===t} onClick={()=>{setView(t);setLimit(12);}}>{t}</button>)}</div>
    {['歌曲','歌手'].includes(view)&&<><div className="ms-library-tools"><Dropdown label="雷達平台" value={platform} choices={['全部平台','QQ 音樂','抖音','KKBOX','Spotify','YouTube','Apple Music']} onChange={v=>{setPlatform(v);setLimit(12);}}/><Dropdown label="訊號類型" value={kind} choices={['全部訊號','連續上升','單期上升','來源標記新進榜']} onChange={v=>{setKind(v);setLimit(12);}}/><span className="ms-note">本區獨立篩選 · {signals.length} 筆訊號</span></div>
      <p className="ms-note">先列連續兩期上升，再列單期上升與新進榜；同類依日期、原榜名次排序，不是潛力分數。各來源日期不同，請以卡片期間為準。首次收錄日期不代表出道日。</p></>}
    {view==='歌曲'&&<DataComponent id="potential-song-signals" queryId="tracks" title="值得再聽一次的歌曲" sourceRows={all.filter(r=>signals.some(s=>entryKey(s)===entryKey(r)))} displayRows={signals} kind="custom" variant="plain"><div className="ms-radar-grid" data-reviewed-rows>{signals.slice(0,limit).map(r=><section className="ms-radar-card" key={entryKey(r)}><span className="ms-signal-label">{r.kind}</span><h3><button onClick={()=>onSelect(entryKey(r))}>{r.title}</button></h3><p>{r.artist}</p><p className="ms-radar-evidence">{r.evidence}</p><small>{r.platform} · {chartLabel(r)}<br/>收錄 {r.historyCount} 期 · 本期 {r.date}</small><ListenLinks row={r} all={all}/><button className="ms-radar-save" onClick={()=>onSave(r.id)} aria-pressed={saved.includes(r.id)}>{saved.includes(r.id)?'已加入觀察收藏':'加入觀察收藏'}</button></section>)}</div>{!signals.length&&<div className="ms-empty"><h3>這個範圍尚無可驗證訊號</h3><p>QQ／抖音仍缺榜單快照；其他來源也可能沒有可比前期。這不代表沒有值得發掘的歌曲。</p></div>}{signals.length>limit&&<button className="ms-more" onClick={()=>setLimit(n=>n+12)}>再看 12 筆</button>}</DataComponent>}
    {view==='歌手'&&<><p className="ms-notice">這是歌曲訊號所涉及的歌手／合作署名，包含已成名歌手。新人篩選尚缺完整出道作品、歷史受眾規模與合約資料；目前沒有已查證可簽約的超級新人。</p><DataComponent id="scouting-reviewed-profiles" queryId="scouting" title="已查證的合作研究案例" sourceRows={profiles} displayRows={profiles} kind="custom" variant="plain"><div className="ms-priority-grid" data-reviewed-rows>{profiles.map(p=><section key={p.id}><span className="ms-kicker">{p.status}</span><h3>{p.artist}</h3><p>{p.note}</p><a href={p.url} target="_blank" rel="noopener noreferrer">官方公告 · 查閱 {p.reviewedAt} ↗</a></section>)}</div>{!profiles.length&&<p className="ms-note">此篩選範圍尚無已完成公開資料查證的歌手。</p>}</DataComponent><DataComponent id="potential-artist-signals" queryId="tracks" title="從作品追蹤歌手" sourceRows={all.filter(r=>signals.some(s=>entryKey(s)===entryKey(r)))} displayRows={artists.map(a=>({歌手:a.artist,訊號歌曲數:a.songCount,平台:a.platforms,查證:scouting.find(p=>p.artist===a.artist)?.status||a.newcomerStatus}))} kind="custom" variant="plain"><div className="ms-radar-grid" data-reviewed-rows>{artists.slice(0,limit).map(a=><section className="ms-radar-card" key={a.artist}><h3>{a.artist}</h3><b>{a.songCount} 首作品有訊號</b><p>{a.platforms}</p><small>{scouting.find(p=>p.artist===a.artist)?.status||a.newcomerStatus}</small><p>{a.records[0].title}</p><ListenLinks row={a.records[0]} all={all}/><button className="ms-radar-save" onClick={()=>onSelect(entryKey(a.records[0]))}>查看代表作品依據</button></section>)}</div>{!artists.length&&<p className="ms-empty">此範圍沒有足夠歌曲訊號。</p>}{artists.length>limit&&<button className="ms-more" onClick={()=>setLimit(n=>n+12)}>再看 12 位</button>}</DataComponent><div className="ms-method"><h3>進入合作研究名單前</h3><p>核對本人及作品署名、原創／翻唱與權利歸屬、至少兩首作品的持續表現、實際現場能力、已簽約狀態與公開商務窗口。先安排聆聽與作品研究；名次或模型分數不直接決定簽約。</p></div></>}
    {view==='樂風'&&<><h3>先分清「現在多」與「正在長」</h3><p>目前只有 Apple Music 的粗略類型標籤，沒有足夠連續週次與經人工確認的細分曲風，尚不能指出哪種風格即將流行。</p><EvidenceChart id="radar-genre-composition" queryId="tracks" title="現有 Apple Music 榜單類型" rows={genreCounts(apple)} sourceRows={apple} spec={{type:'horizontalBar',x:'類型',y:'歌曲數',stackable:false,valueDecimals:0}} height={280} variant="card"/><div className="ms-priority-grid"><section><h3>曲風擴散的觀察方法</h3><p>每週統計同一來源、同一候選池中，各風格的獨立作品占比與獨立歌手數。觀察份額變化、連續增長及新歌手加入，避免把單一明星整張專輯誤當成風格流行。</p></section><section><h3>抖音先發現，QQ 再驗證</h3><p>先標註節奏、音色、唱法與使用情境，再檢查是否由多位互不相關的創作者採用、是否延伸到完整歌曲收聽。這是待驗證假設，目前未測得跨平台轉換率。</p></section></div></>}
    {view==='預測方法'&&<>
      <div className="ms-method"><h3>建議模型：LightGBM + 時序特徵 + 機率校準</h3><p>以「今天以前的 7／14／28 天訊號」預測未來 28 天是否持續突破。先以邏輯斯迴歸和目前名次作基準，再測試 LightGBM 是否真的增加提前發現的能力。這是本專案的模型方案，尚未訓練或回測。</p><ol><li>歌曲：以同一平台與原始榜單為單位。候選今天不在 Top 20；未來 28 天內至少兩個相隔 7 天的觀測日進入 Top 20，定義為持續突破。</li><li>歌手：先人工確認新興身分，再看多首作品、自然受眾增長及合作可行性。歌手模型與歌曲模型分開驗證。</li><li>樂風：用固定標籤與固定來源的每週作品占比、獨立歌手數，建立獨立預測；未分類項目保留，不把它們算成零。</li></ol><p>重點特徵：近期速度、加速度、連續增長、不同創作者採用、跨平台出現時間差、其他作品表現。缺值保留；名次、播放數與影片使用數各自計算，不能混成播放總量。</p></div>
      <div className="ms-priority-grid"><section><h3>如何知道它有用？</h3><p>按時間滾動回測，訓練與測試之間留出 28 天結果窗；另測試從未見過的歌手。比較前 10 名命中率、召回率、PR-AUC、提前發現天數，再以獨立期間校準機率。未上榜者與失敗案例也要收錄。</p></section><section><h3>什麼時候才能顯示機率？</h3><p>先累積跨多個發行週期且包含成功、未突破的完整樣本，取得 28 天後的結果，並在保留期間優於簡單基準。資料天數本身不保證模型可用；目前機率、命中率與預測置信度均未產生。</p></section></div>
      <DataComponent id="radar-history-readiness" queryId="tracks" title="目前各榜歷史覆蓋" sourceRows={all} displayRows={coverage} kind="table" variant="card"><div className="ms-table-wrap"><table className="ms-table" data-reviewed-rows><thead><tr><th>平台</th><th>榜單</th><th>已保存日期數</th><th>期間</th></tr></thead><tbody>{coverage.map(c=><tr key={c.platform+c.market+c.chart}><td>{c.platform}</td><td>{chartLabel(c)}</td><td>{c.periods}</td><td>{c.start} ～ {c.end}</td></tr>)}</tbody></table></div></DataComponent>
      <DataComponent id="radar-research" queryId="research" title="演算法研究依據" sourceRows={research} displayRows={research} kind="custom" variant="plain"><div className="ms-research-references" data-reviewed-rows>{research.map(r=><p key={r.id}><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title} ↗</a><br/><small>{r.note}</small></p>)}</div></DataComponent>
    </>}
  </section>;
}
