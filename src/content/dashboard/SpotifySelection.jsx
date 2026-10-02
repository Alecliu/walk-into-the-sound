import { platformCopy, chartLabel } from './platform-copy.js';
import React, { useEffect, useState } from 'react';
import { Dialog } from '../../data-app-public.jsx';
import { spotifySelection, selectionText } from './spotify-selection.js';
import { ListenLinks } from './ListenLinks.jsx';
import { MusicIcon } from './MusicIcon.jsx';

export function SpotifySelection({open,onClose,cards,all}) {
  const entries=spotifySelection(cards,all);
  const text=selectionText(entries);
  const [copyState,setCopyState]=useState('');
  useEffect(()=>{setCopyState('');},[text,open]);
  async function copy() {
    try { await navigator.clipboard.writeText(text);setCopyState('已複製歌曲與連結。'); }
    catch { setCopyState('無法自動複製，請選取下方清單複製。'); }
  }
  return <Dialog open={open} onClose={onClose} title="今天，先聽這幾首 · Spotify">
    <div className="ms-playlist-panel">
      <p>這裡和首頁是同一份選曲。每首保留原榜的觀察依據，在 Spotify 找到對應版本再聽。</p>
      <ol className="ms-playlist-tracks" data-reviewed-rows>{entries.map(({row,url,searchUrl})=><li key={`${row.id}:${row.market}`}><div><strong>{row.title}</strong><small>{row.artist}</small><small>{row.platform} · {row.date}</small></div><ListenLinks row={row} all={all}/></li>)}</ol>
      <div className="ms-playlist-actions"><button className="ms-outline" onClick={copy}>複製選曲清單</button></div>
      <p className="ms-playlist-status">直接選一首就能前往聆聽，不需要先建立歌單。播放範圍由 Spotify 帳號與地區決定。</p>
      <p role="status" className="ms-playlist-status">{copyState}</p>
      {copyState.startsWith('無法') && <textarea aria-label="可複製的 Spotify 選曲" value={text} readOnly onFocus={e=>e.currentTarget.select()}/>}
    </div>
  </Dialog>;
}
