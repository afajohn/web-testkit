# n8n Integration Troubleshooting Guide

## Quick Fix: The Connection Issue

The error "webhook not registered" means your workflow needs to be set up correctly.

### For Testing (Quick Test)

1. **Open n8n UI**: http://localhost:5678
2. **Open your workflow**
3. **Click "Execute Workflow" button** (top-right, play icon)
4. **Immediately run your test**:
   ```bash
   npm run test:url:n8n -- https://anewbride.com/
   ```
   
   ⚠️ **Important**: Test mode only works ONCE per execution click!

### For Production (Recommended)

1. **Open n8n UI**: http://localhost:5678
2. **Open your workflow**
3. **Toggle the "Active" switch** (top-right) to **ON**
4. **Verify green indicator** is showing
5. **Update script to use `/webhook/`**:
   ```bash
   # Set environment variable (PowerShell)
   $env:N8N_WEBHOOK_URL="http://localhost:5678/webhook/playwright-results"
   
   # Then run your test
   npm run test:url:n8n -- https://anewbride.com/
   ```

## Test the Connection First

Before running full tests, verify the connection works:

```bash
npm run test:n8n-connection
```

This sends a test payload to verify your webhook is accessible.

## Common Errors and Solutions

### Error: "webhook not registered" (404)

**Cause**: Workflow is not activated or in test mode without execution

**Solutions**:
- ✅ **Option 1**: Activate the workflow (toggle switch ON)
- ✅ **Option 2**: Click "Execute Workflow" before sending (test mode only)

### Error: "Unused Respond to Webhook node found in the workflow" (500)

**Cause**: The "Respond to Webhook" node exists but is not connected in the execution path

**Solutions**:
1. **Option 1 - Fix the connection**:
   - In n8n, connect "Respond to Webhook" node AFTER the Webhook node
   - Path must be: `Webhook → [any other nodes] → Respond to Webhook`
   - Make sure there's a connection line between nodes

2. **Option 2 - Remove the node**:
   - If you don't need a response, simply delete the "Respond to Webhook" node
   - The webhook will still work without it

### Error: "Connection refused" or "ECONNREFUSED"

**Cause**: n8n is not running

**Solutions**:
```bash
# Start n8n
n8n

# Verify it's running
# Open http://localhost:5678 in browser
```

### Error: "test-results.json not found"

**Cause**: Tests haven't been run yet, or file is in wrong location

**Solutions**:
```bash
# Run tests first
npm test

# Or test specific URL
npm run test:url https://anewbride.com/

# Verify file exists
ls test-results.json  # or on Windows: dir test-results.json
```

### Tests show 0 total tests

**Cause**: The JSON structure might be different, or no tests ran

**Check**:
1. Open `test-results.json` in a text editor
2. Look for `"stats"` section
3. Verify `expected`, `unexpected`, `skipped` values

## Step-by-Step Setup Verification

### 1. Verify n8n is Running

```bash
# Check if n8n process is running
# On Windows:
Get-Process | Where-Object {$_.ProcessName -like "*n8n*"}

# Or just try accessing the UI
# Open: http://localhost:5678
```

### 2. Verify Workflow Configuration

In n8n UI:
- ✅ Webhook node exists
- ✅ Path is: `playwright-results`
- ✅ HTTP Method is: `POST`
- ✅ "Respond to Webhook" node is connected

### 3. Verify Workflow is Activated

- ✅ Toggle switch shows "Active" (green/ON)
- ✅ Green indicator visible
- ✅ Webhook URL shows: `http://localhost:5678/webhook/playwright-results`

### 4. Test Connection

```bash
npm run test:n8n-connection
```

Should return: ✅ Connection successful!

### 5. Run Full Test

```bash
npm run test:url:n8n -- https://anewbride.com/
```

## File Location Verification

The script expects `test-results.json` in the project root:

```
ANewBride/
├── test-results.json  ← Should be here
├── scripts/
│   └── send-to-n8n.js
└── ...
```

Verify file exists:
```bash
# Windows PowerShell
Test-Path test-results.json

# Should return: True
```

## Environment Variables

If you need to use a different webhook URL:

```bash
# Windows PowerShell
$env:N8N_WEBHOOK_URL="http://localhost:5678/webhook/playwright-results"
npm run send:n8n

# Windows CMD
set N8N_WEBHOOK_URL=http://localhost:5678/webhook/playwright-results
npm run send:n8n

# macOS/Linux
N8N_WEBHOOK_URL=http://localhost:5678/webhook/playwright-results npm run send:n8n
```

## Still Having Issues?

1. **Check n8n logs**: Look at the terminal where `n8n` is running
2. **Check Playwright logs**: Look at test output for errors
3. **Verify JSON file**: Open `test-results.json` and check it's valid JSON
4. **Test connection separately**: Use `npm run test:n8n-connection`
5. **Check firewall**: Ensure port 5678 is not blocked

