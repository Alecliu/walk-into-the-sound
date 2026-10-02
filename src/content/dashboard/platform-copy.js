// Presentation only. Raw chart identities and archived evidence stay intact.
export function platformCopy(value = '') {
  return String(value)
    .replace(/韓國流行樂/g, 'K-pop')
    .replace(/日本流行樂/g, 'J-pop')
    .replace(/中國大陸|中国大陆|大陸|大陆/g, 'QQ／抖音')
    .replace(/台灣|臺灣|台湾/g, '已收錄')
    .replace(/全球/g, '跨語言')
    .replace(/\bTaiwan\b/gi, 'collected')
    .replace(/\bChina\b/gi, 'QQ / Douyin');
}

export function sourceNote(source) {
  if (!source.coverage?.length) return platformCopy(source.note);
  const coverage = source.coverage.map(c => `${c.date} · ${c.count} 首${source.coverage.length > 1 ? (c.market === '全球' ? '（榜單 A）' : '（榜單 B）') : ''}`).join('；');
  const suffix = source.platform === 'Spotify' ? '歌單名次；日期為更新日，未提供播放次數。' : source.platform === 'YouTube' ? '歌曲週榜；日期為統計週結束日，觀看次數與每日串流分開計算。' : '';
  return `${coverage}。${suffix}`;
}

export function chartLabel(row) {
  const name = String(row.chart || '').replace(/\s*[-–]?\s*(Taiwan|Global|台灣|臺灣|全球)/gi, '').trim();
  // Stable labels distinguish two charts without changing how ranks are grouped.
  const edition = ['Spotify', 'YouTube'].includes(row.platform)
    ? (row.market === '全球' ? ' · 榜單 A' : ' · 榜單 B') : '';
  return name + edition;
}
