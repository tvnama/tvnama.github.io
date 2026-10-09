import React,{useEffect,useMemo,useRef,useState} from 'react';
import Hls from 'hls.js';
import {createRoot} from 'react-dom/client';
import {Satellite,Search,Star,Play,ExternalLink,Heart,Copy,Check,Volume2,Maximize,Menu,X,ChevronLeft,Radio,Tv,Clapperboard,Globe,ArrowLeft,ShieldAlert,RefreshCw,Link2,Wallet,Info} from 'lucide-react';
import seed,{embedUrl,displayName} from './catalog';
import independentSources from './independent-sources';
import './style.css';
const CATALOG_URL=`${import.meta.env.BASE_URL}channels.json`;
const ORDER_URL=`${import.meta.env.BASE_URL}parsatv-order.json`;
const STREAMS_URL=`${import.meta.env.BASE_URL}direct-streams.json`;
const channelKey=name=>String(name||'').toLowerCase().replace(/[^a-z0-9]+/g,'');
// آدرس کیف پول خود را فقط اینجا وارد کنید. شبکه باید با آدرس مطابقت داشته باشد.
const wallet={network:'TRC20',address:'TEwto4SaJxRsgKYYyTzZ3SWihDbBySQz6m'};
// لینک دقیق پروفایل LinkedIn خود را اینجا قرار دهید؛ تا آن زمان نام بدون لینک نمایش داده می‌شود.
const linkedinUrl='https://www.linkedin.com/in/aliannezhadi/';
const adSlots=[{title:'جای تبلیغ شما',desc:'تبلیغ برند یا کسب‌وکار شما',link:'mailto:ads@example.com?subject=Satellite%20TV%20Ad',cta:'رزرو جایگاه تبلیغاتی'},{title:'تبلیغات ویژه',desc:'بنر اختصاصی با نمایش در همه دستگاه‌ها',link:'mailto:ads@example.com?subject=Premium%20ad',cta:'سفارش تبلیغ'}];
const categories=['همه شبکه‌ها','مورد علاقه‌ها','فارسی','ایران','استانی','اخبار جهان','ترکیه','ارمنستان','مستند','رادیو','بین‌المللی'];
function readFavs(){try {return JSON.parse(localStorage.getItem('mahnama.favorites')||'[]')} catch{return []}}
function StreamVideo({url, channel}) {
 const videoRef=useRef(null);
 const [error,setError]=useState('');
 useEffect(()=>{
  const video=videoRef.current;
  if(!video||!url)return;
  let hls;
  setError('');
  if(/\.m3u8(?:[?#]|$)/i.test(url) && Hls.isSupported()){
   hls=new Hls({enableWorker:true});
   hls.loadSource(url);
   hls.attachMedia(video);
   hls.on(Hls.Events.ERROR,(_,data)=>{if(data.fatal)setError('پخش مستقیم ناموفق بود؛ ممکن است منبع غیرفعال یا محدود به دامنه باشد.')});
  }else if(video.canPlayType('application/vnd.apple.mpegurl') || !/\.m3u8(?:[?#]|$)/i.test(url)){
   video.src=url;
  }else setError('مرورگر شما از این نوع پخش پشتیبانی نمی‌کند.');
  return ()=>{if(hls)hls.destroy();video.removeAttribute('src');video.load()};
 },[url]);
 return <div className="direct-player"><video key={channel.id} ref={videoRef} controls autoPlay playsInline style={{width:'100%',height:'100%',background:'#080c15'}} onError={()=>setError('پخش مستقیم ناموفق بود؛ دسترسی به منبع را بررسی کنید.')}/>{error&&<div className="stream-error"><span>{error}</span>{channel.sourcePage&&<a href={channel.sourcePage} target="_blank" rel="noopener noreferrer">صفحه اصلی شبکه ↗</a>}</div>}</div>;
}
function Player({channel}) {
 const [reload,setReload]=useState(0);
 const stream=channel?.streamUrl;
 const url=channel?embedUrl(channel):'';
 return <div className="television" aria-label="تلویزیون آنلاین">
  <div className="tv-frame">
   <div className="player">
    {channel ? (stream ? <StreamVideo key={`${channel.id}-${reload}`} channel={channel} url={stream}/> : <iframe key={`${channel.id}-${reload}`} className="embed-player" title={`پخش زنده ${channel.name}`} src={url} allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowFullScreen loading="eager" referrerPolicy="strict-origin-when-cross-origin" />) : <div className="empty-player"><div className="empty-player-message"><Tv size={38}/><h2>شبکه مورد نظر را انتخاب کنید</h2><p>برای شروع پخش، یک شبکه از فهرست کناری انتخاب کنید.</p></div></div>}
    {channel&&<button className="reload-embed" onClick={()=>setReload(n=>n+1)} title="بارگذاری مجدد پلیر" aria-label="بارگذاری دوباره"><RefreshCw size={16}/></button>}
   </div>
  </div>
  <div className="tv-bottom" aria-hidden="true"><span className="tv-wordmark">MAHNAMA TV</span><span className="tv-power-dot"/></div>
  <div className="tv-stand" aria-hidden="true"/>
 </div>;
}

// A shareable query parameter controls the channel without a page reload.
function getChannelFromUrl(){return new URLSearchParams(window.location.search).get('channel')}
function updateChannelUrl(channelId){
 const next=new URL(window.location.href);
 if(channelId)next.searchParams.set('channel',channelId);
 else next.searchParams.delete('channel');
 window.history.pushState({channel:channelId},'',next.pathname+next.search+next.hash);
}
function App(){
 const [directStreams,setDirectStreams]=useState({}),[remote,setRemote]=useState([]),[siteOrder,setSiteOrder]=useState([]),[selected,setSelected]=useState(getChannelFromUrl),[activeCat,setActiveCat]=useState('همه شبکه‌ها'),[search,setSearch]=useState(''),[favorites,setFavorites]=useState(readFavs),[copied,setCopied]=useState(false),[customUrl,setCustomUrl]=useState(''),[listOnlyLive,setListOnlyLive]=useState(false),[status,setStatus]=useState('شبکه‌ها با iframe پارسا تی‌وی بارگذاری می‌شوند');
 useEffect(()=>{fetch(CATALOG_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('http '+r.status);return r.json()}).then(d=>{if(Array.isArray(d)){setRemote(d);setStatus('فهرست شبکه‌ها آماده است؛ منابع مستقیم در صورت تأیید اضافه می‌شوند')}}).catch(()=>setStatus('فهرست اصلی شبکه‌ها آماده است'));},[]);
 useEffect(()=>{fetch(STREAMS_URL,{cache:'no-store'}).then(r=>r.ok?r.json():{}).then(data=>{if(data && !Array.isArray(data) && typeof data==='object')setDirectStreams(data)}).catch(()=>{});},[]);
 useEffect(()=>{fetch(ORDER_URL,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('order');return r.json()}).then(d=>{if(Array.isArray(d))setSiteOrder(d)}).catch(()=>{});},[]);
 const channels=useMemo(()=>{const map=new Map(seed.map(c=>[c.id,c]));const byName=new Map(seed.map(c=>[channelKey(c.originalName),c.id]));remote.forEach(c=>{if(!c?.name||!c?.id)return;const id=byName.get(channelKey(c.originalName||c.name))||c.id;const old=map.get(id)||{};map.set(id,{...old,...c,id,name:old.name||displayName(c.name,c.category),originalName:old.originalName||c.name,parsaName:c.parsaName||old.parsaName||c.name.replaceAll(' ','-'),sourcePage:c.sourcePage||old.sourcePage,type:c.streamUrl?'hls':'iframe'})});return [...map.values()].map(c=>({...c,...(independentSources[c.parsaName]||{}),...(directStreams[c.parsaName]||{})}))},[remote,directStreams]);
 const siteRanks=useMemo(()=>new Map(siteOrder.map((name,i)=>[channelKey(name),i])),[siteOrder]);
 const filtered=useMemo(()=>channels.filter(c=>(activeCat==='همه شبکه‌ها'||(activeCat==='مورد علاقه‌ها'?favorites.includes(c.id):c.category===activeCat))&&(c.name+' '+(c.originalName||'')).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())).sort((a,b)=>{
  const aRank=siteRanks.get(channelKey(a.originalName||a.parsaName||a.name));
  const bRank=siteRanks.get(channelKey(b.originalName||b.parsaName||b.name));
  if(aRank!==undefined||bRank!==undefined)return (aRank??Number.MAX_SAFE_INTEGER)-(bRank??Number.MAX_SAFE_INTEGER);
  return 0;
 }),[channels,activeCat,favorites,search,siteRanks]);
 const current=selected ? (channels.find(c=>c.id===selected)||null) : null;
 const selectChannel=(id)=>{
  if(id===selected)return;
  setSelected(id);
  updateChannelUrl(id);
 };
 useEffect(()=>{
  const onNavigate=()=>setSelected(getChannelFromUrl());
  window.addEventListener('popstate',onNavigate);
  return ()=>window.removeEventListener('popstate',onNavigate);
 },[]);
 useEffect(()=>{
  document.title=current ? `${current.name} | پخش آنلاین در ماه‌نما` : 'ماه‌نما | تماشای آنلاین شبکه‌های ماهواره‌ای و فارسی';
 },[current?.name]);
 const toggleFav=c=>{setFavorites(prev=>{const next=prev.includes(c.id)?prev.filter(id=>id!==c.id):[...prev,c.id];localStorage.setItem('mahnama.favorites',JSON.stringify(next));return next})};
 const addCustom=()=>{try{const u=new URL(customUrl);if(!['http:','https:'].includes(u.protocol))throw Error();const c={id:'user-stream',name:'استریم شخصی',category:'فارسی',streamUrl:u.href,type:/\.m3u8(?:\?|$)/i.test(u.href)?'hls':'direct',sourcePage:u.href};setRemote(prev=>[...prev.filter(v=>v.id!==c.id),c]);setSelected(c.id);setCustomUrl('')}catch{alert('لینک صحیح http یا https وارد کنید.')}};
 const copyWallet=()=>{if(wallet.address==='YOUR_WALLET_ADDRESS')return;navigator.clipboard?.writeText(wallet.address).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),1600)})};
 const countLive=channels.length;
 return <div className="app" dir="rtl"><header className="header"><div className="header-inner"><a className="brand" href="#top"><span className="brand-logo"><Satellite size={22}/></span><span><strong>ماه‌نما</strong><small>تماشای آنلاین ماهواره</small></span></a><nav className="nav"><a href="#tv">تماشای زنده</a><a href="#categories">دسته‌بندی‌ها</a><a href="#ads">تبلیغات</a><a href="#donate">حمایت مالی</a></nav><div className="header-side"><span className="live-pill"><span className="live-dot"/> {countLive.toLocaleString('fa-IR')} شبکه</span><button className="favorites-top" onClick={()=>{setActiveCat('مورد علاقه‌ها');document.getElementById('tv')?.scrollIntoView({behavior:'smooth'})}}><Star size={16}/> علاقه‌مندی‌ها ({favorites.length})</button></div></div></header>
 <main id="top"><div className="tiny-intro"><div><span className="intro-eyebrow"><span className="live-dot"/> شبکه‌های آنلاین، یک‌جا</span><h1>تماشای آنلاین <em>ماهواره</em></h1></div><p>شبکه را از کنار پلیر انتخاب کنید؛ با یک کلیک پخش عوض می‌شود.</p></div>
 <section id="tv" className="tv-layout"><div className="watch-col"><section className="watch-card"><div className="watch-heading"><div><span className="section-overline">در حال تماشا</span><h2><Play size={17} fill="currentColor"/>{current?.name||'انتخاب شبکه'}</h2></div><div className="action-row"><button className={'action-button '+(favorites.includes(current?.id)?'is-fav':'')} onClick={()=>current&&toggleFav(current)} disabled={!current} title="افزودن به علاقه‌مندی" aria-label="علاقه‌مندی"><Star size={19} fill={favorites.includes(current?.id)?'currentColor':'none'}/></button>{current?.sourcePage&&<a className="action-button" href={current.sourcePage} target="_blank" rel="noopener noreferrer" title="صفحه اصلی شبکه"><ExternalLink size={18}/></a>}</div></div><Player channel={current}/><div className="watch-footer">{current&&<><span className={current?.streamUrl?'status-chip online':'status-chip'}>● {current?.streamUrl?'پخش مستقیم (بدون تضمین دسترسی)':'پخش از iframe پارسا تی‌وی'}</span><span className="category-chip">{current?.category}</span>{current?.sourcePage&&<a href={current.sourcePage} target="_blank" rel="noopener noreferrer">صفحه شبکه <ExternalLink size={13}/></a>}</>}</div></section>
 <section id="categories" className="category-section"><div className="heading-inline"><h2>دسته‌بندی شبکه‌ها</h2><span>{channels.length.toLocaleString('fa-IR')} شبکه</span></div><div className="category-chips">{categories.map(cat=><button key={cat} className={activeCat===cat?'active':''} onClick={()=>setActiveCat(cat)}>{cat==='مورد علاقه‌ها'?<Star size={15}/>:<Tv size={15}/>} {cat}</button>)}</div></section>
 
 <div className="under-ad">فضای تبلیغ شما <a href="#ads">درخواست تبلیغات ←</a></div></div>
 <aside className="channel-sidebar"><div className="side-heading"><div><h2>لیست شبکه‌ها</h2><small>{filtered.length.toLocaleString('fa-IR')} شبکه</small></div><Radio size={20}/></div><div className="sidebar-categories" aria-label="دسته‌بندی شبکه‌ها"><div className="sidebar-tabs" role="group" aria-label="فیلتر دسته‌بندی">{categories.map(cat=><button type="button" key={cat} aria-pressed={activeCat===cat} className={'sidebar-tab '+(activeCat===cat?'active':'')} onClick={()=>setActiveCat(cat)}>{cat==='مورد علاقه‌ها'?<Star size={13}/>:null}<span>{cat}</span></button>)}</div></div><label className="side-search"><Search size={18}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="جست‌وجوی شبکه..."/></label><p className="catalog-status">{status}</p><div className="channel-scroll">{filtered.map(c=><div key={c.id} className={'side-channel '+(c.id===current?.id?'selected':'')}><button className="side-channel-main" onClick={()=>selectChannel(c.id)}><span className="channel-avatar"><Tv size={18}/></span><span className="side-channel-title"><strong dir="auto">{c.name}</strong><small>{c.category}</small></span><span className="live-indicator" title="نمایش زنده (پخش‌پذیری استریم تأیید نشده)"><span className="stream-dot yes"/><span className="live-text">LIVE</span></span></button><button className={'side-star '+(favorites.includes(c.id)?'on':'')} aria-label={'علاقه‌مندی '+c.name} title="ستاره" onClick={()=>toggleFav(c)}><Star size={17} fill={favorites.includes(c.id)?'currentColor':'none'}/></button></div>)}{filtered.length===0&&<div className="empty-list">شبکه‌ای با این مشخصات پیدا نشد.</div>}</div></aside></section>
 <section id="ads" className="ads"><div className="section-label">همکاری با ما</div><h2>جایگاه‌های تبلیغاتی</h2><div className="ads-grid">{adSlots.map((ad,i)=><a href={ad.link} key={i} className="ad-card"><div className="ad-illustration">✦</div><div><span className="ad-caption">جایگاه {i+1}</span><h3>{ad.title}</h3><p>{ad.desc}</p><span className="ad-cta">{ad.cta} ←</span></div></a>)}</div></section>
 <section id="donate" className="donate"><div className="donate-copy"><div className="section-label"><Heart size={16}/> حمایت از سایت</div><h2>حمایت مالی از ماه‌نما</h2><p>برای توسعه سایت و نگهداری لیست شبکه‌ها می‌توانید از پروژه حمایت کنید.</p><span className="network-tag"><Wallet size={16}/> شبکه: {wallet.network}</span></div><div className="wallet-card"><span>آدرس کیف پول</span><div className="wallet-address" dir="ltr"><code>{wallet.address}</code><button onClick={copyWallet} disabled={wallet.address==='YOUR_WALLET_ADDRESS'}>{copied?<Check size={18}/>:<Copy size={18}/>}</button></div><small>قبل از ارسال، شبکه و آدرس را با دقت بررسی کنید.</small></div></section><div className="disclaimer"><Info size={18}/> بعضی شبکه‌ها در iframe پارسا تی‌وی فقط داخل سایت اصلی کار می‌کنند. لینک مستقیم نیز ممکن است CORS، محدودیت دسترسی یا قطعی داشته باشد. در این حالت از لینک «صفحه شبکه» استفاده کنید. حقوق پخش شبکه‌ها باید رعایت شود.</div></main><footer><div className="footer-inner"><strong>ماه‌نما · تماشای آنلاین ماهواره</strong><div className="footer-credits"><span>طراحی توسط {linkedinUrl?<a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="designer-link">میثم علیان نژادی ↗</a>:<span className="designer-name">میثم علیان نژادی</span>}</span></div></div></footer></div>
}
createRoot(document.getElementById('root')).render(<App/>);
