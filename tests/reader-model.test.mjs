import test from 'node:test';
import assert from 'node:assert/strict';
import { emptyPreferences, parsePreferences, recommendations } from '../src/content/dashboard/reader-model.js';

const rows=[
  {id:'a',artist:'One',interests:['電影與影集'],publishedAt:'2026-10-03'},
  {id:'b',artist:'Two',people:['One'],interests:['製作幕後'],publishedAt:'2026-10-02'},
  {id:'c',artist:'Three',interests:['電影與影集'],publishedAt:'2026-10-01'},
  {id:'d',artist:'Four',interests:['現場演出'],publishedAt:'2026-10-03'},
];
test('first like recommends related people and topics without recommending liked articles',()=>{
  const prefs={...emptyPreferences(),likedIds:['a']};
  const before=JSON.stringify({rows,prefs});
  const results=recommendations(rows,prefs,{seedId:'a'});
  assert.deepEqual(results.map(r=>r.story.id),['b','c','d']);
  assert.match(results[0].reason,/One/);
  assert.equal(results[2].matched,false);
  assert.match(results[2].reason,/試讀/);
  assert.equal(JSON.stringify({rows,prefs}),before);
});
test('preferences are opt-in, resettable and recommendation switch is respected',()=>{
  assert.deepEqual(recommendations(rows,emptyPreferences()),[]);
  assert.deepEqual(recommendations(rows,{...emptyPreferences(),enabled:false,likedIds:['a']}),[]);
  assert.equal(recommendations(rows,{...emptyPreferences(),topics:['現場演出']})[0].story.id,'d');
  assert.deepEqual(recommendations(rows,{...emptyPreferences(),likedIds:rows.map(r=>r.id)}),[]);
});
test('malformed and unknown storage cannot inject preferences or unbounded arrays',()=>{
  for (const raw of ['{bad',null,'[]','{"version":2,"likedIds":["a"]}']) assert.deepEqual(parsePreferences(raw),emptyPreferences());
  const p=parsePreferences({version:1,likedIds:['a','a',null,2],topics:['電影與影集','invented'],artists:[' One ','One'],token:'private'});
  assert.deepEqual(p.likedIds,['a']); assert.deepEqual(p.topics,['電影與影集']); assert.deepEqual(p.artists,['One']);
  assert.equal(p.token,undefined);
  assert.equal(parsePreferences({version:1,likedIds:Array.from({length:300},(_,i)=>String(i))}).likedIds.length,200);
});
test('unknown artists have honest discovery labels and removed article IDs are harmless',()=>{
  const result=recommendations(rows,{...emptyPreferences(),likedIds:['deleted'],artists:['Unknown']});
  assert.ok(result.every(r=>!r.matched && /試讀/.test(r.reason)));
  assert.deepEqual(recommendations(rows,{...emptyPreferences(),likedIds:['deleted']}),[]);
});
