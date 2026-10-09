# ماه‌نما | تماشای آنلاین ماهواره

React + Vite, GitHub Pages. Player renders each station through the ParsaTV embed endpoint.

## Player

The iframe URL is built from `channel.parsaName` (not the Persian display label):

`https://www.parsatv.com/embed.php?name=Persiana-Iranian&auto=false`

To correct an invalid source identifier, update `parsaName` in `src/catalog.js`. Persian and Iranian labels are controlled by `persianNames`; international network labels stay in English. Browser security policies or unavailable embeds may prevent playback; these URLs have **not** all been verified individually.

## Deploy

Upload all project files to the repository root. Settings > Pages > GitHub Actions. The workflow in `.github/workflows/deploy.yml` builds Vite and publishes `dist`.

Change Vite `base` in `vite.config.js` for a different repository path.

## Advertising and donation

Edit `adSlots` and `wallet` in `src/main.jsx`. User favorites live in localStorage.


### نشانگر LIVE
در کنار شبکه‌ها یک نشانگر سبز چشمک‌زن و متن LIVE نمایش داده می‌شود. این نشانگر صرفاً بیانگر پیکربندی لینک iframe است و به معنی تأیید لحظه‌ای سلامت پخش نیست.


## Sidebar categories & ParsaTV order
The sidebar has a horizontally scrolling category bar (touch and trackpad supported). The All filter follows `public/parsatv-order.json`, initially seeded from the public ParsaTV homepage. During deployment `scripts/sync_parsatv.py` attempts to refresh directory names/order from ParsaTV and rebuild `public/channels.json`; if inaccessible it retains the checked-in snapshot. Channels not included in the snapshot remain after listed channels in seed order. Stream availability is not verified by these display indicators.


## تنظیم کیف پول و لینکدین

در فایل `src/main.jsx` ابتدای فایل دو مقدار قابل تنظیم وجود دارد:

```jsx
const wallet={network:'TRC20',address:'YOUR_WALLET_ADDRESS'};
const linkedinUrl='';
```

`YOUR_WALLET_ADDRESS` را با آدرس **عمومی دریافت** کیف پول جایگزین کنید و در صورت نیاز نام شبکه را اصلاح کنید (مثلاً `TRC20` یا `ERC20`). کلید خصوصی یا عبارت بازیابی را هرگز داخل پروژه GitHub نگذارید. آدرس صحیح پروفایل لینکدین مانند `https://www.linkedin.com/in/your-profile/` را داخل `linkedinUrl` بنویسید؛ تا قبل از آن، نام طراح بدون لینک نمایش داده می‌شود.


### آخرین تغییرات
- لینک طراحی توسط میثم علیان نژادی به https://www.linkedin.com/in/aliannezhadi/ وصل شد.
- عبارت «ساخته‌شده با React» از پایین صفحه حذف شد.
- هنگام ورود به سایت هیچ شبکه‌ای به صورت خودکار انتخاب نمی‌شود و پیام «شبکه مورد نظر را انتخاب کنید» نمایش داده می‌شود.
- برای تنظیم کیف پول در `src/main.jsx` مقدار `YOUR_WALLET_ADDRESS` را فقط با آدرس عمومی دریافت جایگزین کنید.


### نسخه قاب تلویزیونی و کیف پول

قاب پلیر سبک تلویزیون طراحی شده است. آدرس عمومی دریافت TRON / TRC20 در `src/main.jsx` در متغیر `wallet` قرار دارد. برای تغییر از همان قسمت استفاده کنید.


## SEO و پیش‌نمایش لینک
این نسخه متاتگ‌های Open Graph/Twitter، تصویر `public/og-image.png`، فایل‌های `robots.txt` و `sitemap.xml` و داده ساخت‌یافته WebSite دارد. آدرس اصلی https://tvnama.github.io/ است و `vite.config.js` با `base: "/"` تنظیم شده است.

بعد از انتشار، https://tvnama.github.io/og-image.png و https://tvnama.github.io/sitemap.xml را بررسی کنید. برای نمایه‌سازی گوگل از Google Search Console استفاده کنید. پیش‌نمایش شبکه‌های اجتماعی ممکن است کش شود.


## لینک مستقیم شبکه‌ها
با کلیک روی شبکه، نشانی صفحه بدون بارگذاری مجدد به شکل `https://tvnama.github.io/?channel=CHANNEL_ID` تغییر می‌کند. لینک را می‌توان کپی و ارسال کرد. رفت‌وبرگشت مرورگر نیز انتخاب شبکه را به‌روزرسانی می‌کند. متادیتای Open Graph برای لینک‌های دارای پارامتر، در هاست استاتیک GitHub Pages همچنان متادیتای کلی سایت است.

## Independent streams (October 2026 update)

The app now supports first-party HTML5/HLS playback (hls.js) when a channel has `streamUrl`. Configure independent, authorized, publicly playable stream URLs in `src/independent-sources.js` keyed by ParsaTV channel identifier (for example `Namayesh`). If no direct stream is configured, the existing ParsaTV iframe is retained. The original site's `Invalid URL / Please visit the page from its main source` notice means embedding is restricted; embedding that page in this project does not fix it. Do not attempt to bypass domain checks or proxy third-party protected streams without permission.

The supplied Namayesh sample stream is **commented out** because it has not been live-tested, and a publicly visible playlist URL does not establish embedding/redistribution permission or CORS compatibility. Enable only after verification. `public/channels.json` synchronization does not verify playback. The GitHub Pages build remains static and cannot run a server-side stream proxy.

## بررسی خودکار منابع مستقیم شبکه‌ها

هنگام هر انتشار GitHub Actions، بعد از همگام‌سازی فهرست، `scripts/sync_streams.py`
صفحات عمومی هر شبکه را بررسی می‌کند و فقط آدرس‌های HLS که پاسخ قابل‌خواندن
و هدر CORS مناسب برای `https://tvnama.github.io` دارند در
`public/direct-streams.json` قرار می‌دهد. این بررسی **تضمین پخش واقعی نیست**؛
درخواست قطعه‌های ویدیویی، مجوز بازپخش و برخی محدودیت‌های مبتنی بر دامنه
ممکن است همچنان مانع باشند. استریم‌های محافظت‌شده دور زده نمی‌شوند.

برای اجرای دستی: `python -m pip install requests` سپس
`python scripts/sync_streams.py` (با دسترسی شبکه). `SITE_ORIGIN` باید در صورت
تغییر دامنه تنظیم شود. اگر صفحه/استریم اجازه دسترسی ندهد، آن شبکه در روش
قبلی iframe باقی می‌ماند. اجرای آفلاین فایل JSON خالی تولید می‌کند.


## Audit of each source page / گزارش تک‌تک شبکه‌ها

GitHub Actions calls `scripts/sync_streams.py` and writes `public/stream-audit.json` (published at `/stream-audit.json`). It checks each public page, scans direct HLS URLs and at most a few same-site iframe documents, and tests the candidate playlist for HTTP 200, `#EXTM3U`, and browser-origin CORS. A channel only receives a direct-player URL if these checks pass. `Tamasha` has a **candidate** from public IPTV listings (`ncdn.telewebion.ir/hdtest/...`), *not* a verified ParsaTV extraction. The Namayesh candidate comes from the earlier user-provided HTML. Neither is forced into playback until the runtime check passes. This does not confirm segment requests, licensing, or browser playback.

**Important:** The project still uses ParsaTV embeds when no direct URL passes these checks. It is NOT fully independent, and removing all ParsaTV references at this stage would break unverified channels. This package does not claim a finished all-channel migration. For accurate CORS checks, set the GitHub Actions environment `SITE_ORIGIN` to the site's actual origin (including scheme).
