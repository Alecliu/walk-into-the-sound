import { artistName, storyTopics } from './story-model.js';

export const READER_KEY = 'walk-into-the-sound:reader:v1';
export const INTERESTS = ['電影與影集','動畫與遊戲','歌曲裡的人','製作幕後','MV 與地點','新歌觀察','現場演出','經典歌曲'];
export const emptyPreferences = () => ({version:1, likedIds:[], topics:[], artists:[], enabled:true});
const cleanList = (values, max=200) => [...new Set(Array.isArray(values) ? values.filter(v=>typeof v==='string').map(v=>v.trim().slice(0,120)).filter(Boolean) : [])].slice(0,max);
export function parsePreferences(raw) {
  try {
    const p = typeof raw==='string' ? JSON.parse(raw) : raw;
    if (!p || p.version!==1) return emptyPreferences();
    return {version:1, likedIds:cleanList(p.likedIds), topics:cleanList(p.topics).filter(t=>INTERESTS.includes(t)), artists:cleanList(p.artists,30), enabled:p.enabled!==false};
  } catch { return emptyPreferences(); }
}
export function interestsFor(story) {
  if (story.interests?.length) return story.interests.filter(t=>INTERESTS.includes(t));
  const mapping={'影像與配樂':'電影與影集','歌詞裡的地方':'歌曲裡的人','唱片與物件':'製作幕後','現場與相遇':'現場演出','新歌觀察':'新歌觀察','製作人':'製作幕後','MV 場景':'MV 與地點'};
  return [...new Set(storyTopics(story).map(t=>mapping[t]).filter(Boolean))];
}
const normalize = value => (value || '').normalize('NFKC').toLowerCase().trim();
const peopleFor = story => [...new Set([artistName(story),...(story.people || [])].map(normalize).filter(Boolean))];
export function recommendations(stories, preferences, {seedId='',limit=3}={}) {
  const prefs=parsePreferences(preferences);
  if (!prefs.enabled) return [];
  const liked=new Set(prefs.likedIds);
  const seeds=stories.filter(s=>liked.has(s.id) || s.id===seedId);
  if (!seeds.length && !prefs.topics.length && !prefs.artists.length) return [];
  const weightedTopics=new Map(prefs.topics.map(t=>[t,5]));
  const weightedPeople=new Map(prefs.artists.map(a=>[normalize(a),10]));
  for (const seed of seeds) {
    const weight=seed.id===seedId ? 5 : 2;
    for (const topic of interestsFor(seed)) weightedTopics.set(topic,(weightedTopics.get(topic)||0)+weight);
    for (const person of peopleFor(seed)) weightedPeople.set(person,(weightedPeople.get(person)||0)+weight+2);
  }
  const ranked=stories.filter(s=>s.id!==seedId && !liked.has(s.id)).map(story=>{
    const topics=interestsFor(story).filter(t=>weightedTopics.has(t));
    const people=peopleFor(story).filter(p=>weightedPeople.has(p));
    const score=topics.reduce((sum,t)=>sum+weightedTopics.get(t),0)+people.reduce((sum,p)=>sum+weightedPeople.get(p),0);
    const personLabel=[artistName(story),...(story.people||[])].find(p=>people.includes(normalize(p)));
    const reason=personLabel ? `也談到你關注的 ${personLabel}` : topics.length ? `同樣聊${topics.slice(0,2).join('、')}` : '換個主題，試讀這一篇';
    return {story,score,reason,matched:score>0};
  }).sort((a,b)=>b.score-a.score || (b.story.publishedAt||'').localeCompare(a.story.publishedAt||'') || a.story.id.localeCompare(b.story.id));
  const selected=[];
  const artists=new Set();
  for (const item of ranked) {
    const artist=normalize(artistName(item.story));
    if (selected.length && artists.has(artist)) continue;
    selected.push(item);artists.add(artist);
    if (selected.length===limit) break;
  }
  return selected;
}
