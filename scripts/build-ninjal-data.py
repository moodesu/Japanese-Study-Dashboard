#!/usr/bin/env python3
"""Convert the official CC BY 4.0 NINJAL 2026.01 ZIP to inert local JSON.

Usage: python3 scripts/build-ninjal-data.py SOURCE.zip assets/ninjal-bunkei.json
No scraping, external dependencies, HTML execution or private data required.
"""
import hashlib
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET
import zipfile

SOURCE_SHA256 = '21db3087c49c9e05eaf50f735d5c704b971df20d206b56a079dee1f50bf3a6a9'


def text(node, name):
    return node.findtext(name, '').strip()


def convert(source):
    if hashlib.sha256(Path(source).read_bytes()).hexdigest() != SOURCE_SHA256:
        raise ValueError('Not the verified NINJAL 2026.01 archive; review a new version before converting.')
    entries = []
    with zipfile.ZipFile(source) as archive:
        for filename in sorted(archive.namelist()):
            if not filename.endswith('.xml'):
                continue
            root = ET.fromstring(archive.read(filename))
            if root.tag != 'Entry':
                raise ValueError('Unexpected entry format')
            entry = {
                'id': Path(filename).stem,
                'pattern': text(root, 'SentencePattern'),
                'reading': text(root, 'Reading'),
                'explanation': text(root, 'GeneralExplanation'),
                'senses': []
            }
            for index, sense in enumerate(root.findall('Sense'), 1):
                item = {'id': str(index), 'category': text(sense, 'SenceCategory'),
                        'level': text(sense, 'Level'), 'usage': text(sense, 'Usage'),
                        'notes': [], 'connections': []}
                for tag, label in [('UsageNotes', 'Usage notes'), ('Style', 'Register'),
                                   ('CommonlyUsedWordsTogether', 'Common combinations'),
                                   ('Orthography', 'Writing'), ('AlternativeForm', 'Alternative forms'),
                                   ('SimilarExpressions', 'Similar expressions'),
                                   ('ContrastingExpression', 'Contrasting expressions')]:
                    if text(sense, tag):
                        item['notes'].append({'label': label, 'text': text(sense, tag)})
                for connection in sense.findall('Connection'):
                    item['connections'].append({
                        'form': text(connection, 'ConnectionType'),
                        'examples': [{'scene': text(ex, 'SceneDescription'),
                                      'text': text(ex, 'Example'),
                                      'note': text(ex, 'ExampleNote')}
                                     for ex in connection.findall('ExampleSet')]
                    })
                entry['senses'].append(item)
            entries.append(entry)
    counts = {'entries': len(entries), 'senses': sum(len(e['senses']) for e in entries),
              'examples': sum(len(c['examples']) for e in entries for s in e['senses'] for c in s['connections'])}
    assert counts == {'entries': 800, 'senses': 958, 'examples': 9552}, counts
    return {'version': '2026.01', 'source': 'https://doi.org/10.15084/0002000610',
            'license': 'https://creativecommons.org/licenses/by/4.0/',
            'creators': ['Prashant Pardeshi', 'Yuriko Sunakawa'],
            'publisher': 'National Institute for Japanese Language and Linguistics (NINJAL)',
            'changes': 'XML converted to JSON; original Japanese, readings, emphasis and sense grouping retained. English interface labels added by Learning Hub; no translations added.',
            'source_sha256': SOURCE_SHA256, 'counts': counts, 'entries': entries}


if __name__ == '__main__':
    data = convert(sys.argv[1])
    target = Path(sys.argv[2])
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps(data['counts']), '->', target)
