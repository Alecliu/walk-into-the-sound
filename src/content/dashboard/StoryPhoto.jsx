import React from 'react';
import abbeyRoad from '../assets/story-photos/abbey-road-2015.jpg';
import cavernClub from '../assets/story-photos/cavern-club-2013.jpg';
import larryMullen from '../assets/story-photos/larry-mullen-dublin-2015.jpg';
import cafe from '../assets/story-photos/cafe-deux-moulins-2010.jpg';

const images = { 'abbey-road-2015': abbeyRoad, 'cavern-club-2013': cavernClub, 'larry-mullen-dublin-2015': larryMullen, 'cafe-deux-moulins-2010': cafe };
export function StoryPhotoImage({ photo, compact = false }) {
  if (!photo || !images[photo.id]) return null;
  return <img className={compact ? 'ms-story-photo-thumb' : 'ms-story-photo-full'} src={images[photo.id]} alt={photo.alt} loading={compact ? 'lazy' : 'eager'} decoding="async" style={{objectPosition:photo.position || 'center'}}/>;
}
export function StoryPhotoCredit({ photo, compact = false }) {
  if (!photo) return null;
  return <div className="ms-story-photo-credit"><span>{photo.caption}</span><span>攝影：{photo.author} · <a href={photo.sourceUrl} target="_blank" rel="noopener noreferrer">Wikimedia Commons</a> · <a href={photo.licenseUrl} target="_blank" rel="noopener noreferrer">{photo.license}</a>{compact ? ' · 縮圖裁切呈現' : ' · 原比例呈現'}</span></div>;
}
export function StoryPhoto({ photo }) {
  if (!photo || !images[photo.id]) return null;
  return <figure className="ms-story-photo"><StoryPhotoImage photo={photo}/><figcaption><StoryPhotoCredit photo={photo}/></figcaption></figure>;
}
