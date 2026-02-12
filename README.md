# QA Domains - Automated Website Quality Audit & Dashboard

A comprehensive TypeScript-based automated quality assurance system that scans websites for **SEO issues, accessibility violations, security headers, broken links, and images without alt text**. Results are aggregated into a real-time web dashboard with historical tracking.

---

## 📊 Project Overview

This project automates the auditing of multiple websites by:
1. **Scanning URLs** for quality issues across multiple categories
2. **Collecting audit results** in structured JSON reports
3. **Aggregating data** with trend tracking (NEW, STILL_BROKEN, FIXED)
4. **Visualizing results** in an interactive web dashboard
5. **Monitoring storage** with automatic retention policies

**Tech Stack:** TypeScript, Node.js, Playwright, Axe-core, HTML/CSS/JavaScript

---

## 📁 Project Structure & File Purposes

### Root Configuration Files

```
package.json                    # NPM dependencies & project metadata
├─ devDependencies:
│  ├─ typescript              # TypeScript compiler
│  ├─ ts-node                 # Execute TypeScript directly
│  ├─ @types/node             # Node.js type definitions
│  └─ playwright              # Browser automation framework
├─ dependencies:
│  └─ @axe-core/playwright    # Accessibility testing library
```

```
tsconfig.json                  # TypeScript compiler configuration
                               # Defines compilation rules and output targets
```

```
setup.bat                      # Windows batch script for environment initialization
                               # Installs npm dependencies via 'npm install'
```

```
Guide.md                       # Quick start guide with terminal commands
```

---

## 🏗️ Directory Structure & Components

### 1. **`/runner`** - URL Scanning & Core Logic
Handles individual URL scanning with comprehensive quality checks.

#### Files:

**`scan-url-core.ts`**
- **Purpose:** Core scanning engine that visits a URL and runs all audit checks
- **Key Features:**
  - Launches headless Chromium browser via Playwright
  - Executes all check modules (SEO, Security, A11Y, Images, Links)
  - Captures system errors gracefully
  - Returns structured audit result with timestamp
- **Output:** `PageResult` object containing domain, URL, and array of audit errors
- **Error Handling:** System-level failures are captured as `FUNC` category errors

**`batch-run.ts`**
- **Purpose:** Orchestrates scanning of multiple URLs from a text file
- **Key Features:**
  - Reads URL list from `urls/` directory (e.g., `colombianlady.com.txt`)
  - Implements concurrent scanning (4 workers max to prevent resource exhaustion)
  - Saves results to `data/{domain}/` directory
  - Generates filenames with URL slug + ISO timestamp
  - Shows real-time progress with colored output (✓ for success, ✘ for failures)
  - Displays error counts and duration for each scan
  - Reports storage statistics at the end
- **Storage Monitoring:** Tracks total JSON records and disk space used
- **Usage:**
  ```bash
  npx ts-node runner/batch-run.ts example.com.txt
  ```

**`types.ts`**
- **Purpose:** TypeScript type definitions for the entire system
- **Key Types:**
  - `AuditError` - Complete error structure with ID, category, severity, selector, bounding box
  - `PageResult` - Container for all errors found on a single URL scan
  - `AuditSeverity` - Error severity levels (low, medium, high, critical)
  - `generateErrorId()` - MD5 hash function for creating deterministic error IDs
- **Error Properties:**
  - `id`: Unique MD5 hash based on URL + category + title + selector
  - `fingerprint`: Used for deduplication across scans
  - `status`: Tracks if error is NEW, STILL_BROKEN, or FIXED (set during aggregation)
  - `boundingBox`: Visual location on page for broken link/image issues

---

### 2. **`/checks`** - Quality Check Modules
Individual audit modules that run within the browser context.

#### **`seo.ts`**
- **Purpose:** SEO optimization checks
- **Checks Performed:**
  - ❌ Missing H1 tag (every page needs exactly one)
  - ❌ Multiple H1 tags (only one H1 allowed per page)
  - ❌ Page structure optimization
- **Severity:** Medium to High
- **Execution Context:** Runs within Playwright page evaluation
- **Output:** Array of SEO-related `AuditError` objects

#### **`a11y.ts`** (Accessibility)
- **Purpose:** WCAG compliance and accessibility testing
- **Tools Used:** Axe-core automated accessibility engine
- **Standards Checked:** WCAG 2A, WCAG 2AA, WCAG 2.1A
- **Rules Disabled:** Color contrast (manual review recommended)
- **Checks Include:**
  - Missing form labels
  - Invalid ARIA attributes
  - Keyboard navigation issues
  - Screen reader compatibility
- **Execution:** Asynchronous evaluation with element bounding boxes
- **Severity:** High to Critical based on impact

#### **`security.ts`**
- **Purpose:** HTTP security header validation
- **Headers Checked:**
  - `Strict-Transport-Security` (HSTS) - Forces HTTPS [HIGH]
  - `X-Frame-Options` - Prevents clickjacking [MEDIUM]
  - `X-Content-Type-Options` - MIME type sniffing prevention [LOW]
  - `Content-Security-Policy` (CSP) - Prevents XSS attacks [CRITICAL]
- **Execution:** Response header analysis (no page evaluation needed)
- **Severity:** Low to Critical
- **Recommendation:** Configure headers in Nginx/Apache

#### **`images.ts`**
- **Purpose:** Image accessibility and quality checks
- **Checks Performed:**
  - ❌ Missing alt text on images
  - ❌ Empty alt attributes
  - ✓ Ignores tiny images (< 10×10 px tracking pixels)
- **Severity:** Medium
- **Execution:** DOM evaluation with image dimensions
- **Output:** Includes bounding box for visual location

#### **`links.ts`**
- **Purpose:** Broken link detection and validation
- **Key Features:**
  - Extracts all valid external links from page
  - Ignores JavaScript links, anchors (#), and mailto links
  - Tests links in parallel batches (5 concurrent max)
  - HEAD requests for performance (not loading full page)
  - 5-second timeout per link request
- **Checks Performed:**
  - ❌ HTTP 4xx/5xx error status codes
  - ❌ Timeout failures
  - ❌ Invalid URLs
- **Severity:** High
- **Deduplication:** Only tests each unique URL once per scan

---

### 3. **`/aggregator`** - Data Aggregation & Real-time Watcher
Processes raw scan data and maintains aggregated reports.

#### **`aggregate-logic.ts`**
- **Purpose:** Combines multiple scans into a unified report with historical tracking
- **Key Features:**
  - Groups scan results by domain
  - Compares latest scan with previous scan
  - Marks errors as: `NEW` (first appearance), `STILL_BROKEN` (repeating), `FIXED` (resolved)
  - Implements retention policy (keeps last 3 versions per URL)
  - Automatically purges old scan files to save storage
  - Generates sorted, structured report
- **Output Location:** `dashboard/data/aggregated.json`
- **Storage Monitoring:** Tracks total MB and file count
- **Constants:**
  - `KEEP_COUNT = 3` - Retains only 3 most recent scans per URL
  - `DATA_DIR` - Points to `/data` directory

**Aggregation Process:**
1. Reads all domains from `/data` directory
2. For each domain, groups JSON files by URL
3. Compares latest against previous scan
4. Assigns status based on error persistence
5. Purges files beyond retention limit
6. Writes combined report to dashboard

#### **`watch-and-build.ts`**
- **Purpose:** Real-time file watcher that rebuilds dashboard when new scans arrive
- **Key Features:**
  - Monitors `/data` directory recursively
  - Triggers aggregation on new `.json` files (debounced 500ms)
  - Automatically creates missing directories
  - Runs continuously in background
  - Excludes `aggregated.json` from triggers (prevents loops)
- **Usage:**
  ```bash
  npx ts-node aggregator/watch-and-build.ts
  ```
- **Output:** Auto-updates `dashboard/data/aggregated.json` whenever new scans complete

---

### 4. **`/dashboard`** - Web-based Results Visualization
Interactive HTML/CSS/JavaScript frontend for viewing audit results.

#### **`index.html`**
- **Purpose:** Main dashboard page structure
- **Key Sections:**
  - Header with logo, live stats bar (domains, pages, active errors)
  - Main container for domain cards (injected via JavaScript)
  - Footer with last sync timestamp
  - Links to stylesheet and app.js
- **Responsive:** Mobile-friendly viewport meta tag
- **Fonts:** JetBrains Mono (code) + Segoe UI (UI)

#### **`app.js`**
- **Purpose:** Dashboard logic and real-time updates
- **Key Functions:**
  - `initDashboard()` - Fetches aggregated.json and renders dashboard
  - `renderStats()` - Displays total domains, pages, and error counts
  - `renderStructure()` - Creates collapsible domain cards
  - `updateContent()` - Populates error details within cards
  - Auto-refresh every 10 seconds (configurable)
- **Features:**
  - Color-coded error severity (danger, warning, info)
  - Error status badges (NEW, STILL_BROKEN, FIXED)
  - Auto-clears old data on refresh
  - Expandable/collapsible domain sections
- **Data Source:** `data/aggregated.json`

#### **`styles.css`**
- **Purpose:** Visual styling and theming
- **Key Styles:**
  - Dark theme with monochrome green accent
  - CSS custom properties for maintainable colors
  - Responsive grid layout
  - Code-like appearance (console aesthetic)
  - Color coding: danger (red), success (green), warning (orange)

#### **`data/aggregated.json`** (Generated)
- **Purpose:** Aggregated scan results database
- **Structure:**
  ```json
  {
    "lastUpdated": "2026-02-12T00:33:20.123Z",
    "domains": [
      {
        "name": "colombianlady.com",
        "totalErrors": 42,
        "pageCount": 15,
        "pages": [
          {
            "url": "https://colombianlady.com/about",
            "timestamp": "2026-02-12T00:33:00.000Z",
            "stableId": "about",
            "errors": [
              {
                "id": "a1b2c3d4e5f6",
                "url": "https://...",
                "category": "SEO|A11Y|SECURITY|FUNC",
                "title": "Missing H1",
                "message": "...",
                "severity": "high|medium|low|critical",
                "status": "NEW|STILL_BROKEN|FIXED",
                "fix": "..."
              }
            ]
          }
        ]
      }
    ]
  }
  ```
- **Auto-generated** by `aggregate-logic.ts`

---

### 5. **`/data`** - Raw Scan Results Storage
Stores individual scan results organized by domain.

#### Structure:
```
data/
├─ colombianlady.com/
│  ├─ about-colombian-lady-html__2026-02-11T23-55-20-439Z.json
│  ├─ best-colombia-matchmakers-marriage-agency-html__2026-02-11T23-55-23-268Z.json
│  └─ ... (more scans)
├─ poltavawomen.com/
│  ├─ about-poltava-women-html__2026-02-12T00-33-03-683Z.json
│  └─ ... (more scans)
└─ ... (other domains)
```

- **Filename Format:** `{url-slug}__{ISO-timestamp}.json`
- **Content:** Raw `PageResult` objects with all audit errors
- **Retention:** Only latest 3 scans per URL (older files auto-deleted)
- **Size:** Monitored and reported during batch runs

---

### 6. **`/urls`** - URL Lists for Batch Scanning
Text files containing URLs to scan, organized by domain.

#### File Format:
```
urls/
├─ colombianlady.com.txt
├─ poltavawomen.com.txt
└─ ... (other domains)
```

**Text File Content:**
- One URL per line
- URLs must be complete (include protocol: http:// or https://)
- Blank lines are ignored
- File name should match the domain (used for organization)

**Example: `colombianlady.com.txt`**
```
https://colombianlady.com/about
https://colombianlady.com/colombian-brides
https://colombianlady.com/tours
```

---

## 🔄 Project Workflow

### Complete Audit Cycle:

```
┌─────────────────────────────────────────────────────────┐
│  1. PREPARATION: Set Up URL Lists                       │
├─────────────────────────────────────────────────────────┤
│  └─ Create or update txt files in /urls folder          │
│     One URL per line, grouped by domain                 │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  2. BATCH SCANNING: Run audit on multiple URLs          │
├─────────────────────────────────────────────────────────┤
│  Command: npx ts-node runner/batch-run.ts domain.txt    │
│                                                         │
│  For each URL in the file:                             │
│  ├─ Launch headless browser (Playwright)               │
│  ├─ Navigate to URL                                     │
│  └─ Execute audit checks:                              │
│     ├─ checkSEO()        ← Heading structure            │
│     ├─ checkSecurity()   ← HTTP headers                 │
│     ├─ checkA11y()       ← AccessibilityViolations     │
│     ├─ checkImages()     ← Alt text                     │
│     └─ checkLinks()      ← Broken links                │
│                                                         │
│  Up to 4 URLs scanned concurrently                     │
│  Real-time progress displayed with colors              │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  3. RESULTS STORAGE: Save raw scan data                 │
├─────────────────────────────────────────────────────────┤
│  └─ Each scan saved to:                                 │
│     /data/{domain}/{url-slug}__{timestamp}.json         │
│                                                         │
│     Filename format: URL path sanitized + ISO date      │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  4. REAL-TIME AGGREGATION: Watch folder & rebuild      │
├─────────────────────────────────────────────────────────┤
│  Command: npx ts-node aggregator/watch-and-build.ts    │
│                                                         │
│  When new JSON detected:                               │
│  ├─ Compare with previous scan (error tracking)        │
│  ├─ Mark errors as: NEW / STILL_BROKEN / FIXED         │
│  ├─ Purge files older than 3 scans per URL             │
│  └─ Generate /dashboard/data/aggregated.json           │
│                                                         │
│  This runs continuously in background                   │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│  5. VISUALIZATION: View results in dashboard            │
├─────────────────────────────────────────────────────────┤
│  └─ Open dashboard/index.html in browser               │
│                                                         │
│     Shows:                                              │
│     ├─ Total domains being tracked                      │
│     ├─ Total pages scanned                              │
│     ├─ Total active errors (excluding FIXED)           │
│     ├─ Expandable domain sections                       │
│     ├─ Pages within each domain                         │
│     └─ Detailed errors with status & severity          │
│                                                         │
│  Auto-refreshes every 10 seconds                       │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start Commands

### 1. **Initial Setup**
```bash
npm install
```

### 2. **Prepare URLs**
Create a text file in `urls/` (e.g., `example.com.txt`):
```
https://example.com/page1
https://example.com/page2
https://example.com/page3
```

### 3. **Run Batch Scan**
```bash
npx ts-node runner/batch-run.ts example.com.txt
```

### 4. **Start Real-time Watcher** (in separate terminal)
```bash
npx ts-node aggregator/watch-and-build.ts
```

### 5. **View Dashboard**
Open `dashboard/index.html` in a web browser.

---

## 📈 Data Flow Diagram

```
URLs (txt files)
    │
    ▼
[batch-run.ts] ─ launches 4 concurrent workers
    │
    ├─ URL #1 ──→ [scan-url-core.ts] ──→ All 5 checks
    ├─ URL #2 ──→ [scan-url-core.ts] ──→ All 5 checks
    ├─ URL #3 ──→ [scan-url-core.ts] ──→ All 5 checks
    └─ URL #4 ──→ [scan-url-core.ts] ──→ All 5 checks
         │
         ▼
    /data/{domain}/*.json (raw results)
         │
         ▼
    [watch-and-build.ts] ─ monitors file changes
         │
         ▼
    [aggregate-logic.ts] ─ compares & tracks changes
         │
         ▼
    /dashboard/data/aggregated.json (final report)
         │
         ▼
    [app.js] ─ renders in browser
         │
         ▼
    Dashboard visualization
```

---

## 🔍 Audit Categories

### **SEO** (Search Engine Optimization)
- Heading hierarchy (H1, H2, H3 structure)
- Meta tags and descriptions
- Content optimization

### **A11Y** (Accessibility)
- WCAG 2A/2AA/2.1A compliance
- ARIA attributes
- Form labels
- Alt text for images
- Screen reader support

### **SECURITY** (HTTP Headers)
- HSTS (HTTP Strict Transport Security)
- X-Frame-Options (clickjacking prevention)
- X-Content-Type-Options (MIME sniffing)
- Content-Security-Policy (XSS prevention)

### **FUNC** (Functional Issues)
- Broken links (HTTP 4xx/5xx)
- System/connection errors
- Timeouts

---

## 💾 Storage Management

The system implements **automatic retention policies** to prevent excessive disk usage:

- **Policy:** Keep only the **3 most recent scans** per unique URL
- **Triggered:** Automatically during aggregation
- **Benefit:** Tracks error trends without unlimited growth
- **Monitoring:** Storage stats displayed after each batch run

Example:
```
When batch scan completes:
🛡️  STORAGE MONITOR
   Total JSON Records: 145
   Disk Space Used:    2.3 MB
   Retention Policy:   3 versions/URL
```

---

## 🎯 Key Features

✅ **Automated Scanning** - Batch process thousands of URLs  
✅ **Concurrent Execution** - 4 concurrent scans, 5 concurrent link checks  
✅ **Multi-Category Audits** - SEO, A11y, Security, Links, Images  
✅ **Error Tracking** - NEW, STILL_BROKEN, FIXED status  
✅ **Real-time Dashboard** - Auto-updating visualization  
✅ **Historical Data** - Compare scans over time  
✅ **Storage Optimization** - Automatic cleanup with retention policy  
✅ **Detailed Reports** - JSON with bounding boxes and fix suggestions  

---

## 🛠️ Development Tips

**TypeScript Compilation:**
- `tsconfig.json` configures output to allow direct execution via `ts-node`
- No build step needed - runs TypeScript directly

**Browser Automation:**
- Uses Playwright for reliable cross-platform browser control
- Headless mode = no visual window, faster execution
- USER_AGENT set to `QA-Speed-Scanner/1.0`

**Error Deduplication:**
- MD5 hash of URL + category + title + selector ensures consistent IDs
- Same error across multiple scans has the same ID
- Enables accurate tracking of error persistence

**Concurrency Control:**
- Batch runs: 4 concurrent URL scans (prevents resource exhaustion)
- Link checks: 5 concurrent requests per page (balanced for speed)
- Debouncing: 500ms delay on file watch triggers (prevents flapping)

---

## 📝 Example Scan Result

**Raw Result File:** `/data/colombianlady.com/about-colombian-lady-html__2026-02-11T23-55-20-439Z.json`

```json
{
  "domain": "colombianlady.com",
  "url": "https://colombianlady.com/about",
  "timestamp": "2026-02-11T23:55:20.439Z",
  "errors": [
    {
      "id": "8f14e45fceea167a5a36dedd4bea2543",
      "url": "https://colombianlady.com/about",
      "category": "A11Y",
      "title": "image-alt",
      "message": "Ensures every img element has an alternative text attribute",
      "selector": "img[src='banner.jpg']",
      "outerHTML": "<img src='banner.jpg' width='600' height='400'>",
      "severity": "high",
      "fix": "https://dequeuniversity.com/rules/axe/4.11/image-alt",
      "boundingBox": { "x": 10, "y": 50, "width": 600, "height": 400 },
      "fingerprint": "8f14e45fceea167a5a36dedd4bea2543",
      "detectedAt": 1613013320439
    }
  ]
}
```

---

## 🎓 How to Extend

**Add New Check Module:**
1. Create new file in `/checks` (e.g., `performance.ts`)
2. Export async function returning `AuditError[]`
3. Import and call in `scan-url-core.ts`

**Add New Audit Category:**
1. Extend `AuditError.category` union type in `types.ts`
2. Create new check module
3. Results auto-flow to dashboard

**Customize Dashboard:**
1. Edit `dashboard/app.js` for logic changes
2. Edit `dashboard/styles.css` for styling
3. Results auto-update on every batch run

---

## 📚 File Reference Summary

| File | Purpose | Type |
|------|---------|------|
| `runner/scan-url-core.ts` | Core scanning engine | Core Logic |
| `runner/batch-run.ts` | Batch orchestration | CLI Tool |
| `runner/types.ts` | TypeScript definitions | Type Definitions |
| `checks/seo.ts` | SEO audit checks | Module |
| `checks/a11y.ts` | Accessibility checks | Module |
| `checks/security.ts` | Security header checks | Module |
| `checks/images.ts` | Image alt text checks | Module |
| `checks/links.ts` | Broken link detection | Module |
| `aggregator/aggregate-logic.ts` | Report generation | Core Logic |
| `aggregator/watch-and-build.ts` | File watcher | Background Service |
| `dashboard/index.html` | Dashboard structure | UI |
| `dashboard/app.js` | Dashboard logic | UI |
| `dashboard/styles.css` | Dashboard styling | UI |

---

## 🚦 Status Codes & Indicators

In the dashboard and batch output:

- ✓ (green) = Scan succeeded
- ✘ (red) = Scan failed or system error
- **NEW** = Error appeared for first time
- **STILL_BROKEN** = Error persists from previous scan
- **FIXED** = Error resolved since last scan

---

**Last Updated:** February 12, 2026  
**Version:** 1.0-QA  
**Created for:** Automated multi-domain quality assurance
