import webAssets from '../assets/web-assets.json';
import React from 'react';
const images = Object.fromEntries(Object.entries(webAssets).map(([id,asset])=>[id,'./'+asset.path]));
export function StoryPhotoImage({ photo, compact = false }) {
  if (!photo || !images[photo.id]) return null;
  return <img className={compact ? 'ms-story-photo-thumb' : 'ms-story-photo-full'} src={images[photo.id]} alt={photo.alt} loading={compact ? 'lazy' : 'eager'} decoding="async" style={{objectPosition:photo.position || 'center'}}/>;
}
export function StoryPhotoCredit({ photo, compact = false }) {
  if (!photo) return null;
  return <div className="ms-story-photo-credit"><span>{photo.caption}</span><span>攝影：{photo.attribution || photo.author} · <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a>{compact ? ' · 縮圖裁切呈現' : ' · 原比例呈現'}</span></div>;
}
export function StoryPhoto({ photo }) {
  if (!photo || !images[photo.id]) return null;
  return <figure className="ms-story-photo"><StoryPhotoImage photo={photo}/><figcaption><StoryPhotoCredit photo={photo}/></figcaption></figure>;
}
