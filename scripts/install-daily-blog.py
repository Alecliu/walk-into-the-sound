"""Configure this Mac's user launchd jobs; no credentials or local paths enter Git."""
import argparse
import datetime as dt
import json
import os
from pathlib import Path
import plistlib
import shutil
import subprocess
import sys
from daily_plan import PREPARE_HOUR

ROOT=Path(__file__).resolve().parents[1]
STATE=Path.home()/'Library/Application Support/WalkIntoTheSound'
parser=argparse.ArgumentParser()
parser.add_argument('--install',action='store_true',help='Load the two launchd jobs (otherwise only write private configuration)')
args=parser.parse_args()
if dt.datetime.now().astimezone().utcoffset()!=dt.timedelta(hours=8):
    raise SystemExit('Set the Mac timezone to Asia/Taipei before installing this calendar schedule.')
STATE.mkdir(parents=True,exist_ok=True)
os.chmod(STATE,0o700)
(STATE/'logs').mkdir(exist_ok=True)
# launchd cannot inherit Codex's macOS Documents-folder permission. Install only
# the application-owned runner in Application Support; keep the checkout in place.
runtime=STATE/'runtime'
runtime.mkdir(exist_ok=True)
for name in ('daily-blog.py','blog_validation.py','daily_plan.py','editorial_policy.py','story_photos.py'):
    shutil.copyfile(ROOT/'scripts'/name,runtime/name)
codex_home=Path(os.environ.get('CODEX_HOME',str(Path.home()/'.codex')))
config={'state':str(STATE),'project':str(ROOT),'node':shutil.which('node'),'gh':shutil.which('gh'),'codex':shutil.which('codex'),
        'plugin':str(codex_home/'plugins/cache/openai-curated-remote/data-analytics/1.0.11'),'humanizer':str(codex_home/'skills/humanizer-zh')}
for key in ('node','gh','codex'):
    if not config[key] or not Path(config[key]).is_file():
        raise SystemExit('Required executable is missing: '+key)
for key,file in (('plugin','scripts/data-app.mjs'),('humanizer','SKILL.md')):
    if not (Path(config[key])/file).is_file():
        raise SystemExit('Required installed component is missing: '+key)
config_path=STATE/'config.json'
config_path.write_text(json.dumps(config,indent=2)+'\n')
os.chmod(config_path,0o600)
subprocess.run([sys.executable,str(ROOT/'scripts/daily-blog.py'),'self-check','--config',str(config_path)],check=True)
if not args.install:
    print('Private configuration ready. Pass --install to load the schedule.')
    raise SystemExit(0)
launch_agents=Path.home()/'Library/LaunchAgents'
launch_agents.mkdir(exist_ok=True)
for mode,interval in [('prepare',[{'Hour':PREPARE_HOUR,'Minute':0}]),('publish',[{'Hour':9,'Minute':0},{'Hour':9,'Minute':15},{'Hour':9,'Minute':30}])]:
    label='com.walkintothesound.'+mode
    target='gui/'+str(os.getuid())+'/'+label
    subprocess.run(['launchctl','bootout',target],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
    plist={'Label':label,'ProgramArguments':['/usr/bin/caffeinate','-i',sys.executable,str(runtime/'daily-blog.py'),mode,'--config',str(config_path)],
           'WorkingDirectory':str(STATE),'StartCalendarInterval':interval,'RunAtLoad':True,'ProcessType':'Background','LowPriorityIO':True,
           'EnvironmentVariables':{'PATH':str(Path.home()/'.local/bin')+':/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin','PYTHONUNBUFFERED':'1','TZ':'Asia/Taipei'},
           'StandardOutPath':str(STATE/'logs'/(mode+'.log')),'StandardErrorPath':str(STATE/'logs'/(mode+'.error.log'))}
    path=launch_agents/(label+'.plist')
    with path.open('wb') as handle:
        plistlib.dump(plist,handle)
    subprocess.run(['launchctl','bootstrap','gui/'+str(os.getuid()),str(path)],check=True)
    print('Loaded',label,interval)
