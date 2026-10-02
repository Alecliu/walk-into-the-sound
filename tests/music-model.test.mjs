import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { latestRows, filterRows, movement, genreCounts, compareRows, comparisonPlot, entryKey, crossPlatformSongs, songKey } from '../src/content/dashboard/music-model.js';
const data = JSON.parse(readFileSync(new URL('../src/data.json', import.meta.url))).queries.tracks.rows;
test('latest rows preserve independent chart dates and unique record grain', () => {
  const rows = latestRows(data);
  for (const platform of ['Apple Music','KKBOX']) {
    const relevant = data.filter(r => r.platform === platform);
    const date = relevant.map(r=>r.date).sort().at(-1);
    assert.deepEqual(rows.filter(r=>r.platform===platform), relevant.filter(r=>r.date===date));
  }
  assert.equal(new Set(rows.map(r=>`${r.platform}:${r.market}:${r.chart}:${r.date}:${r.id}`)).size, rows.length);
});
test('absent Apple history is not a new entry or a zero increase',()=>{
  assert.equal(movement({platform:'Apple Music',rank:1,previousRank:null}).type,'unknown');
  assert.equal(movement({platform:'Apple Music',rank:1,previousRank:null}).value,null);
  assert.equal(movement({platform:'KKBOX',rank:2,previousRank:null}).type,'new');
  assert.equal(movement({platform:'KKBOX',rank:47,previousRank:52}).value,5);
});
test('all resets population and filters never manufacture mainland data',()=>{
  const rows=latestRows(data);
  assert.equal(filterRows(rows,{market:'中國大陸'}).length,0);
  assert.deepEqual(filterRows(rows),rows);
  assert.equal(filterRows(rows,{platform:'Apple Music',search:'不存在的歌曲000'}).length,0);
});
test('genre counts reconcile and comparisons contain only selected source IDs',()=>{
  const rows=latestRows(data).filter(r=>r.platform==='Apple Music');
  assert.equal(genreCounts(rows).reduce((n,r)=>n+r.歌曲數,0),rows.length);
  const row=data.find(r=>r.platform==='KKBOX');
  assert.ok(compareRows(data,[entryKey(row)]).every(r=>entryKey(r)===entryKey(row)));
});
test('missing chart dates stay null in the plot instead of connecting unobserved ranks',()=>{
  const rows=[{id:'a',platform:'KKBOX',date:'2026-09-20',title:'A',rank:10},{id:'b',platform:'KKBOX',date:'2026-09-21',title:'B',rank:1},{id:'a',platform:'KKBOX',date:'2026-09-22',title:'A',rank:2}];
  assert.deepEqual(comparisonPlot(rows,[entryKey(rows[0])]).map(r=>r.名次),[10,null,2]);
  assert.deepEqual(compareRows(rows,[entryKey(rows[0])]).map(r=>r.rank),[10,2]);
});
test('same Spotify song in global and Taiwan remains two chart histories',()=>{
  const rows=[{id:'s',platform:'Spotify',chart:'Top 50',market:'全球',date:'2026-09-24',rank:2,title:'A'},
    {id:'s',platform:'Spotify',chart:'Top 50',market:'台灣',date:'2026-09-23',rank:40,title:'A'}];
  assert.equal(latestRows(rows).length,2);
  assert.deepEqual(compareRows(rows,[entryKey(rows[1])]),[rows[1]]);
  assert.deepEqual(comparisonPlot(rows,[entryKey(rows[1])]).map(r=>r.名次),[40]);
});
test('cross-platform exposure counts platforms once, never countries or summed ranks',()=>{
  const base={id:'a',title:'Example',artist:'Alpha, Beta',rank:1};
  const rows=[{...base,platform:'Spotify',market:'全球'},{...base,platform:'Spotify',market:'台灣',rank:30},
    {...base,platform:'YouTube',market:'全球',artist:'Beta, Alpha',rank:10}];
  const result=crossPlatformSongs(rows);
  assert.equal(result.length,1);assert.equal(result[0].platformCount,2);assert.equal(result[0].records.length,3);
});
test('matching preserves versions, featured artists and different artists with the same title',()=>{
  const r={id:'a',platform:'Spotify',title:'Example',artist:'Alpha'};
  assert.notEqual(songKey(r),songKey({...r,title:'Example (Remix)'}));
  assert.notEqual(songKey(r),songKey({...r,artist:'Beta'}));
  assert.notEqual(songKey(r),songKey({...r,artist:'Alpha, Beta'}));
  assert.equal(songKey(r),songKey({...r,title:' EXAMPLE ',artist:'ALPHA'}));
});
test('YouTube view growth is not rank growth and reentries are not debuts',()=>{
  assert.equal(movement({platform:'YouTube',rank:10,previousRank:5,viewsChange:1}).type,'down');
  assert.equal(movement({platform:'YouTube',rank:10,previousRank:null,rankStatus:'reentry'}).label,'重新進榜');
});
