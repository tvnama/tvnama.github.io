#!/usr/bin/env python3
"""Best-effort scan of public channel pages for directly reusable HLS streams.

A discovered URL is published only when the manifest is obtainable and its
CORS policy permits a browser hosted at the configured site origin. This does
not bypass referrer checks, authentication, DRM, or licensing restrictions.
"""
import concurrent.futures
import json
import os
import re
from pathlib import Path
from urllib.parse import urlparse, unquote, parse_qs
import requests

ROOT = Path(__file__).resolve().parents[1]
CATALOG = ROOT / 'public/channels.json'
OUT = ROOT / 'public/direct-streams.json'
ORIGIN = os.environ.get('SITE_ORIGIN','https://tvnama.github.io')
WORKERS = int(os.environ.get('STREAM_SCAN_WORKERS','6'))
PATTERNS = [
    re.compile(r'\bfile\s*:\s*[\'\"]([^\'\"]+)[\'\"]', re.I),
    re.compile(r'\b(?:src|source|url)\s*:\s*[\'\"]([^\'\"]+\.m3u8(?:\?[^\'\"]*)?)[\'\"]',re.I),
    re.compile(r'<source[^>]+src=[\'\"]([^\'\"]+)[\'\"]',re.I),
]
UA = {'User-Agent':'Mozilla/5.0 (compatible; MahnamaPublicStreamChecker/1.0)'}

def possible_streams(html):
    seen=set()
    for pattern in PATTERNS:
        for raw in pattern.findall(html):
            raw=raw.replace('\\/','/').replace('&amp;','&').strip()
            if 'url=' in raw and ('workers.dev' in raw or 'proxy' in urlparse(raw).netloc.lower()):
                raw=parse_qs(urlparse(raw).query).get('url',[raw])[0]
            if not re.search(r'\.m3u8(?:[?#]|$)',raw,re.I):continue
            if not raw.startswith(('https://','http://')):continue
            if raw in seen:continue
            seen.add(raw)
            yield raw

def verify(url):
    try:
        r=requests.get(url, headers={**UA,'Origin':ORIGIN},timeout=9,allow_redirects=True)
        cors=r.headers.get('access-control-allow-origin','').strip()
        mime=r.headers.get('content-type','').lower()
        if r.status_code != 200 or (cors not in ('*',ORIGIN)):
            return False
        if not ('#EXTM3U' in r.text[:500] or 'mpegurl' in mime):return False
        return True
    except requests.RequestException:return False

def scan(channel):
    page=channel.get('sourcePage')
    if not page:return None
    try:
        r=requests.get(page,headers=UA,timeout=12)
        r.raise_for_status()
    except requests.RequestException:return None
    for url in possible_streams(r.text):
        if verify(url):
            return {'streamUrl':url,'sourcePage':page,'sourceStatus':'manifest-and-cors-checked'}
    return None

def main():
    channels=json.loads(CATALOG.read_text())
    if not isinstance(channels,list):raise ValueError('catalog must be list')
    prior={}
    if OUT.exists():
        try:prior=json.loads(OUT.read_text())
        except ValueError:pass
    results={}
    with concurrent.futures.ThreadPoolExecutor(max_workers=WORKERS) as executor:
        futures={executor.submit(scan,ch):ch for ch in channels if ch.get('parsaName')}
        for future in concurrent.futures.as_completed(futures):
            ch=futures[future]
            try:value=future.result()
            except Exception as e:
                print('Skipped',ch.get('parsaName'),str(e)[:90]);continue
            if value:results[ch['parsaName']]=value
    # Do not retain previously verified streams without re-checking: live links expire.
    OUT.write_text(json.dumps(results,ensure_ascii=False,indent=2)+'\n')
    print(f'Checked {len(futures)} public channel pages; {len(results)} streams passed HTTP/CORS manifest checks.')
    print('Browser playback is not guaranteed; hosts may separately enforce referer, tokens or content rights.')
if __name__=='__main__':main()
