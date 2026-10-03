export const storyLenses = [
  {name:'影像與配樂', description:'電影與影集中的場景，和留在耳邊的旋律。'},
  {name:'歌詞裡的地方', description:'一個街名、一段歌詞，把聲音放回地圖。'},
  {name:'唱片與物件', description:'封面、啟事與日常物件，藏著音樂的來處。'},
  {name:'現場與相遇', description:'故事發生的房間、舞台，與在那裡交會的人。'},
];
export const tagTypes = ['城市', '街區', '打卡點'];
export const artistName = story => story.artist || story.band || '';
export const storyTopics = story => [...new Set(story.topics?.length ? story.topics : [story.lens].filter(Boolean))];
export const availableTopics = stories => [...new Set(stories.flatMap(storyTopics))];
export const newestStories = stories => [...stories].sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''));
export const tagKey = tag => `${tag.type}:${tag.label}`;
export function storyTags(story) {
  return story.tags || (story.city ? [{ type: '城市', label: story.city, aliases: [story.cityEn].filter(Boolean) }] : []);
}
export function availableTags(stories) {
  return [...new Map(stories.flatMap(storyTags).map(tag => [tagKey(tag), tag])).values()];
}
export function tagOptions(stories, type, selections = {}) {
  const upstream = Object.fromEntries(tagTypes.slice(0, tagTypes.indexOf(type)).map(key => [key, selections[key]]));
  return availableTags(filterStories(stories, { selections: upstream })).filter(tag => tag.type === type);
}
export function updateSelections(stories, selections, type, value) {
  const next = { ...selections, [type]: value };
  for (const downstream of tagTypes.slice(tagTypes.indexOf(type) + 1)) {
    if (!tagOptions(stories, downstream, next).some(tag => tagKey(tag) === next[downstream])) {
      next[downstream] = '';
    }
  }
  return next;
}
export function filterStories(stories, { search = '', tag = '', topic = '', selections = {} } = {}) {
  const selected = [tag, ...Object.values(selections)].filter(Boolean);
  const terms = search.normalize('NFKC').toLowerCase().replace(/#/g, ' ').trim().split(/\s+/).filter(Boolean);
  return stories.filter(story => {
    const tags = storyTags(story);
    const text = [story.title, story.deck, story.work, story.anchor, ...storyTopics(story), artistName(story), ...(story.people || []), story.city, story.cityEn, story.category,
      ...(story.places || []).map(place => place.name), ...tags.flatMap(t => [t.label, ...(t.aliases || [])])].join(' ').normalize('NFKC').toLowerCase();
    return (!topic || storyTopics(story).includes(topic)) && selected.every(value => tags.some(t => tagKey(t) === value)) && terms.every(term => text.includes(term));
  });
}
