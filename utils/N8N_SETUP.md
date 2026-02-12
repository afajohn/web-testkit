# n8n Integration Setup Guide

## Step-by-Step Setup

### 1. Install and Start n8n

```bash
# Install n8n globally
npm install -g n8n

# Start n8n
n8n
```

n8n will be available at: http://localhost:5678

### 2. Create Webhook Workflow in n8n

1. **Open n8n UI**: Go to http://localhost:5678

2. **Create New Workflow**:
   - Click "New Workflow" button

3. **Add Webhook Node**:
   - Click "+" to add a node
   - Search for "Webhook"
   - Select "Webhook" node

4. **Configure Webhook Node**:
   - **HTTP Method**: **POST** (recommended for large test results)
   - **Path**: `playwright-results`
   - **Response Mode**: "Respond to Webhook" (optional)
   
   **Important**: 
   - **POST is recommended** because test results can be 30KB+ and GET has URL length limitations
   - If using GET, you may get HTTP 431 errors with large payloads
   - POST sends data in the request body (no size limitations)
   
   The webhook URL will be displayed:
   ```
   http://localhost:5678/webhook/playwright-results
   ```
   
   **Note**: The `/webhook-test/` URL is for testing only. Use `/webhook/` for production.

5. **Add Response Node** (optional):
   - Add "Respond to Webhook" node
   - **IMPORTANT**: Connect it directly after the Webhook node (or through other nodes)
   - Connection path must be: `Webhook → [optional nodes] → Respond to Webhook`
   - If the "Respond to Webhook" node is disconnected, you'll get a 500 error
   - **Alternative**: You can omit this node entirely if you don't need a response

6. **Activate the Workflow**:
   - **CRITICAL**: Toggle the "Active" switch in the top-right corner
   - The workflow must be **ACTIVATED** (not just saved) for it to receive webhooks
   - Activated workflows show a green indicator

### 3. Test the Integration

Run your Playwright tests and send results to n8n:

```bash
# Test a specific URL and send to n8n
npm run test:url:n8n -- https://anewbride.com/

# Or run all tests and send to n8n
npm run test:n8n

# Or send existing test results
npm run send:n8n
```

### 4. Verify Receipt in n8n

1. Go to n8n UI
2. Click on "Executions" in the sidebar
3. You should see incoming executions with your test data

## Webhook URLs Explained

n8n provides two webhook URL types:

### Production Webhook (`/webhook/`)
- **Path**: `http://localhost:5678/webhook/playwright-results`
- **Requirements**: Workflow must be **ACTIVATED**
- **Usage**: Production use, works continuously
- **Status**: Green indicator when activated

### Test Webhook (`/webhook-test/`)
- **Path**: `http://localhost:5678/webhook-test/playwright-results`
- **Requirements**: Click "Execute Workflow" button first
- **Usage**: Testing/debugging only
- **Limitation**: Works **only once** per execution button click

## Common Issues

### "Webhook not registered" Error

**Problem**: Getting 404 error saying webhook is not registered

**Solutions**:
1. Make sure workflow is **ACTIVATED** (toggle switch in top-right)
2. Verify you're using `/webhook/` path (not `/webhook-test/`)
3. Check that the path matches: `playwright-results`
4. Restart n8n if needed

### Connection Refused Error

**Problem**: Can't connect to n8n

**Solutions**:
1. Verify n8n is running: `n8n`
2. Check n8n is accessible: http://localhost:5678
3. Verify the port (default is 5678)

### Test Results Not Appearing

**Problem**: Script runs but no data in n8n

**Solutions**:
1. Check n8n Executions tab
2. Verify workflow is activated (green indicator)
3. Check webhook path matches exactly: `playwright-results`
4. Verify HTTP method is POST

## Custom Webhook Path

If you want to use a different webhook path:

1. In n8n, change the webhook node path (e.g., `my-custom-path`)
2. Update the script with environment variable:
   ```bash
   # Windows PowerShell
   $env:N8N_WEBHOOK_URL="http://localhost:5678/webhook/my-custom-path"
   npm run send:n8n
   ```

## Next Steps

Once the basic integration works, you can:

1. **Process test results** in n8n (parse JSON, extract failures, etc.)
2. **Send notifications** (email, Slack, etc.) based on test results
3. **Store results** in a database
4. **Trigger other workflows** based on test outcomes
5. **Add AI reasoning** (e.g., Gemini API) to analyze failures

