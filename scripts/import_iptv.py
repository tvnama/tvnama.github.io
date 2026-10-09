#!/usr/bin/env python3
"""Import *publicly listed* IPTV-org streams without bypassing access controls.
The file is a discovery catalog, not a live-playback or redistribution guarantee.
"""
import json,re,os
from pathlib import Path
from urllib.parse import urlparse
import requests
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/channels.json'
PLAYLISTS={
 'فارسی':['languages/fas.m3u','languages/prs.m3u'],
 'ایران':['countries/ir.m3u'],
 'ارمنستان':['languages/hye.m3u'],
 'ترکیه':['countries/tr.m3u'],
 'اخبار جهان':['categories/news.m3u'],
 'مستند':['categories/documentary.m3u'],
 'بین‌المللی':['countries/gb.m3u','countries/us.m3u'],
}
def norm(s):
 s=re.sub(r'\s*\(\d{3,4}p\)|\s*\((?:HD|SD|FHD|4K)\)','',s,flags=re.I)
 return re.sub(r'[^a-z0-9]+','',s.casefold())
def slug(s):return re.sub(r'[^a-z0-9]+','-',s.casefold()).strip('-')
def safe_url(url):
 try:
  p=urlparse(url)
  return p.scheme=='https' and bool(p.hostname) and not p.username and not p.password and not p.hostname.endswith('.local')
 except ValueError:return False
def parse(text):
 prev=''
 for line in text.splitlines():
  line=line.strip()
  if line.startswith('#EXTINF:'):
   prev=line
  elif line and not line.startswith('#') and prev:
   n=prev.rsplit(',',1)[-1].strip()
   if n and safe_url(line) and ('.m3u8' in urlparse(line).path.lower() or '.mp4' in urlparse(line).path.lower()):yield n,line
   prev=''
def main():
 existing=json.loads(OUT.read_text(encoding='utf8')) if OUT.exists() else []
 by_id={c['id']:c for c in existing if c.get('id')}
 # Collect IDs and names from curated built-in catalog directly, no node tooling required.
 raw=(ROOT/'src/catalog.js').read_text(encoding='utf8')
 groups=dict(re.findall(r"'([^']+)':\s*'([^']+)'",raw))
 for category,names in groups.items():
  for name in names.split('|'):
   key=slug(name)
   by_id.setdefault(key,{'id':key,'name':name,'category':category,'sourcePage':f'https://www.parsatv.com/name%3D{name.replace(" ","-")}','streamUrl':''})
 by_name={norm(c['name']):c for c in by_id.values() if c.get('name')}
 count=0; created=0
 for category,lists in PLAYLISTS.items():
  for path in lists:
   url='https://iptv-org.github.io/iptv/'+path
   try:
    r=requests.get(url,timeout=30,headers={'User-Agent':'Mozilla/5.0'});r.raise_for_status()
   except requests.RequestException as e:
    print('Unavailable:',url,str(e)[:90]);continue
   for name,stream in parse(r.text):
    key=norm(name)
    if not key:continue
    record=by_name.get(key)
    if record is None:
     channel_id=slug(name)
     if not channel_id:continue
     channel_id='iptv-'+channel_id
     if channel_id in by_id:continue
     record={'id':channel_id,'name':name,'category':category,'sourcePage':'https://github.com/iptv-org/iptv','streamUrl':'','type':'hls'}
     by_name[key]=record;by_id[channel_id]=record;created+=1
    if not record.get('streamUrl'):
     record.update(streamUrl=stream,type='hls' if '.m3u8' in urlparse(stream).path.lower() else 'direct',streamSource='iptv-org',verified=False)
     count+=1
   print('Imported',path)
 # Preserve human-entered catalog with known sources; no claim of working streams.
 OUT.write_text(json.dumps(list(by_id.values()),ensure_ascii=False,indent=2)+'\n',encoding='utf8')
 print('New public direct URLs:',count,'new channels:',created,'catalog size:',len(by_id))
if __name__=='__main__':main()
