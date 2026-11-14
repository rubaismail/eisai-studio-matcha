# Website Lighthouse results and fix tracking

Site: https://eisaistudio.com (home page). Tracks every issue from the first Lighthouse run after launch, how each one is fixed, and the result after the fix.

**How to update:** when a fix is deployed, re-run Lighthouse with the same settings, add a row to [Score history](#score-history), set the issue's status, and fill in its "After" value. Save each new report next to the baseline in [lighthouse/](lighthouse/).

## Test settings

| Setting    | Value                                                                                                                                                                                                   |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool       | Lighthouse 12.8.2 (same engine as Chrome DevTools > Lighthouse)                                                                                                                                         |
| Device     | Mobile, simulated mid-range phone on slow 4G (DevTools default)                                                                                                                                         |
| Page       | `https://eisaistudio.com/`                                                                                                                                                                              |
| Baseline   | November 11, 2026, 19:11 UTC, right after launch (#40)                                                                                                                                                  |
| Raw report | [lighthouse/2026-11-11-baseline-mobile.json](lighthouse/2026-11-11-baseline-mobile.json). Open it in the [Lighthouse Viewer](https://googlechrome.github.io/lighthouse/viewer/) to see the full report. |
| Re-runs    | Run 3 times per change and record the median run, since scores vary a few points between runs. Reports are saved as `lighthouse/<date>-<change>-mobile.json`.                                           |

Scores vary a few points between runs. Compare trends, not single points.

## Score history

| Date       | Change deployed           | Performance | Accessibility | Best Practices | SEO | LCP   | FCP   |
| ---------- | ------------------------- | ----------- | ------------- | -------------- | --- | ----- | ----- |
| 2026-11-11 | Baseline (launch)         | 62          | 100           | 100            | 83  | 7.7 s | 4.7 s |
| 2026-11-11 | Server gzip + HTTP/2, #96 | 81          | 100           | 100            | 100 | 4.4 s | 2.5 s |
|            | #93 fonts                 |             |               |                |     |       |       |
|            | #94 images                |             |               |                |     |       |       |
|            | #95 code splitting        |             |               |                |     |       |       |

After server gzip + HTTP/2 and #96 (median of 3 runs at 19:38–19:40 UTC; Performance 81, 81, 82): First Contentful Paint 2.5 s, Largest Contentful Paint 4.4 s, Speed Index 2.5 s, Time to Interactive 4.4 s, Total Blocking Time 0 ms, Cumulative Layout Shift 0, total download 1.3 MB. Report: [lighthouse/2026-11-11-after-quick-fixes-mobile.json](lighthouse/2026-11-11-after-quick-fixes-mobile.json).

#93 fonts, checked on a local production build before deploying (same settings, median of 3 runs per build): Google Fonts no longer appears under render-blocking requests, only the site's own CSS. First Contentful Paint 2.2 s → 1.5 s, Speed Index 2.2 s → 1.9 s, Largest Contentful Paint 4.6 s → 4.4 s, Performance 81 → 84. Text renders pixel-identical before and after. The live site still needs a re-run after deploy for the score history. Reports: [before](lighthouse/2026-11-13-fonts-local-before-mobile.json), [after](lighthouse/2026-11-13-fonts-local-after-mobile.json).

Baseline metrics: First Contentful Paint 4.7 s, Largest Contentful Paint 7.7 s, Speed Index 5.7 s, Time to Interactive 7.8 s, Total Blocking Time 10 ms, Cumulative Layout Shift 0.001. Server response time was 47 ms, so the server itself is not the bottleneck; the page's 1.7 MB download size is.

## Issues found and fixes

Status: **Open**, **Fixed** (merged, not yet deployed or measured), **Verified** (deployed and confirmed by a new Lighthouse run).

| #   | Lighthouse audit                                                     | Baseline              | Fix                                                                                  | Owner                 | Tracked in        | Status       | After                                                                                     |
| --- | -------------------------------------------------------------------- | --------------------- | ------------------------------------------------------------------------------------ | --------------------- | ----------------- | ------------ | ----------------------------------------------------------------------------------------- |
| 1   | Enable text compression                                              | ~300 KB savings       | Nginx `gzip_types` for JS/CSS/JSON (`deploy/eisai-gzip.nginx.conf`)                  | rubaismail            | #96 + server step | Verified     | Passes                                                                                    |
| 2   | Use HTTP/2 / Modern HTTP                                             | 21 requests, ~0.8 s   | `listen 443 ssl http2` in the Nginx site files                                       | rubaismail            | #96 + server step | Verified     | Passes                                                                                    |
| 3   | Largest Contentful Paint / Preload LCP image / LCP request discovery | 7.7 s, ~0.7 s savings | `fetchPriority="high"` on the hero (done); preload the hero from `index.html` (open) | rubaismail, brandenxo | #96, #94          | Partly fixed | LCP 4.4 s; preload and discovery still flagged                                            |
| 4   | Render-blocking requests                                             | ~1.2 s                | Self-host Questrial and Anonymous Pro instead of Google Fonts                        | brandenxo             | #93               | Fixed        | Local build: Google Fonts no longer blocking; FCP 2.2 s → 1.5 s (live check after deploy) |
| 5   | Properly size images / Serve images in next-gen formats              | ~420 KB               | WebP/AVIF, phone-sized `srcset`, smaller logo, lazy-load below the fold              | brandenxo             | #94               | Open         | No change (~420 KB)                                                                       |
| 6   | Reduce unused JavaScript                                             | ~230 KB               | Load admin and account pages with `React.lazy` so the home page downloads less code  | Cherriuu              | #95               | Open         | ~87 KB (compression shrank it; code still unused)                                         |
| 7   | Time to Interactive, Speed Index, Network dependency tree            | 7.8 s, 5.7 s          | No separate fix: summary metrics that improve as 1–6 are fixed                       | —                     | —                 | —            | TTI 4.4 s, Speed Index 2.5 s                                                              |
| 8   | robots.txt is not valid                                              | 19 errors             | Add `apps/web/public/robots.txt` (the missing file fell through to `index.html`)     | rubaismail            | #96               | Verified     | Passes                                                                                    |
| 9   | Document does not have a meta description                            | Missing               | Add `<meta name="description">` to `apps/web/index.html` (client may reword)         | rubaismail            | #96               | Verified     | Passes                                                                                    |

## What each issue means

1. **Text compression.** The site's code (419 KB) and styles (35 KB) were sent uncompressed. Ubuntu's Nginx only compresses HTML by default. Compressed, the code is about 135 KB.
2. **HTTP/2.** Files were downloaded over HTTP/1.1, which only fetches a few at a time. HTTP/2 fetches them all in parallel over one connection.
3. **Largest Contentful Paint.** The biggest thing on screen is the hero photo. The browser only discovers it after downloading and running all the site's code, so it starts loading late.
4. **Render-blocking requests.** The page stays blank until the Google Fonts stylesheet (on another domain) and the site's CSS finish downloading.
5. **Image size and format.** Phones receive full desktop-size JPGs and PNGs. WebP/AVIF and phone-sized copies are 30–70% smaller.
6. **Unused JavaScript.** Every visitor downloads the code for every page, including the admin dashboard, to see the home page.
7. **Summary metrics.** These combine the issues above and have no fix of their own.
8. **robots.txt.** With no `robots.txt` file, the site returned the home page for that address, so search engines received HTML instead of crawling rules.
9. **Meta description.** Google had no summary to show under the site name in search results.

Accessibility (100) and Best Practices (100) had no failing audits.
