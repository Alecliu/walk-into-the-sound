import { chartLabel, platformCopy } from './platform-copy.js';
export function latestRows(rows) {
  const dates = new Map();
  for (const r of rows) { const k = `${r.platform}|${r.market}|${r.chart}`; if (!dates.has(k) || r.date > dates.get(k)) dates.set(k, r.date); }
  return rows.filter(r => r.date === dates.get(`${r.platform}|${r.market}|${r.chart}`));
}
export function filterRows(rows, { platform = '全部平台', market = '全部市場', search = '' } = {}) {
  const q = search.trim().toLocaleLowerCase();
  return rows.filter(r => (platform === '全部平台' || r.platform === platform) && (market === '全部市場' || r.market === market) && (!q || `${r.title} ${r.artist} ${r.genre}`.toLocaleLowerCase().includes(q)));
}
export function movement(row) {
  if (row.rankStatus === 'reentry') return { type: 'new', value: null, label: '重新進榜' };
  if (row.rankStatus === 'new') return { type: 'new', value: null, label: '新進榜' };
  if (row.platform === 'KKBOX' && row.previousRank === null) return { type: 'new', value: null, label: '新進榜' };
  if (!Number.isFinite(row.previousRank)) return { type: 'unknown', value: null, label: '無前期資料' };
  const value = row.previousRank - row.rank;
  return { type: value > 0 ? 'up' : value < 0 ? 'down' : 'same', value, label: value > 0 ? `↑ 上升 ${value} 名` : value < 0 ? `↓ 下降 ${Math.abs(value)} 名` : '— 名次持平' };
}
export function summarizeArtists(rows) {
  const counts = new Map();
  for (const r of rows) { const name = r.artist.replace(/\s*\([^)]*\)\s*$/u, '').trim(); counts.set(name, (counts.get(name) || 0) + 1); }
  return [...counts].map(([歌手, 榜單筆數]) => ({ 歌手, 榜單筆數 })).sort((a,b) => b.榜單筆數-a.榜單筆數);
}
export function genreCounts(rows) {
  const counts = new Map(); for (const r of rows) counts.set(r.genre, (counts.get(r.genre)||0)+1);
  return [...counts].map(([類型, 歌曲數]) => ({類型:platformCopy(類型),歌曲數})).sort((a,b)=>b.歌曲數-a.歌曲數);
}
export function entryKey(r) { return [r.platform,r.market,r.chart,r.id].join('|'); }
export function compareRows(rows, ids) { return rows.filter(r => ids.includes(entryKey(r))).sort((a,b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id)); }
export function comparisonPlot(rows, ids) {
  return ids.flatMap(key => {
    const track = rows.find(r => entryKey(r) === key);
    if (!track) return [];
    const chart = rows.filter(r=>r.platform===track.platform&&r.market===track.market&&r.chart===track.chart);
    const dates = [...new Set(chart.map(r=>r.date))].sort();
    return dates.map(date => ({ 日期: date, 歌曲: `${track.title} · ${track.platform} / ${chartLabel(track)}`, 名次: chart.find(r => r.id === track.id && r.date === date)?.rank ?? null }));
  });
}

const normalize = text => String(text || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
export function songKey(row) {
  // Conservative identity: preserve remix/live/version text and the complete artist set.
  const names = row.artists?.length ? row.artists : row.artist.split(/,|、|\s+&\s+/);
  const artists = names.map(a=>normalize(a).replace(/\s*\([a-z .-]+\)$/u,'')).filter(Boolean).sort();
  if (artists.includes('various artists')) return `unmatched:${entryKey(row)}`;
  return `${normalize(row.title)}|${[...new Set(artists)].join('|')}`;
}
export function crossPlatformSongs(rows) {
  const groups = new Map();
  for (const r of rows) {
    const key = songKey(r);
    if (!groups.has(key)) groups.set(key, { key, title:r.title, artist:r.artist, records:[] });
    groups.get(key).records.push(r);
  }
  return [...groups.values()].map(g=>({...g, platformCount:new Set(g.records.map(r=>r.platform)).size,
    risingCount:g.records.filter(r=>movement(r).value>0).length})).sort((a,b)=>b.platformCount-a.platformCount || a.title.localeCompare(b.title));
}
export function periodLabel(row) {
  return row.dateBasis==='playlistUpdated' ? `歌單更新 ${row.date}` : row.dateBasis==='feedUpdated' ? `榜單更新 ${row.date}` : row.cadence==='weekly' ? `${row.periodStart} ～ ${row.date}` : `榜單日期 ${row.date}`;
}
export function movementBasis(row) {
  if (row.comparisonBasis==='snapshot') return row.comparisonDate ? `較 ${row.comparisonDate} 快照` : '尚無前次快照';
  return row.cadence==='weekly' ? '較上週' : row.platform==='KKBOX' ? '較前一日' : '尚無前次快照';
}
