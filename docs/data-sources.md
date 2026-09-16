# SANKET — Data Source Availability & Access Report

**Scope:** Landslide early-warning system, 8 North East Indian states.
**Target bbox:** 21.5N–29.5N, 88E–97.5E (~8° lat × 9.5° lon).
**Research date:** 2026-08-25. **Timeline:** 6 days remaining.

## How to read this document

Every factual claim is tagged:

- **[VERIFIED-URL]** — I fetched the live page/endpoint on 2026-08-25 and read this off it.
- **[VERIFIED-SEARCH]** — read from a search-engine extract of the live page, not the page itself. Slightly weaker; the underlying page was live.
- **[FROM-MEMORY-UNVERIFIED]** — recalled from training data. **Treat as a hypothesis, not a fact.**

> **Testing caveat that affects several rows below.** All fetches came from a **non-Indian network egress**. Several Indian government hosts refused the connection outright (see Bhukosh). A test from an Indian IP may give a different result. Where this is a plausible explanation I say so instead of declaring the source dead.

---

# TIER 1 — Critical path

## 1. IMD (India Meteorological Department)

**Bottom line: IMD has a real, fully documented REST API, but it is NOT open. I tested it and got HTTP 401. Do not build on it and do not claim it in the pitch as an open data source.**

| Field | Finding |
|---|---|
| Official URL | `https://mausam.imd.gov.in/responsive/apis.php` (landing), `https://api.imd.gov.in/public/index.php` (portal), `https://api.imd.gov.in/public/api_reference.html` (docs) [VERIFIED-URL] |
| Provides | 7-day city forecast, current weather, district nowcast, **district rainfall**, district warnings, station nowcast, state rainfall, **AWS station data**, river-basin QPF, port/sea/coastal bulletins, subdivision warnings, sun/moon, cyclone track/wind/cone [VERIFIED-URL] |
| Spatial resolution | Point (station ID) and district/state/subdivision polygons — not gridded [VERIFIED-URL] |
| Temporal / latency | Not documented on the public reference page [VERIFIED-URL] |
| Access method | REST, JSON, `https://api.imd.gov.in/api/v1/<endpoint>` [VERIFIED-URL] |
| **Auth** | **Registration + IP whitelisting.** The IMD page explicitly links an "IP Whitelisting Portal" and the portal itself shows Create Account / Login [VERIFIED-URL] |
| Cost | Not published [VERIFIED-URL] |
| Rate limits | Not published. Docs *require* clients to "employ client-side caching to optimize performance during peak weather events" [VERIFIED-URL] |
| Licence | **Attribution to IMD is mandatory** [VERIFIED-URL] |
| Format | JSON [VERIFIED-URL] |

### What I actually tested (2026-08-25)

```
GET https://api.imd.gov.in/api/v1/cityforecast      -> HTTP 401 Unauthorized   [VERIFIED-URL]
GET https://api.imd.gov.in/api/v1/districtrainfall  -> HTTP 401 Unauthorized   [VERIFIED-URL]
```

Both returned 401 with no body. This is an authentication gate, not a network block — the docs page and portal on the same host loaded fine from the same egress. So the 401 is real and not an artifact of my network.

### Documented endpoints (verbatim from the reference page) [VERIFIED-URL]

| Endpoint | Path | Params |
|---|---|---|
| City forecast (7d) | `/api/v1/cityforecast` | `?id=StationId` |
| City forecast + coords | `/api/v1/cityforecastloc` | `?id=StationId` |
| Current weather | `/api/v1/current_wx` | `?id=StationId` |
| District nowcast | `/api/v1/districtnowcast` | `?id=DistrictId` |
| **District rainfall** | `/api/v1/districtrainfall` | `?id=DistrictId` |
| District warnings | `/api/v1/districtwarning` | `?id=DistrictId` |
| Station nowcast | `/api/v1/stationnowcast` | `?id=StationName` |
| State rainfall | `/api/v1/staterainfall` | `?id=StateName` |
| **AWS data** | `/api/v1/aws_data` | `?id=StationId` or `?sid=StateId` |
| River basin QPF | `/api/v1/basinqpf` | `?id=BasinId` |
| Sun/moon | `/api/v1/sunmoon` | `?lat=&lon=` |

Plus port warning, sea bulletin, coastal bulletin, subdivision warning, cyclone track/wind/cone.

### GOTCHAS

- **Do not overclaim.** There is no public, key-free IMD API in 2026. The honest framing for a hackathon pitch is: *"IMD publishes a documented API; access requires registration and IP whitelisting, which we have applied for. Our prototype runs on Open-Meteo + GPM IMERG, and the IMD adapter is written and ready to switch on."*
- IP whitelisting is the real killer: it binds you to a **fixed egress IP**. A laptop on hotel/college wifi or an ephemeral cloud function will not work. You need a static IP (a small VPS) before you even apply.
- Approval time is **not published anywhere I could find**. Assume it will not land inside 6 days.
- The public HTML pages (`mausam.imd.gov.in/responsive/rainfallinformation.php`, `.../rainfall_statistics.php`) are reachable and could be scraped as a last resort, but that is fragile and the terms are unclear. Not recommended as a primary path.

---

## 2. Open-Meteo — forecast API + ERA5 historical archive

**Bottom line: this is your primary weather backbone. No key, no registration, CC BY 4.0, hourly precipitation, archive back to 1940. Nothing here blocks you.**

### 2a. Forecast API

| Field | Finding |
|---|---|
| Official URL | `https://open-meteo.com/en/docs` [VERIFIED-URL] |
| Endpoint | `https://api.open-meteo.com/v1/forecast` [VERIFIED-URL] |
| **API key** | **Not required for non-commercial use.** Docs: key "Only required to commercial use to access reserved API resources" [VERIFIED-URL] |
| Forecast length | 7 days default, **up to 16 days** [VERIFIED-URL] |
| Hourly variables | Temperature 2m, RH 2m, dewpoint, apparent temp, **precipitation probability**, **precipitation (rain + showers + snow)**, and many more [VERIFIED-URL] |
| Licence | **CC BY 4.0** for data; source code AGPLv3 [VERIFIED-URL] |
| Attribution | Required. Must include a link, e.g. `<a href="https://open-meteo.com/">Weather data by Open-Meteo.com</a>` [VERIFIED-URL] |
| Format | JSON (also FlatBuffers / CSV / XLSX per docs) [VERIFIED-URL] |

### 2b. ERA5 Historical Weather Archive

| Field | Finding |
|---|---|
| Official URL | `https://open-meteo.com/en/docs/historical-weather-api` [VERIFIED-URL] |
| Endpoint | `https://archive-api.open-meteo.com/v1/archive` [VERIFIED-URL] |
| **Archive start** | **1940** [VERIFIED-URL] |
| Spatial resolution | **0.25° (~25 km)**, global [VERIFIED-URL] |
| Temporal resolution | **Hourly** [VERIFIED-URL] |
| **Hourly precipitation** | **Yes** — "Total precipitation (rain, showers, snow) sum of the preceding hour", mm or inches [VERIFIED-URL] |
| **Latency** | Updates daily with a **5-day delay** — most recent data is ~5 days old [VERIFIED-URL] |
| API key | Not required for non-commercial use [VERIFIED-URL] |

### Free-tier rate limits (both APIs) [VERIFIED-URL] — from `https://open-meteo.com/en/pricing`

| Window | Limit |
|---|---|
| Per minute | **600 calls** |
| Per hour | **5,000 calls** |
| Per day | **10,000 calls** |
| Per month | **300,000 calls** |

### Sizing for the NER bbox

- ERA5 at 0.25° over 21.5–29.5N / 88–97.5E ≈ **32 × 38 = ~1,216 grid points** [derived arithmetic, not a fetched figure].
- Open-Meteo accepts **comma-separated multi-coordinate requests**, so you do not need one call per point. Batch aggressively. [FROM-MEMORY-UNVERIFIED — confirm the exact multi-point syntax and per-request point cap in the docs before you rely on it.]
- 10 years hourly × 1,216 points is large as JSON. Prefer daily aggregation server-side, or pull a coarser point set (e.g. one point per district centroid, ~100 points) for the prototype.

### GOTCHAS

- **Ambiguity worth knowing:** the pricing page lists Historical/Climate/Ensemble/Satellite-Radiation as APIs "unlocked" on Professional and Enterprise tiers, while the Historical API docs say no key is needed for non-commercial use [both VERIFIED-URL]. My reading: the tier gating is about **commercial licensing and reserved capacity**, and free non-commercial use of `archive-api` is permitted. **Low risk, but if the archive endpoint ever 402s/429s on you, this is why.**
- The 5-day archive lag means ERA5 **cannot** feed your real-time path. Use forecast API + GPM IMERG Early for live; ERA5 for model training only.
- 10,000 calls/day is generous but a naive per-village per-hour backfill will blow through it. Cache to local parquet on first pull.
- Non-commercial only. Fine for a government hackathon prototype; re-check if this ever ships commercially.

---

## 3. Landslide4Sense 2022 (IARAI) — **CRITICAL: official distribution is DEAD**

**Bottom line: the IARAI domain no longer resolves. Every official download link in the README is dead. The dataset survives only on third-party mirrors — chiefly Hugging Face. Plan on the mirror and verify the contents yourself.**

### Dataset contents [VERIFIED-URL] — from `https://raw.githubusercontent.com/iarai/Landslide4Sense-2022/main/README.md`

| Property | Value |
|---|---|
| **Bands** | **14 total** |
| — B1–B12 (12 bands) | Sentinel-2 multispectral |
| — Band 13 | **Slope** (from ALOS PALSAR) |
| — Band 14 | **DEM** (from ALOS PALSAR) |
| **Patch size** | **128 × 128 px**, ~**10 m/px** |
| **Train** | **3,799 patches** |
| **Validation** | **245 patches** |
| **Test** | **800 patches** |
| **Total** | **4,844 patches** |
| Format | **HDF5 (`.h5`)**, one file per patch |
| Labels | Pixel-wise binary: `0` = non-landslide, `1` = landslide |
| Directory layout | `images/train/`, `images/validation/`, `images/test/` and `annotations/train/`, `annotations/validation/`, `annotations/test/` [VERIFIED-URL] |

### Official download links — ALL DEAD [VERIFIED-URL]

The README lists these verbatim [VERIFIED-URL]:

```
Train: https://cloud.iarai.ac.at/index.php/s/KrwKngeXN7KjkFm
Val:   https://cloud.iarai.ac.at/index.php/s/N6TacGsfr5nRNWr
Model: https://cloud.iarai.ac.at/index.php/s/CgbjDRK6B5KYaLE
```

DNS resolution results, 2026-08-25:

```
cloud.iarai.ac.at        -> getaddrinfo ENOTFOUND        (domain does not resolve)  [VERIFIED-URL]
www.iarai.ac.at          -> getaddrinfo ENOTFOUND        (domain does not resolve)  [VERIFIED-URL]
www.landslide4sense.org  -> TLSV1_ALERT_INTERNAL_ERROR   (TLS handshake fails)      [VERIFIED-URL]
```

This is **NXDOMAIN, not a firewall block** — a geo-block or firewall returns refused/timeout, not "no such name". IARAI (Institute of Advanced Research in Artificial Intelligence, Vienna) wound down its public operations and the domain has lapsed. **The official distribution is gone and is not coming back inside your timeline.**

Corroborating: GitHub issue #9 "The download for landslide is invalid", opened **29 June 2023**, still **open**, no maintainer response, no alternative link posted [VERIFIED-URL] — `https://github.com/iarai/Landslide4Sense-2022/issues/9`. The rot has been known for 3 years and nobody fixed it.

### WORKING MIRROR — Hugging Face [VERIFIED-URL]

`https://huggingface.co/datasets/harshinde/LandSlide4Sense`

| Field | Finding |
|---|---|
| **Total size** | **8.99 GB** [VERIFIED-URL] |
| Structure | `images/` and `annotations/` folders; `.gitattributes` (2.46 kB), `README.md` (2.04 kB) [VERIFIED-URL] |
| Splits | 3,799 train / 245 val / 800 test — **matches the official spec exactly** [VERIFIED-URL] |
| Bands | 14 (S2 B1–B12 + slope + DEM) — matches [VERIFIED-URL] |
| Downloads | 869 last month — actively used, so it is not a broken upload [VERIFIED-URL] |
| **Licence** | **NOT STATED on the dataset card.** No LICENSE file visible in the repo tree [VERIFIED-URL] |
| Login to download | Not explicitly required; HF public datasets are generally anonymous-downloadable via `huggingface_hub` [FROM-MEMORY-UNVERIFIED — just try `hf download` and see] |

Additional mirror: RCAC Federated Dataset Documentation, `https://datasetdocs.readthedocs.io/en/latest/geoai/Landslide4sense.html` — describes the same three splits [VERIFIED-SEARCH]. Purdue RCAC-hosted; may require campus access.

A second HF copy, `https://huggingface.co/datasets/ibm-nasa-geospatial/Landslide4sense`, was checked 25 Aug 2026 and also exists with the identical 800-test-mask structure [VERIFIED-URL]. Either works; try the `ibm-nasa-geospatial` one first (institutional org, less likely to vanish than an individual account).

### FOURTH SOURCE — Kaggle, checked live 25 Aug 2026 [VERIFIED — inspected directly via browser, Data Explorer opened]

`https://www.kaggle.com/datasets/tekbahadurkshetri/landslide4sense`

| Field | Finding |
|---|---|
| **Total size** | **8.97 GB** — matches the HF mirrors |
| Structure | `TrainData/`, `ValidData/`, `TestData/img/` — `TestData/img` confirmed as **exactly 800 files** |
| **Test masks** | **Absent.** `TestData` has only one subdirectory (`img`) — no mask folder. Same limitation as the original official release. |
| **Licence** | **"Licensed by IARAI GmbH"**, stated directly in the dataset description — clearer attribution than either HF mirror, which state no licence at all |
| Stability | Uploaded/last updated **3 years ago**, **7,063 total downloads**, **25.5K views**, 503 views + 112 downloads in the last 30 days — established and actively used, not an abandoned upload |
| Access | `kaggle datasets download -d tekbahadurkshetri/landslide4sense` — one line via the Kaggle CLI, no HF auth flow |

**Recommendation:** use the Kaggle copy for training (train + val, which is all you need if you carve your own held-out split — see `ml-research.md` §A for why that is the methodologically better choice anyway). It is the easiest to pull and has the least ambiguous licence of the four sources found. Reach for an HF mirror only if you specifically want to report against the official test split.

### Licence position

- The **original** Landslide4Sense terms were competition terms on the now-dead IARAI site. **I could not retrieve them** — the site does not resolve.
- **Both Hugging Face mirrors state no licence at all** [VERIFIED-URL].
- **The Kaggle mirror explicitly attributes "Licensed by IARAI GmbH"** — not a full licence text, but a clear statement of ownership that the HF mirrors lack.
- The underlying inputs are Sentinel-2 (free, full open licence) and ALOS PALSAR (NASA/JAXA, free for research) [FROM-MEMORY-UNVERIFIED].
- **Practical stance for a government hackathon prototype:** cite the paper (Ghorbanzadeh et al., *Landslide4Sense*, IEEE JSTARS, DOI `10.1109/JSTARS.2022.3220845` [VERIFIED-URL, from README]), cite whichever mirror you actually pulled from, state clearly it is research/non-commercial use. Do not redistribute the data yourself. **Flag the licence ambiguity in your submission rather than asserting a licence you cannot evidence** — though the Kaggle attribution to IARAI GmbH makes this a smaller ask than it was with HF alone.

### GOTCHAS

- **Download it on day 1.** All four sources are third-party mirrors with no institutional guarantee. If they disappear you have no fallback with matching splits.
- Verify patch counts after extraction (`3799 / 245 / 800`). If the mirror is partial you want to know immediately, not on training day.
- The Kaggle copy has no test masks — do not plan the training pipeline around scoring against the official held-out test set unless you specifically pulled from HF.
- **The test split may have no public labels** — in the original competition, test annotations were withheld for leaderboard scoring [FROM-MEMORY-UNVERIFIED]. The HF tree does list `annotations/test/`, so the mirror *may* include them, but confirm before you plan an evaluation around it.
- Band 10 (B10, cirrus) carries no surface signal and is usually dropped. Bands are **not** rescaled/normalised uniformly — check value ranges per band before feeding a CNN.
- 8.99 GB is global, not NER-specific. There is no NER-only subset.
- The Future Development Leaderboard referenced in the paper lived at `iarai.ac.at` — also dead. No live leaderboard to benchmark against.

---

## 4. Google Earth Engine — free non-commercial access

**Bottom line: yes, still free for non-commercial use in 2026. Registration is immediate. BUT there is a NEW monthly compute quota introduced 27 April 2026 that you must design around.**

| Field | Finding |
|---|---|
| Official URL | `https://developers.google.com/earth-engine/guides/access`, `https://developers.google.com/earth-engine/guides/noncommercial_tiers` [VERIFIED-URL] |
| Free for non-commercial | **Yes** [VERIFIED-URL] |
| Registration | At `console.cloud.google.com/earth-engine`. Requires a Google Cloud project with the Earth Engine API enabled [VERIFIED-URL] |
| **Approval time** | **"After registration, Earth Engine access is enabled immediately."** Automated, no manual review for Community/Contributor [VERIFIED-URL] |
| Billing required | **No** for non-commercial tiers [VERIFIED-URL] |
| Cost | Free (non-commercial) [VERIFIED-URL] |

### **NEW IN 2026 — monthly EECU quota** [VERIFIED-URL]

> "Since April 27, 2026, all noncommercial Earth Engine projects have a recurring monthly quota."

| Tier | Monthly free quota | Requirement | Approval |
|---|---|---|---|
| **Community** (default) | **150 EECU-hours** (540,000 EECU-s) | None beyond verification | Immediate |
| **Contributor** | **1,000 EECU-hours** (3,600,000 EECU-s) | Active billing account attached — **but you are not charged for non-commercial usage** | Immediate (self-select in Cloud Console) |
| **Partner** | **100,000 EECU-hours** | High-impact climate/biodiversity org | **Manual review, "may take several weeks"** |

Quotas were noted as "still gradually rolling out", so some projects may not have limits applied yet [VERIFIED-URL].

### Verification requirements [VERIFIED-URL]

- Projects registered before **15 April 2025** must verify non-commercial eligibility to keep access.
- Since **26 September 2025**, all non-commercial projects must complete a verification questionnaire; access is **paused** without it.
- **Annual reverification** is required for all non-commercial projects.

### GOTCHAS

- **Switch to Contributor tier on day 1** — it is a self-service dropdown, takes effect immediately, and gives you **6.6× the compute** (1,000 vs 150 EECU-h). You attach a billing account but are not billed for non-commercial work. There is no reason to stay on Community.
- **Do NOT plan on Partner tier.** Several weeks of manual review — impossible in 6 days.
- 150 EECU-hours burns fast on large `Image.reduceRegions` over the whole NER at 10 m. Export to Drive/GCS in tiles and cache; do not re-run interactive reductions.
- Complete the non-commercial questionnaire *before* you start real work, or your project can be paused mid-hackathon.
- GEE is the cheapest path to Sentinel-2 + Copernicus DEM + GPM IMERG **already co-registered** — it may save you more time than downloading rasters yourself. Strongly consider it as the primary EO compute layer.

---

## 5. Copernicus DEM GLO-30

**Bottom line: the single easiest DEM to get. Anonymous S3, no registration, no key. Use this, not Bhuvan CartoDEM.**

| Field | Finding |
|---|---|
| Official URL | `https://registry.opendata.aws/copernicus-dem/`, readme at `https://copernicus-dem-30m.s3.amazonaws.com/readme.html` [VERIFIED-URL] |
| Provides | Global DSM (surface model, not bare-earth) |
| Spatial resolution | 30 m (GLO-30, 1 arc-sec); GLO-90 also available |
| Temporal | Static (TanDEM-X epoch ~2011–2015) [FROM-MEMORY-UNVERIFIED] |
| **Access** | **AWS S3, anonymous** — `aws s3 ls s3://copernicus-dem-30m/ --no-sign-request` [VERIFIED-URL] |
| **Auth** | **NONE.** Buckets are publicly accessible [VERIFIED-URL] |
| Cost | Free [VERIFIED-URL] |
| Rate limits | Standard S3; none documented [VERIFIED-URL] |
| Licence | Copernicus Licence — "free basis for the general public" [VERIFIED-URL] |
| Format | **Cloud Optimized GeoTIFF**, DEFLATE compressed [VERIFIED-URL] |
| Tile index | `tileList.txt` in each bucket [VERIFIED-URL] |

### Naming convention [VERIFIED-URL]

```
Copernicus_DSM_COG_[res]_[northing]_00_[easting]_00_DEM/
  res = 10 for GLO-30, 30 for GLO-90
  e.g. s3://copernicus-dem-30m/Copernicus_DSM_COG_10_N26_00_E092_00_DEM/
```

Note the counter-intuitive part: **GLO-30 uses `COG_10`** (10 = arc-seconds ×10 notation), not `COG_30`. Getting this wrong is the #1 cause of "the bucket is empty" confusion.

### Size for the NER bbox

- 1°×1° tiles → 8 lat × 10 lon = **~80 tiles** [derived arithmetic].
- Estimated **~2–4 GB** total for GLO-30 over the bbox [FROM-MEMORY-UNVERIFIED — measure with `aws s3 ls --summarize` before committing disk].

### GOTCHAS

- "GLO-30 Public provides **limited** worldwide coverage... a small subset of tiles covering specific countries are not yet released to the public" [VERIFIED-SEARCH]. **Check NER coverage explicitly on day 1** — parts of the India/China border region are politically sensitive. If a tile is missing, fall back to SRTM GL1 or GLO-90.
- It is a **DSM** (includes tree canopy and buildings), not a DTM. In densely forested NER this biases slope calculations. Note the limitation; do not silently treat it as bare earth.
- COG means you can **range-request windows** with rasterio/GDAL `/vsis3/` without downloading whole tiles. Use this — it turns a 4 GB download into a few hundred MB.

---

## 6. Copernicus Data Space Ecosystem — Sentinel-2 L2A

**Bottom line: free, registration is instant, quotas are generous. No blocker.**

| Field | Finding |
|---|---|
| Official URL | `https://dataspace.copernicus.eu/` [VERIFIED-URL] |
| Provides | Sentinel-1/2/3/5P; **Sentinel-2 L2A** (BOA reflectance, atmospherically corrected) |
| Spatial resolution | 10 m (B2,B3,B4,B8), 20 m, 60 m |
| Temporal | ~5-day revisit (S2A+S2B combined) [FROM-MEMORY-UNVERIFIED] |
| **Registration** | **Free and effectively instant** — fill form, accept terms, click email verification link, done. No eligibility restrictions stated [VERIFIED-URL] |
| APIs | **OData**, **STAC**, **openEO**, **Sentinel Hub**, S3 [VERIFIED-URL] |
| OData endpoint | `https://catalogue.dataspace.copernicus.eu/odata/v1/Products` [VERIFIED-URL] |
| Auth for download | **Access token required** (via Token API) [VERIFIED-URL] |
| Format | SAFE (JPEG2000 per band), 100×100 km ortho tiles in UTM/WGS84 [VERIFIED-SEARCH] |
| Licence | Copernicus open licence — free, full, open [FROM-MEMORY-UNVERIFIED] |

### Free-account quotas [VERIFIED-URL] — `https://documentation.dataspace.copernicus.eu/Quotas.html`

| Limit | Value |
|---|---|
| Sentinel Hub API requests | **10,000 / month** |
| openEO processing units | **10,000 PU / month** |
| Data Workspace processed products | **25 / month** |
| **Download volume** | **12 TB / rolling 30 days**, then throttled to 1 MB/s |
| S3 + OData requests | **2,000 / minute** |
| Sentinel Hub requests | **300 / minute** |
| openEO requests | **12 / minute** (1 per 5 s) |
| Concurrent connections | **4** (immediate data), **1** (deferred/offline orders) |
| Active sessions | **100** |
| Access token lifetime | **10 minutes** (refreshable within 60 min) |

### Example OData query for Sentinel-2 L2A [VERIFIED-URL]

```
https://catalogue.dataspace.copernicus.eu/odata/v1/Products
  ?$filter=Collection/Name eq 'SENTINEL-2'
   and Attributes/OData.CSC.StringAttribute/any(
       att:att/Name eq 'productType'
       and att/OData.CSC.StringAttribute/Value eq 'S2MSI2A')
   and ContentDate/Start gt <START> and ContentDate/Start lt <END>
```

Docs stress: always specify the collection name and bound by acquisition date, and split very broad date ranges by year, or the query is slow [VERIFIED-URL].

### Size for the NER bbox

- NER needs roughly **40–50 MGRS tiles** for full coverage [FROM-MEMORY-UNVERIFIED].
- Each S2 L2A SAFE product is roughly **600 MB – 1.1 GB** [FROM-MEMORY-UNVERIFIED — the official size table was not on the pages I could reach].
- One cloud-free-ish pass over the whole NER ≈ **30–50 GB**. Multiply by the number of dates you need.

### GOTCHAS

- **10-minute token lifetime** will break any long download loop. Refresh proactively; do not assume a token survives a 40 GB pull.
- **4 concurrent connections only.** Parallel downloaders will 429. Cap your worker pool at 4.
- NER in monsoon is **persistently cloudy**. Realistically you will fight for usable optical scenes June–September — precisely when landslides happen. Budget time for cloud masking (SCL band) and mosaicking, or lean on Sentinel-1 SAR instead.
- Older products move to "deferred/offline" and must be *ordered* before download (1 concurrent connection) — this adds hours to latency. Prefer recent acquisitions.
- **If you only need band statistics, use GEE instead** and skip the download entirely.

---

# TIER 2 — Important

## 7. GSI Bhukosh + National Landslide Susceptibility Mapping (NLSM)

**Bottom line: portal-only, no API, and the host refused every connection from my network. This is the highest-uncertainty item in the report and the one most likely to need a person in India to unblock.**

### Connectivity test results (2026-08-25)

```
https://bhukosh.gsi.gov.in/                        -> ECONNREFUSED 144.24.99.164:443  [VERIFIED-URL]
https://bhukosh.gsi.gov.in/Bhukosh/Public          -> ECONNREFUSED 144.24.99.164:443  [VERIFIED-URL]
https://bhukosh.gsi.gov.in/Bhukosh/MapViewer.aspx  -> ECONNREFUSED 144.24.99.164:443  [VERIFIED-URL]
https://www.data.gov.in/catalog/bhukosh            -> HTTP 403 Forbidden              [VERIFIED-URL]
```

**Connection refused (not NXDOMAIN, not timeout)** means the host resolves and something actively rejected the TCP handshake. Combined with `data.gov.in` returning 403 to the same egress, the most likely explanation is **geo-blocking or bot-filtering of non-Indian traffic** — *not* that the portal is down. Search engines index the site fine, and Indian users publish walkthrough videos, so it is live for someone.

**→ Have a teammate on an Indian residential/college connection test this immediately. Do not conclude it is dead.**

### What is available (from official secondary sources)

| Field | Finding |
|---|---|
| Official URL | `https://bhukosh.gsi.gov.in/Bhukosh/Public` [VERIFIED-SEARCH — indexed, reachable for others] |
| Provides | GSI landslide inventory; **NLSM** susceptibility at **1:50,000** national scale; meso-scale at **1:10,000 / 1:5,000** for critical sectors; lithology, geochemistry, geophysics [VERIFIED-SEARCH] |
| NLSM programme | Ran **2013–2020** at 1:50,000; upscaling to meso-scale, **160 critical sectors done by end of FS 2024-25**, target 200 sectors by 2028 [VERIFIED-SEARCH] |
| Coverage claim | **4.3 lakh km²** (~430,000 km²) of landslide-prone area mapped [VERIFIED-SEARCH] |
| Cost | Free [VERIFIED-SEARCH] |
| Licence | Not stated on any page I could reach — **[COULD NOT VERIFY]** |

### **Can it be downloaded programmatically? — NO** [VERIFIED-URL]

From a DataMeet mailing-list thread specifically about scripting Bhukosh (`https://groups.google.com/g/datameet/c/v_1QU8v2nV4/m/PLTbWVdtBwAJ`), a user reports [VERIFIED-URL]:

- **Maximum area per download is capped**
- **Maximum number of variables per download is capped**
- Delivery is **email-based** — you request, they mail you a link
- **No bulk download mechanism**

No API, ArcGIS REST endpoint, or WFS was discovered in that thread, and no solution was posted. **Treat Bhukosh as manual, portal-only, human-in-the-loop.**

### Alternative GSI routes (both reachable from my network)

**Bhusanket / NLFC — `https://bhusanket.gsi.gov.in/`** [VERIFIED-URL]

- National Landslide Forecasting Centre portal
- Landslide forecast bulletins, susceptibility maps by state (Assam, Meghalaya, Sikkim, West Bengal, etc. all listed), field-validated inventory, **1,179 state-wise landslide reports**, impact probability maps
- Downloadable state-wise reports and inventory data
- **No API, RSS, or machine-readable feed documented** [VERIFIED-URL]
- The page showed "Unable to fetch data from the server" errors during my fetch — partially degraded
- Since the **2025 monsoon**, GSI issues operational + experimental landslide forecast bulletins for **21 districts across 8 states** [VERIFIED-SEARCH]
- Meso-scale SOP PDF is public: `https://bhusanket.gsi.gov.in/Landslide_Hazard_pdf/` [VERIFIED-SEARCH]

**NGDR (National Geoscience Data Repository) — `https://geodataindia.gov.in/`** [VERIFIED-URL]

- Redirects to `/login` — **login required** [VERIFIED-URL]
- NGDR 2.0 launched with enhanced visualisation and AI-assisted exploration [VERIFIED-SEARCH]
- **35 map services** (geological, geochemical, geophysical) viewable/downloadable [VERIFIED-SEARCH]
- Run by Ministry of Mines + GSI + BISAG-N [VERIFIED-SEARCH]
- Registration process and approval time: **[COULD NOT VERIFY]**

### GOTCHAS

- **Test from an Indian IP before writing this source off.** My refusal is likely a geo-block.
- Area caps + email delivery mean assembling full NER inventory coverage is **many manual portal sessions**, not one script. Start immediately or descope.
- Format is almost certainly **shapefile** [FROM-MEMORY-UNVERIFIED] — the tutorial videos are all titled "download shapefile from Bhukosh". Not confirmed on a live page.
- **Licence terms are genuinely unknown.** For a government hackathon this is probably acceptable (GSI is the sponsoring ecosystem), but do not assert a licence you have not read.
- Support contacts: `ocbis.helpdesk@gsi.gov.in`, `ddg.it@gsi.gov.in` [VERIFIED-SEARCH]. Email them on day 1.
- **Fallback if Bhukosh stays blocked:** use NASA COOLR + published NLSM figures from the MoES/PIB PDFs for context, and lean on your own susceptibility model trained from DEM + Landslide4Sense.

---

## 8. NASA Global Landslide Catalog (GLC) / COOLR

**Bottom line: the modern ArcGIS endpoints now require a login token — that is a change. The legacy CSV still downloads anonymously but is frozen at 2016.**

### Access test results (2026-08-25)

```
https://landslides.nasa.gov/viewer
  -> 301 -> https://gis.earthdata.nasa.gov/portal/apps/experiencebuilder/experience/?id=a7b17eff544a4ce5ae045c32dbb99f7b   [VERIFIED-URL]

https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides?f=pjson
  -> {"error":{"code":499,"message":"Token Required","details":[]}}   [VERIFIED-URL]

https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/COOLR_Events_Points/FeatureServer/0?f=pjson
  -> {"error":{"code":503,"message":"User couldn't access this resource 'landslides/coolr_events_points.mapserver'","details":[]}}   [VERIFIED-URL]

https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/COOLR_Events_Polygons/FeatureServer/0
  -> renders a "Sign In" page   [VERIFIED-URL]

https://maps.disasters.nasa.gov/ags01/rest/services/Hosted/nasa_glc_poly_point/FeatureServer/0
  -> HTTP 404 Not Found (endpoint retired)   [VERIFIED-URL]
```

**Interpretation:** COOLR migrated from `gpm.nasa.gov` / `maps.disasters.nasa.gov` to `gis.earthdata.nasa.gov`, and the new ArcGIS services are **behind Earthdata authentication**. The old anonymous endpoints are gone (404). An Earthdata Login token will very likely unlock them — see §10, registration is instant.

Known service paths (from search indexing) [VERIFIED-SEARCH]:

```
https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/COOLR_Events_Points/FeatureServer
https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/COOLR_Events_Polygons/FeatureServer
https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/COOLR_Reports_Points/FeatureServer
https://gis.earthdata.nasa.gov/gis05/rest/services/Landslides/COOLR_Reports_Polygons/FeatureServer
```

### Working anonymous route — legacy CSV [VERIFIED-URL]

```
https://data.nasa.gov/docs/legacy/Global_Landslide_Catalog_Export/Global_Landslide_Catalog_Export_rows.csv
  -> HTTP 302 -> presigned S3 URL (data-nasa-bucket-production.s3.us-east-1.amazonaws.com)   [VERIFIED-URL]
```

The redirect to a working presigned S3 URL confirms **the file is live and downloadable without credentials**.

| Field | Finding |
|---|---|
| Format | CSV [VERIFIED-URL] |
| **Coverage** | **Current as of 7 March 2016** — this export is frozen [VERIFIED-URL] |
| Catalog start | Compiled from **2007** at NASA GSFC [VERIFIED-URL] |
| Record page last updated | 29 May 2025 [VERIFIED-URL] |
| Licence | **"License not specified"** on the record [VERIFIED-URL]. Citation to Kirschbaum et al. (2010), *Natural Hazards*, requested [VERIFIED-URL] |
| Contact | dalia.b.kirschbaum@nasa.gov [VERIFIED-URL] |

### COOLR structure [VERIFIED-SEARCH]

- Two layer families: **`coolr_reports`** (citizen-science, Landslide Reporter Catalog) and **`coolr_events`** (GLC + curated inventories), each as **point** and **polygon** layers
- Attributes include location, date, **trigger**, **fatalities**, notes, `title` (digitisation method + location + `YYYY-MM-DD`), and `citation`
- Download formats: **file geodatabase (.gdb), shapefile (.shp), CSV** [VERIFIED-SEARCH]
- Export guide: `https://gpm.nasa.gov/landslides/guides/COOLRGuide_Exporting.pdf` — **404 as of today** [VERIFIED-URL]

### Size for NER bbox

**[COULD NOT VERIFY]** — I attempted a `returnCountOnly` spatial query against the NER envelope and got the 503/token error. GLC globally is on the order of 11,000+ events, with India well represented [FROM-MEMORY-UNVERIFIED]. Expect **a few hundred NER records at most** — small enough that size is irrelevant; the concern is sparsity, not volume.

### GOTCHAS

- **The 2016 CSV is too stale to train on alone.** Get an Earthdata token and retry the ArcGIS endpoints for current data.
- Once authenticated, ArcGIS REST supports `returnCountOnly`, `resultOffset`/`resultRecordCount` pagination, and envelope queries — ideal for pulling just the NER bbox as GeoJSON.
- GLC is **media-report derived**, so it is heavily biased toward **roads, towns, and fatal events**. Remote NER slopes are massively under-represented. Do not treat absence as absence of landslides — this will wreck a naively-trained susceptibility model.
- Licence is "not specified" — cite Kirschbaum et al. (2010) and note it as US Government work.
- **Bonus, highly relevant:** NASA **LHASA** *Global Landslide Nowcast* L4, **1 day, 1 km**, **v2.0.0** is at GES DISC — `https://www.earthdata.nasa.gov/data/catalog/ges-disc-global-landslide-nowcast-2.0.0` [VERIFIED-SEARCH]. v2.0.0 replaced the v1 heuristic decision tree with an **ML model producing probabilistic output** [VERIFIED-SEARCH]. LHASA combines GPM precipitation (last 7 days vs a 95th-percentile historical threshold) with a susceptibility map built from slope, geology, road networks, fault zones and forest loss [VERIFIED-SEARCH]. This is essentially a working reference implementation of what you are building — worth studying and citing as a baseline. Code at `https://github.com/nasa/LHASA` [VERIFIED-SEARCH].

---

## 9. NASA SMAP L3/L4 soil moisture

| Field | Finding |
|---|---|
| Official URL | `https://nsidc.org/data/spl4smgp/versions/8` (L4), `https://nsidc.org/data/spl3smp/versions/8` (L3 36 km), `https://nsidc.org/data/spl3smp_e/versions/5` (L3 enhanced 9 km) [VERIFIED-URL / VERIFIED-SEARCH] |
| **L4 provides** | **Surface AND root-zone** soil moisture — 3-hourly time-average geophysical land surface fields from the L4_SM algorithm [VERIFIED-URL] |
| L4 spatial resolution | **9 km EASE-Grid 2.0** [VERIFIED-URL] |
| L4 temporal resolution | **3-hourly** [VERIFIED-URL] |
| L4 coverage | **31 March 2015 – present** [VERIFIED-URL] |
| L4 coverage extent | 85.044°N to 85.044°S, global cylindrical [VERIFIED-URL] |
| L3 options | 36 km (SPL3SMP V8) and enhanced 9 km (SPL3SMP_E V4/V5), daily [VERIFIED-SEARCH] |
| Format | **HDF5** [VERIFIED-URL] |
| **Auth** | **Free NASA Earthdata Login account required** [VERIFIED-URL] |
| Cost | Free [VERIFIED-URL] |
| Access | NASA Earthdata Search, Data Access Tool, HTTPS file system, **AWS S3** [VERIFIED-URL] |
| L4 DOI | `10.5067/T5RUATAQREF8` [VERIFIED-URL] |
| Licence | Cite the dataset (authors, year 2025, title, DOI, access date) [VERIFIED-URL] |
| Latency | NSIDC publishes a required-vs-actual latency table per product [VERIFIED-SEARCH]; L4 is typically ~**2.5 days** [FROM-MEMORY-UNVERIFIED] |

### GOTCHAS

- **ACTIVE DATA QUALITY ISSUE:** "The dataset experienced a **geolocation issue from May–July 2026** affecting standard products, which were being reprocessed" [VERIFIED-URL]. **Check the reprocessing status before using any 2026 SMAP data.** This is recent and directly affects your current-season work.
- NSIDC is **retiring its legacy on-premises archive** and moving to **NASA Earthdata Cloud** [VERIFIED-SEARCH]. Old direct-HTTPS paths may break. Use Earthdata Search or `earthaccess` (Python) rather than hardcoded URLs.
- **9 km is coarse for landslide work.** A single SMAP pixel covers ~81 km² of extremely heterogeneous NER terrain. It is useful as an *antecedent wetness* regional predictor, not a slope-scale variable.
- L-band microwave senses only the **top ~5 cm**; the L4 root-zone product is a **model assimilation**, not a measurement. Be honest about this in the pitch.
- SMAP radar failed in July 2015, so radar/radiometer combined products (SPL3SMAP) only cover Apr–Jul 2015 [FROM-MEMORY-UNVERIFIED].

---

## 10. NASA GPM IMERG (Early / Late / Final)

**Bottom line: this is your real-time rainfall backbone. Earthdata Login is instant and automatic — this is NOT a blocker.**

### Run latencies [VERIFIED-SEARCH, corroborated VERIFIED-URL]

| Run | Latency | Update cadence | Use case |
|---|---|---|---|
| **Early** | **~4 hours** | Every half hour | **Real-time nowcasting — use this** |
| **Late** | **~14 hours** | Every half hour | Same/next-day analysis |
| **Final** | **~3.5 months** | Monthly | Research, model training, gauge-corrected |

Source: "IMERG has three Runs... rapid-response applications (Early Run, 4-h latency), same/next-day applications (Late Run, 14-h latency), and post-real-time research (Final Run, 3.5-month latency)" [VERIFIED-SEARCH].

### Product details

| Field | Finding |
|---|---|
| Spatial resolution | **0.1° × 0.1°** (~10 × 10 km), 90°N–90°S, 180°W–180°E [VERIFIED-URL] |
| Temporal resolution | **Half-hourly** and **daily** variants |
| Half-hourly Early | `GPM_3IMERGHHE` V07, DOI `10.5067/GPM/IMERG/3B-HH-E/07` [VERIFIED-URL] |
| Daily Early | `GPM_3IMERGDE` V07, DOI `10.5067/GPM/IMERGDE/DAY/07` [VERIFIED-URL] |
| Daily Late | `GPM_3IMERGDL` V07 [VERIFIED-URL] |
| Daily Final | `GPM_3IMERGDF` V07 [VERIFIED-URL] |
| Coverage start | Catalog pages state **1 January 1998** for the V07 record [VERIFIED-URL]; the classic GPM-era start is 1 June 2000 [FROM-MEMORY-UNVERIFIED]. **The two differ — verify for your chosen product.** |
| Format | **HDF5** (NetCDF via subsetter) [VERIFIED-URL / FROM-MEMORY-UNVERIFIED] |
| Access | GES DISC **HTTPS**, **OPeNDAP**, **AWS S3** cloud [VERIFIED-URL / VERIFIED-SEARCH] |
| **Auth** | **NASA Earthdata Login required** [VERIFIED-URL] |
| Cost | Free |
| Licence | NASA open data; cite the DOI |
| Daily granule count | `GPM_3IMERGDE` has **10,462 granules** [VERIFIED-URL] |
| Units | Daily mean precipitation rate in **mm/day**, with quality flags and error estimates [VERIFIED-URL] |

### Earthdata Login registration [VERIFIED-URL] — `https://urs.earthdata.nasa.gov/documentation/for_users/how_to_register`

- Six steps: visit site → Register → fill form → submit → **click email activation link** → log in
- **Approval is automatic** — "no manual approval stage is mentioned" [VERIFIED-URL]
- **Email verification is mandatory**; account must be active before login [VERIFIED-URL]
- **No eligibility restrictions** stated [VERIFIED-URL]
- Bearer tokens generated from the profile page [VERIFIED-URL]
- **→ Minutes, not days. NOT A BLOCKER.**

### Size for NER bbox

- NER at 0.1° = **80 × 95 = ~7,600 grid cells** [derived arithmetic]
- Half-hourly = 17,520 granules/year. Global HDF5 granules are ~8 MB each, but **GES DISC subsetting** cuts this to a few KB per granule for the bbox
- Estimated subsetted: **~200–500 MB per year** of half-hourly NER data [FROM-MEMORY-UNVERIFIED]
- Daily product: 365 files/year, trivially small subsetted

### GOTCHAS

- **You must set up a `.netrc` / `.urs_cookies`** for `wget`/`curl` against GES DISC, or authenticated downloads silently return HTML login pages instead of HDF5. This trips up nearly everyone once. Use the `earthaccess` Python library to avoid it entirely.
- **Use the GES DISC subsetter or OPeNDAP** — never download global granules and crop locally. The bandwidth difference is ~1000×.
- IMERG **underestimates orographic rainfall in steep Himalayan terrain** [FROM-MEMORY-UNVERIFIED but well established in the literature]. NER is exactly that terrain. Calibrate against whatever gauge data you can get, and state the limitation.
- Early Run is **uncalibrated by gauges** and uses forward-morphing only. It is the least accurate run — which is the price of 4-hour latency.

---

## 11. Bhashini (Government of India language API)

**Bottom line: free for PoC, registration is self-service with email verification. But two of your seven target languages are almost certainly NOT supported.**

| Field | Finding |
|---|---|
| Official URL | `https://bhashini.gov.in/` ; docs `https://bhashini.gitbook.io/bhashini-apis` [VERIFIED-URL] |
| **Registration** | `https://bhashini.gov.in/ulca/user/register` [VERIFIED-URL] |
| Login | `https://bhashini.gov.in/ulca/user/login` [VERIFIED-URL] |
| Provides | **ASR** (speech→text), **NMT** (translation), **TTS** (text→speech), OCR, transliteration [VERIFIED-SEARCH] |
| **Credentials issued** | **User ID** + **API Key (ulcaApiKey)**, both from the My Profile section [VERIFIED-URL] |
| **API key limit** | **Maximum 5 keys per integrator** [VERIFIED-URL] |
| Approval | Fill form → **email authentication** → log in → generate keys. **No manual review stage documented** [VERIFIED-URL] |
| Approval time | Not stated. Appears self-service/instant, gated only on the email link [VERIFIED-URL] |
| Cost | **Free for low-volume / PoC** [VERIFIED-SEARCH] |
| Rate limits | **Not published** [VERIFIED-URL] |
| Also listed on | API Setu directory: `https://directory.apisetu.gov.in/api-collection/bhashini` [VERIFIED-SEARCH] |
| Key revocation | Keys can be viewed and individually revoked from the profile dashboard [VERIFIED-URL] |

### **Licence restriction — read this carefully** [VERIFIED-URL]

Verbatim from the Bhashini API docs:

> "Usage of these APIs shall be for the purposes of **PoC only**. If the Bhashini Sahyogi, Bhashini App Mitra or Bhashini Udyat Mitra wants to use the same on production systems or integrators are charging end-users, please reach out to Bhashini team for the paid version of the APIs and exploring Pricing Plans."

**A hackathon prototype is squarely a PoC, so you are fine.** But you cannot claim this scales to production without a separate commercial agreement. Say "PoC-tier Bhashini access" in the pitch.

### Language support for your 7 target languages

| Language | NMT | TTS | ASR | Confidence |
|---|---|---|---|---|
| **Assamese** | Yes | Yes | Yes | [VERIFIED-URL] |
| **Bengali** | Yes | Yes | Yes | [VERIFIED-URL] |
| **Bodo** | Yes | Yes | Likely | [VERIFIED-URL for NMT/TTS] |
| **Manipuri (Meitei)** | Yes | Yes | Likely | [VERIFIED-URL for NMT/TTS] |
| **Nepali** | Yes | Yes | Likely | [VERIFIED-URL for NMT/TTS] |
| **Mizo** | **Almost certainly NO** | **NO** | **NO** | **See warning** |
| **Khasi** | **Almost certainly NO** | **NO** | **NO** | **See warning** |

Useful model/service IDs seen in the catalogue [VERIFIED-URL]:

- NMT: `bhashini/iiith/nmt-all` (broadest), `ai4bharat/indictrans-v2-all-gpu--t4`
- TTS: `Bhashini/IITM/TTS` (most comprehensive), `ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4`
- ASR: `bhashini/ai4bharat/conformer-multilingual-asr` (21-language model)

### **WARNING — Mizo and Khasi** [FLAGGED, PARTIALLY VERIFIED]

The Bhashini language roster I read is the **22 Eighth Schedule languages**: Assamese, Bengali, Bodo, Dogri, Gujarati, Hindi, Kannada, Kashmiri, Konkani, Maithili, Malayalam, Manipuri, Marathi, Nepali, Odia, Punjabi, Sanskrit, Santali, Sindhi, Tamil, Telugu, Urdu [VERIFIED-SEARCH].

**Mizo and Khasi are not Eighth Schedule languages and do not appear in that list.** One search extract asserted they were supported, but that same extract self-contradicted (it wrote "✓ Mizo (not listed)"), so it is unreliable. The explicit model listings for TTS and ASR do **not** include them.

**→ Treat Mizo and Khasi as UNSUPPORTED until you check the live model catalogue yourself at `https://bhashini.gov.in/ulca/search-model`.** This matters a lot: Mizoram and Meghalaya are two of your eight states, and an alerting system that cannot speak to them in their own language is a visible gap. Have a fallback (English + Assamese/Bengali, or pre-recorded human audio for Mizo/Khasi phrases).

### GOTCHAS

- The API is a **two-step call**: first a **Pipeline Config** call (needs userID + ulcaApiKey) to get a service-specific endpoint and auth token, then the **Compute** call. It is not a single REST hit. Budget time for this.
- Multiple doc mirrors exist (`bhashini.gitbook.io`, `dibd-bhashini.gitbook.io`, `dibdbhashini.gitbook.io`) with differing content. Prefer `bhashini.gitbook.io`.
- Rate limits are undocumented — build in retry/backoff blindly.
- Support: `digitalindiabhashinidivision@gmail.com` [VERIFIED-URL] (a Gmail address for a national API, which tells you something about response times).

---

## 12. NDMA SACHET / CAP 1.2

**Bottom line: CAP 1.2 is a fully public open standard you can implement today. SACHET itself has NO public developer API — integration is an institutional process, not a technical one.**

### CAP 1.2 specification — fully public [VERIFIED-URL]

`https://docs.oasis-open.org/emergency/cap/v1.2/CAP-v1.2-os.html` — OASIS Standard, free, no registration.

**XML namespace:** `urn:oasis:names:tc:emergency:cap:1.2` [VERIFIED-URL]

**Mandatory elements** [VERIFIED-URL]:

| Block | Required children |
|---|---|
| `<alert>` | `identifier`, `sender`, `sent`, `status`, `msgType`, `scope` |
| `<info>` (optional block; if present) | `category`, `event`, `urgency`, `severity`, `certainty` |
| `<area>` (optional; if present) | `areaDesc` |
| `<resource>` (optional; if present) | `resourceDesc`, `mimeType` (per RFC 2046) |

**Controlled vocabularies** [VERIFIED-URL]:

| Field | Valid values |
|---|---|
| `msgType` | Alert, Update, Cancel, Ack, Error |
| `status` | Actual, Exercise, System, Test, Draft |
| `scope` | Public, Restricted, Private |
| `severity` | Extreme, Severe, Moderate, Minor, Unknown |
| `urgency` | Immediate, Expected, Future, Past, Unknown |
| `certainty` | Observed, Likely, Possible, Unlikely, Unknown |

For a landslide alert you would emit `category=Geo`, `event=Landslide`, and a `<polygon>` or `<circle>` inside `<area>` [FROM-MEMORY-UNVERIFIED for the exact category enum — confirm against the spec's category list, which also includes Met, Safety, Rescue, Fire, Health, Env, Transport, Infra, CBRNE, Other].

### SACHET [VERIFIED-URL] — `https://sachet.ndma.gov.in/`

| Field | Finding |
|---|---|
| What | India's "1st and only portal across India to publish official warnings for all disasters from authorized sources" [VERIFIED-URL] |
| Built by | **C-DOT** for **NDMA** [VERIFIED-SEARCH] |
| Coverage | All **36 states/UTs** [VERIFIED-SEARCH] |
| Languages | **12 regional languages** per the portal [VERIFIED-URL]; press material claims **19+** [VERIFIED-SEARCH] |
| **Public feed** | **YES — an RSS feed for India CAP alerts exists.** "The alert will be published on the RSS feed as well, and agencies (News agencies etc.) subscribed for the RSS feed will get alerts" [VERIFIED-URL] |
| Dissemination channels | SMS, iOS/Android apps, browser notifications, RSS [VERIFIED-URL] |
| **Developer docs / API** | **NONE published** [VERIFIED-URL] |
| Alert-generating agencies | IMD, CWC, INCOIS, DGRE, FSI + all 36 state/UT DMAs [VERIFIED-SEARCH] |
| Alert-disseminating agencies | TSPs, TV, radio, cable TV, social media, Indian Railways, coastal sirens, GAGAN & NavIC [VERIFIED-SEARCH] |
| Becoming an agency | **No public eligibility criteria or application process documented** [VERIFIED-URL] |

### Integration path — realistic assessment

**Inbound (consuming SACHET alerts): feasible.** The RSS feed is public. Find its exact URL from the portal and parse it. [The specific feed URL is **[COULD NOT VERIFY]** — not exposed on the pages I reached.]

**Outbound (publishing your alerts into SACHET): NOT feasible in 6 days.** Becoming an Alert Generating Agency is an institutional designation granted to statutory bodies (IMD, CWC, INCOIS, DGRE, FSI) and State DMAs. There is no self-service developer onboarding. A hackathon team cannot become one.

**→ The right architecture for the pitch:** generate **valid CAP 1.2 XML** as your alert output format, validate it against the OASIS schema, and present it as *"SACHET-ready — the moment a State DMA adopts SANKET, its output drops straight into the national alerting pipeline with zero transformation."* That is credible, demonstrable, and honest. Do not claim you are integrated with SACHET.

### GOTCHAS

- CAP 1.2 requires `identifier` to be **globally unique** and to contain no spaces, commas, or `<`/`&`. Use a UUID with a sender prefix.
- `sent` must be **ISO 8601 with an explicit timezone offset** (e.g. `2026-08-25T14:30:00+05:30`). IST offsets are the Indian convention.
- Polygons in CAP are `lat,lon` pairs (**latitude first**, opposite of GeoJSON), space-separated, and the ring **must be explicitly closed** (last point equals first). This is the single most common CAP validation failure.
- Google's CAP requirements doc (`developers.google.com/public-alerts/guides/cap-requirements`) is a useful stricter-profile reference [VERIFIED-SEARCH].

---

## 13. OpenStreetMap — North East India extract (Geofabrik)

**Bottom line: trivially easy. Download it in the first hour. No registration, no key.**

| Field | Finding |
|---|---|
| Official URL | `https://download.geofabrik.de/asia/india/north-eastern-zone.html` [VERIFIED-URL] |
| Parent | `https://download.geofabrik.de/asia/india.html` [VERIFIED-URL] |
| Provides | Full OSM vector data — roads, buildings, settlements, rivers, admin boundaries, POIs |
| **Auth** | **None** [VERIFIED-URL] |
| Cost | Free [VERIFIED-URL] |
| **Licence** | **ODbL 1.0** (Open Database License) [VERIFIED-URL] |
| Update frequency | Daily — files were "1–5 hours old" at fetch time [VERIFIED-URL] |
| History | Snapshots back to **2022** available (~31 MB in 2022 → ~109 MB now) [VERIFIED-URL] |
| Extent file | A **`.poly` file** describes the region boundary [VERIFIED-URL] |

### File sizes [VERIFIED-URL]

| Format | Size |
|---|---|
| **`north-eastern-zone-latest.osm.pbf`** | **104 MB** |
| `north-eastern-zone-latest-free.shp.zip` | **275 MB** |
| `north-eastern-zone-latest.gpkg.zip` | **280 MB** |
| (whole India `.osm.pbf`, for reference) | 1.6 GB |

Other India zones for comparison [VERIFIED-URL]: Central 334 MB, Eastern 235 MB, Northern 212 MB, Southern 531 MB, Western 209 MB.

### GOTCHAS

- **"No sub regions are defined for this region"** [VERIFIED-URL] — you cannot download a single state. It is the whole zone or nothing. 104 MB is small, so just take it all.
- **Verify which states the zone actually contains.** Geofabrik follows India's zonal-council groupings, and **Sikkim sits in the Eastern Zone under some schemes, not the North-Eastern Zone.** Your 8-state scope almost certainly includes Sikkim. **Download the `.poly` file and check it against your bbox before assuming coverage.** If Sikkim is missing you also need `eastern-zone` (235 MB), or just take all-India at 1.6 GB and clip. **[COULD NOT VERIFY — the page does not enumerate member states.]**
- **ODbL is share-alike.** If you publish a derived database you must license it under ODbL and attribute OpenStreetMap contributors. For an internal prototype this is a non-issue; for a public deliverable, include the attribution. This is a *stronger* obligation than CC-BY — be aware.
- Geofabrik strips **user names, user IDs, and changeset IDs** for EU data-protection reasons [VERIFIED-URL]. Irrelevant for hazard mapping.
- For a tight bbox clip, use `osmium extract -b 88,21.5,97.5,29.5`.

---

## 14. Census of India 2011 — village-level population

**Bottom line: the official portal gives you tables but not geometry. SHRUG is the practical answer because it ships village polygons already joined to Census data.**

### Option A — SHRUG (recommended)

| Field | Finding |
|---|---|
| Official URL | `https://www.devdatalab.org/shrug` [VERIFIED-URL] |
| Docs | `https://docs.devdatalab.org` [VERIFIED-URL] |
| What | "Open access repository currently comprising dozens of datasets covering India's over **500,000 villages and 8,000 towns** over a span of 25 years" [VERIFIED-URL] |
| **Geometry** | **YES — "open-source geometries at the village- and town-level based on 2011 Census polygons"** [VERIFIED-URL] |
| Key | `shrid` — a consistent geographic identifier linking across censuses [VERIFIED-URL] |
| Contents | Primary Census Abstract (PCA) + Village/Town Directory, village-level; villages covered 1991–2011 [VERIFIED-SEARCH] |
| **Licence** | **CC BY-NC-SA 4.0** — non-commercial only; commercial use requires contacting the team [VERIFIED-URL] |
| Registration | Not specified as required [VERIFIED-URL] |
| File sizes/formats | **[COULD NOT VERIFY]** — not on the landing page; check `/shrug_download/` |
| Codebook | `http://paulnovosad.com/pdf/shrug-codebook.pdf` [VERIFIED-SEARCH] |

### Option B — Official Census portal

| Field | Finding |
|---|---|
| Population Finder | `https://censusindia.gov.in/census.website/data/population-finder` [VERIFIED-SEARCH] |
| What | Primary Census Abstract tables, **85 indicators**, for districts, sub-districts, towns, **villages**, wards [VERIFIED-SEARCH] |
| **Geometry** | **NO** — tabular only |
| Cost | Free |

### Option C — data.gov.in

`https://www.data.gov.in/catalog/village-amenities-census-2011` — Village Amenities Census 2011: Gram Panchayat name, geographical area, households, population by gender, facilities [VERIFIED-SEARCH]. Tabular. (Note: `data.gov.in` returned **403** to my egress — same likely geo-block as Bhukosh [VERIFIED-URL].)

### Option D — commercial/academic shapefiles

- Harvard CGA "Village Map India 2011" — village boundaries for **only 7 districts** [VERIFIED-SEARCH]. Too narrow.
- ML Infomap — commercial vendor producing Census GIS shapefiles from RGI data [VERIFIED-SEARCH]. Paid.

### GOTCHAS

- **CC BY-NC-SA on SHRUG is share-alike.** A derived dataset must also be NC-SA. Fine for a hackathon; a real deployment by a State DMA would need to check whether NC is compatible with government use.
- 2011 Census data is **15 years old**. NER has seen substantial population change. **The 2021 Census was repeatedly postponed** [FROM-MEMORY-UNVERIFIED] — 2011 remains the latest complete village-level enumeration. State this limitation explicitly; do not present 2011 numbers as current exposure.
- Village polygons in NER are **less complete than in the plains** — many Arunachal Pradesh villages are unsurveyed or have approximate boundaries [FROM-MEMORY-UNVERIFIED].
- If SHRUG geometry proves patchy for NER, fall back to **OSM `place=village` nodes** (§13) joined to Census PCA by name — messy but workable, and OSM has decent NER settlement coverage.

---

# TIER 3 — Supporting

## 15. ISRO Bhuvan CartoDEM

**Bottom line: use Copernicus GLO-30 instead. CartoDEM is gated behind a nationality restriction that could take weeks.**

| Field | Finding |
|---|---|
| Official URL | `https://bhuvan-app3.nrsc.gov.in/data/download/` [VERIFIED-URL] |
| FAQ | `https://bhuvan.nrsc.gov.in/wiki/index.php/Frequently_Asked_Questions` [VERIFIED-URL] |
| Provides | Cartosat-1 derived national DEM |
| Spatial resolution | **30 m** free (1 arc-sec); 90 m (3 arc-sec) also available. Both **sub-sampled from the original 1/3 arc-sec** data [VERIFIED-SEARCH] |
| Vertical accuracy | **~8 m at 90% confidence** [VERIFIED-SEARCH] |
| Policy | "IRS satellite derived DEM with **30 m or coarser** posting shall be made available as free download" [VERIFIED-SEARCH] |
| **Registration** | **Required. "Yes, anyone can signup"** [VERIFIED-URL] |
| **Download limit** | **20 tiles (10×10) per day** for Cartosat-1 DEM; excess goes to a **"Backlog" list kept for 7 days** [VERIFIED-URL] |
| Tiling | Survey of India mapsheet numbers — **1:250,000** for CartoDEM and AWiFS; 1:50,000 for LISS-III [VERIFIED-URL] |
| Cost | Free [VERIFIED-SEARCH] |
| Format | **[COULD NOT VERIFY]** — GeoTIFF expected [FROM-MEMORY-UNVERIFIED] |
| Licence | **[COULD NOT VERIFY]** — NRSC Open Data Access Policy referenced but not readable from my egress |
| Support | `bhuvan@nrsc.gov.in` [VERIFIED-URL] |
| Readme | `CartoDEMReadme_v1_u1_23082011.pdf` on bhuvan-app3 [VERIFIED-SEARCH] |

### **BLOCKING GOTCHA — foreign nationals** [VERIFIED-SEARCH]

> "Foreign users may obtain the data **after necessary clearance from the competent ISRO/DOS committee**."

If any team member is a foreign national, or if you register with a non-Indian identity, CartoDEM download requires an **ISRO/DOS committee clearance** — a multi-week institutional process, not a form. Also noted: "Bhuvan content is mostly restricted to within Indian boundaries" [VERIFIED-SEARCH].

**→ For an all-Indian team on an Indian IP this is probably fine. For anyone else it is a hard stop. Either way, Copernicus GLO-30 (§5) gives you equivalent 30 m coverage with zero gatekeeping. Use GLO-30 as primary; treat CartoDEM as a nice-to-have "we also validated against the Indian national DEM" line.**

### Other gotchas

- 20 tiles/day at 1:250,000 sheets: NER needs roughly **25–35 sheets** [FROM-MEMORY-UNVERIFIED], so **2 days minimum** of manual downloading. With 6 days left that is a real cost for a dataset you can get instantly elsewhere.
- Portal-only, no API, no bulk download.
- Sub-sampled from finer source data, so effective resolution is lower than the nominal 30 m suggests.

---

## 16. NASA SRTM 30 m (via OpenTopography / Earthdata)

| Field | Finding |
|---|---|
| Official URL | `https://portal.opentopography.org/raster?opentopoID=OTSRTM.082015.4326.1` [VERIFIED-URL] |
| Developer docs | `https://opentopography.org/developers`, `https://portal.opentopography.org/apidocs/` [VERIFIED-SEARCH] |
| Provides | SRTM GL1 — "the most complete high-resolution digital topographic database of Earth", ~119.56 million km² [VERIFIED-URL] |
| Spatial resolution | **30 m** (GL1); 90 m (GL3) |
| Temporal | Static — acquired over 11 days, **February 2000** [VERIFIED-URL] |
| **Auth (web/S3)** | **No API key needed** for the web interface or bulk S3 [VERIFIED-URL] |
| **Auth (REST API)** | **API key REQUIRED** — free, self-service via My Account on the OpenTopography portal [VERIFIED-SEARCH] |
| **API rate limits** | **250 calls / 24 h (academic)**, **50 calls / 24 h (non-academic)** [VERIFIED-SEARCH] |
| **API area limits** | **450,000 km²** per request for SRTMGL1 and COP30; **4,050,000 km²** for SRTMGL3 and COP90 [VERIFIED-SEARCH] |
| Bulk S3 | `opentopography.s3.sdsc.edu` — via AWS CLI or CyberDuck [VERIFIED-URL] |
| Cost | Free; OpenTopography Plus subscription raises non-academic limits [VERIFIED-SEARCH] |
| Licence | Listed as **"Not Provided"** on the dataset metadata [VERIFIED-URL]. Must acknowledge **OpenTopography and NASA/NGA** in any publication [VERIFIED-URL] |
| Datasets via API | SRTMGL1, SRTMGL3, **COP30**, COP90, and others; **COP30 is the API default** [VERIFIED-SEARCH] |

### Size for NER bbox

- NER bbox area ≈ **8° × 9.5°** ≈ **~900,000 km²** [derived arithmetic].
- **This EXCEEDS the 450,000 km² single-request limit for SRTMGL1/COP30** [VERIFIED-SEARCH]. **You must split the NER into at least 2–3 API requests**, or use bulk S3 instead.
- ~80 1°×1° tiles, roughly **2 GB** total [FROM-MEMORY-UNVERIFIED].

### GOTCHAS

- **The area limit vs. your bbox is a real, concrete constraint** — plan the tiling up front.
- 50 calls/day for non-academics is tight if you are iterating. **Register with an academic email if you have one** — it is a 5× difference.
- SRTM is a **DSM from 2000** — 26 years stale, and it includes canopy. NER forest cover has changed substantially. Copernicus GLO-30 is newer and better; prefer it.
- SRTM has **voids in steep terrain** (radar shadow) — exactly the high-relief Himalayan slopes you care about. Voids are filled by interpolation in GL1, which produces smooth, physically wrong slopes in the most landslide-prone areas [FROM-MEMORY-UNVERIFIED]. This is a genuine scientific reason to prefer GLO-30.
- Licence "Not Provided" is a metadata gap, not a restriction — SRTM is US Government public-domain data [FROM-MEMORY-UNVERIFIED].

---

## 17. CAS Landslide Dataset (2024)

| Field | Finding |
|---|---|
| Paper | *CAS Landslide Dataset: A Large-Scale and Multisensor Dataset for Deep Learning-Based Landslide Detection*, **Scientific Data** (2024), DOI `10.1038/s41597-023-02847-z` [VERIFIED-SEARCH] |
| **Data** | **Zenodo, DOI `10.5281/zenodo.10294997`** — `https://zenodo.org/records/10294997` [VERIFIED-URL] |
| Producer | AI Group, Institute of Mountain Hazards and Environment, **Chinese Academy of Sciences** [VERIFIED-SEARCH] |
| Contents | **20,865 images** from **9 regions**, satellite + UAV [VERIFIED-URL] |
| Resolution | **0.2 m – 1 m** for UAV data [VERIFIED-URL] |
| Regions | Hokkaido, Jiuzhaigou, Lombok, Palu, Wenchuan, and others [VERIFIED-URL] |
| **Access** | **Open access, no registration** [VERIFIED-URL] |
| **Licence** | **CC BY-NC 4.0** (Attribution–NonCommercial) [VERIFIED-URL] |
| Files | **16 files**, plus README and shapefile documentation [VERIFIED-URL] |
| GitHub | `https://github.com/HydroPML/Dataset4LandslideNets` [VERIFIED-SEARCH] |
| Open-access mirror | PMC `https://pmc.ncbi.nlm.nih.gov/articles/PMC10762236/` [VERIFIED-SEARCH] |

### GOTCHAS

- **Reported total size was "31.8 TB across all versions"** [VERIFIED-URL as read off the Zenodo page] — **this is almost certainly a misread of Zenodo's cumulative all-versions counter, not the actual download size.** 20,865 image patches cannot be 31.8 TB. Expect **tens of GB**. **Check the actual per-file sizes on the record before you allocate disk.** Flagging this rather than repeating a number I do not believe.
- **NO Indian regions.** The 9 regions are Japan, China, Indonesia, and similar. **Direct transfer to NER is a research assumption, not a given** — different geology, land cover, and sensor characteristics. Useful for pre-training or augmentation; do not present it as NER-representative.
- **CC BY-NC** — non-commercial only, same posture as SHRUG and Landslide4Sense.
- Mixed sensors and wildly varying GSD (0.2 m UAV vs ~10 m satellite) means **you cannot naively pool it with Landslide4Sense** (fixed 10 m, 128×128). Resampling strategy needed.

---

## 18. State & district boundaries — used for the prototype's NER map

| Field | Finding |
|---|---|
| Source | `udit-001/india-maps-data` GitHub repo, district-level GeoJSON for all of India |
| URL | `https://cdn.jsdelivr.net/gh/udit-001/india-maps-data@2884453/geojson/india.geojson` |
| Contents | 760 district-level polygon features nationwide; 118 across the 8 NER states |
| Processing | Downloaded once to `web/geodata_src/india.geojson` (4.0 MB). `web/geodata_src/build_geo.py` filters to the 8 NER states, dissolves districts into state boundaries with **Shapely** (`unary_union`), simplifies both levels (state tolerance 0.006°, district 0.003°), projects lon/lat to a static SVG viewBox (equirectangular, cos-latitude corrected — accurate enough at NER's ~9° span), and writes precomputed `d` path strings to `web/src/data/nerGeo.js` (61 KB, committed — no GeoJSON parsing happens at runtime) |
| Licence | Repo does not state one explicitly at the pinned commit — treat as attribution-required pending confirmation, same posture as the other unlicensed geodata sources in this document |

### GOTCHAS
- **Sikkim's district is "East Sikkim," not "Gangtok."** Gangtok is the capital town inside East Sikkim district — our mock data originally used "Gangtok" as a district name and was corrected to match the real boundary data.
- **Zone positions within a district are still illustrative.** The district *boundary* is now real; the risk-zone markers plotted inside it use fractional coordinates chosen for layout, not actual lat/lon — see `docs/HANDOFF.md` §3a.
- Re-run `build_geo.py` if simplification tolerance needs tuning (finer detail vs. smaller bundle) or to add district boundaries for states beyond the current 8.

---

# Published rainfall Intensity-Duration thresholds — Indian Himalaya & NE India

Standard power-law form: **I = α · D^(−β)** where I = rainfall intensity, D = duration.
**Units differ between studies — check them before using any coefficient.**

## National / regional set — four Indian regions [VERIFIED-SEARCH]

From *The relation between rainfall and landslides in India: An empirical approach for prediction of landslide*, **J. Earth Syst. Sci.** (2025), DOI `10.1007/s12040-025-02551-z`; open text at `https://www.ias.ac.in/article/fulltext/jess/134/0097`. Derived by the **frequentist statistical method** on landslides from **2007–2016**.

| Region | Threshold | α | β |
|---|---|---|---|
| **Northeastern Himalaya** | **I = 5.8294 · D^(−0.4141)** | **5.8294** | **0.4141** |
| Northwestern Himalaya | I = 2.9993 · D^(−0.4152) | 2.9993 | 0.4152 |
| Eastern Ghats | I = 26.88 · D^(−0.6885) | 26.88 | 0.6885 |
| Western Ghats | I = 28.01 · D^(−0.641) | 28.01 | 0.641 |

**This NE Himalaya row is the single most directly applicable published threshold for your system.** (Note: I read these from a search extract of the live article page; the publisher page returned 403 to my direct fetch. **[VERIFIED-SEARCH, not VERIFIED-URL]** — confirm against the PDF before hard-coding.)

## Guwahati, Assam [VERIFIED-URL]

**I = 5.9 · D^(−0.479)**

- Bhusan, K., Kundu, S. S., Goswami, K., Sudhakar, S. (2014), *Susceptibility mapping and estimation of rainfall threshold using space based input for assessment of landslide hazard in Guwahati city in North East India*, **ISPRS Archives XL-8, 15–19**, DOI `10.5194/isprsarchives-XL-8-15-2014`
- Based on **19 documented landslides**, rainfall from **TRMM**
- Open access — full text retrievable
- Note how closely α=5.9, β=0.479 tracks the regional NE Himalaya α=5.8294, β=0.4141. Mutually corroborating.

## Darjeeling — National Highway 10 [VERIFIED-SEARCH]

Mandal & Sarkar (2021), *Estimation of rainfall threshold for the early warning of shallow landslides along National Highway-10 in Darjeeling Himalayas*, **Natural Hazards** 105(3), DOI `10.1007/s11069-020-04407-9`

- **Intensity–Duration:** **I = (20.10 ± 1.84) · D^(−0.45 ± 0.05)**, I in **mm/day**, D in **days**
- **Event–Duration:** **E = 0.15 · D^1.03**, for **24 ≤ D ≤ 408 hours**, E = cumulative event rainfall (mm), D in hours
- Data: IMD rain gauges + tea-garden gauges along NH-10; landslide records from PWD, newspapers, prior publications
- Finding: **slate lithology is more landslide-susceptible** than other rock types in the corridor

## Kalimpong, West Bengal [VERIFIED-SEARCH]

Dikshit & Satyam (2018), *Estimation of rainfall thresholds for landslide occurrences in Kalimpong, India*, **Innovative Infrastructure Solutions**, DOI `10.1007/s41062-018-0132-9`

- **I = 3.52 · D^(−0.41)**, I in **mm/h**, D in **hours**
- **0.95 mm/h over 24 h** → high risk of slide initiation
- Antecedent: **88.37 mm (10-day)** and **133.5 mm (20-day)** required for occurrence
- Also reported: cumulative **>111.3 mm over 20 days** and **222 mm in a month** as triggering levels
- Related: *Rainfall Threshold Estimation and Landslide Forecasting for Kalimpong, India Using SIGMA Model*, **Water** 12(4) 1195, DOI `10.3390/w12041195` — open access [VERIFIED-SEARCH]

## Sikkim — regional [VERIFIED-SEARCH]

Dikshit et al. (2019), *Towards establishing rainfall thresholds for a real-time landslide early warning system in Sikkim, India*, **Landslides**, DOI `10.1007/s10346-019-01244-1`

- **I = 43.26 · D^(−0.78)**, I in **mm/day**, D in **days**
- Explicitly intended to support the **R-LEWS (real-time Landslide Early Warning System)** being developed for Sikkim
- An author-copy PDF is mirrored at `https://www.gwp.org/globalassets/global/water-changemaker-awards/submitted-form-media/documents/towardsestablishingrainfallthresholdsforareal-timelandslideearlywarningsysteminsikkimindia.pdf` [VERIFIED-SEARCH] — **use this to confirm the coefficients without a paywall**

## North Sikkim road corridor [VERIFIED-SEARCH]

*Assessment of Rainfall Thresholds for Rain-Induced Landslide Activity in North Sikkim Road Corridor in Sikkim Himalaya, India*, **J. Geography, Environment and Earth Science International**

- **I = 4.045 · D^(−0.25)**, I in mm/h, D in hours
- **1.82 mm/h over 24 h** → high landslide risk
- Antecedent: **58 mm (10-day)**, **139 mm (20-day)**
- Based on **210 landslides (2010–2016)**, of which **155** had usable rainfall data
- Context claim from the same work: **42% of India's landslide-prone landmass is in the North East Himalaya**, specifically Darjeeling and Sikkim

## Lanta Khola, North Sikkim [VERIFIED-SEARCH]

Sengupta, Gupta & Anbarasu (2010), *Rainfall thresholds for the initiation of landslide at Lanta Khola in north Sikkim, India*, **Natural Hazards**, DOI `10.1007/s11069-009-9352-9`

- **Does NOT follow a standard power law.** The authors found that "sliding cannot be modeled by typical exponential relationships between cumulative rainfall and rainfall duration"
- Proposed instead: **sliding occurs if normalized cumulative rainfall over more than 15 days exceeds 250 mm**
- Data reviewed: **1998–2006**
- Context: a 15 km stretch of North Sikkim Highway in fine-grained, low-permeability debris; Lanta Khola reactivates every monsoon
- ⚠️ One search result attributed **I = 73.90 · D^(−0.79)** to Lanta Khola, but the primary description of the paper explicitly rejects a power-law fit. **Do not use the 73.90/0.79 pair without reading the paper.** [CONFLICTING — UNRESOLVED]

## Northeastern Himalaya — cumulative-event / moisture threshold [VERIFIED-URL]

Monga, D. & Ganguli, P. (2024), *Derivation of Moisture-Driven Landslide Thresholds for Northeastern Regions of the Indian Himalayas*, **NHESS preprint** `nhess-2024-152`, DOI `10.5194/nhess-2024-152`

- **E (mm) = −11.10 + 0.62 · D (hour)**, valid for **24 < D < 1440 hours**
- Based on **490 rain-driven landslides, 2006–2019**
- Method: Regularized Expectation-Maximization + non-crossing quantile regression
- Finding: **Guwahati and Shillong require higher cumulative rainfall to trigger landslides than Aizawl**
- Environmental controls noted: elevation, slope, land use, rock type
- ⚠️ **THIS PREPRINT WAS REJECTED.** The NHESS page states: "The manuscript was not accepted for further review after discussion" [VERIFIED-URL]. **Cite with care, or not at all.**
- A likely published successor exists: *Development of a Precipitation-Induced Moisture-Driven Landslide Threshold Atlas for the Northwestern and Northeastern Himalayas*, **J. Hydrologic Engineering** 31(2), DOI `10.1061/JHYEFF.HEENG-6745` [VERIFIED-SEARCH] — **paywalled, returned 403, coefficients [COULD NOT VERIFY]**. Worth chasing via institutional access.

## Other Himalayan thresholds (for comparison, not NE India)

| Region | Threshold | Source |
|---|---|---|
| Nepal Himalaya | Representative regional thresholds | Dahal & Hasegawa (2008), *Geomorphology*, DOI `10.1016/j.geomorph.2008.01.014` [VERIFIED-SEARCH] |
| Garhwal Himalaya | Shallow landslide threshold | ScienceDirect `S2772883824000359` [VERIFIED-SEARCH] |
| Shimla, NW Himalaya | Threshold + Bayesian probabilistic | ScienceDirect `S2666592124000969` [VERIFIED-SEARCH] |
| Chamoli–Joshimath, Garhwal | Shallow landslide thresholds | *Landslides*, DOI `10.1007/s10346-013-0438-9` [VERIFIED-SEARCH] |
| Himalayan catchment (debris flows) | Numerical-model-derived ID thresholds | **NHESS 24, 465 (2024)** — open access [VERIFIED-SEARCH] |

## Recommended operational thresholds for SANKET

| Purpose | Threshold | Why |
|---|---|---|
| **Primary regional** | **I = 5.8294 · D^(−0.4141)** | Purpose-built for NE Himalaya; corroborated by the independent Guwahati result |
| **Assam / urban validation** | I = 5.9 · D^(−0.479) | Open access, verifiable, city-specific |
| **Sikkim / Darjeeling sub-region** | I = 43.26 · D^(−0.78) (mm/d, d) | Designed for an operational LEWS in exactly this terrain |
| **Cumulative-rainfall cross-check** | 20-day antecedent > ~111 mm | Multiple independent studies converge near this |

**Unit discipline:** these are published in **mm/h with D in hours** (Kalimpong, Guwahati, NE Himalaya, North Sikkim) *and* **mm/day with D in days** (Sikkim regional, NH-10). Converting between them changes α by orders of magnitude. **Normalise everything to mm/h and hours in code, and unit-test the conversion.** This is the most likely source of a silent, catastrophic bug in your alerting logic.

---

# BLOCKERS: things requiring registration/approval that could take >24h

**Ranked by risk to the 6-day timeline.**

## 🔴 SEVERE — will not resolve in time; design around them now

| # | Source | Blocker | Mitigation |
|---|---|---|---|
| 1 | **IMD API** | Registration **+ IP whitelisting**. Confirmed **HTTP 401** on live endpoints. Approval time not published anywhere. Requires a **static egress IP**. | **Do not depend on it.** Use Open-Meteo + GPM IMERG. Write the IMD adapter, apply anyway, and pitch it as "ready to switch on". |
| 2 | **Landslide4Sense official download** | **IARAI domain no longer resolves (NXDOMAIN).** All official links dead since ~2023. Not recoverable by any registration. | **Use the Hugging Face mirror (8.99 GB). Download on day 1.** Verify 3799/245/800 splits on extract. |
| 3 | **NDMA SACHET outbound integration** | Becoming an **Alert Generating Agency** is an institutional designation for statutory bodies. No self-service path exists. | **Emit valid CAP 1.2 XML** and pitch as "SACHET-ready". Consume the public RSS feed for inbound. |
| 4 | **GEE Partner Tier** | **"May take several weeks"** manual review. | **Do not apply.** Use **Contributor Tier** — self-select, immediate, 1,000 EECU-h/mo. |
| 5 | **Bhuvan CartoDEM (foreign nationals)** | **"Foreign users may obtain the data after necessary clearance from the competent ISRO/DOS committee."** Multi-week institutional process. | **Use Copernicus GLO-30** — anonymous S3, no gatekeeping, equivalent resolution. |

## 🟠 HIGH — uncertain, needs action TODAY

| # | Source | Blocker | Mitigation |
|---|---|---|---|
| 6 | **GSI Bhukosh** | **ECONNREFUSED from non-Indian egress.** Likely geo-blocked. Even when reachable: **portal-only, area caps, variable caps, email-based delivery, no bulk download, no API.** | **Have a teammate test from an Indian IP within hours.** Email `ocbis.helpdesk@gsi.gov.in` today. Begin manual downloads immediately — this cannot be scripted. Fallback: NASA COOLR + your own DEM-derived susceptibility. |
| 7 | **NGDR (`geodataindia.gov.in`)** | **Login required.** Registration process and approval time **unverified**. | Register today. It may be the more modern route to the same GSI data. |
| 8 | **NASA COOLR ArcGIS endpoints** | Now return **`499 Token Required`** / **`503`** / Sign-In. Migrated behind Earthdata auth. | **Get an Earthdata Login (instant, §10) and retry.** Meanwhile the legacy 2016 CSV downloads anonymously. |

## 🟡 MEDIUM — quick, but do them first thing

| # | Source | Blocker | Time |
|---|---|---|---|
| 9 | **NASA Earthdata Login** (GPM IMERG, SMAP, COOLR) | Email verification required; **approval is automatic** | **Minutes.** Do it first — it unlocks three sources. |
| 10 | **Copernicus Data Space** (Sentinel-2) | Email verification | **Minutes.** |
| 11 | **Google Earth Engine** | Cloud project + **non-commercial questionnaire** (mandatory since 26 Sep 2025; access **paused** without it) | **Access immediate**, but complete the questionnaire before real work. |
| 12 | **Bhashini** | Registration + email auth; max 5 API keys | **Minutes**, no manual review documented. |
| 13 | **OpenTopography API key** | Free, self-service via My Account | **Minutes.** Use an **academic email** — 250 vs 50 calls/day. |
| 14 | **Bhuvan (Indian nationals)** | Signup open to anyone; **20 tiles/day cap** | Account is instant, but **~2 days of manual downloading** for NER. Skip in favour of GLO-30. |

## 🟢 NO BLOCKER — start immediately, no account needed

- **Open-Meteo** forecast + ERA5 archive — no key at all
- **Copernicus DEM GLO-30** — anonymous S3
- **OSM Geofabrik North-Eastern Zone** — 104 MB direct download
- **CAS Landslide Dataset** — open Zenodo
- **NASA GLC legacy CSV** — anonymous (but frozen at 2016)
- **CAP 1.2 specification** — open OASIS standard
- **SHRUG** Census 2011 + village geometries — open download
- **SRTM via OpenTopography web/S3** — no key for bulk S3

## Suggested day-1 action list

1. Register: **Earthdata Login**, **Copernicus Data Space**, **GEE** (+ questionnaire, + switch to Contributor), **Bhashini**, **OpenTopography** (academic email), **NGDR**. *(~1 hour total)*
2. **Download Landslide4Sense from Hugging Face (8.99 GB)** and verify splits. *(highest-risk asset)*
3. **Get a teammate on an Indian connection to test Bhukosh** and start manual inventory downloads.
4. Email `ocbis.helpdesk@gsi.gov.in` and the IMD API contact — start the clock on the slow processes even if you never use them.
5. Pull **GLO-30 tiles** and the **OSM NE extract** (fast, unblocked, unblocks all terrain work).

---

# COULD NOT VERIFY

Items I was unable to confirm on a live page, and why.

## Blocked by network egress (likely geo-restriction — retry from India)

| Item | What happened |
|---|---|
| **GSI Bhukosh** — entire portal, all paths | `ECONNREFUSED 144.24.99.164:443`, repeatedly |
| Bhukosh **data format** (shapefile assumed) | Could not reach the download UI |
| Bhukosh / NLSM **licence terms** | Not stated on any reachable page |
| Bhukosh **NER extract size** | Unknown |
| **`data.gov.in`** catalog pages | `HTTP 403 Forbidden` |
| **Bhuvan CartoDEM** file format and licence text | Portal search returned no results to my egress |
| **NRSC Open Data Access Policy** full text | Not reachable |

## Paywalled or access-controlled

| Item | What happened |
|---|---|
| **J. Hydrologic Engineering** threshold atlas, DOI `10.1061/JHYEFF.HEENG-6745` | `HTTP 403` — the likely published successor to the rejected NHESS preprint. **Coefficients unknown.** |
| **JESS 2025** article (the NE Himalaya α/β source) | `HTTP 403` direct; Springer redirected to IdP login. Coefficients read from a **search extract only** — [VERIFIED-SEARCH, not VERIFIED-URL] |
| **Dikshit & Satyam 2018** (Kalimpong) primary text | Springer IdP redirect. Coefficients from search extract. |
| **Dikshit et al. 2019** (Sikkim) primary text | Springer IdP redirect. Coefficients from search extract. A free author-copy PDF is mirrored at gwp.org — use it to confirm. |
| **Mandal & Sarkar 2021** (NH-10) primary text | Coefficients from search extract. |

## Endpoints that returned auth/error states

| Item | What happened |
|---|---|
| **COOLR record count for the NER bbox** | Spatial `returnCountOnly` query blocked by `503` / `499 Token Required` |
| **COOLR current record count / date coverage** | Same |
| `gpm.nasa.gov/landslides/data.html` | `404` |
| `COOLRGuide_Exporting.pdf` | `404` |
| **IMD API rate limits, cost, approval time** | Behind the 401; nothing published |
| **IMD API auth mechanism** (key vs IP-only vs both) | Docs do not state it |

## Simply not published anywhere I could find

| Item | Notes |
|---|---|
| **Landslide4Sense original licence** | IARAI site gone; HF mirror states none |
| Whether the HF mirror includes **test-split labels** | Folder exists; contents unverified |
| **Bhashini rate limits** | Not documented |
| **Bhashini approval time** | Self-service in appearance; not stated |
| **Bhashini support for Mizo and Khasi** | **Contradictory sources.** Not in the 22-language roster. **Assume unsupported; verify at `bhashini.gov.in/ulca/search-model`.** |
| **SACHET RSS feed URL** | Feed confirmed to exist; exact URL not exposed |
| **SACHET alert-generating-agency onboarding** | No public criteria or process |
| **NGDR registration process / approval time** | Login wall |
| **Geofabrik NE Zone member states** (does it include Sikkim?) | "No sub regions are defined." **Check the `.poly` file.** |
| **SHRUG file sizes and formats** | Not on landing page |
| **Sentinel-2 L2A authoritative per-product size** | Official size table not reachable |
| **CAS Landslide true download size** | Page reported "31.8 TB across all versions" — **not credible**; real per-file sizes unverified |
| **SMAP L4 exact operational latency** | NSIDC has a latency table; specific figure not read |
| **IMERG coverage start: 1998 vs 2000** | Catalog pages disagree |
| **Open-Meteo multi-coordinate request syntax / point cap** | Assumed from memory; confirm in docs |

## Conflicting / unresolved

| Item | Conflict |
|---|---|
| **Lanta Khola threshold** | One source gives **I = 73.90·D^(−0.79)**; the primary paper description explicitly says a power law does **not** fit and proposes a 250 mm / 15-day normalized-cumulative rule instead. **Do not use the power-law pair unread.** |
| **Open-Meteo Historical API tier gating** | Pricing page implies Historical is a paid-tier unlock; Historical docs say no key needed for non-commercial. **Read: commercial licensing, not a free-tier block.** Low risk. |
| **Bhashini Mizo/Khasi** | One extract claimed support while self-contradicting in the same sentence. Not in the official roster. |

---

## Recommended minimal viable stack (all unblocked)

| Layer | Source | Status |
|---|---|---|
| Rainfall — live | **Open-Meteo forecast API** | ✅ no key |
| Rainfall — real-time satellite | **GPM IMERG Early** (4 h) | ✅ Earthdata, instant |
| Rainfall — historical training | **Open-Meteo ERA5** (1940–, hourly, 5-day lag) | ✅ no key |
| Terrain | **Copernicus DEM GLO-30** | ✅ anonymous S3 |
| Soil moisture | **SMAP L4** 9 km 3-hourly | ✅ Earthdata (check 2026 reprocessing) |
| Optical imagery | **Sentinel-2 L2A** via CDSE or **GEE** | ✅ instant registration |
| CV training data | **Landslide4Sense** (HF mirror, 8.99 GB) | ⚠️ mirror only — grab today |
| Landslide inventory | **NASA COOLR** (+ Earthdata token) | ⚠️ token needed |
| Roads / settlements | **OSM Geofabrik NE Zone** (104 MB) | ✅ direct |
| Population exposure | **SHRUG** village polygons + Census 2011 | ✅ open |
| Thresholds | **I = 5.8294·D^(−0.4141)** (NE Himalaya) | ✅ published |
| Alert format | **CAP 1.2** (OASIS) | ✅ open standard |
| Multilingual alerts | **Bhashini** (5 of 7 NE languages) | ⚠️ Mizo/Khasi gap |
| Compute | **GEE Contributor Tier** (1,000 EECU-h/mo) | ✅ instant |
| Baseline to benchmark against | **NASA LHASA v2.0.0** nowcast (1 km daily) | ✅ Earthdata |

**Nothing on this list blocks you. The two things to do in the next hour: download Landslide4Sense from Hugging Face, and get a teammate testing Bhukosh from an Indian IP.**
