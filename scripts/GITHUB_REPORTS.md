# Uploading Playwright Reports to GitHub

This guide explains how to upload and share Playwright HTML reports on GitHub, especially when testing multiple URLs and websites.

## Quick Start

1. **Prepare reports for GitHub:**
   ```bash
   npm run prepare:github
   ```

2. **Commit and push:**
   ```bash
   git add gh-pages-reports/
   git commit -m "Add test reports"
   git push
   ```

3. **Enable GitHub Pages** in repository settings to host the reports.

## Methods

### Method 1: GitHub Pages (Recommended)

**Best for:** Permanent, shareable reports accessible via URL

**Steps:**

1. **Prepare reports:**
   ```bash
   npm run prepare:github
   ```
   This creates a `gh-pages-reports/` directory with:
   - All your organized reports (by URL/website)
   - An index page listing all available reports
   - Proper structure for GitHub Pages

2. **Commit to repository:**
   ```bash
   git add gh-pages-reports/
   git commit -m "Add test reports for multiple URLs"
   git push
   ```

3. **Enable GitHub Pages:**
   - Go to repository Settings → Pages
   - Source: Deploy from a branch
   - Branch: `main` (or your default branch)
   - Folder: `/gh-pages-reports`
   - Click Save

4. **Access reports:**
   - Your reports will be available at: `https://YOUR_USERNAME.github.io/YOUR_REPO/`
   - The index page lists all available reports
   - Each report is accessible at: `https://YOUR_USERNAME.github.io/YOUR_REPO/REPORT_PATH/index.html`

### Method 2: GitHub Actions Artifacts

**Best for:** CI/CD workflows, temporary reports, build artifacts

**Steps:**

1. **Use the provided GitHub Actions workflow** (`.github/workflows/playwright-reports.yml`)
   - Automatically runs tests on push/PR
   - Prepares reports
   - Uploads as artifacts

2. **Access artifacts:**
   - Go to Actions tab in GitHub
   - Click on a workflow run
   - Download the `playwright-report` artifact
   - Extract and open `index.html` to browse reports

3. **Manual trigger:**
   ```bash
   # Push to trigger, or use GitHub UI:
   # Actions → Playwright Test Reports → Run workflow
   ```

### Method 3: GitHub Releases

**Best for:** Versioned reports, milestone releases

**Steps:**

1. **Prepare reports:**
   ```bash
   npm run prepare:github
   ```

2. **Create a zip file:**
   ```bash
   cd gh-pages-reports
   zip -r ../test-reports.zip .
   cd ..
   ```

3. **Create a GitHub Release:**
   - Go to Releases → Create a new release
   - Tag version (e.g., `v1.0.0`)
   - Upload `test-reports.zip` as an asset
   - Publish release

4. **Share the release URL** with your team

### Method 4: GitHub Actions + Pages (Automated)

**Best for:** Automatic deployment after each test run

**Steps:**

1. **Uncomment the GitHub Pages deployment steps** in `.github/workflows/playwright-reports.yml`:
   ```yaml
   - name: Deploy to GitHub Pages
     uses: peaceiris/actions-gh-pages@v3
     if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/master'
     with:
       github_token: ${{ secrets.GITHUB_TOKEN }}
       publish_dir: ./gh-pages-reports
   ```

2. **Enable GitHub Pages** in repository settings (same as Method 1)

3. **Reports will automatically update** after each test run on main/master branch

## Report Organization

Reports are organized by URL structure:

```
gh-pages-reports/
├── index.html                    # Main index page (lists all reports)
├── default/                      # Default/latest report
│   ├── index.html
│   └── data/
├── anewbride.com/               # Reports for anewbride.com
│   ├── index.html
│   ├── data/
│   └── tour/                    # Reports for tour pages
│       ├── index.html
│       └── data/
└── example.com/                 # Reports for another website
    ├── index.html
    └── data/
```

## Custom Output Directory

Use a custom directory (e.g., `docs/reports` for GitHub Pages on `/docs` folder):

```bash
node scripts/prepare-github-reports.js docs/reports
```

Then in GitHub Pages settings:
- Source: `/docs`
- Reports accessible at: `https://YOUR_USERNAME.github.io/YOUR_REPO/reports/`

## Workflow Examples

### Testing Multiple URLs

```bash
# Test multiple URLs
npm run test:url -- https://anewbride.com/
npm run test:url -- https://anewbride.com/tour/
npm run test:url -- https://example.com/

# Prepare all reports for GitHub
npm run prepare:github

# Commit and push
git add gh-pages-reports/
git commit -m "Add test reports for multiple URLs"
git push
```

### CI/CD Integration

The GitHub Actions workflow (`.github/workflows/playwright-reports.yml`) automatically:
1. Runs tests on push/PR
2. Prepares reports
3. Uploads as artifacts
4. (Optional) Deploys to GitHub Pages

## Troubleshooting

**Reports not showing:**
- Ensure `gh-pages-reports/index.html` exists
- Check GitHub Pages settings (correct folder selected)
- Wait a few minutes for GitHub Pages to build
- Check Actions tab for build errors

**Multiple reports not appearing:**
- Ensure all reports are in `playwright-report/` directory
- Check that each report has an `index.html` file
- Verify the prepare script ran successfully

**GitHub Pages 404:**
- Ensure the folder path in Pages settings matches your output directory
- Check that files are committed and pushed
- Verify `index.html` exists at the root of the selected folder

**Large file sizes:**
- GitHub Pages has a 1GB limit per repository
- Consider excluding videos from reports
- Use artifacts instead for large reports
- Clean up old reports periodically

## Best Practices

1. **Regular Updates:** Commit reports regularly to keep them current
2. **Clean Up:** Remove old reports periodically to avoid repository bloat
3. **Use Branches:** Create a `gh-pages` branch for reports (keeps main clean)
4. **Descriptive Commits:** Use clear commit messages indicating which URLs were tested
5. **Artifacts for CI:** Use artifacts for temporary CI reports, Pages for permanent ones

## Security Considerations

- **Don't commit sensitive data:** Ensure test reports don't contain credentials or sensitive information
- **Private repositories:** GitHub Pages on private repos requires GitHub Pro/Team
- **Public URLs:** GitHub Pages reports are publicly accessible (use private repos if needed)

