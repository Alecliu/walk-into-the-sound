import { songKey } from './music-model.js';

// Explicit catalogue matches, reviewed against the collected Spotify entries.
// KKBOX appends its release subtitle and includes Jess Lee's Chinese/English names.
const catalogueMatches = {
  'kkbox:GptIJ2y--IKc1ewMvC': {
    sourceTitle: '甲乙丙丁Strangers - 你我怎麼兩清',
    sourceArtist: '李佳薇 (Jess Lee)',
    spotifyId: 'spotify:629FqLOdjtsXh5b45FTk43',
    title: '甲乙丙丁Strangers', artist: 'Jess Lee',
  },
};
export function spotifySelection(cards, all) {
  return cards.map(row => {
    const own = row.platform === 'Spotify' ? row : null;
    const exact = all.find(candidate => candidate.platform === 'Spotify' && songKey(candidate) === songKey(row));
    const match = catalogueMatches[row.id];
    const reviewed = match && match.sourceTitle === row.title && match.sourceArtist === row.artist
      ? all.find(candidate => candidate.id === match.spotifyId && candidate.title === match.title && candidate.artist === match.artist) : null;
    const spotify = own || exact || reviewed;
    const url = spotify?.url;
    return { row, url: /^https:\/\/open\.spotify\.com\/track\/[A-Za-z0-9]{22}$/.test(url || '') ? url : null,
      searchUrl: 'https://open.spotify.com/search/' + encodeURIComponent(`${row.title} ${row.artist}`) };
  });
}
export function selectionText(entries) {
  return entries.map(({row,url,searchUrl}) => `${row.title} — ${row.artist}\n${url || searchUrl}${url ? '' : '（Spotify 搜尋）'}`).join('\n\n');
}
export function matchingPlaylist(entries, playlist) {
  if (!/^https:\/\/open\.spotify\.com\/playlist\/[A-Za-z0-9]{22}$/.test(playlist?.url || '')) return null;
  const current = [...new Set(entries.map(e=>e.url))];
  return current.length && current.every(Boolean) && current.length === playlist.trackUrls?.length
    && current.every(url=>playlist.trackUrls.includes(url)) ? playlist : null;
}
