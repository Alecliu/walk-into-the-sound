import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeWeeklyIssue, weekKey } from '../src/content/dashboard/weekly-model.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const arg=process.argv.indexOf('--date');
const asOf=arg>=0?process.argv[arg+1]:new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
if(!/^\d{4}-\d{2}-\d{2}$/.test(asOf)||Number.isNaN(Date.parse(asOf)))throw Error('Expected --date YYYY-MM-DD');
const snapshotPath=path.join(root,'src/data.json'), snapshot=JSON.parse(fs.readFileSync(snapshotPath));
const dir=path.join(root,'issues');fs.mkdirSync(dir,{recursive:true});
const target=path.join(dir,`${weekKey(asOf)}.json`);
if(fs.existsSync(target))console.log(`Preserved existing weekly issue: ${weekKey(asOf)}`);
else {
 const issue=makeWeeklyIssue(snapshot.queries.tracks.rows,asOf);
 const latestDate=issue.coverage.map(r=>r.date).sort().at(-1);
 if((new Date(asOf)-new Date(latestDate))/86400000>7)throw Error('No recent evidence: do not publish stale weekly issue');
 const temp=target+'.tmp';fs.writeFileSync(temp,JSON.stringify(issue,null,2)+'\n');fs.renameSync(temp,target);
 console.log(`Created ${issue.id}; ${issue.evidence.length} frozen source records`);
}
const issues=fs.readdirSync(dir).filter(n=>/^\d{4}-W\d{2}\.json$/.test(n)).sort().reverse().map(n=>JSON.parse(fs.readFileSync(path.join(dir,n))));
snapshot.queries.weekly={rows:issues,source:{name:'每週音樂觀察・固定版本',description:'每個 ISO 週最多一篇。文章、公式結果、來源期間與證據一同封存；後续日榜更新不重算舊文章。',files:issues.map(i=>`issues/${i.id}.json`),metricDefinitions:[{label:'固定歌曲群觀看變化',definition:'相鄰兩期 YouTube 全球 Top 100 皆在榜且前期觀看數大於 0 的歌曲，本期觀看總和除以前期觀看總和減 1。'},{label:'榜內集中度',definition:'YouTube 全球 Top 10 觀看數除以同一期 Top 100 觀看數。'},{label:'跨平台交集',definition:'各取 Spotify／YouTube 全球前 50 名，標準化歌名與完整歌手名單後配對，日期不同仍個別標示。'}]}};
const temp=snapshotPath+'.tmp';fs.writeFileSync(temp,JSON.stringify(snapshot,null,2)+'\n');fs.renameSync(temp,snapshotPath);
