"""Topic exclusions supplement, but never replace, the source-reading review."""
import re

# Match political subjects, not languages, cities, artists' origins or ordinary place names.
EXCLUDED_SUBJECTS = re.compile(
    r'兩岸|两岸|台海|臺海|台獨|臺獨|台独|統獨|统独|統一台灣|统一台湾|'
    r'一國兩制|一国两制|九二共識|九二共识|民進黨|民进党|國民黨|国民党|'
    r'台灣民眾黨|臺灣民眾黨|台灣基進|時代力量|中國共產黨|中国共产党|中共|'
    r'習近平|习近平|賴清德|赖清德|蔡英文|馬英九|马英九|柯文哲|'
    r'六四|天安門事件|天安门事件|反送中|雨傘運動|雨伞运动|港獨|港独|'
    r'(?:台灣|臺灣|台湾).{0,8}(?:政治|選舉|选举|罷免|罢免|政黨|政党)|'
    r'(?:中國|中国|大陸|大陆|香港|澳門|澳门).{0,8}(?:政治|政權|政权|民主運動|民主运动)|'
    r'cross[- ]strait|taiwan(?:ese)? (?:politics|independence)|chinese communist party',
    re.I,
)

def editorial_text(story):
    # URLs and raw photo metadata are evidence, not editorial claims.
    text = [str(story.get(k, '')) for k in ('title','deck','anchor','work','artist','lens')]
    text += list(story.get('topics', []))
    for field, keys in (('sections',('title','body')),('timeline',('event',)),('places',('name','detail')),('sources',('title',))):
        for item in story.get(field, []):
            text.extend(str(item.get(k,'')) for k in keys)
    return re.sub(r'https?://[^\s)]+', '', '\n'.join(text))

def validate_editorial_scope(story):
    match = EXCLUDED_SUBJECTS.search(editorial_text(story))
    if match:
        raise ValueError('Excluded political subject needs a different music topic: '+match.group(0))
