import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts'))
from editorial_policy import validate_editorial_scope

class EditorialPolicyTests(unittest.TestCase):
    def test_excluded_topics_stop_publication(self):
        for text in ['兩岸關係如何影響歌曲','台灣本土政治與選舉','台独歌曲','反送中歌曲','中國共產黨宣傳歌','Taiwan independence and music']:
            with self.subTest(text=text),self.assertRaisesRegex(ValueError,'Excluded political subject'):
                validate_editorial_scope({'title':text})

    def test_language_and_locations_are_not_excluded(self):
        for text in ['台灣歌手在台北錄音','香港電影的配樂','華語流行歌的和聲','中國樂手與日本製作人的合作','愛爾蘭音樂人的吉他']:
            validate_editorial_scope({'title':text})

    def test_existing_stories_pass_current_topic_gate(self):
        for story in json.loads((ROOT/'src/data.json').read_text())['queries']['cityStories']['rows']:
            validate_editorial_scope(story)

if __name__=='__main__': unittest.main()
