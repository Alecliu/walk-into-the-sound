"""Local daily editorial pipeline. State/auth remain outside the public repository."""
import argparse
import contextlib
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import time
from urllib.request import urlopen, Request
from blog_validation import TAIPEI, require, validate_collection, validate_site
from daily_plan import FIVE_ARTICLE_START, plan_for, published_count, remaining_slots, validate_assignment, select_ready
from importlib.util import spec_from_file_location, module_from_spec

ROOT = Path(__file__).resolve().parents[1]
REMOTE = 'https://github.com/Alecliu/walk-into-the-sound.git'
REPO = 'Alecliu/walk-into-the-sound'
LIVE = 'https://alecliu.github.io/walk-into-the-sound/'
DEFAULT_STATE = Path.home() / 'Library/Application Support/WalkIntoTheSound'

def read(path):
    return json.loads(Path(path).read_text())

def write(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + '.tmp')
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(path)

def run(command, cwd=None, timeout=300, capture=True, **kwargs):
    print('Running:', command[0], command[1] if len(command)>1 else '', flush=True)
    result = subprocess.run(command, cwd=cwd, timeout=timeout, check=True, text=True, stdout=subprocess.PIPE if capture else None, **kwargs)
    return result.stdout.strip() if capture else ''

def now():
    return dt.datetime.now(TAIPEI)

def published(rows, day):
    return published_count(rows, day) >= len(plan_for(day))

def receipt(state, day, **fields):
    path = state / 'drafts' / day / 'receipt.json'
    path.parent.mkdir(parents=True, exist_ok=True)
    previous = read(path) if path.exists() else {}
    previous.update(fields, checkedAt=now().isoformat())
    write(path, previous)

@contextlib.contextmanager
def checkout(state):
    """Only the private automation mirror/worktrees are changed, never the user's checkout."""
    mirror = state / 'repository.git'
    if not mirror.exists():
        run(['git', 'clone', '--bare', REMOTE, str(mirror)], timeout=600)
    require(run(['git','--git-dir',str(mirror),'remote','get-url','origin']) == REMOTE, 'Unexpected remote')
    run(['git','--git-dir',str(mirror),'fetch','origin','refs/heads/main:refs/remotes/origin/main'], timeout=600)
    workspace = Path(tempfile.mkdtemp(prefix='work-', dir=str(state))) / 'checkout'
    run(['git','--git-dir',str(mirror),'worktree','add','--detach',str(workspace),'refs/remotes/origin/main'])
    try:
        yield workspace
    except BaseException:
        print('Preserved failed worktree:', workspace, flush=True)
        raise
    else:
        # Successful temporary worktrees contain only pipeline-owned files, including ignored dist.
        run(['git','--git-dir',str(mirror),'worktree','remove','--force',str(workspace)])
        workspace.parent.rmdir()

def codex(config, directory, prompt, schema, output, name, timeout):
    env = os.environ.copy()
    for key in ('CODEX_THREAD_ID','CODEX_SESSION_ID'):
        env.pop(key, None)
    command = [config['codex'],'exec','--sandbox','read-only','-c','approval_policy="never"','-c','web_search="live"',
               '--ephemeral','--skip-git-repo-check','-C',str(directory),'--output-schema',str(schema),'-o',str(output),'-']
    with (directory / (name + '.log')).open('w') as log:
        subprocess.run(command, input=prompt, text=True, stdout=log, stderr=subprocess.STDOUT, env=env, timeout=timeout, check=True)
    return read(output)

def approve_review(candidate, review):
    require(review['approved'] is True and review['issues'] == [], 'Editorial review rejected: ' + '; '.join(review['issues']))
    require(set(review['checkedUrls']) == {s['url'] for s in candidate['story']['sources']}, 'Reviewer did not read all sources')

def ready_files(state, day):
    result = {}
    for slot in plan_for(day):
        path = state/'drafts'/day/'slots'/slot['id']/'ready.json'
        if path.exists():
            result[slot['id']] = read(path)
    return result

def prepare(config, state, day):
    with checkout(state) as work:
        data = read(work/'src/data.json')
        rows = data['queries']['cityStories']['rows']
        if published(rows, day):
            print('Daily article target already reached for '+day)
            return
        cached, _ = select_ready(rows, day, ready_files(state, day))
        accepted = {ready['slot']:ready for _,ready in cached}
        # Include all valid cached drafts when choosing later topics, even after restart.
        existing = rows+[story for story,_ in cached]
        failures = {}
        for slot in remaining_slots(rows, day):
            if slot['id'] in accepted:
                continue
            directory = state/'drafts'/day/'slots'/slot['id']
            directory.mkdir(parents=True, exist_ok=True)
            try:
                require(now().date().isoformat()==day, 'Preparation crossed into a new day')
                context = {'date':day, 'assignment':slot,
                           'stories':[{k:s.get(k) for k in ('id','title','artist','work','publishedAt','topics')} for s in existing],
                           'scouting':data['queries']['scouting']['rows'],
                           'chartLeads':sorted(data['queries']['tracks']['rows'], key=lambda s:s['date'], reverse=True)[:100]}
                write(directory/'context.json',context)
                shutil.copyfile(work/'editorial/EDITORIAL.md', directory/'editorial-policy.md')
                skill = Path(config['humanizer'])
                require((skill/'SKILL.md').is_file(), 'humanizer-zh is missing')
                if (directory/'humanizer').exists():
                    shutil.rmtree(directory/'humanizer')
                shutil.copytree(skill,directory/'humanizer')
                prompt = (work/'editorial/daily-writer.txt').read_text().format(day=day,focus=slot['focus'])
                candidate = codex(config,directory,prompt,work/'editorial/daily-article.schema.json',directory/'candidate.json','writer',1500)
                story = validate_assignment(candidate,existing,day,slot)
                review = codex(config,directory,(work/'editorial/daily-reviewer.txt').read_text().format(day=day),work/'editorial/daily-review.schema.json',directory/'review.json','reviewer',1200)
                approve_review(candidate,review)
                require(now().date().isoformat()==day, 'Review crossed into a new day')
                ready = {'day':day,'slot':slot['id'],'preparedAt':now().isoformat(),'baseCommit':run(['git','rev-parse','HEAD'],cwd=work),'candidate':candidate,'review':review}
                write(directory/'ready.json',ready)
                accepted[slot['id']] = ready
                existing.append(story)
                print('Reviewed draft ready:',story['title'])
            except Exception as error:
                failures[slot['id']] = str(error)
                write(directory/'failure.json',{'date':day,'slot':slot['id'],'checkedAt':now().isoformat(),'error':str(error)})
                # A rejected slot never makes another checked article disappear.
                if (directory/'ready.json').exists():
                    (directory/'ready.json').unlink()
                print('Slot stopped:',slot['id'],str(error),flush=True)
            receipt(state,day,status='preparing',target=len(plan_for(day)),readySlots=list(accepted),failedSlots=failures)
        receipt(state,day,status='ready' if not failures else 'partially-ready',target=len(plan_for(day)),readySlots=list(accepted),failedSlots=failures)

def fetch_bytes(url):
    with urlopen(Request(url, headers={'User-Agent':'WalkIntoTheSound-PublicationCheck/1.0','Cache-Control':'no-cache'}), timeout=40) as response:
        return response.read()

def verify_live(config, work, sha):
    """Success requires the exact Actions head and matching deployed HTML + data bytes."""
    deadline = time.monotonic() + 1200
    run_id = None
    rerun = False
    while time.monotonic() < deadline:
        runs = json.loads(run([config['gh'],'run','list','--repo',REPO,'--workflow','pages.yml','--commit',sha,'--limit','5','--json','databaseId,status,conclusion']))
        if runs:
            status = runs[0]
            run_id = status['databaseId']
            if status['status'] == 'completed':
                if status['conclusion'] == 'success':
                    break
                if not rerun:
                    run([config['gh'],'run','rerun',str(run_id),'--failed','--repo',REPO])
                    rerun = True
                else:
                    raise RuntimeError('GitHub Actions failed: ' + str(run_id))
        time.sleep(15)
    else:
        raise RuntimeError('Timed out waiting for GitHub Actions: ' + sha)
    expected = read(work/'site/data-app-build.json')
    for attempt in range(20):
        live = json.loads(fetch_bytes(LIVE + 'data-app-build.json?verify=' + sha))
        if live == expected:
            html = fetch_bytes(LIVE+'index.html?verify='+sha)
            snapshot = fetch_bytes(LIVE + expected['snapshot']['path'])
            require(hashlib.sha256(html).hexdigest() == expected['html']['sha256'], 'Live HTML hash mismatch')
            require(hashlib.sha256(snapshot).hexdigest() == expected['snapshot']['sha256'], 'Live snapshot hash mismatch')
            asset_manifest=work/'src/content/assets/web-assets.json'
            if asset_manifest.exists():
                for asset in read(asset_manifest).values():
                    with urlopen(Request(LIVE+asset['path'],method='HEAD'),timeout=40) as response:
                        require(response.status==200, 'Published image unavailable')
                        length=response.headers.get('Content-Length')
                        require(length is None or int(length)==asset['bytes'], 'Published image size mismatch')
            return 'https://github.com/'+REPO+'/actions/runs/'+str(run_id)
        time.sleep(15)
    raise RuntimeError('Pages content does not match the deployed commit')

def publish(config, state, day, allow_early=False, dry_run=False, research_missing=True):
    require(allow_early or now().hour >= 9, 'Publication waits until 09:00 Asia/Taipei')
    with checkout(state) as work:
        data = read(work/'src/data.json')
        rows = data['queries']['cityStories']['rows']
        if published(rows,day):
            sha = run(['git','rev-parse','HEAD'],cwd=work)
            action = verify_live(config,work,sha) if not dry_run else None
            receipt(state,day,status='already-published' if not dry_run else 'validated-dry-run',commit=sha,action=action,publishedCount=published_count(rows,day),target=len(plan_for(day)))
            print('Today already published'+(' and verified' if not dry_run else '')+':', sha)
            return
        cached, errors = select_ready(rows,day,ready_files(state,day))
        missing = len(cached) < len(remaining_slots(rows,day))
    # Dry runs never start research or write externally. Normal retries resume missing slots.
    if missing and not cached and not dry_run and research_missing:
        prepare(config,state,day)
    with checkout(state) as work:
        data = read(work/'src/data.json')
        rows = data['queries']['cityStories']['rows']
        if published(rows,day):
            sha = run(['git','rev-parse','HEAD'],cwd=work)
            action = verify_live(config,work,sha) if not dry_run else None
            receipt(state,day,status='already-published' if not dry_run else 'validated-dry-run',commit=sha,action=action,publishedCount=published_count(rows,day),target=len(plan_for(day)))
            return
        selected, errors = select_ready(rows,day,ready_files(state,day))
        require(selected, 'No publishable articles: '+json.dumps(errors,ensure_ascii=False))
        require(now().date().isoformat()==day, 'Publication crossed into a new day')
        rows[0:0] = [story for story,_ in selected]
        require(published_count(rows,day) <= len(plan_for(day)), 'Daily article limit exceeded')
        data['buildStatus']='complete'
        validate_collection(data)
        write(work/'src/data.json',data)
        evidence_dir = work/'editorial/daily'
        evidence_dir.mkdir(exist_ok=True)
        evidence_paths = []
        for story,ready in selected:
            evidence_path = 'editorial/daily/'+day+'-'+ready['slot']+'.json'
            evidence_paths.append(evidence_path)
            write(work/evidence_path, {'date':day,'slot':ready['slot'],'articleId':story['id'],'preparedAt':ready['preparedAt'],'selection':ready['candidate'].get('selection',{}),'sources':ready['candidate']['evidence'],'review':ready['review']})
        spec = spec_from_file_location('build_site',work/'scripts/build-site.py')
        builder = module_from_spec(spec)
        spec.loader.exec_module(builder)
        builder.build(work,config['node'],config['plugin'],True)
        run([config['node'],'--test']+[str(p) for p in sorted((work/'tests').glob('*.test.mjs'))],cwd=work,timeout=300)
        run([sys.executable,'-m','unittest','discover','-s','tests','-p','test_*.py'],cwd=work,timeout=300)
        validate_site(work)
        run(['git','diff','--check'],cwd=work)
        run(['git','add','--','src/data.json','site']+evidence_paths,cwd=work)
        changed = run(['git','diff','--cached','--name-only'],cwd=work).splitlines()
        require(all(p=='src/data.json' or p.startswith('site/') or p in evidence_paths for p in changed),'Unexpected staged changes')
        article_ids = [story['id'] for story,_ in selected]
        if dry_run:
            receipt(state,day,status='validated-dry-run',articleIds=article_ids,publishedCount=published_count(rows,day),target=len(plan_for(day)))
            print('Dry run passed; no commit or push.')
            return
        require(now().date().isoformat()==day, 'Build crossed into a new day')
        run(['git','-c','user.name=Walk into the sound','-c','user.email=5766352+Alecliu@users.noreply.github.com','commit','-m','Publish '+str(len(selected))+' daily music articles '+day],cwd=work)
        sha=run(['git','rev-parse','HEAD'],cwd=work)
        receipt(state,day,status='built',commit=sha,articleIds=article_ids,target=len(plan_for(day)))
        run(['git','push',REMOTE,'HEAD:main'],cwd=work,timeout=600)
        receipt(state,day,status='pushed')
        action=verify_live(config,work,sha)
        receipt(state,day,status='published' if published(rows,day) else 'partially-published',action=action,urls=[LIVE+'#cities/'+i for i in article_ids],publishedCount=published_count(rows,day),failedSlots=errors)
        print('Published and verified:',len(selected),'new articles;',published_count(rows,day),'of',len(plan_for(day)),'today')

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument('mode',choices=['prepare','publish','status','self-check'])
    parser.add_argument('--config',type=Path,default=DEFAULT_STATE/'config.json')
    parser.add_argument('--dry-run',action='store_true')
    args=parser.parse_args()
    config=read(args.config)
    state=Path(config['state'])
    state.mkdir(parents=True,exist_ok=True)
    day=now().date().isoformat()
    if args.mode=='status':
        print(json.dumps({'schedule':'Asia/Taipei 05:00 prepare; 09:00 publish; 09:15/09:30 retry','fiveArticleStart':FIVE_ARTICLE_START,'targetToday':len(plan_for(day)),'slots':[s['id'] for s in plan_for(day)],'state':str(state),'receipt':read(state/'drafts'/day/'receipt.json') if (state/'drafts'/day/'receipt.json').exists() else None},ensure_ascii=False,indent=2))
        return
    for key in ('codex','node','gh'):
        require(Path(config[key]).is_file(),'Missing tool: '+key)
    if args.mode=='self-check':
        run([config['codex'],'login','status'])
        permission=json.loads(run([config['gh'],'api','repos/'+REPO,'--jq','.permissions']))
        require(permission['push'],'GitHub push permission missing')
        require((Path(config['plugin'])/'scripts/data-app.mjs').is_file(),'Data plugin missing')
        require((Path(config['humanizer'])/'SKILL.md').is_file(),'humanizer-zh missing')
        print('Tools, Codex authentication, GitHub push access, builder and humanizer are available.')
        return
    # launchd calendar intervals follow the system timezone; fail explicitly if it changes.
    require(dt.datetime.now().astimezone().utcoffset()==dt.timedelta(hours=8),'Set this Mac timezone to Asia/Taipei before using its calendar schedule')
    if args.mode=='publish' and now().hour<9:
        print('Waiting for 09:00 Asia/Taipei')
        return
    with (state/'pipeline.lock').open('w') as lock:
        try:
            fcntl.flock(lock,fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            print('Another editorial run is active; next scheduled retry will check again.')
            return
        try:
            if args.mode=='prepare':
                prepare(config,state,day)
                # Login/wake after 09:00: the competing publish job may have hit this lock.
                if now().hour >= 9:
                    publish(config,state,day,dry_run=args.dry_run,research_missing=False)
            else:
                publish(config,state,day,dry_run=args.dry_run)
        except Exception as error:
            receipt(state,day,status='failed',error=str(error))
            raise

if __name__=='__main__':
    main()
