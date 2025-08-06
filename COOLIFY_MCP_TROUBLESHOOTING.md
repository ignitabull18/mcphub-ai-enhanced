# Coolify MCP Troubleshooting Guide

## Issue: Coolify MCP Tools Not Responding

The Coolify MCP tools are not responding, which could be due to several reasons:

### Possible Causes:

1. **MCP Server Not Running**
   - The Coolify MCP server might not be started
   - The MCP server might not be properly configured

2. **Authentication Issues**
   - The MCP might need API keys or credentials
   - Authentication tokens might be expired or invalid

3. **Network Configuration**
   - There might be connectivity issues
   - Firewall or proxy settings might be blocking the connection

4. **MCP Configuration**
   - The MCP might not be properly configured in your environment
   - Missing environment variables or configuration files

## Troubleshooting Steps:

### 1. Check MCP Server Status

First, let's check if the Coolify MCP server is running:

```bash
# Check if MCP server is running
ps aux | grep coolify-mcp

# Check if MCP server is listening on the expected port
netstat -tlnp | grep coolify
```

### 2. Verify MCP Configuration

Check if the MCP configuration is properly set up:

```bash
# Check MCP configuration files
ls -la ~/.config/mcp/
ls -la ~/.mcp/

# Check environment variables
echo $MCP_SERVER_URL
echo $MCP_API_KEY
echo $COOLIFY_API_KEY
```

### 3. Test MCP Connection

Try to test the MCP connection manually:

```bash
# Test MCP server connection
curl -X GET "http://localhost:3000/mcp/health" \
  -H "Authorization: Bearer your-api-key"

# Test Coolify API directly
curl -X GET "https://your-coolify-instance.com/api/v1/projects" \
  -H "Authorization: Bearer your-coolify-api-key"
```

### 4. Check MCP Logs

Look for any error messages in the MCP logs:

```bash
# Check MCP server logs
tail -f /var/log/mcp/coolify-mcp.log

# Check system logs for MCP-related errors
journalctl -u coolify-mcp -f
```

## Manual Deployment Steps

Since the MCP tools aren't working, here are the manual steps to deploy mcp-nexus:

### Step 1: Prepare Your Repository

1. **Run the deployment script:**
   ```bash
   ./deploy-to-coolify.sh
   ```

2. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Prepare mcp-nexus for Coolify deployment"
   git push origin main
   ```

### Step 2: Deploy via Coolify Web Interface

1. **Log into Coolify Dashboard**
   - Navigate to your Coolify instance
   - Log in with your credentials

2. **Navigate to Applications**
   - Click on "Applications" in the sidebar
   - Look for your existing "mcp-hub" project

3. **Create New Application**
   - Click "Create Application"
   - Fill in the following details:
     - **Project**: Select your existing "mcp-hub" project
     - **Server**: Select your target server
     - **Environment**: `production`
     - **Repository**: Your Git repository URL
     - **Branch**: `main`
     - **Build Pack**: `Dockerfile`
     - **Ports**: `3000`

4. **Configure Environment Variables**
   - Add all the variables from `.env.production`:
     ```
     NODE_ENV=production
     PORT=3000
     JWT_SECRET=your-secure-jwt-secret-here
     SKIP_AUTH=false
     BASE_PATH=
     OPENAI_API_KEY=your-openai-api-key-here
     POSTGRES_HOST=your-postgres-host-here
     POSTGRES_PORT=5432
     POSTGRES_DB=mcp_nexus
     POSTGRES_USER=postgres
     POSTGRES_PASSWORD=your-postgres-password-here
     REQUEST_TIMEOUT=60000
     ```

5. **Configure Domains (Optional)**
   - **Domain**: `mcp-nexus.yourdomain.com`
   - **SSL**: Enable automatic SSL

6. **Deploy**
   - Click "Deploy" to start the build process
   - Monitor the build logs for any issues
   - Wait for deployment to complete

### Step 3: Verify Deployment

1. **Check Application Status**
   - Verify the application is running
   - Check the health endpoint: `https://your-domain.com/health`

2. **Test Application**
   - Access the dashboard: `https://your-domain.com`
   - Log in with default credentials: `admin` / `admin123`
   - Change the default password immediately

3. **Configure MCP Servers**
   - Add your MCP servers through the dashboard
   - Test the MCP endpoints

## Alternative: Use Coolify CLI

If the web interface doesn't work, you can try using the Coolify CLI:

```bash
# Install Coolify CLI (if not already installed)
npm install -g @coolify/cli

# Login to Coolify
coolify login

# Deploy application
coolify deploy --project mcp-hub --name mcp-nexus --repository your-repo-url
```

## Getting Help

If you continue to have issues:

1. **Check Coolify Documentation**: https://docs.coolify.io/
2. **Join Coolify Discord**: https://discord.gg/coolify
3. **Check GitHub Issues**: https://github.com/coollabsio/coolify/issues

## Next Steps

Once the deployment is successful:

1. **Monitor the application** using Coolify's built-in monitoring
2. **Set up backups** for your database and application data
3. **Configure alerts** for any issues
4. **Test all functionality** to ensure everything works as expected

---

**Note**: The MCP tools should work once the Coolify MCP server is properly configured and running. The manual deployment steps above will help you deploy mcp-nexus while the MCP connection issues are being resolved.
