import copy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from story_photos import licensed_metadata, prepare_photos, fetch_photo, publish_photos, validate_photo_review, download_image

class StoryPhotoTests(unittest.TestCase):
    def info(self):
        return {'descriptionurl':'https://commons.wikimedia.org/wiki/File:Fixture.jpg','thumburl':'https://upload.wikimedia.org/wikipedia/commons/thumb/fixture.jpg',
                'extmetadata':{k:{'value':v} for k,v in {'Artist':'<b>Fixture photographer</b>','Attribution':'Credit exactly this way','LicenseShortName':'CC BY-SA 4.0','LicenseUrl':'https://creativecommons.org/licenses/by-sa/4.0/'}.items()}}

    def test_licenses_keep_author_and_extra_attribution(self):
        photo=licensed_metadata(self.info())
        self.assertEqual(photo['author'],'Fixture photographer')
        self.assertEqual(photo['attribution'],'Credit exactly this way')
        for url in ['https://creativecommons.org/licenses/by-nc/4.0/','https://creativecommons.org/licenses/by-nd/4.0/','https://example.com/free','https://creativecommons.org.evil.test/licenses/by/4.0/']:
            info=self.info();info['extmetadata']['LicenseUrl']['value']=url
            with self.assertRaises(ValueError): licensed_metadata(info)

    def test_downloader_rejects_arbitrary_hosts_before_network(self):
        for url in ['http://upload.wikimedia.org/wikipedia/commons/a.jpg','https://example.com/photo.jpg','https://upload.wikimedia.org/private/x.jpg']:
            with self.assertRaisesRegex(ValueError,'download host'): download_image(url)

    def test_every_place_needs_photo_and_reviewer_must_see_it(self):
        with tempfile.TemporaryDirectory() as temp:
            with self.assertRaisesRegex(ValueError,'Every place'):
                prepare_photos({'story':{'places':[{'name':'Fixture'}]},'photoRequests':[]},temp,'2026-10-04')
        candidate={'story':{'places':[{'photo':{'id':'fixture'}}]},'photoEvidence':[{'photo':{'id':'fixture'}}]}
        with self.assertRaisesRegex(ValueError,'inspect every photo'): validate_photo_review(candidate,{'checkedPhotoIds':[]})
        validate_photo_review(candidate,{'checkedPhotoIds':['fixture']})

    def test_reviewed_bytes_are_bound_to_publication_and_paths_are_confined(self):
        # Explicit synthetic bytes; never used as an editorial photo or published fixture.
        with tempfile.TemporaryDirectory() as temp,patch('story_photos.download_image',return_value=(b'fixture image bytes','jpg')):
            base=Path(temp);draft=base/'draft';work=base/'work';assets=work/'src/content/assets';assets.mkdir(parents=True)
            (assets/'web-assets.json').write_text('{}')
            request={'commonsTitle':'File:Fixture.jpg','placeIndex':0,'caption':'Fixture only','alt':'Fixture','scope':'area'}
            record=fetch_photo(request,draft/'photos','2026-10-04',info=self.info())
            candidate={'photoEvidence':[record]}
            paths=publish_photos(candidate,draft,work)
            self.assertEqual(len(paths),3)
            self.assertEqual((assets/record['asset']['source']).read_bytes(),b'fixture image bytes')
            self.assertIn(record['photo']['id'],json.loads((assets/'story-photos/verified-photos.json').read_text()))
            bad=copy.deepcopy(candidate);bad['photoEvidence'][0]['asset']['source']='../../outside.jpg'
            with self.assertRaisesRegex(ValueError,'asset path'): publish_photos(bad,draft,work)
            (draft/'photos'/Path(record['asset']['source']).name).write_bytes(b'changed')
            with self.assertRaisesRegex(ValueError,'bytes changed'): publish_photos(candidate,draft,work)

if __name__=='__main__': unittest.main()
