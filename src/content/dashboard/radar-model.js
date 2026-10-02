import {latestRows,entryKey,songKey} from './music-model.js';
const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
const chartKey=r=>[r.platform,r.market,r.chart].join('|');

// Descriptive evidence only. No fitted model, probability or invented cross-source volume.
export function radarSignals(all,asOf) {
  const eligible=all.filter(r=>!asOf||r.date<=asOf);
  return latestRows(eligible).flatMap(row=>{
    const chart=eligible.filter(r=>chartKey(r)===chartKey(row));
    const chartDates=[...new Set(chart.map(r=>r.date))].sort();
    const dates=chartDates.slice(-3);
    const recent=dates.map(d=>chart.find(r=>r.id===row.id&&r.date===d));
    const expected=row.cadence==='daily'?1:row.cadence==='weekly'?7:null;
    const continuous=expected!==null&&recent.length===3&&recent.every(Boolean)&&dates.every((d,i)=>i===0||day(d)-day(dates[i-1])===expected);
    const sustained=continuous&&recent[0].rank>recent[1].rank&&recent[1].rank>recent[2].rank;
    const prior=chart.find(r=>r.id===row.id&&r.date===chartDates.at(-2));
    // Snapshot and irregular periods do not become daily growth rates.
    const comparable=prior&&expected!==null&&day(row.date)-day(prior.date)===expected;
    const gain=comparable?prior.rank-row.rank:null;
    const newly=row.rankStatus==='new';
    if(!sustained&&!(gain>0)&&!newly) return [];
    const history=eligible.filter(r=>entryKey(r)===entryKey(row)).sort((a,b)=>a.date.localeCompare(b.date));
    const kind=sustained?'連續上升':gain>0?'單期上升':'來源標記新進榜';
    return [{...row,kind,historyCount:history.length,firstObserved:history[0].date,gain,
      basis:row.cadence==='weekly'?'較前一週':'較前一日',
      evidence:sustained?`${dates[0]} → ${dates[2]}：第 ${recent.map(r=>r.rank).join(' → ')} 名`:
        gain>0?`${prior.date} → ${row.date}：第 ${prior.rank} → ${row.rank} 名`:'原榜標記新進榜；不等於新歌或新人',
      sustained,sortOrder:sustained?0:gain>0?1:2}];
  }).sort((a,b)=>a.sortOrder-b.sortOrder||b.date.localeCompare(a.date)||a.rank-b.rank||a.title.localeCompare(b.title));
}

export function radarArtists(signals) {
  const artists=new Map();
  for(const row of signals) {
    // Full credits retained; no guessed individual attribution or stage-name merges.
    if(!artists.has(row.artist)) artists.set(row.artist,{artist:row.artist,records:[],songs:new Set()});
    const group=artists.get(row.artist);group.records.push(row);group.songs.add(songKey(row));
  }
  return [...artists.values()].map(g=>({artist:g.artist,records:g.records,songCount:g.songs.size,
    platforms:[...new Set(g.records.map(r=>r.platform))].join('、'),newcomerStatus:'新人／合約狀態待查證'}))
    .sort((a,b)=>b.songCount-a.songCount||a.artist.localeCompare(b.artist));
}

export function chartCoverage(all) {
  const groups=new Map();
  for(const r of all) {const key=chartKey(r);if(!groups.has(key))groups.set(key,{platform:r.platform,market:r.market,chart:r.chart,dates:new Set()});groups.get(key).dates.add(r.date);}
  return [...groups.values()].map(g=>{const dates=[...g.dates].sort();return {platform:g.platform,market:g.market,chart:g.chart,periods:dates.length,start:dates[0],end:dates.at(-1),spanDays:day(dates.at(-1))-day(dates[0])};});
}
