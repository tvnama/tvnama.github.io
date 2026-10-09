#!/usr/bin/env python3
"""Best-effort public ParsaTV catalog crawler. No DRM, auth, proxy or access bypass.
Usage: pip install requests beautifulsoup4; python scripts/crawl.py
"""
import json,re,time,html,os
from pathlib import Path
from urllib.parse import urljoin,urlparse,unquote
import requests
from bs4 import BeautifulSoup
BASE='https://www.parsatv.com/'
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'public/channels.json'
UA={'User-Agent':'Mozilla/5.0 (compatible; PublicChannelCatalogBot/1.0; +https://github.com/)'}
s=requests.Session();s.headers.update(UA)
CATEGORIES={'فارسی':r'persian','ایران':r'irib|shabake|ifilm','استانی':r'ostani','رادیو':r'radio','مستند':r'doc|travel|nat geo','ترکیه':r'trt|turk','ارمنستان':r'armenia','اخبار جهان':r'news|bbc|euronews'}
def get(url):
 try:
  r=s.get(url,timeout=16);r.raise_for_status();return r.text
 except requests.RequestException as e:
  print('Fetch failed:',url,str(e)[:100]);return ''
def category(name):
 for key,pat in CATEGORIES.items():
  if re.search(pat,name,re.I):return key
 return 'بین‌المللی'
def valid_stream(u):
 try:
  p=urlparse(u)
  return p.scheme in ('http','https') and p.hostname and re.search(r'\.(?:m3u8|mpd|mp4)(?:$|\?)',p.path+'?'+p.query,re.I)
 except ValueError:return False
def extract_stream(doc,url):
 soup=BeautifulSoup(doc,'html.parser')
 candidates=[]
 for tag in soup.select('video[src], source[src]'):
  candidates.append(urljoin(url,tag.get('src','')))
 for m in re.findall(r'''(?:https?:)?(?:\\/\\/|//)[^\s"'<>\\]+?\.(?:m3u8|mpd|mp4)(?:\?[^\s"'<>]*)?''',doc,re.I):
  candidates.append(m.replace('\\/','/'))
 for x in candidates:
  if x.startswith('//'):x='https:'+x
  if valid_stream(x):return x
 return ''
def main():
 homepage=get(BASE)
 if not homepage:
  print('Source not reachable. Preserving existing catalog; no fabricated stream links.');return
 soup=BeautifulSoup(homepage,'html.parser');links={}
 for a in soup.find_all('a',href=True):
  href=urljoin(BASE,html.unescape(a['href']));p=urlparse(href)
  if p.hostname not in ('parsatv.com','www.parsatv.com'):continue
  path=unquote(p.path)
  if not re.search(r'/name=',path,re.I):continue
  name=a.get_text(' ',strip=True)
  if not name or len(name)>85:continue
  links[href.split('#')[0]]=name
 print('Found channel pages:',len(links))
 old={x['sourcePage']:x for x in json.loads(OUT.read_text())} if OUT.exists() else {}
 max_pages=int(os.getenv('CRAWL_MAX','1000'))
 results=[]
 for n,(url,name) in enumerate(list(links.items())[:max_pages],1):
  doc=get(url);stream=extract_stream(doc,url) if doc else ''
  prev=old.get(url,{})
  slug=re.sub(r'[^a-z0-9]+','-',name.lower()).strip('-') or 'channel-'+str(n)
  results.append({'id':slug,'name':name,'category':prev.get('category') or category(name),'sourcePage':url,'streamUrl':stream,'type':'hls' if stream.endswith('.m3u8') else ('direct' if stream else 'source')})
  if n%25==0:print('Scanned',n,'/',min(len(links),max_pages))
  time.sleep(float(os.getenv('CRAWL_DELAY','0.3')))
 if results:
  OUT.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
  print('Saved',len(results),'channels,',sum(bool(x['streamUrl']) for x in results),'direct links (not availability-tested)')
if __name__=='__main__':main()
