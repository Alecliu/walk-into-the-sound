from pathlib import Path
from blog_validation import validate_site

if __name__ == '__main__':
    count = validate_site(Path(__file__).resolve().parents[1])
    print('Verified {} articles, original routes, sources, full build hashes and source/publication equality.'.format(count))
