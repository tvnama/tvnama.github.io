import React,{useEffect,useMemo,useRef,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {Satellite,Search,Star,Play,ExternalLink,Heart,Copy,Check,Volume2,Maximize,Menu,X,ChevronLeft,Radio,Tv,Clapperboard,Globe,ArrowLeft,ShieldAlert,RefreshCw,Link2,Wallet,Info} from 'lucide-react';
import seed,{displayName} from './catalog';
import Hls from 'hls.js';
import './style.css';
const ORDER_URL=`${import.meta.env.BASE_URL}channel-order.json`;
const STREAMS_URL=`${import.meta.env.BASE_URL}streams.json`;
const channelKey=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
// آدرس کیف پول خود را فقط اینجا وارد کنید. شبکه باید با آدرس مطابقت داشته باشد.
const wallet={network:'TRC20',address:'TEwto4SaJxRsgKYYyTzZ3SWihDbBySQz6m'};
// لینک دقیق پروفایل LinkedIn خود را اینجا قرار دهید؛ تا آن زمان نام بدون لینک نمایش داده می‌شود.
const linkedinUrl='https://www.linkedin.com/in/aliannezhadi/';
const adSlots=[{title:'جای تبلیغ شما',desc:'تبلیغ برند یا کسب‌وکار شما',link:'mailto:ads@example.com?subject=Satellite%20TV%20Ad',cta:'رزرو جایگاه تبلیغاتی'},{title:'تبلیغات ویژه',desc:'بنر اختصاصی با نمایش در همه دستگاه‌ها',link:'mailto:ads@example.com?subject=Premium%20ad',cta:'سفارش تبلیغ'}];
const categories=['همه شبکه‌ها','مورد علاقه‌ها','فارسی','ایران','استانی','اخبار جهان','ترکیه','ارمنستان','مستند','رادیو','بین‌المللی'];
function readFavs(){try {return JSON.parse(localStorage.getItem('mahnama.favorites')||'[]')} catch{return []}}
function Player({channel}) {
 const videoRef=useRef(null);
 const engineRef=useRef(null);
 const [sourceIndex,setSourceIndex]=useState(0);
 const [quality,setQuality]=useState('auto');
 const [levels,setLevels]=useState([]);
 const [error,setError]=useState('');
 const [state,setState]=useState('idle');
 const [autoSource,setAutoSource]=useState(true);
 const [reload,setReload]=useState(0);
 const sourceUrls=useMemo(()=>Array.from(new Set([channel?.streamUrl,...(channel?.alternatives||[])].filter(Boolean))),[channel]);
 const urlsRef=useRef(sourceUrls); urlsRef.current=sourceUrls;
 const indexRef=useRef(sourceIndex); indexRef.current=sourceIndex;
 const autoRef=useRef(autoSource); autoRef.current=autoSource;
 const advanceRef=useRef(()=>{});
 useEffect(()=>{setSourceIndex(0);indexRef.current=0;setQuality('auto');setLevels([]);setError('');setState('idle');setAutoSource(true);autoRef.current=true;setReload(n=>n+1)},[channel?.id]);
 const changeSource=(i)=>{setSourceIndex(i);indexRef.current=i;setQuality('auto');setLevels([]);setError('');setState('loading');setReload(n=>n+1)};
 const nextSource=()=>{if(sourceUrls.length>1)changeSource((indexRef.current+1)%sourceUrls.length);else setReload(n=>n+1)};
 useEffect(()=>{
  const video=videoRef.current;
  const url=sourceUrls[sourceIndex];
  if(!video||!url)return;
  let hls=null,stopped=false,failed=false,ready=false,timeoutId=null;
  const clearTimer=()=>{if(timeoutId!==null)clearTimeout(timeoutId)};
  setState('loading');setError('');setLevels([]);
  const fail=()=>{
   if(stopped||failed||ready)return;
   failed=true;clearTimer();
   if(autoRef.current&&indexRef.current+1<urlsRef.current.length){
    setError('منبع پاسخ نداد؛ در حال امتحان لینک بعدی…');
    changeSource(indexRef.current+1);
   }else{
    setState('failed');setError('هیچ منبع قابل پخشی در دسترس نیست؛ می‌توانید دستی لینک دیگری انتخاب کنید.');
   }
  };
  const markPlaying=()=>{if(stopped)return;ready=true;failed=false;clearTimer();setError('');setState('playing')};
  const handleError=()=>{ready=false;fail()};
  const handleStalled=()=>{if(!stopped&&!video.paused){ready=false;clearTimer();timeoutId=setTimeout(fail,12000)}};
  const handleWaiting=()=>{if(!stopped&&!video.paused){clearTimer();timeoutId=setTimeout(fail,15000)}};
  video.pause();video.removeAttribute('src');video.load();
  video.addEventListener('playing',markPlaying);
  video.addEventListener('error',handleError);
  video.addEventListener('stalled',handleStalled);
  video.addEventListener('waiting',handleWaiting);
  timeoutId=setTimeout(fail,18000);
  if(/\.mpd(?:[?#]|$)/i.test(url)){fail()}
  else if(Hls.isSupported()){
   hls=new Hls({enableWorker:true,startLevel:-1,capLevelToPlayerSize:true,abrEwmaDefaultEstimate:650000,lowLatencyMode:true});
   engineRef.current=hls;
   hls.on(Hls.Events.MANIFEST_PARSED,(_event,data)=>{
    const ls=(data.levels||[]).map((l,i)=>({index:i,height:l.height||0,bitrate:l.bitrate||0}));
    setLevels(ls);hls.currentLevel=-1;
    video.play().catch(()=>{});
   });
   hls.on(Hls.Events.LEVEL_SWITCHED,()=>{});
   hls.on(Hls.Events.ERROR,(_event,data)=>{
    if(!data.fatal)return;
    if(data.type===Hls.ErrorTypes.MEDIA_ERROR){try{hls.recoverMediaError();return}catch{}}
    ready=false;fail();
   });
   hls.attachMedia(video);hls.loadSource(url);
  }else if(video.canPlayType('application/vnd.apple.mpegurl')){
   video.src=url;video.play().catch(()=>{});
  }else fail();
  return ()=>{
   stopped=true;clearTimer();
   video.removeEventListener('playing',markPlaying);
   video.removeEventListener('error',handleError);
   video.removeEventListener('stalled',handleStalled);
   video.removeEventListener('waiting',handleWaiting);
   hls?.destroy();if(engineRef.current===hls)engineRef.current=null;
   video.pause();video.removeAttribute('src');video.load();
  };
 },[channel?.id,sourceIndex,reload,sourceUrls]);
 const changeQuality=v=>{
  setQuality(v);
  const hls=engineRef.current;
  if(hls){hls.currentLevel=v==='auto'?-1:Number(v);hls.loadLevel=v==='auto'?-1:Number(v)}
 };
 return <><div className="television" aria-label="تلویزیون آنلاین"><div className="tv-frame"><div className="player">
  {sourceUrls.length?<><video ref={videoRef} className="video" controls playsInline autoPlay />{error&&<div className="play-notice">{error}</div>}</>:
   <div className="empty-player"><div className="empty-player-message"><Tv size={38}/><h2>{channel?'برای این شبکه منبع مستقیم ثبت نشده':'شبکه مورد نظر را انتخاب کنید'}</h2><p>{channel?'این شبکه بدون تغییر در فهرست باقی مانده است.':'برای شروع پخش، یک شبکه از فهرست کناری انتخاب کنید.'}</p></div></div>}
  {sourceUrls.length>0&&<button className="reload-embed" onClick={()=>changeSource(0)} title="شروع دوباره از منبع اول" aria-label="تلاش دوباره"><RefreshCw size={16}/></button>}
 </div></div><div className="tv-bottom" aria-hidden="true"><span className="tv-wordmark">MAHNAMA TV</span><span className="tv-power-dot"/></div><div className="tv-stand" aria-hidden="true"/></div>
 {sourceUrls.length>0&&<div className="stream-controls" dir="rtl">
   <label className="stream-control"><span>کیفیت</span><select aria-label="انتخاب کیفیت" value={quality} onChange={e=>changeQuality(e.target.value)}><option value="auto">خودکار (متناسب با اینترنت)</option>{levels.map(l=><option key={l.index} value={String(l.index)}>{l.height?`${l.height}p`:`کیفیت ${l.index+1}`}{l.bitrate?` · ${Math.round(l.bitrate/1000)} kbps`:''}</option>)}</select></label>
   <label className="stream-control"><span>لینک پخش</span><select aria-label="تغییر لینک پخش" value={sourceIndex} onChange={e=>changeSource(Number(e.target.value))}>{sourceUrls.map((url,i)=><option key={url} value={i}>لینک {i+1}</option>)}</select></label>
   <label className="auto-source-option"><input type="checkbox" checked={autoSource} onChange={e=>{setAutoSource(e.target.checked);autoRef.current=e.target.checked}}/> تعویض خودکار لینک هنگام خطا</label>
   <span className="play-state" role="status">{state==='playing'?'● در حال پخش':state==='loading'?'در حال آزمایش منبع…':state==='failed'?'منبع در دسترس نیست':''}</span>
   {sourceUrls.length>1&&<button className="next-source" onClick={nextSource}><RefreshCw size={14}/> لینک بعدی</button>}
 </div>}
 </>;
}

function App(){
 const [remote,setRemote]=useState([]),[streamMap,setStreamMap]=useState({}),[siteOrder,setSiteOrder]=useState([]),[selected,setSelected]=useState(null),[activeCat,setActiveCat]=useState('همه شبکه‌ها'),[search,setSearch]=useState(''),[favorites,setFavorites]=useState(readFavs),[copied,setCopied]=useState(false),[customUrl,setCustomUrl]=useState(''),[listOnlyLive,setListOnlyLive]=useState(false),[status,setStatus]=useState('در حال بارگذاری منابع مستقیم شبکه‌ها');
 useEffect(()=>{fetch(STREAMS_URL,{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(r.status)).then(d=>{setStreamMap(d);setStatus('منابع مستقیم ثبت‌شده: '+Object.keys(d).length.toLocaleString('fa-IR')+' شبکه')}).catch(()=>setStatus('دریافت فهرست منابع ممکن نشد'));},[]);
 useEffect(()=>{fetch(ORDER_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('order');return r.json()}).then(d=>{if(Array.isArray(d))setSiteOrder(d)}).catch(()=>{});},[]);
 const channels=useMemo(()=>seed.map(c=>{const d=streamMap[channelKey(c.originalName)];return {...c,...(d?{streamUrl:d.url,alternatives:d.alternatives||[],type:d.kind,scanStatus:d.scanStatus}:{} )}}).concat(remote.filter(c=>c.id==='user-stream')),[streamMap,remote]);
 const siteRanks=useMemo(()=>new Map(siteOrder.map((name,i)=>[channelKey(name),i])),[siteOrder]);
 const filtered=useMemo(()=>channels.filter(c=>(activeCat==='همه شبکه‌ها'||(activeCat==='مورد علاقه‌ها'?favorites.includes(c.id):c.category===activeCat))&&(c.name+' '+(c.originalName||'')).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((a,b)=>{
  const aRank=siteRanks.get(channelKey(a.originalName||a.name));
  const bRank=siteRanks.get(channelKey(b.originalName||b.name));
  if(aRank!==undefined||bRank!==undefined)return (aRank??Number.MAX_SAFE_INTEGER)-(bRank??Number.MAX_SAFE_INTEGER);
  return 0;
 }),[channels,activeCat,favorites,search,siteRanks]);
 const current=selected ? (channels.find(c=>c.id===selected)||null) : null;
 const toggleFav=c=>{setFavorites(prev=>{const next=prev.includes(c.id)?prev.filter(id=>id!==c.id):[...prev,c.id];localStorage.setItem('mahnama.favorites',JSON.stringify(next));return next})};
 const addCustom=()=>{try{const u=new URL(customUrl);if(!['http:','https:'].includes(u.protocol))throw Error();const c={id:'user-stream',name:'استریم شخصی',category:'فارسی',streamUrl:u.href,type:/\.m3u8(?:\?|$)/i.test(u.href)?'hls':'direct',sourcePage:u.href};setRemote(prev=>[...prev.filter(v=>v.id!==c.id),c]);setSelected(c.id);setCustomUrl('')}catch{alert('لینک صحیح http یا https وارد کنید.')}};
 const copyWallet=()=>{if(wallet.address==='YOUR_WALLET_ADDRESS')return;navigator.clipboard?.writeText(wallet.address).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1600)})};
 const countLive=channels.length;
 return <div className="app" dir="rtl"><header className="header"><div className="header-inner"><a className="brand" href="#top"><span className="brand-logo"><Satellite size={22}/></span><span><strong>ماه‌نما</strong><small>تماشای آنلاین ماهواره</small></span></a><nav className="nav"><a href="#tv">تماشای زنده</a><a href="#categories">دسته‌بندی‌ها</a><a href="#ads">تبلیغات</a><a href="#donate">حمایت مالی</a></nav><div className="header-side"><span className="live-pill"><span className="live-dot"/> {countLive.toLocaleString('fa-IR')} شبکه</span><button className="favorites-top" onClick={()=>{setActiveCat('مورد علاقه‌ها');document.getElementById('tv')?.scrollIntoView({behavior:'smooth'})}}><Star size={16}/> علاقه‌مندی‌ها ({favorites.length})</button></div></div></header>
 <main id="top"><div className="tiny-intro"><div><span className="intro-eyebrow"><span className="live-dot"/> شبکه‌های آنلاین، یک‌جا</span><h1>تماشای آنلاین <em>ماهواره</em></h1></div><p>شبکه را از کنار پلیر انتخاب کنید؛ با یک کلیک پخش عوض می‌شود.</p></div>
 <section id="tv" className="tv-layout"><div className="watch-col"><section className="watch-card"><div className="watch-heading"><div><span className="section-overline">در حال تماشا</span><h2><Play size={17} fill="currentColor"/>{current?.name||'انتخاب شبکه'}</h2></div><div className="action-row"><button className={'action-button '+(favorites.includes(current?.id)?'is-fav':'')} onClick={()=>current&&toggleFav(current)} disabled={!current} title="افزودن به علاقه‌مندی" aria-label="علاقه‌مندی"><Star size={19} fill={favorites.includes(current?.id)?'currentColor':'none'}/></button></div></div><Player channel={current}/><div className="watch-footer">{current&&<><span className={current?.streamUrl?'status-chip online':'status-chip'}>{current?.streamUrl?'● منبع مستقیم':'● منبع مستقیم ثبت نشده'}</span><span className="category-chip">{current?.category}</span></>}</div></section>
 <section id="categories" className="category-section"><div className="heading-inline"><h2>دسته‌بندی شبکه‌ها</h2><span>{channels.length.toLocaleString('fa-IR')} شبکه</span></div><div className="category-chips">{categories.map(cat=><button key={cat} className={activeCat===cat?'active':''} onClick={()=>setActiveCat(cat)}>{cat==='مورد علاقه‌ها'?<Star size={15}/>:<Tv size={15}/>} {cat}</button>)}</div></section>
 <section className="stream-box"><div><Info size={19}/> پخش مستقیم شبکه‌ها</div><small>لینک‌های پخش از گزارش مرورگر استخراج شده‌اند؛ در دسترس بودن آن‌ها روی دامنه ماه‌نما ممکن است به سیاست سرور بستگی داشته باشد.</small></section>
 <div className="under-ad">فضای تبلیغ شما <a href="#ads">درخواست تبلیغات ←</a></div></div>
 <aside className="channel-sidebar"><div className="side-heading"><div><h2>لیست شبکه‌ها</h2><small>{filtered.length.toLocaleString('fa-IR')} شبکه</small></div><Radio size={20}/></div><div className="sidebar-categories" aria-label="دسته‌بندی شبکه‌ها"><div className="sidebar-tabs" role="group" aria-label="فیلتر دسته‌بندی">{categories.map(cat=><button type="button" key={cat} aria-pressed={activeCat===cat} className={'sidebar-tab '+(activeCat===cat?'active':'')} onClick={()=>setActiveCat(cat)}>{cat==='مورد علاقه‌ها'?<Star size={13}/>:null}<span>{cat}</span></button>)}</div></div><label className="side-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جست‌وجوی شبکه..."/></label><p className="catalog-status">{status}</p><div className="channel-scroll">{filtered.map(c=><div key={c.id} className={'side-channel '+(c.id===current?.id?'selected':'')}><button className="side-channel-main" onClick={()=>setSelected(c.id)}><span className="channel-avatar"><Tv size={18}/></span><span className="side-channel-title"><strong dir="auto">{c.name}</strong><small>{c.category} · پخش آنلاین</small></span><span className="live-indicator" title="این نشانگر بخشی از طراحی فهرست است و تضمین پخش نیست"><span className="stream-dot yes"/><span className="live-text">LIVE</span></span></button><button className={'side-star '+(favorites.includes(c.id)?'on':'')} aria-label={'علاقه‌مندی '+c.name} title="ستاره" onClick={()=>toggleFav(c)}><Star size={17} fill={favorites.includes(c.id)?'currentColor':'none'}/></button></div>)}{filtered.length===0&&<div className="empty-list">شبکه‌ای با این مشخصات پیدا نشد.</div>}</div></aside></section>
 <section id="ads" className="ads"><div className="section-label">همکاری با ما</div><h2>جایگاه‌های تبلیغاتی</h2><div className="ads-grid">{adSlots.map((ad,i)=><a href={ad.link} key={i} className="ad-card"><div className="ad-illustration">✦</div><div><span className="ad-caption">جایگاه {i+1}</span><h3>{ad.title}</h3><p>{ad.desc}</p><span className="ad-cta">{ad.cta} ←</span></div></a>)}</div></section>
 <section id="donate" className="donate"><div className="donate-copy"><div className="section-label"><Heart size={16}/> حمایت از سایت</div><h2>حمایت مالی از ماه‌نما</h2><p>برای توسعه سایت و نگهداری لیست شبکه‌ها می‌توانید از پروژه حمایت کنید.</p><span className="network-tag"><Wallet size={16}/> شبکه: {wallet.network}</span></div><div className="wallet-card"><span>آدرس کیف پول</span><div className="wallet-address" dir="ltr"><code>{wallet.address}</code><button onClick={copyWallet} disabled={wallet.address==='YOUR_WALLET_ADDRESS'}>{copied?<Check size={18}/>:<Copy size={18}/>}</button></div><small>قبل از ارسال، شبکه و آدرس را با دقت بررسی کنید.</small></div></section><div className="disclaimer"><Info size={18}/> پخش هر شبکه وابسته به دسترسی و مجوز ارائه‌دهنده آن است. ثبت لینک به معنی تضمین پخش یا داشتن حق بازپخش نیست.</div></main><footer><div className="footer-inner"><strong>ماه‌نما · تماشای آنلاین ماهواره</strong><div className="footer-credits"><span>طراحی توسط {linkedinUrl?<a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="designer-link">میثم علیان نژادی ↗</a>:<span className="designer-name">میثم علیان نژادی</span>}</span></div><nav className="footer-legal" aria-label="اطلاعات حقوقی"><a href={`${import.meta.env.BASE_URL}copyright.html`}>Copyright</a><a href={`${import.meta.env.BASE_URL}dmca.html`}>DMCA</a></nav></div></footer></div>
}
createRoot(document.getElementById('root')).render(<App/>);
