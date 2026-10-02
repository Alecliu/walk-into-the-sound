import test from 'node:test';
import assert from 'node:assert/strict';
import {radarSignals,radarArtists} from '../src/content/dashboard/radar-model.js';
import {spotifySelection,selectionText} from '../src/content/dashboard/spotify-selection.js';
import {readFileSync} from 'node:fs';
const base={id:'a',title:'Song',artist:'Artist',platform:'QQ 音樂',market:'中國大陸',chart:'測試榜',cadence:'daily',rankStatus:'ranked'};
const row=(date,rank,extra={})=>({...base,date,rank,...extra});
test('requires actual adjacent chart periods and two rising edges for sustained signal',()=>{
 const good=[row('2026-09-20',30),row('2026-09-21',20),row('2026-09-22',10)];
 assert.equal(radarSignals(good)[0].kind,'連續上升');
 assert.equal(radarSignals([good[0],good[2]]).length,0);
 assert.equal(radarSignals([good[0],{...good[1],id:'other'},good[2]]).length,0);
 assert.equal(radarSignals([good[0],{...good[1],market:'台灣'},good[2]]).length,0);
 assert.equal(radarSignals(good.map(r=>({...r,cadence:'snapshot'}))).length,0);
 assert.equal(radarSignals(good,'2026-09-21')[0].kind,'單期上升');
});
test('weekly cadence is not daily; unknown first observation is never automatically a newcomer',()=>{
 assert.equal(radarSignals([row('2026-09-10',30,{cadence:'weekly'}),row('2026-09-17',20,{cadence:'weekly'})])[0].kind,'單期上升');
 assert.equal(radarSignals([row('2026-09-22',1)]).length,0);
 const fresh=radarSignals([row('2026-09-22',1,{rankStatus:'new'})]);
 assert.equal(fresh[0].kind,'來源標記新進榜');
 assert.equal(radarArtists(fresh)[0].newcomerStatus,'新人／合約狀態待查證');
});
test('artist count deduplicates repeated platform/market records of same song',()=>{
 const signals=[row('2026-09-22',1),row('2026-09-22',2,{market:'台灣'}),row('2026-09-22',3,{title:'Song (Live)'})];
 assert.equal(radarArtists(signals)[0].songCount,2);
});
test('every collected track has Spotify direct or safely encoded search plus a source song URL',()=>{
 const all=JSON.parse(readFileSync(new URL('../src/data.json',import.meta.url))).queries.tracks.rows;
 for(const e of spotifySelection(all,all)) {
   assert.ok(e.url?.startsWith('https://open.spotify.com/track/')||e.searchUrl.startsWith('https://open.spotify.com/search/'));
   assert.ok(e.row.url.startsWith('https://'));
 }
 const e=spotifySelection([{...base,title:'A & B / 現場',artist:'C #D'}],[]);
 assert.match(selectionText(e),/https:\/\/open.spotify.com\/search\/A%20%26%20B/);
});
