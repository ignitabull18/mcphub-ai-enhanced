# Manual Deployment Steps for MCP-Nexus

Since the Coolify MCP tools aren't responding, here are the exact manual steps to deploy your mcp-nexus application.

## Prerequisites

1. ✅ Your mcp-hub repository is ready (run `./deploy-to-coolify.sh` first)
2. ✅ You have access to your Coolify dashboard
3. ✅ Your Git repository is pushed to the remote

## Step-by-Step Deployment

### Step 1: Prepare Your Repository

First, run the deployment script to prepare your repository:

```bash
# Run the deployment script
./deploy-to-coolify.sh

# Commit and push your changes
git add .
git commit -m "Prepare mcp-nexus for Coolify deployment"
git push origin main
```

### Step 2: Access Coolify Dashboard

1. **Open your Coolify dashboard** in your browser
2. **Log in** with your credentials
3. **Navigate to the dashboard** home page

### Step 3: Find Your Project

1. **Click on "Projects"** in the left sidebar
2. **Look for your existing "mcp-hub" project**
3. **Click on the project** to open it

### Step 4: Create New Application

1. **Click "Create Application"** or the "+" button
2. **Fill in the application details:**

   **Basic Information:**
   - **Name**: `mcp-nexus`
   - **Description**: `AI-Enhanced MCP Hub with intelligent group creation and vector-powered tool discovery`
   - **Repository**: Your Git repository URL (e.g., `https://github.com/yourusername/mcphub.git`)
   - **Branch**: `main`
   - **Build Pack**: `Dockerfile`
   - **Port**: `3000`

   **Advanced Settings:**
   - **Environment**: `production`
   - **Server**: Select your target server
   - **Domain**: `mcp-nexus.yourdomain.com` (optional)

### Step 5: Configure Environment Variables

Add these environment variables in the Coolify interface:

```bash
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

**Important Notes:**
- Replace `your-secure-jwt-secret-here` with a strong 32+ character secret
- Replace `your-openai-api-key-here` with your actual OpenAI API key
- Replace `your-postgres-host-here` with your database host
- Replace `your-postgres-password-here` with your database password

### Step 6: Configure Health Check

In the health check section:
- **Path**: `/health`
- **Interval**: `30` seconds
- **Timeout**: `10` seconds
- **Retries**: `3`

### Step 7: Deploy

1. **Click "Deploy"** to start the build process
2. **Monitor the build logs** for any issues
3. **Wait for deployment to complete** (this may take several minutes)

### Step 8: Verify Deployment

1. **Check the deployment status** in Coolify
2. **Test the health endpoint**: `https://your-domain.com/health`
3. **Access the dashboard**: `https://your-domain.com`
4. **Log in with default credentials**:
   - **Username**: `admin`
   - **Password**: `admin123`

### Step 9: Post-Deployment Setup

1. **Change the default password** immediately
2. **Configure your MCP servers** through the dashboard
3. **Test the MCP endpoints**
4. **Set up monitoring and alerts**

## Troubleshooting Common Issues

### Build Failures

If the build fails:

1. **Check the build logs** in Coolify
2. **Verify all environment variables** are set correctly
3. **Ensure the Dockerfile** is in the root of your repository
4. **Check if the repository** is accessible

### Runtime Errors

If the application fails to start:

1. **Check the application logs** in Coolify
2. **Verify database connectivity**
3. **Ensure all environment variables** are correctly set
4. **Check if port 3000** is available

### Health Check Failures

If health checks fail:

1. **Verify the health endpoint** is accessible
2. **Check if the application** is starting properly
3. **Review the health check configuration**
4. **Check application logs** for startup issues

## Success Criteria

Your deployment is successful when:

- ✅ Application builds without errors
- ✅ Health check endpoint returns `200 OK`
- ✅ Dashboard is accessible at the configured URL
- ✅ Default login credentials work
- ✅ MCP servers can be configured
- ✅ All environment variables are properly set

## Next Steps After Deployment

1. **Monitor the application** using Coolify's built-in monitoring
2. **Set up backups** for your database and application data
3. **Configure alerts** for any issues
4. **Test all functionality** to ensure everything works as expected
5. **Document any custom configurations**

## Getting Help

If you encounter issues:

1. **Check the application logs** in Coolify
2. **Review the build logs** for any errors
3. **Verify all environment variables** are correctly configured
4. **Ensure database connectivity** is working
5. **Consult the troubleshooting guide** in `COOLIFY_MCP_TROUBLESHOOTING.md`

---

**Note**: These manual steps will get your mcp-nexus application deployed while the MCP connection issues are being resolved. The deployment is designed to work seamlessly with your existing Coolify setup!
