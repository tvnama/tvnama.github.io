#!/usr/bin/env python3
"""Public ParsaTV directory order and channel names, best-effort during GitHub build.
Does not request stream pages or bypass any restrictions. Keeps checked-in snapshot on failure.
"""
from pathlib import Path
from urllib.parse import urljoin,urlparse,parse_qs,unquote
import json,re
import requests
from bs4 import BeautifulSoup

ROOT=Path(__file__).resolve().parents[1]
BASE='https://www.parsatv.com/'
ORDER=ROOT/'public/parsatv-order.json'
CATALOG=ROOT/'public/channels.json'
GROUPS=[('Persian','فارسی'),('News','اخبار جهان'),('Radio','رادیو'),('Music','بین‌المللی'),('Fashion','بین‌المللی'),('Movie','بین‌المللی'),('Sport','بین‌المللی'),('International','بین‌المللی'),('Turkey','ترکیه'),('Armenia','ارمنستان'),('Iran','ایران')]
def key(name):return re.sub('[^a-z0-9]','',name.lower())
def category(name,index):
 if index < 139:return 'فارسی'
 if index < 210:return 'اخبار جهان'
 if index < 289:return 'رادیو'
 return 'بین‌المللی'
def main():
 try:
  resp=requests.get(BASE,headers={'User-Agent':'Mozilla/5.0 (compatible; public-directory-reader)'},timeout=20)
  resp.raise_for_status()
  soup=BeautifulSoup(resp.text,'html.parser')
  ordered=[];seen=set();entries=[]
  for a in soup.select('a[href]'):
   url=urljoin(BASE,a['href']);p=urlparse(url)
   if p.hostname not in ('www.parsatv.com','parsatv.com'):continue
   pathname=unquote(p.path)
   if '/name=' not in pathname.lower():continue
   name=a.get_text(' ',strip=True)
   if not name or len(name)>75 or key(name) in seen:continue
   parsa_name=pathname.split('=',1)[-1]
   if not parsa_name:continue
   seen.add(key(name));ordered.append(name)
   entries.append({'id':re.sub('[^a-z0-9]+','-',name.lower()).strip('-'),
       'name':name,'originalName':name,'parsaName':parsa_name,
       'category':category(name,len(entries)),'sourcePage':url,'type':'iframe'})
  if len(entries)<100:raise ValueError(f'Too few channels: {len(entries)}')
  ORDER.write_text(json.dumps(ordered,ensure_ascii=False,indent=2)+'\n')
  # The app merges these entries with its localized seed using the original channel names.
  CATALOG.write_text(json.dumps(entries,ensure_ascii=False,indent=2)+'\n')
  print('Updated',len(entries),'directory channels in native ParsaTV order.')
 except Exception as exc:
  print('Sync unavailable; preserving snapshot:',exc)
if __name__=='__main__':main()
