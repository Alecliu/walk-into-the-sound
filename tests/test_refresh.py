import importlib.util
from pathlib import Path
import unittest
import json
spec = importlib.util.spec_from_file_location('refresh', Path(__file__).resolve().parents[1] / 'scripts/refresh-music.py')
refresh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(refresh)

class RefreshTests(unittest.TestCase):
    def row(self, identity='one', date='2026-09-24', rank=1):
        return dict(id=identity, platform='KKBOX', market='台灣', chart='test', date=date, title='test', artist='test', rank=rank, previousRank=None, url='https://www.kkbox.com/tw/tc/song/test', sourceUrl=refresh.KKBOX)
    def test_replaces_whole_day_not_only_matching_songs(self):
        old=[self.row('one'),self.row('dropped',rank=2),self.row('history','2026-09-23')]
        merged=refresh.merge_snapshots(old,[self.row('new')])
        self.assertEqual({r['id'] for r in merged},{'new','history'})
    def test_rejects_empty_or_duplicate_chart(self):
        with self.assertRaises(ValueError): refresh.validate_rows([])
        with self.assertRaises(ValueError): refresh.validate_rows([self.row(), self.row()])
    def test_rejects_missing_fields_and_bad_source(self):
        row=self.row();row['url']='javascript:alert(1)'
        with self.assertRaises(ValueError): refresh.validate_rows([row])
        row=self.row();row['title']=''
        with self.assertRaises(ValueError): refresh.validate_rows([row])
    def test_date_mismatch_and_page_redesign_fail_closed(self):
        with self.assertRaises(ValueError): refresh.parse_kkbox('<html>login</html>','now')
        with self.assertRaises(ValueError): refresh.parse_kkbox('var chart = [];\nvar chartDate = "2026-09-24";','now','2026-09-23')
    def test_spotify_requires_official_owner_and_preserves_update_date_semantics(self):
        entity={'id':refresh.SPOTIFY['全球'],'subtitle':'Spotify','format':'chart','attributes':[{'key':'last_updated','value':'2026-09-24T14:22:01Z'}],
            'trackList':[{'uri':'spotify:track:'+str(i).zfill(22),'title':f'Test {i}','subtitle':'Test Artist'} for i in range(50)]}
        def html():return '<script id="__NEXT_DATA__">'+json.dumps({'props':{'pageProps':{'state':{'data':{'entity':entity}}}}})+'</script>'
        result=refresh.parse_spotify(html(),'now')
        self.assertEqual(len(result),50);self.assertEqual(result[0]['dateBasis'],'playlistUpdated');self.assertIsNone(result[0]['previousRank'])
        entity['subtitle']='Unofficial'
        with self.assertRaises(ValueError):refresh.parse_spotify(html(),'now')
    def test_previous_snapshot_is_scoped_to_market_and_chart(self):
        row={**self.row(),'platform':'Spotify','market':'台灣'}
        prior={**row,'date':'2026-09-20','rank':30}
        unrelated={**row,'market':'全球','date':'2026-09-23','rank':2}
        result=refresh.with_previous_snapshot([row],[prior,unrelated])[0]
        self.assertEqual(result['previousRank'],30);self.assertEqual(result['comparisonDate'],'2026-09-20')
    def test_youtube_rejects_the_wrong_market_or_chart_type(self):
        content={'perspectiveMetadata':{'requestParams':{'chartParams':{'countryCode':'tw','chartType':'CHART_TYPE_VIDEOS'}}}}
        payload={'contents':{'sectionListRenderer':{'contents':[{'musicAnalyticsSectionRenderer':{'content':content}}]}}}
        with self.assertRaises(ValueError):refresh.parse_youtube(json.dumps(payload),'now')

if __name__=='__main__': unittest.main()
