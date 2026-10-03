import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { chartLabel, platformCopy } from '../src/content/dashboard/platform-copy.js';
import { comparisonPlot, entryKey } from '../src/content/dashboard/music-model.js';
import { filterStories, availableTags, tagKey, tagOptions, updateSelections } from '../src/content/dashboard/story-model.js';

test('location dropdowns cascade and discard incompatible downstream choices', () => {
  const makeStory = (city, district, place) => ({tags:[{type:'城市',label:city}, {type:'街區',label:district}, ...(place ? [{type:'打卡點',label:place}] : [])]});
  const stories = [makeStory('甲城','甲街','甲館'), makeStory('甲城','乙街','乙館'), makeStory('乙城','丙街','丙館'), makeStory('丙城','丁街')];
  let selections = updateSelections(stories, {}, '城市', '城市:甲城');
  assert.deepEqual(tagOptions(stories, '街區', selections).map(t => t.label), ['甲街','乙街']);
  assert.deepEqual(tagOptions(stories, '打卡點', selections).map(t => t.label), ['甲館','乙館']);
  selections = updateSelections(stories, selections, '街區', '街區:甲街');
  assert.deepEqual(tagOptions(stories, '打卡點', selections).map(t => t.label), ['甲館']);
  selections = updateSelections(stories, selections, '打卡點', '打卡點:甲館');
  assert.equal(filterStories(stories, {selections}).length, 1);
  selections = updateSelections(stories, selections, '街區', '街區:乙街');
  assert.equal(selections['打卡點'], '');
  assert.equal(filterStories(stories, {selections}).length, 1);
  selections = updateSelections(stories, selections, '城市', '城市:乙城');
  assert.equal(selections['街區'], '');
  assert.deepEqual(tagOptions(stories, '打卡點', selections).map(t => t.label), ['丙館']);
  selections = updateSelections(stories, selections, '城市', '城市:丙城');
  assert.deepEqual(tagOptions(stories, '打卡點', selections), []);
  assert.equal(filterStories(stories, {selections}).length, 1);
  selections = updateSelections(stories, selections, '城市', '');
  assert.equal(filterStories(stories, {selections}).length, stories.length);
});

test('story discovery combines typed tags, aliases and people without requiring a band', () => {
  const stories = JSON.parse(readFileSync(new URL('../src/data.json', import.meta.url))).queries.cityStories.rows;
  assert.equal(filterStories(stories, {search:'#艾比路 Beatles'})[0].id, 'london-abbey-road');
  assert.equal(filterStories(stories, {search:'Larry Mullen'})[0].id, 'dublin-u2-kitchen');
  assert.equal(filterStories(stories, {search:'Cavern', tag:'城市:都柏林'}).length, 0);
  assert.equal(filterStories(stories, {tag:'街區:Artane'}).length, 1);
  assert.equal(filterStories(stories, {search:'   '}).length, stories.length);
  assert.equal(new Set(availableTags(stories).map(tagKey)).size, availableTags(stories).length);
  assert.equal(filterStories([{artist:'Solo Artist', tags:[], places:[]}], {search:'solo artist'}).length, 1);
  assert.equal(filterStories(stories, {search:'艾蜜莉 咖啡館'})[0].id, 'paris-amelie-cafe');
  assert.equal(filterStories(stories, {search:'徵人啟事'})[0].id, 'dublin-u2-kitchen');
  assert.equal(filterStories([{work:'Example Film', anchor:'一把琴', tags:[], places:[]}], {search:'Example 一把琴'}).length, 1);
});

test('each published city story has a unique route and inspectable evidence', () => {
  const stories = JSON.parse(readFileSync(new URL('../src/data.json', import.meta.url))).queries.cityStories.rows;
  assert.equal(new Set(stories.map(s => s.id)).size, stories.length);
  assert.ok(stories.length >= 3);
  for (const s of stories) {
    assert.match(s.id, /^[a-z0-9-]+$/);
    assert.ok(s.work && s.anchor && s.lens && s.sections.length >= 3 && s.timeline.length >= 2);
    assert.ok(s.sources.length >= 2 && Array.isArray(s.places));
    assert.ok(s.sources.every(source => source.url.startsWith('https://')));
    assert.ok(s.sections.some(section => section.body.includes(s.sources[0].url)));
    assert.doesNotMatch(JSON.stringify(s), /中國|台灣|臺灣|英國|愛爾蘭|國籍/);
  }
});

test('platform copy does not mutate reviewed records or collapse chart series', () => {
  const records = ['全球', '台灣'].map((market, i) => ({ id:'same-song', title:'Song', artist:'Artist', platform:'YouTube', market, chart:'熱門歌曲週榜 Top 100', date:'2026-09-24', rank:i+1 }));
  const original = JSON.stringify(records);
  assert.notEqual(chartLabel(records[0]), chartLabel(records[1]));
  const plotted = comparisonPlot(records, records.map(entryKey));
  assert.equal(new Set(plotted.map(r => r.歌曲)).size, 2);
  assert.deepEqual(plotted.map(r => r.名次), [1,2]);
  assert.doesNotMatch(JSON.stringify(plotted), /台灣|全球/);
  assert.equal(JSON.stringify(records), original);
  assert.doesNotMatch(platformCopy('台灣／中國大陸'), /台灣|中國|大陸/);
});

test('blog tags share one chronological list without mutating source rows', async () => {
  const { newestStories, availableTopics, storyTopics } = await import('../src/content/dashboard/story-model.js');
  const rows = [{id:'old',publishedAt:'2026-10-02',lens:'唱片與物件',tags:[{type:'城市',label:'倫敦'}]}, {id:'new',publishedAt:'2026-10-03',topics:['新歌觀察','音樂人筆記'],tags:[{type:'城市',label:'巴黎'}]}];
  const original = JSON.stringify(rows);
  assert.deepEqual(newestStories(rows).map(s=>s.id),['new','old']);
  assert.deepEqual(storyTopics(rows[0]),['唱片與物件']);
  assert.deepEqual(availableTopics(rows),['唱片與物件','新歌觀察','音樂人筆記']);
  assert.deepEqual(filterStories(rows,{topic:'音樂人筆記',selections:{城市:'城市:巴黎'}}).map(s=>s.id),['new']);
  assert.equal(filterStories(rows,{topic:'新歌觀察',selections:{城市:'城市:倫敦'}}).length,0);
  assert.equal(filterStories(rows,{search:'音樂人筆記'}).length,1);
  assert.equal(JSON.stringify(rows),original);
});
