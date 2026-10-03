import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from blog_validation import validate_candidate, validate_collection, validate_site
spec=importlib.util.spec_from_file_location('daily_blog',ROOT/'scripts/daily-blog.py')
daily=importlib.util.module_from_spec(spec)
spec.loader.exec_module(daily)

class BlogPublicationTests(unittest.TestCase):
    def setUp(self):
        self.data=json.loads((ROOT/'src/data.json').read_text())
        self.story=copy.deepcopy(self.data['queries']['cityStories']['rows'][0])
        self.story['id']='test-music-article'
        self.story.pop('dailyKey',None)
        self.story['publishedAt']=self.story['reviewedAt']='2026-10-04'
        self.candidate={'status':'ready','reason':'','story':self.story,'evidence':[{'url':s['url'],'readAt':'2026-10-04','supports':'A specific verified source claim with enough detail to check.'} for s in self.story['sources']]}
    def test_original_routes_survive_growth(self):
        self.data['queries']['cityStories']['rows'].append(self.story)
        self.assertGreater(len(validate_collection(self.data)),20)
        self.data['queries']['cityStories']['rows']=[s for s in self.data['queries']['cityStories']['rows'] if s['id']!='paris-amelie-cafe']
        with self.assertRaisesRegex(ValueError,'original article'):
            validate_collection(self.data)
    def test_duplicate_day_and_candidate_rejected(self):
        self.assertTrue(daily.published([self.story],'2026-10-04'))
        with self.assertRaisesRegex(ValueError,'Duplicate article'):
            validate_candidate(self.candidate,[self.story],'2026-10-04')
        self.assertEqual(validate_candidate(self.candidate,[],'2026-10-04')['id'],'test-music-article')
    def test_stale_or_unreviewed_sources_rejected(self):
        with self.assertRaisesRegex(ValueError,'Wrong target date'):
            validate_candidate(self.candidate,[],'2026-10-05')
        self.candidate['evidence'][0]['readAt']='2026-10-03'
        with self.assertRaisesRegex(ValueError,'reading record'):
            validate_candidate(self.candidate,[],'2026-10-04')
    def test_review_must_open_every_source_and_report_no_issues(self):
        review={'approved':True,'issues':[],'checkedUrls':[s['url'] for s in self.story['sources']]}
        daily.approve_review(self.candidate,review)
        review['checkedUrls'].pop()
        with self.assertRaisesRegex(ValueError,'all sources'):
            daily.approve_review(self.candidate,review)
        review.update(approved=False,issues=['Unsupported fact'])
        with self.assertRaisesRegex(ValueError,'rejected'):
            daily.approve_review(self.candidate,review)
    def test_new_posts_can_omit_unconfirmed_geography(self):
        self.story.update(city='',cityEn='',tags=[],places=[])
        self.assertEqual(validate_candidate(self.candidate,[],'2026-10-04')['places'],[])
    def test_search_link_cannot_claim_verification(self):
        self.story['listen']['youtubeLabel']='Official MV'
        with self.assertRaisesRegex(ValueError,'labelled'):
            validate_candidate(self.candidate,[],'2026-10-04')
    def test_release_rejects_unchanged_site_after_data_edit(self):
        # A valid, small split bundle exercises real hash/source checks without rebuilding the runtime.
        import hashlib
        data=copy.deepcopy(self.data);data['buildStatus']='complete'
        with tempfile.TemporaryDirectory() as temp:
            root=Path(temp);(root/'src').mkdir();(root/'site').mkdir()
            source=json.dumps(data).encode();digest=hashlib.sha256(source).hexdigest();name='snapshot.'+digest+'.json'
            html=('<html>'+name+'</html>').encode()
            (root/'src/data.json').write_bytes(source);(root/'site'/name).write_bytes(source);(root/'site/index.html').write_bytes(html)
            manifest={'kind':'separate-data-v1','sourceSnapshotSha256':digest,'snapshot':{'path':name,'sha256':digest,'bytes':len(source)},'html':{'path':'index.html','sha256':hashlib.sha256(html).hexdigest(),'bytes':len(html)}}
            (root/'site/data-app-build.json').write_text(json.dumps(manifest))
            validate_site(root)
            data['queries']['cityStories']['rows'][0]['deck']='Changed in source only'
            (root/'src/data.json').write_text(json.dumps(data))
            with self.assertRaisesRegex(ValueError,'differs from source'):
                validate_site(root)

if __name__=='__main__':
    unittest.main()
