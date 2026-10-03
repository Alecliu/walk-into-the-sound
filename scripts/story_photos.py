"""Download explicitly selected Commons photos; keep license proof and bytes together."""
import hashlib
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from blog_validation import require

UA = 'WalkIntoTheSound/1.0 (https://github.com/Alecliu/walk-into-the-sound; licensed editorial photos)'
MAX_BYTES = 15 * 1024 * 1024

def plain(value):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', value))).strip()

def licensed_metadata(info):
    metadata = info['extmetadata']
    def value(key):
        return plain(metadata.get(key, {}).get('value', ''))
    license_url = value('LicenseUrl').replace('http://creativecommons.org/', 'https://creativecommons.org/')
    parsed = urlparse(license_url)
    require(parsed.hostname == 'creativecommons.org' and parsed.scheme == 'https', 'Unapproved photo license host')
    require(re.fullmatch(r'/(?:licenses/by(?:-sa)?/(?:2\.0|2\.5|3\.0|4\.0)|publicdomain/zero/1\.0)/?(?:deed\.[a-z-]+)?', parsed.path), 'Photo needs CC0, CC BY or CC BY-SA')
    require(value('Artist') and value('LicenseShortName'), 'Missing photo author or license')
    require(urlparse(info['descriptionurl']).hostname == 'commons.wikimedia.org', 'Photo source must be Commons')
    return {'author':value('Artist'), 'attribution':value('Attribution'), 'sourceUrl':info['descriptionurl'], 'license':value('LicenseShortName'), 'licenseUrl':license_url}

def download_image(url):
    def permitted(url):
        parsed=urlparse(url)
        return parsed.scheme=='https' and parsed.hostname in ('upload.wikimedia.org','thumb.wikimedia.org') and parsed.path.startswith('/wikipedia/commons/')
    require(permitted(url), 'Unapproved image download host')
    with urlopen(Request(url,headers={'User-Agent':UA}),timeout=60) as response:
        require(permitted(response.geturl()), 'Unexpected image redirect')
        content=response.read(MAX_BYTES+1)
    require(0 < len(content) <= MAX_BYTES, 'Image exceeds size limit')
    if content.startswith(b'\xff\xd8\xff'): extension='jpg'
    elif content.startswith(b'\x89PNG\r\n\x1a\n'): extension='png'
    elif content[:4]==b'RIFF' and content[8:12]==b'WEBP': extension='webp'
    else: raise ValueError('Expected a JPEG, PNG or WebP photo')
    return content, extension

def fetch_photo(request, directory, day, info=None):
    title=request['commonsTitle']
    require(title.startswith('File:') and len(title)<400, 'Need an exact Commons File title')
    require(request['scope'] in ('exact','area'), 'Photo scope must identify exact place or surrounding area')
    require(request['caption'].strip() and request['alt'].strip(), 'Photo needs caption and alt text')
    if info is None:
        url='https://commons.wikimedia.org/w/api.php?'+urlencode({'action':'query','titles':title,'prop':'imageinfo','iiprop':'url|extmetadata','iiurlwidth':1200,'format':'json'})
        with urlopen(Request(url,headers={'User-Agent':UA}),timeout=45) as response:
            pages=json.load(response).get('query',{}).get('pages',{})
        require(len(pages)==1, 'Commons file not found')
        page=next(iter(pages.values()))
        require(page.get('imageinfo'), 'Commons file has no image')
        info=page['imageinfo'][0]
    photo=licensed_metadata(info)
    download=info.get('thumburl') or info['url']
    content,extension=download_image(download)
    digest=hashlib.sha256(content).hexdigest()
    photo_id='place-'+digest[:16]
    source='story-photos/'+photo_id+'.'+extension
    asset={'source':source,'path':'assets/'+photo_id+'.'+digest[:12]+'.'+extension,'sha256':digest,'bytes':len(content)}
    photo.update(id=photo_id,caption=request['caption'],alt=request['alt'],scope=request['scope'])
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    (directory/Path(source).name).write_bytes(content)
    return {'photo':photo,'asset':asset,'commonsTitle':title,'downloadUrl':download,'metadata':info['extmetadata'],'checkedAt':day,'placeIndex':request['placeIndex']}

def prepare_photos(candidate, directory, day):
    story=candidate['story']
    requests=candidate.get('photoRequests',[])
    places=story.get('places',[])
    require(len(places)<=3, 'Keep location coverage to three relevant places')
    require(len(requests)==len(places) and {r['placeIndex'] for r in requests}==set(range(len(places))), 'Every place needs one licensed location photo')
    require(not story.get('photo') and not any(p.get('photo') for p in places), 'Writer may request photos, not invent approved image records')
    records=[]
    for request in requests:
        record=fetch_photo(request,Path(directory)/'photos',day)
        places[request['placeIndex']]['photo']=record['photo']
        records.append(record)
    if records:
        story['photo']=places[0]['photo']
    candidate['photoEvidence']=records
    return candidate

def validate_photo_review(candidate, review):
    expected={p['photo']['id'] for p in candidate.get('photoEvidence',[])}
    require(set(review.get('checkedPhotoIds',[]))==expected, 'Reviewer did not inspect every photo')
    places=candidate['story'].get('places',[])
    require(all(p.get('photo') and p['photo']['id'] in expected for p in places), 'Location photo evidence missing')

def reviewed_file(record, directory):
    photo=record['photo'];asset=record['asset'];photo_id=photo['id']
    require(re.fullmatch(r'place-[0-9a-f]{16}',photo_id), 'Invalid approved photo ID')
    extension=Path(asset['source']).suffix
    require(extension in ('.jpg','.png','.webp'), 'Invalid approved image type')
    require(asset['source']=='story-photos/'+photo_id+extension and asset['path']=='assets/'+photo_id+'.'+asset['sha256'][:12]+extension, 'Invalid approved asset path')
    source=Path(directory)/'photos'/Path(asset['source']).name
    content=source.read_bytes()
    require(hashlib.sha256(content).hexdigest()==asset['sha256'] and len(content)==asset['bytes'], 'Reviewed image bytes changed')
    credits_from_source=licensed_metadata({'extmetadata':record['metadata'],'descriptionurl':photo['sourceUrl']})
    require(all(photo.get(key)==value for key,value in credits_from_source.items()), 'Photo credits changed after review')
    return source,content

def validate_photo_files(candidate, directory):
    for record in candidate.get('photoEvidence',[]):
        reviewed_file(record,directory)

def publish_photos(candidate, directory, work):
    """Only copy reviewed bytes from a private draft; never download again at publication."""
    records=candidate.get('photoEvidence',[])
    if not records: return []
    work=Path(work);base=work/'src/content/assets'
    manifest_path=base/'web-assets.json'
    manifest=json.loads(manifest_path.read_text())
    credits_path=base/'story-photos/verified-photos.json'
    credits=json.loads(credits_path.read_text()) if credits_path.exists() else {}
    changed=[]
    for record in records:
        photo=record['photo'];asset=record['asset'];photo_id=photo['id']
        source,content=reviewed_file(record,directory)
        target=base/asset['source'];target.parent.mkdir(parents=True,exist_ok=True)
        require(not target.exists() or target.read_bytes()==content, 'Photo asset collision')
        shutil.copyfile(source,target)
        manifest[photo_id]=asset;credits[photo_id]=record
        changed.append(str(target.relative_to(work)))
    for path,value in ((manifest_path,manifest),(credits_path,credits)):
        path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n')
        changed.append(str(path.relative_to(work)))
    return changed
