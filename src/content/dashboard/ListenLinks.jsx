import React from 'react';
import { spotifySelection } from './spotify-selection.js';
import { MusicIcon } from './MusicIcon.jsx';

export function ListenLinks({row,all=[]}) {
  const {url,searchUrl}=spotifySelection([row],all)[0];
  const original=/^https:\/\//.test(row.url||'') && row.url!==url;
  return <span className="ms-listen-links">
    <a href={url||searchUrl} target="_blank" rel="noopener noreferrer" aria-label={`${url?'在 Spotify 聽':'在 Spotify 搜尋'} ${row.title} — ${row.artist}`}><MusicIcon name="spotify"/>{url?'Spotify 聆聽':'Spotify 搜尋'} ↗</a>
    {original&&<a className="ms-original-link" href={row.url} target="_blank" rel="noopener noreferrer" aria-label={`在 ${row.platform} 開啟 ${row.title}`}>{row.platform} ↗</a>}
  </span>;
}
