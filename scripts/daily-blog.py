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
from blog_validation import TAIPEI, require, validate_candidate, validate_collection, validate_site
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
    return any(s['publishedAt'] == day or s.get('dailyKey') == day for s in rows)

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

def prepare(config, state, day):
    directory = state / 'drafts' / day
    directory.mkdir(parents=True, exist_ok=True)
    with checkout(state) as work:
        data = read(work / 'src/data.json')
        rows = data['queries']['cityStories']['rows']
        if published(rows, day):
            print('An article already exists for ' + day)
            return
        if (directory / 'ready.json').exists():
            ready = read(directory / 'ready.json')
            validate_candidate(ready['candidate'], rows, day)
            approve_review(ready['candidate'], ready['review'])
            print('Reviewed draft already ready for ' + day)
            return
        context = {'date':day,'stories':[{k:s.get(k) for k in ('id','title','artist','work','publishedAt','topics')} for s in rows],
                   'scouting':data['queries']['scouting']['rows'],
                   'chartLeads':sorted(data['queries']['tracks']['rows'], key=lambda s:s['date'], reverse=True)[:100]}
        write(directory / 'context.json', context)
        shutil.copyfile(work / 'editorial/EDITORIAL.md', directory / 'editorial-policy.md')
        skill = Path(config['humanizer'])
        require((skill / 'SKILL.md').is_file(), 'humanizer-zh is missing')
        if (directory / 'humanizer').exists():
            shutil.rmtree(directory / 'humanizer')
        shutil.copytree(skill, directory / 'humanizer')
        focus = ['音樂故事：錄音、物件、配樂或現場','新歌觀察：從近期作品或有日期的榜單線索研究','音樂人筆記：作品、製作或演出值得追蹤的原因'][dt.date.fromisoformat(day).toordinal() % 3]
        prompt = (work/'editorial/daily-writer.txt').read_text().format(day=day, focus=focus)
        candidate = codex(config,directory,prompt,work/'editorial/daily-article.schema.json',directory/'candidate.json','writer',1500)
        validate_candidate(candidate, rows, day)
        review_prompt = (work/'editorial/daily-reviewer.txt').read_text().format(day=day)
        review = codex(config,directory,review_prompt,work/'editorial/daily-review.schema.json',directory/'review.json','reviewer',1200)
        approve_review(candidate, review)
        ready = {'day':day,'preparedAt':now().isoformat(),'baseCommit':run(['git','rev-parse','HEAD'],cwd=work),'candidate':candidate,'review':review}
        write(directory/'ready.json',ready)
        receipt(state,day,status='ready',articleId=candidate['story']['id'])
        print('Reviewed draft ready:', candidate['story']['title'])

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

def publish(config, state, day, allow_early=False, dry_run=False):
    require(allow_early or now().hour >= 9, 'Publication waits until 09:00 Asia/Taipei')
    directory = state/'drafts'/day
    with checkout(state) as work:
        data = read(work/'src/data.json')
        if published(data['queries']['cityStories']['rows'],day):
            sha = run(['git','rev-parse','HEAD'],cwd=work)
            action = verify_live(config,work,sha)
            receipt(state,day,status='already-published',commit=sha,action=action)
            print('Today already published and verified:', sha)
            return
    if not (directory/'ready.json').exists():
        # Wake/login after the preparation time: research first, publish late after all gates.
        prepare(config,state,day)
    ready = read(directory/'ready.json')
    with checkout(state) as work:
        data = read(work/'src/data.json')
        rows = data['queries']['cityStories']['rows']
        require(not published(rows,day), 'Another article was published while preparing; retry to verify it')
        story = validate_candidate(ready['candidate'],rows,day)
        approve_review(ready['candidate'],ready['review'])
        require(ready['day'] == day and dt.datetime.fromisoformat(ready['preparedAt']).astimezone(TAIPEI).date().isoformat() == day,'Draft is stale')
        story['dailyKey'] = day
        rows.insert(0,story)
        data['buildStatus']='complete'
        validate_collection(data)
        write(work/'src/data.json',data)
        evidence_dir = work/'editorial/daily'
        evidence_dir.mkdir(exist_ok=True)
        write(evidence_dir/(day+'.json'), {'date':day,'articleId':story['id'],'preparedAt':ready['preparedAt'],'sources':ready['candidate']['evidence'],'review':ready['review']})
        spec = spec_from_file_location('build_site',work/'scripts/build-site.py')
        builder = module_from_spec(spec)
        spec.loader.exec_module(builder)
        builder.build(work,config['node'],config['plugin'],True)
        run([config['node'],'--test']+[str(p) for p in sorted((work/'tests').glob('*.test.mjs'))],cwd=work,timeout=300)
        run([sys.executable,'-m','unittest','discover','-s','tests','-p','test_*.py'],cwd=work,timeout=300)
        validate_site(work)
        run(['git','diff','--check'],cwd=work)
        run(['git','add','--','src/data.json','site','editorial/daily/'+day+'.json'],cwd=work)
        changed = run(['git','diff','--cached','--name-only'],cwd=work).splitlines()
        require(all(p=='src/data.json' or p.startswith('site/') or p=='editorial/daily/'+day+'.json' for p in changed),'Unexpected staged changes')
        if dry_run:
            receipt(state,day,status='validated-dry-run',articleId=story['id'])
            print('Dry run passed; no commit or push.')
            return
        run(['git','-c','user.name=Walk into the sound','-c','user.email=5766352+Alecliu@users.noreply.github.com','commit','-m','Publish daily music article '+day],cwd=work)
        sha=run(['git','rev-parse','HEAD'],cwd=work)
        receipt(state,day,status='built',commit=sha,articleId=story['id'])
        run(['git','push',REMOTE,'HEAD:main'],cwd=work,timeout=600)
        receipt(state,day,status='pushed')
        action=verify_live(config,work,sha)
        receipt(state,day,status='published',action=action,url=LIVE+'#cities/'+story['id'])
        print('Published and verified:', LIVE+'#cities/'+story['id'])

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
        print(json.dumps({'schedule':'Asia/Taipei 08:00 prepare; 09:00 publish; 09:15/09:30 retry','state':str(state),'receipt':read(state/'drafts'/day/'receipt.json') if (state/'drafts'/day/'receipt.json').exists() else None},ensure_ascii=False,indent=2))
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
            else:
                publish(config,state,day,dry_run=args.dry_run)
        except Exception as error:
            receipt(state,day,status='failed',error=str(error))
            raise

if __name__=='__main__':
    main()
