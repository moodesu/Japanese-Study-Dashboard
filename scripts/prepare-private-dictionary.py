"""Convert the user's MDX/MDD ZIP to a private setup folder; never uploads data.

Requires the readmdict Python package (and its documented python-lzo dependency).
Usage: python prepare-private-dictionary.py dictionary.zip /outside/repo/private-dictionary-data
The destination must not exist. Do not commit or deploy its output.
"""
import argparse
import hashlib
import html
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import tempfile
import zipfile

ALLOWED=set('div p span br table tbody thead tr td th ul ol li b strong em i u small sup sub ruby rt rp'.split())
BLOCKED=set('script style iframe object embed svg math template audio video form'.split())
CLASSES=set('header edition pos sub-header meaning related counterpart formation concept cloze politeness antonym bold'.split())
VOLUMES={'㊦':'Basic','㊥':'Intermediate','㊤':'Advanced'}

class CleanHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.parts=[];self.images=[];self.blocked=[]
    def handle_starttag(self,tag,attrs):
        if tag in BLOCKED:self.blocked.append(tag)
        if self.blocked:return
        attrs=dict(attrs)
        if tag=='img':
            source=attrs.get('src','').replace('\\','/').lstrip('/')
            if source:self.images.append(source)
        if tag not in ALLOWED:return
        kept=[]
        classes=[x for x in attrs.get('class','').split() if x in CLASSES]
        if classes:kept.append('class="'+html.escape(' '.join(classes),quote=True)+'"')
        for key in ['rowspan','colspan']:
            if tag in ('td','th') and re.fullmatch('[1-9][0-9]?',attrs.get(key,'')):kept.append(key+'="'+attrs[key]+'"')
        self.parts.append('<'+tag+(' '+' '.join(kept) if kept else '')+'>')
    def handle_endtag(self,tag):
        if self.blocked:
            if self.blocked[-1]==tag:self.blocked.pop()
            return
        if tag in ALLOWED and tag!='br':self.parts.append('</'+tag+'>')
    def handle_data(self,data):
        if not self.blocked:self.parts.append(html.escape(data))

def convert(archive,output):
    from readmdict import MDX,MDD
    output=Path(output)
    if output.exists():raise ValueError('Destination already exists; choose a new empty destination.')
    with tempfile.TemporaryDirectory(prefix='jlh-dictionary-convert-') as working:
        with zipfile.ZipFile(archive) as z:
            selected={ext:[x for x in z.infolist() if x.filename.lower().endswith(ext)] for ext in ('.mdx','.mdd')}
            if any(len(v)!=1 for v in selected.values()):raise ValueError('Expected one MDX and one MDD file.')
            for ext,items in selected.items():
                item=items[0]
                if item.file_size>300_000_000:raise ValueError('Dictionary component exceeds the conversion limit.')
                # Fixed temporary filenames: archive paths are never used as extraction destinations.
                with z.open(item) as source,open(Path(working)/('dictionary'+ext),'wb') as dest:
                    while block:=source.read(1024*1024):dest.write(block)
        records=[(k.decode('utf-8'),v.decode('utf-8')) for k,v in MDX(str(Path(working)/'dictionary.mdx')).items()]
        primary={};redirects={}
        for key,value in records:
            if value.startswith('@@@LINK='):redirects.setdefault(key,[]).append(value[8:].strip())
            else:
                if key in primary:raise ValueError('Duplicate primary headword: '+key)
                primary[key]=value
        aliases={key:{key,key[:-1]} for key in primary}
        def targets(key,seen):
            if key in seen:raise ValueError('Alias cycle: '+key)
            if key in primary:return [key]
            if key not in redirects:raise ValueError('Missing alias target: '+key)
            return [target for next_key in redirects[key] for target in targets(next_key,seen|{key})]
        for alias in redirects:
            for target in targets(alias,set()):aliases[target].add(alias)
        image_data={};image_names={};excluded=[]
        for key,value in MDD(str(Path(working)/'dictionary.mdd')).items():
            name=key.decode('utf-8').replace('\\','/').lstrip('/')
            if not name.lower().endswith('.png'):
                excluded.append(name);continue
            if not value.startswith(b'\x89PNG\r\n\x1a\n') or len(value)>5242880:raise ValueError('Invalid or oversized PNG: '+name)
            digest=hashlib.sha256(value).hexdigest()+'.png'
            image_names[name]=digest;image_data[digest]=value
        entries=[];used=set()
        for key,value in primary.items():
            if key[-1] not in VOLUMES:raise ValueError('Unknown dictionary volume: '+key)
            parser=CleanHTML();parser.feed(value);parser.close()
            body=''.join(parser.parts)
            images=[image_names[name] for name in parser.images] # Missing resources fail conversion.
            used.update(images)
            meaning=re.search(r'<span class="meaning">(.*?)</span>',value,re.S)
            summary=html.unescape(re.sub('<[^>]+>',' ',meaning.group(1))) if meaning else ''
            summary=' '.join(summary.split())
            identifier=hashlib.sha256((key+'\0'+body+'\0'+'|'.join(images)).encode()).hexdigest()
            entries.append({'id':identifier,'headword':key[:-1],'volume':VOLUMES[key[-1]],'aliases':sorted(aliases[key]),'summary':summary,'body_html':body,'image_files':images})
        manifest={'format':'jlh-private-dictionary-v1','title':'A Dictionary of Japanese Grammar — supplied MDX compilation','entries':entries}
        output.mkdir(parents=True)
        (output/'images').mkdir()
        for filename in sorted(used):(output/'images'/filename).write_bytes(image_data[filename])
        (output/'dictionary-data.json').write_text(json.dumps(manifest,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        print(json.dumps({'entries':len(entries),'aliases':len(redirects),'images':len(used),'image_bytes':sum(len(image_data[x]) for x in used),'manifest_bytes':(output/'dictionary-data.json').stat().st_size,'excluded_resources':excluded},ensure_ascii=False))

if __name__=='__main__':
    cli=argparse.ArgumentParser(description=__doc__)
    cli.add_argument('archive');cli.add_argument('output')
    args=cli.parse_args();convert(args.archive,args.output)
