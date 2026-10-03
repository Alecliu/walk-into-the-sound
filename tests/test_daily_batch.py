"""Quota, resumability and source gates; fixture articles are never published."""
import copy
import contextlib
import datetime as dt
import importlib.util
import json
from pathlib import Path
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from blog_validation import TAIPEI, validate_collection
from daily_plan import EDITORIAL_POLICY_VERSION, plan_for, published_count, remaining_slots, validate_assignment, select_ready
spec=importlib.util.spec_from_file_location('batch_runner',ROOT/'scripts/daily-blog.py')
daily=importlib.util.module_from_spec(spec)
spec.loader.exec_module(daily)
DAY='2026-10-04'

class DailyBatchTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((ROOT/'src/data.json').read_text())
        # Keep fixtures independent of tomorrow's real publication and future editions.
        self.rows=[s for s in self.data['queries']['cityStories']['rows'] if s['publishedAt'] < DAY]
        self.data['queries']['cityStories']['rows']=self.rows
        self.slots=plan_for(DAY)

    def ready(self,slot):
        story=copy.deepcopy(self.rows[0])
        story.pop('dailyKey',None)
        story.update(id='fixture-'+slot['id'],title='Fixture '+slot['id'],artist='Fixture Artist '+slot['id'],work='Fixture Work '+slot['id'],topics=[slot['topic']],publishedAt=DAY,reviewedAt=DAY)
        story['photo']=None
        story['places']=[]
        candidate={'status':'ready','reason':'','story':story,
                   'selection':{'releaseDate':'2026-09-30','releaseSource':story['sources'][0]['url'],'focusNote':'Explicit test fixture, not actual editorial research.'},
                   'evidence':[{'url':s['url'],'readAt':DAY,'supports':'Explicit fixture evidence, not a researched article for publication.'} for s in story['sources']]}
        review={'approved':True,'issues':[],'checkedUrls':[s['url'] for s in story['sources']],'summary':'Test fixture only'}
        return {'day':DAY,'slot':slot['id'],'policyVersion':EDITORIAL_POLICY_VERSION,'preparedAt':DAY+'T08:00:00+08:00','candidate':candidate,'review':review}

    def all_ready(self):
        return {s['id']:self.ready(s) for s in self.slots}

    def test_change_starts_tomorrow_and_reserves_two_new_releases(self):
        self.assertEqual(len(plan_for('2026-10-03')),1)
        self.assertEqual(len(self.slots),5)
        self.assertEqual(sum(s['recent'] for s in self.slots),2)
        plans=[plan_for((dt.date.fromisoformat(DAY)+dt.timedelta(days=i)).isoformat()) for i in range(4)]
        self.assertEqual(len({p[3]['topic'] for p in plans}),4)
        self.assertTrue(all('日本' not in s['focus'] and '韓國' not in s['focus'] for p in plans for s in p))
        self.assertEqual(len({p[2]['focus'] for p in plans}),4)

    def test_previous_policy_drafts_cannot_be_published(self):
        ready=self.all_ready();ready['new-release'].pop('policyVersion')
        selected,errors=select_ready(self.rows,DAY,ready)
        self.assertEqual(len(selected),4)
        self.assertIn('current editorial policy',errors['new-release'])

    def test_missing_photo_bundle_isolated_from_other_ready_slots(self):
        with tempfile.TemporaryDirectory() as temp:
            state=Path(temp)
            ready=self.all_ready()
            photo_id='place-'+'a'*16
            ready['producer']['candidate']['photoEvidence']=[{'photo':{'id':photo_id},'asset':{'source':'story-photos/'+photo_id+'.jpg','path':'assets/'+photo_id+'.'+'a'*12+'.jpg','sha256':'a'*64,'bytes':10}}]
            for slot,draft in ready.items():
                directory=state/'drafts'/DAY/'slots'/slot;directory.mkdir(parents=True)
                daily.write(directory/'ready.json',draft)
            valid=daily.ready_files(state,DAY)
            self.assertEqual(len(valid),4)
            self.assertNotIn('producer',valid)

    def test_five_unique_slots_and_retry_does_not_publish_again(self):
        ready=self.all_ready()
        selected,errors=select_ready(self.rows,DAY,ready)
        self.assertEqual(len(selected),5)
        self.assertEqual(errors,{})
        new_rows=self.rows+[s for s,_ in selected]
        self.assertEqual(published_count(new_rows,DAY),5)
        self.assertTrue(daily.published(new_rows,DAY))
        self.assertEqual(select_ready(new_rows,DAY,ready),([],{}))
        self.assertNotIn('dailyKey',ready['new-release']['candidate']['story'])
        self.data['queries']['cityStories']['rows']=new_rows
        validate_collection(self.data)
        sixth=copy.deepcopy(selected[0][0]);sixth.update(id='fixture-sixth',dailyKey=DAY+':sixth')
        new_rows.append(sixth)
        with self.assertRaisesRegex(ValueError,'More than five'):
            validate_collection(self.data)

    def test_partial_publication_resumes_only_missing_slots(self):
        ready=self.all_ready()
        selected,_=select_ready(self.rows,DAY,ready)
        posted=[selected[1][0],selected[3][0]]
        remaining,_=select_ready(self.rows+posted,DAY,ready)
        self.assertEqual([r['slot'] for _,r in remaining],['new-release','mv-location','artist-story'])
        manual=[dict(story,dailyKey=None) for story,_ in selected[:4]]
        self.assertEqual(len(remaining_slots(self.rows+manual,DAY)),1)

    def test_duplicate_slot_and_key_date_are_rejected(self):
        selected,_=select_ready(self.rows,DAY,self.all_ready())
        self.data['queries']['cityStories']['rows']+= [s for s,_ in selected[:2]]
        second=self.data['queries']['cityStories']['rows'][-1]
        second['dailyKey']=selected[0][0]['dailyKey']
        with self.assertRaisesRegex(ValueError,'Duplicate daily'):
            validate_collection(self.data)
        second['dailyKey']='2026-10-05:producer'
        with self.assertRaisesRegex(ValueError,'Invalid daily'):
            validate_collection(self.data)

    def test_bad_draft_does_not_block_other_valid_articles(self):
        ready=self.all_ready()
        ready['producer']['review']['approved']=False
        ready['artist-story']['preparedAt']='2026-10-03T08:00:00+08:00'
        selected,errors=select_ready(self.rows,DAY,ready)
        self.assertEqual(len(selected),3)
        self.assertEqual(set(errors),{'producer','artist-story'})

    def test_new_release_requires_current_release_and_source(self):
        candidate=self.ready(self.slots[0])['candidate']
        for invalid in ('2026-07-01','2026-10-05'):
            candidate['selection']['releaseDate']=invalid
            with self.assertRaisesRegex(ValueError,'within 60 days'):
                validate_assignment(candidate,self.rows,DAY,self.slots[0])
        candidate['selection'].update(releaseDate='2026-09-30',releaseSource='https://example.com/unread')
        with self.assertRaisesRegex(ValueError,'cited source'):
            validate_assignment(candidate,self.rows,DAY,self.slots[0])

    def test_cross_article_and_recent_artist_duplicates_rejected(self):
        ready=self.all_ready()
        ready['producer']['candidate']['story']['artist']=ready['new-release']['candidate']['story']['artist']
        selected,errors=select_ready(self.rows,DAY,ready)
        self.assertEqual(len(selected),4)
        self.assertIn('three days',errors['producer'])
        candidate=self.ready(self.slots[2])['candidate']
        candidate['story']['artist']=self.rows[0]['artist']
        with self.assertRaisesRegex(ValueError,'three days'):
            validate_assignment(candidate,self.rows,DAY,self.slots[2])

    def test_preparation_reuses_reviewed_drafts_and_retries_only_failure(self):
        with tempfile.TemporaryDirectory() as temp:
            state=Path(temp)
            skill=state/'skill';skill.mkdir();(skill/'SKILL.md').write_text('Fixture skill')
            work=state/'work';(work/'src').mkdir(parents=True)
            daily.write(work/'src/data.json',self.data)
            shutil.copytree(ROOT/'editorial',work/'editorial')
            cached=self.ready(self.slots[0])
            directory=state/'drafts'/DAY/'slots'/cached['slot'];directory.mkdir(parents=True)
            daily.write(directory/'ready.json',cached)
            @contextlib.contextmanager
            def checkout(_):
                yield work
            calls=[]
            fail_producer=[True]
            def codex(config,directory,prompt,schema,output,name,timeout):
                slot=json.loads((directory/'context.json').read_text())['assignment']
                calls.append((slot['id'],name))
                if fail_producer[0] and slot['id']=='producer':
                    raise ValueError('Fixture source unavailable')
                ready=self.ready(slot)
                return ready['candidate'] if name=='writer' else ready['review']
            with patch.object(daily,'checkout',checkout),patch.object(daily,'codex',codex),patch.object(daily,'run',return_value='fixture-base'),patch.object(daily,'now',return_value=dt.datetime(2026,10,4,8,tzinfo=TAIPEI)):
                daily.prepare({'humanizer':str(skill)},state,DAY)
                self.assertEqual(len(daily.ready_files(state,DAY)),4)
                self.assertFalse(any(slot=='new-release' for slot,_ in calls))
                calls.clear();fail_producer[0]=False
                daily.prepare({'humanizer':str(skill)},state,DAY)
                self.assertEqual(calls,[('producer','writer'),('producer','reviewer')])
                self.assertEqual(len(daily.ready_files(state,DAY)),5)

if __name__=='__main__':
    unittest.main()
