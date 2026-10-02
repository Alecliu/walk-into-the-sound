import { latestRows, songKey } from './music-model.js';

export function weekKey(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const year = d.getUTCFullYear();
  return `${year}-W${String(Math.ceil(((d - new Date(Date.UTC(year, 0, 1))) / 86400000 + 1) / 7)).padStart(2, '0')}`;
}
export function weekRange(date) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() || 7) - 1));
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 6);
  return [start, d.toISOString().slice(0, 10)];
}
export const pct = n => n == null ? '資料不足' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(1)}%`;
const sum = rows => rows.reduce((s, r) => s + r.views, 0);
const median = values => { const a = [...values].sort((a,b)=>a-b); return a.length ? (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2 : null; };
export function chartPair(rows, platform, market, minimumDays = 1) {
  const pool = rows.filter(r=>r.platform===platform&&r.market===market);
  const dates = [...new Set(pool.map(r=>r.date))].sort();
  const end = dates.at(-1);
  const prior = dates.filter(d=>(new Date(end)-new Date(d))/86400000 >= minimumDays).at(-1);
  return { current:pool.filter(r=>r.date===end), previous:pool.filter(r=>r.date===prior), end, prior };
}
export function pairedStats(current, previous) {
  const prev = new Map(previous.map(r=>[r.id,r]));
  const pairs = current.filter(r=>prev.has(r.id)).map(r=>({current:r,previous:prev.get(r.id)}));
  const viewed = pairs.filter(p=>Number.isFinite(p.current.views)&&p.previous.views>0);
  const growth = viewed.map(p=>p.current.views/p.previous.views-1);
  const totalBefore = viewed.reduce((s,p)=>s+p.previous.views,0);
  return { pairs, retained:pairs.length, entered:previous.length?current.length-pairs.length:null,
    medianGrowth:median(growth), viewedCount:viewed.length,
    cohortGrowth:totalBefore?viewed.reduce((s,p)=>s+p.current.views,0)/totalBefore-1:null };
}
function coverage(rows) {
  const groups = new Map();
  for(const r of latestRows(rows)) { const k=[r.platform,r.market,r.chart].join('|'); if(!groups.has(k)) groups.set(k,{platform:r.platform,market:r.market,chart:r.chart,date:r.date,periodStart:r.periodStart||null,dateBasis:r.dateBasis,count:0,url:r.sourceUrl});groups.get(k).count++; }
  return [...groups.values()];
}
export function makeWeeklyIssue(rows, asOf) {
  const evidence = rows.filter(r=>r.date<=asOf && (!r.observedAt || r.observedAt.slice(0,10)<=asOf));
  if (!evidence.length) throw Error('No evidence available by publication cutoff');
  const [weekStart, weekEnd] = weekRange(asOf);
  const kkPool=evidence.filter(r=>r.platform==='KKBOX'&&r.market==='台灣');
  const kkEnd=kkPool.map(r=>r.date).sort().at(-1);
  const kkStart=kkEnd?new Date(new Date(`${kkEnd}T00:00:00Z`)-6*86400000).toISOString().slice(0,10):null;
  const kk=kkPool.filter(r=>r.date>=kkStart);
  const kkDates=[...new Set(kk.map(r=>r.date))].sort();
  const end=kk.filter(r=>r.date===kkEnd), start=kk.filter(r=>r.date===kkDates[0]);
  const ks=kkDates.length>1?pairedStats(end,start):null;
  const artistMap=new Map();
  for (const r of end) { const a=r.artists?.join('、')||r.artist; if(a==='Various Artists')continue; artistMap.set(a,(artistMap.get(a)||0)+1); }
  const artists=[...artistMap].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const lead=artists[0];
  const seats=lead?kkDates.map(d=>({日期:d,榜單席次:kk.filter(r=>r.date===d&&(r.artists?.join('、')||r.artist)===lead[0]).length})):[];
  const yt=chartPair(evidence,'YouTube','全球',7);
  const adjacent=yt.prior && (new Date(yt.end)-new Date(yt.prior))/86400000===7;
  const ys=pairedStats(yt.current,adjacent?yt.previous:[]);
  const share=a=>a.length && a.every(r=>Number.isFinite(r.views))&&sum(a)>0?sum(a.filter(r=>r.rank<=10))/sum(a):null;
  const globalShares=[...(adjacent?[{日期:yt.prior,'Top 10 觀看占比 (%)':share(yt.previous)*100}]:[]),...(share(yt.current)!=null?[{日期:yt.end,'Top 10 觀看占比 (%)':share(yt.current)*100}]:[])];
  const latest=latestRows(evidence);
  const sp=latest.filter(r=>r.platform==='Spotify'&&r.market==='全球'&&r.rank<=50);
  const y50=yt.current.filter(r=>r.rank<=50), sm=new Map(sp.map(r=>[songKey(r),r]));
  const matches=y50.filter(r=>sm.has(songKey(r))).map(r=>({title:r.title,artist:r.artist,spotifyRank:sm.get(songKey(r)).rank,youtubeRank:r.rank,spotifyDate:sm.get(songKey(r)).date,youtubeDate:r.date,url:r.url}));
  const movers=ys.pairs.filter(p=>p.previous.views>0).map(p=>({...p.current,priorViews:p.previous.views,calculatedGrowth:p.current.views/p.previous.views-1})).sort((a,b)=>b.calculatedGrowth-a.calculatedGrowth);
  const fresh=movers.filter(r=>r.weeksOnChart<=4&&r.calculatedGrowth>0).slice(0,3);
  const mandarinText=end.length ? `華語榜最明確的訊號，是作品在榜單中的集中程度。${lead?`${lead[0]} 在 ${kkEnd} 的 KKBOX 台灣華語 Top ${end.length} 占 ${lead[1]} 席（${(lead[1]/end.length*100).toFixed(1)}%）；${seats.length>1?`觀察窗起點 ${kkDates[0]} 為 ${seats[0].榜單席次} 席。`:'目前只有一期。'}`:''}${ks?`相較 ${kkDates[0]}，${ks.retained} 首留在榜內、${ks.entered} 首出現在期末榜單但不在期初榜單。這些是兩個端點的差異，不能當成發行新歌數。`:''}` : '本期沒有足夠的華語榜資料。';
  const globalText=adjacent&&ys.viewedCount ? `YouTube 全球 Top 100 在 ${yt.prior} 與 ${yt.end} 兩期，共有 ${ys.viewedCount} 首歌曲持續在榜且有可比觀看數。這一固定歌曲群的觀看總數變化為 ${pct(ys.cohortGrowth)}，逐首增幅中位數為 ${pct(ys.medianGrowth)}。前者受大流量歌曲影響較大，後者描述中間那首歌曲的變化；兩者一起看，才能分辨少數強勢作品與較廣泛的變動。` : '尚未取得相鄰兩週完整榜單，不能計算全球週增長。';
  const title=lead?`華語榜的作品集中，與全球歌曲的熱度分化`:'從榜單變化，建立本週音樂觀察';
  return { id:weekKey(asOf),title,publishedAt:asOf,weekStart,weekEnd,asOf,tags:['華語','全球','跨平台'],
    summary:`以 KKBOX 華語榜、YouTube 全球週榜及 Spotify 全球 Top 50，觀察作品集中、觀看變化與平台交集。`,
    coverage:coverage(evidence),evidence,metrics:{kkDays:kkDates.length,kkStart:kkDates[0]||null,kkEnd,kkCount:end.length,kkLead:lead?.[0]||null,kkSeats:lead?.[1]??null,kkRetained:ks?.retained??null,kkEntered:ks?.entered??null,ytEnd:yt.end||null,ytPrior:adjacent?yt.prior:null,cohortCount:ys.viewedCount,cohortGrowth:ys.cohortGrowth,medianGrowth:ys.medianGrowth,globalMatches:matches.length,spotifyCount:sp.length,youtubeCount:y50.length},
    mandarinText,globalText,artistSeats:seats,globalShares,matches,candidates:fresh,
    mandarinInterpretation:'榜單席次是作品可見度，不是播放市占率。若同一歌手多首作品一起進榜，應先檢查是否為作品集中發行造成；這還不能證明新的音樂風格正在擴散。華語範圍目前限 KKBOX 台灣華語榜，不能代表全部華語市場；台灣其他平台榜也不等於華語榜。',
    globalInterpretation:'固定在榜群排除了新進與跌出歌曲，因此可能有存活偏差；不能把它稱為全球音樂總需求。Top 10 觀看占比只以同一期 Top 100 為分母，觀察榜內熱度是否集中。全球榜混合不同語言，但平台使用者分布與榜單規則會影響結果。',
    methods:[
      '描述性探索分析：使用官方榜單快照、固定比較範圍、保留零值與缺值差異；未做因果推斷或爆紅機率估計。',
      '華語觀察窗：最新 KKBOX 榜單日往前 6 天；只比較真實取得的日期。期末未見於期初的歌曲可能是新進榜或重新進榜，不等於新發行。',
      '全球週變化：僅使用相隔 7 天的 YouTube 全球歌曲週榜。同歌前期觀看數大於 0 才計算增幅＝本期／前期−1；固定群總量增幅＝本期觀看總和／前期觀看總和−1。',
      '集中度＝本期前 10 名歌曲觀看總和／本期 Top 100 觀看總和。這是榜內占比，不是全平台市占。',
      '跨平台比較：Spotify 與 YouTube 都取全球前 50 名，按標準化歌名＋完整歌手名單保守配對；日期分別標示，不能解讀成同週同步擴散。',
      '觀察候選：從兩週可比、YouTube 在榜不超過 4 週且觀看成長為正的歌曲，選增幅最高的 3 首；4 週是編輯篩選門檻，未經預測效能校驗，也不表示歌手是新人。',
      '不報顯著性或信賴區間：榜單是截斷後的觀察集合，並非所有聽眾的隨機樣本；歷史太短，無法推估季節性或可靠的爆紅模型。',
      '歌詞與音樂風格：本期尚無實際歌詞閱讀與音訊標註，不從歌名推測主題，也不將作品的榜單表現直接歸因於曲風。'
    ],references:[
      {title:'NIST：探索性資料分析的方法',url:'https://itl.nist.gov/div898/handbook/eda/section1/eda11.htm'},
      {title:'NIST：相關性不代表因果',url:'https://www.nist.gov/glossary-term/21291'},
      {title:'YouTube：官方榜單與觀看計數定義',url:'https://support.google.com/youtube/answer/9014376?hl=en'}
    ],nextWeek:'下一期先驗證：華語榜集中出現的作品能否維持席次；全球成長候選是否連續上升並在另一平台出現；若要判斷曲風，需先聆聽多位不同歌手的作品，建立一致的節奏、音色與編曲標註，再比較數週的占比。'};
}
export function archiveDates(rows, month='全部月份', platform='全部平台') {
  const scoped=rows.filter(r=>(month==='全部月份'||r.date.startsWith(month))&&(platform==='全部平台'||r.platform===platform));
  return [...new Set(scoped.map(r=>r.date))].sort().reverse().map(date=>({date,count:scoped.filter(r=>r.date===date).length,platforms:[...new Set(scoped.filter(r=>r.date===date).map(r=>r.platform))]}));
}
