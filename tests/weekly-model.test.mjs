import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { weekKey,weekRange,pairedStats,makeWeeklyIssue,archiveDates } from '../src/content/dashboard/weekly-model.js';
const issue=JSON.parse(fs.readFileSync(new URL('../issues/2026-W39.json',import.meta.url)));
test('ISO weeks do not create a second issue at a calendar-year boundary',()=>{
 assert.equal(weekKey('2027-01-01'),'2026-W53');
 assert.equal(weekKey('2026-12-28'),'2026-W53');
 assert.deepEqual(weekRange('2027-01-01'),['2026-12-28','2027-01-03']);
});
test('growth uses a fixed cohort, excludes missing/zero baselines and is not a mean of rates',()=>{
 const p=[{id:'a',views:100},{id:'b',views:10},{id:'c',views:0},{id:'out',views:200}];
 const c=[{id:'a',views:50},{id:'b',views:30},{id:'c',views:20},{id:'new',views:500}];
 const s=pairedStats(c,p);
 assert.equal(s.viewedCount,2);assert.equal(s.retained,3);assert.equal(s.entered,1);
 assert.equal(s.medianGrowth,.75);assert.ok(Math.abs(s.cohortGrowth-(80/110-1))<1e-12);
});
test('first period cannot be treated as a 100% influx or zero growth',()=>{
 const s=pairedStats([{id:'a',views:10}],[]);
 assert.equal(s.entered,null);assert.equal(s.medianGrowth,null);assert.equal(s.cohortGrowth,null);
});
test('published evidence reproduces first issue headline metrics',()=>{
 const regenerated=makeWeeklyIssue(issue.evidence,issue.asOf);
 assert.deepEqual(regenerated.metrics,issue.metrics);
 assert.equal(issue.metrics.kkCount,50);assert.equal(issue.metrics.kkSeats,10);
 assert.equal(issue.metrics.kkRetained+issue.metrics.kkEntered,50);
 assert.equal(issue.metrics.cohortCount,81);assert.equal(issue.metrics.globalMatches,6);
 for(const r of issue.candidates)assert.ok(r.weeksOnChart<=4&&r.calculatedGrowth>0&&r.priorViews>0);
});
test('future chart dates and records collected after cutoff never leak into an issue',()=>{
 const future={...issue.evidence[0],date:'2026-10-01',rank:1};
 const late={...issue.evidence[0],id:'late',observedAt:'2026-10-01T01:00:00Z'};
 assert.deepEqual(makeWeeklyIssue([...issue.evidence,future,late],issue.asOf).metrics,issue.metrics);
});
test('a two-week gap is not labelled week-on-week growth',()=>{
 const rows=issue.evidence.filter(r=>!(r.platform==='YouTube'&&r.date==='2026-09-10'));
 rows.push(...issue.evidence.filter(r=>r.platform==='YouTube'&&r.date==='2026-09-10').map(r=>({...r,date:'2026-09-03'})));
 const result=makeWeeklyIssue(rows,issue.asOf);
 assert.equal(result.metrics.cohortGrowth,null);assert.equal(result.metrics.ytPrior,null);assert.equal(result.candidates.length,0);
});
test('archive platform/month scope changes both date choices and counts',()=>{
 const result=archiveDates(issue.evidence,'2026-09','YouTube');
 assert.equal(result.length,2);assert.equal(result[0].count,200);
 assert.deepEqual(result[0].platforms,['YouTube']);
 assert.deepEqual(archiveDates(issue.evidence,'2026-08'),[]);
});
