import test from 'node:test';
import assert from 'node:assert/strict';
import {spotifySelection, matchingPlaylist} from '../src/content/dashboard/spotify-selection.js';
const track={id:'spotify:3h5T5JypYU7huFiVYhv1dr',platform:'Spotify',title:'Song',artist:'A',url:'https://open.spotify.com/track/3h5T5JypYU7huFiVYhv1dr'};
test('matches complete artist/version identity and never invents missing Spotify IDs',()=>{
  assert.equal(spotifySelection([{...track,platform:'YouTube'}],[track])[0].url,track.url);
  assert.equal(spotifySelection([{...track,platform:'YouTube',title:'Song (Live)'}],[track])[0].url,null);
  assert.equal(spotifySelection([{...track,platform:'YouTube',artist:'B'}],[track])[0].url,null);
  assert.equal(spotifySelection([{...track,url:'javascript:alert(1)'}],[])[0].url,null);
});
test('published playlist only appears for the exact current selection',()=>{
 const p={url:'https://open.spotify.com/playlist/1234567890123456789012',trackUrls:[track.url]};
 assert.equal(matchingPlaylist([{url:track.url}],p),p);
 assert.equal(matchingPlaylist([{url:null}],p),null);
 assert.equal(matchingPlaylist([],p),null);
 assert.equal(matchingPlaylist([{url:track.url},{url:'https://open.spotify.com/track/another'}],p),null);
 assert.equal(matchingPlaylist([{url:track.url}],{...p,url:null}),null);
});
test('explicit catalogue alias fails closed if either source identity changes',()=>{
 const row={id:'kkbox:GptIJ2y--IKc1ewMvC',platform:'KKBOX',title:'甲乙丙丁Strangers - 你我怎麼兩清',artist:'李佳薇 (Jess Lee)'};
 const target={id:'spotify:629FqLOdjtsXh5b45FTk43',platform:'Spotify',title:'甲乙丙丁Strangers',artist:'Jess Lee',url:'https://open.spotify.com/track/629FqLOdjtsXh5b45FTk43'};
 assert.equal(spotifySelection([row],[target])[0].url,target.url);
 assert.equal(spotifySelection([{...row,title:row.title+' (Live)'}],[target])[0].url,null);
 assert.equal(spotifySelection([row],[{...target,artist:'Other'}])[0].url,null);
});
