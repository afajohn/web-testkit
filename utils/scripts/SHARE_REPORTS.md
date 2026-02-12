# Sharing Playwright HTML Reports

This guide explains how to share Playwright test results HTML reports with developers without uploading to GitHub.

## Quick Start

After running tests, serve the HTML reports:

```bash
npm run serve:reports
```

This will start a local HTTP server and display URLs that you can share with your team.

## Methods

### Method 1: Serve Reports Locally (Recommended for Local Sharing)

**Use this when:**
- Developers are on the same local network
- You want quick, direct access
- No external dependencies needed

**Steps:**

1. Run your tests:
   ```bash
   npm run test:url -- https://example.com
   ```

2. Serve the reports:
   ```bash
   npm run serve:reports
   ```

3. Share the URL(s) displayed:
   - **Local URL**: `http://localhost:9323/` (only accessible on your machine)
   - **Network URL**: `http://YOUR_IP:9323/` (accessible to anyone on your network)

4. Developers can open the Network URL in their browser to view the reports

**Custom Port:**
```bash
node scripts/serve-reports.js 8080
```

**Serve Specific Report:**
```bash
node scripts/serve-reports.js 9323 playwright-report/anewbride.com
```

### Method 2: Share Report Files Directly

**Use this when:**
- Developers are remote
- You want to share via email/file sharing service
- Network access is not possible

**Steps:**

1. Navigate to the report directory:
   ```bash
   cd playwright-report
   # Or for URL-specific reports:
   cd playwright-report/anewbride.com
   ```

2. Zip the report folder:
   - Windows: Right-click folder → Send to → Compressed (zipped) folder
   - Mac/Linux: `zip -r report.zip playwright-report/`

3. Share the zip file via:
   - Email
   - File sharing service (Dropbox, Google Drive, OneDrive, etc.)
   - Team communication tool (Slack, Teams, etc.)

4. Developers extract and open `index.html` in their browser

### Method 3: Use Playwright's Built-in Server

**Use this when:**
- You want Playwright's official report viewer
- You want automatic report detection

**Steps:**

1. After running tests, use Playwright's show-report command:
   ```bash
   npx playwright show-report
   ```

2. Share the displayed URL with your team (if on same network)

**Note:** This serves from the default `playwright-report/` directory only.

## Which Report to Share?

Reports are organized by URL in the `playwright-report/` directory:

```
playwright-report/
  ├── index.html                    # Default/latest report
  ├── anewbride.com/
  │   ├── index.html               # Report for anewbride.com
  │   └── data/                    # Report data files
  └── anewbride.com/
      └── tour/
          ├── index.html           # Report for tour pages
          └── data/
```

- **Default report**: `playwright-report/index.html` (latest test run)
- **URL-specific reports**: `playwright-report/<domain>/<path>/index.html`

## Tips for Sharing

### On Same Network
- Use the Network URL from `npm run serve:reports`
- Ensure firewall allows connections on the port (default: 9323)
- Share the Network IP address URL

### Remote Sharing
- Zip the entire report directory (including `data/` subfolder)
- Share via email, Slack, Teams, or file sharing service
- Include instructions to extract and open `index.html`

### For CI/CD Integration (Future)
- Upload reports as build artifacts
- Use GitHub Actions `actions/upload-artifact`
- Publish to static hosting (GitHub Pages, Netlify, etc.)

## Troubleshooting

**Port already in use:**
```bash
# Use a different port
node scripts/serve-reports.js 8080
```

**Can't access Network URL:**
- Check firewall settings (Windows Firewall, macOS Security)
- Ensure you're on the same network
- Try the localhost URL if you're on the same machine

**Report not found:**
- Run tests first: `npm run test:url -- <URL>`
- Check that `playwright-report/` directory exists
- Verify `index.html` exists in the report directory

**Network IP not showing:**
- You may be on a VPN or isolated network
- Use localhost URL if sharing on the same machine
- Or use Method 2 (share files directly)

