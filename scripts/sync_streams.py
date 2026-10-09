#!/usr/bin/env python3
"""Audit public source pages and publish ONLY HLS manifests passing basic access checks.

This is not a referrer, authentication, DRM or geo restriction bypass. It produces
an explicit per-channel report, rather than treating unsuccessful embeds as streams.
"""
import concurrent.futures
import html
import json
import os
import re
from pathlib import Path
from urllib.parse import parse_qs, unquote, urljoin, urlparse
import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'public/channels.json'
OUT = ROOT / 'public/direct-streams.json'
REPORT = ROOT / 'public/stream-audit.json'
ORIGIN = os.environ.get('SITE_ORIGIN', 'https://tvnama.github.io')
WORKERS = int(os.environ.get('STREAM_SCAN_WORKERS', '6'))
UA = {'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/125.0 Safari/537.36'}
# Independent public directory cross-check; these are candidates, NOT preapproved URLs.
# Tamasha hdtest is identified by the public IPTV channel metadata, not a guessed slug.
CANDIDATES = {
 'Tamasha': ['https://ncdn.telewebion.ir/hdtest/live/playlist.m3u8'],
 'Namayesh': ['https://live-aburayhan1103.telewebion.ir/ek/namayesh/live/720p/index.m3u8'],
}
PATTERNS = [
 re.compile(r'\b(?:file|src|source|url|hls|playlist)\s*[:=]\s*[\'\"]([^\'\"]+)[\'\"]',re.I),
 re.compile(r'[\'\"](https?:[^\'\"<>\s]+?\.m3u8(?:\?[^\'\"<>\s]*)?)[\'\"]',re.I),
]

def normalize(raw, base):
 raw=html.unescape(raw).replace('\\/','/').replace('\\u0026','&').strip()
 for _ in range(2):
  if '%3a%2f%2f' in raw.lower():raw=unquote(raw)
 p=urlparse(urljoin(base,raw))
 if p.scheme not in ('http','https'):return None
 if 'url=' in p.query and ('proxy' in p.netloc or 'workers.dev' in p.netloc):
  inner=parse_qs(p.query).get('url',[''])[0]
  if inner:return normalize(inner,base)
 if not re.search(r'\.m3u8(?:$|[?#])',p.geturl(),re.I):return None
 return p.geturl()

def extract(page, content):
 soup=BeautifulSoup(content,'html.parser')
 urls=[];frames=[]
 for tag in soup.select('iframe[src],video[src],source[src]'):
  address=urljoin(page,tag['src'])
  if tag.name=='iframe' and urlparse(address).hostname and address.startswith('http'):
   frames.append(address)
  else:urls.append(address)
 for pattern in PATTERNS:
  urls.extend(pattern.findall(content))
 valid=[]
 for raw in urls:
  u=normalize(raw,page)
  if u and u not in valid:valid.append(u)
 return valid,frames[:3]

def verify(url):
 try:
  r=requests.get(url,headers={**UA,'Origin':ORIGIN},timeout=12,allow_redirects=True)
  if r.status_code!=200:return False,'HTTP '+str(r.status_code)
  cors=r.headers.get('access-control-allow-origin','').strip()
  if cors not in ('*',ORIGIN):return False,'CORS disallows site origin'
  if not r.text.lstrip().startswith('#EXTM3U'):return False,'not an HLS manifest'
  # Manifest loads, but this does not guarantee that segments will also load.
  return True,'manifest/CORS passed (segments not checked)'
 except requests.RequestException as e:return False,type(e).__name__

def audit(ch):
 slug=ch.get('parsaName') or ''
 original=(ch.get('originalName') or ch.get('name') or '').strip()
 page=ch.get('sourcePage') or ('https://www.parsatv.com/name='+slug if slug else '')
 entry={'name':original,'page':page,'status':'not-found','candidates':[]}
 discovered=[];pages=[]
 if page:
  pages.append(page)
  try:
   r=requests.get(page,headers=UA,timeout=14)
   if r.ok:
    urls,frames=extract(page,r.text)
    discovered+=urls
    # Fetch only a small number of one-level public iframe documents.
    for frame in frames:
     if urlparse(frame).hostname not in ('www.parsatv.com','parsatv.com'):
      continue
     try:
      sub=requests.get(frame,headers=UA,timeout=9)
      if sub.ok:
       more,_=extract(frame,sub.text)
       discovered+=more
     except requests.RequestException:pass
   else:entry['pageError']='HTTP '+str(r.status_code)
  except requests.RequestException as e:entry['pageError']=type(e).__name__
 discovered+=CANDIDATES.get(original,[])
 for url in dict.fromkeys(discovered):
  ok,reason=verify(url)
  entry['candidates'].append({'url':url,'status':reason,'usable':ok})
  if ok:
   entry['status']='manifest-checked'
   entry['streamUrl']=url
   entry['streamHost']=urlparse(url).hostname
   break
 return slug,entry

def main():
 channels=json.loads(CATALOG.read_text())
 if not isinstance(channels,list):raise ValueError('channels.json must contain an array')
 results={};audit_results={}
 with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as pool:
  futures=[pool.submit(audit,c) for c in channels if c.get('parsaName')]
  for f in concurrent.futures.as_completed(futures):
   slug,item=f.result()
   audit_results[slug]=item
   if item.get('streamUrl'):
    results[slug]={'streamUrl':item['streamUrl'],'sourceStatus':'manifest-and-cors-checked','sourceHost':item['streamHost']}
 OUT.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
 REPORT.write_text(json.dumps({'originChecked':ORIGIN,'scanned':len(futures),'withManifest':len(results),'channels':audit_results},ensure_ascii=False,indent=2)+'\n')
 print('Checked',len(futures),'channels;',len(results),'passed manifest/CORS check; see public/stream-audit.json')
 print('A passed manifest does NOT confirm segments, legal rights or browser playback.')
if __name__=='__main__':main()
