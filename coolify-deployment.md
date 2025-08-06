# MCP-Nexus Coolify Deployment Guide

This guide will help you deploy your MCP-Hub variation as "mcp-nexus" on Coolify.

## Prerequisites

1. Access to your Coolify instance
2. Git repository with your mcp-hub code
3. Docker registry access (if using private images)

## Step 1: Prepare Your Repository

### 1.1 Update Package.json
Make sure your `package.json` has the correct name and version:

```json
{
  "name": "mcp-nexus",
  "version": "1.0.0",
  "description": "AI-Enhanced MCP Hub with intelligent group creation and vector-powered tool discovery",
  "main": "dist/index.js",
  "type": "module"
}
```

### 1.2 Environment Variables
Create a `.env.production` file for production settings:

```env
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secure-jwt-secret
SKIP_AUTH=false
BASE_PATH=
OPENAI_API_KEY=your-openai-api-key
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=mcp_nexus
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-postgres-password
```

## Step 2: Coolify Configuration

### 2.1 Application Settings

**Basic Configuration:**
- **Name**: `mcp-nexus`
- **Description**: `AI-Enhanced MCP Hub with intelligent group creation and vector-powered tool discovery`
- **Repository**: Your Git repository URL
- **Branch**: `main` (or your preferred branch)
- **Build Pack**: `Dockerfile`
- **Port**: `3000`

### 2.2 Environment Variables

Add these environment variables in Coolify:

```bash
NODE_ENV=production
PORT=3000
JWT_SECRET=your-secure-jwt-secret-here
SKIP_AUTH=false
BASE_PATH=
OPENAI_API_KEY=your-openai-api-key
POSTGRES_HOST=your-postgres-host
POSTGRES_PORT=5432
POSTGRES_DB=mcp_nexus
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-postgres-password
REQUEST_TIMEOUT=60000
```

### 2.3 Build Configuration

**Build Command:**
```bash
pnpm install && pnpm frontend:build && pnpm build
```

**Start Command:**
```bash
pnpm start
```

## Step 3: Database Setup

### 3.1 PostgreSQL Database

If you need a PostgreSQL database, create one in Coolify:

1. Go to your Coolify dashboard
2. Navigate to "Databases"
3. Create a new PostgreSQL database:
   - **Name**: `mcp-nexus-db`
   - **Type**: PostgreSQL
   - **Version**: 16 (with pgvector support)

### 3.2 Database Environment Variables

Add these to your application environment variables:

```bash
POSTGRES_HOST=your-database-host
POSTGRES_PORT=5432
POSTGRES_DB=mcp_nexus
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-database-password
```

## Step 4: Deployment Steps

### 4.1 Create Application

1. Log into your Coolify dashboard
2. Navigate to "Applications"
3. Click "Create Application"
4. Fill in the details:
   - **Project**: Select your existing mcp-hub project
   - **Server**: Select your target server
   - **Environment**: `production`
   - **Repository**: Your Git repository URL
   - **Branch**: `main`
   - **Build Pack**: `Dockerfile`
   - **Ports**: `3000`

### 4.2 Configure Environment Variables

Add all the environment variables listed in section 2.2.

### 4.3 Configure Domains (Optional)

If you want to use a custom domain:
- **Domain**: `mcp-nexus.yourdomain.com`
- **SSL**: Enable automatic SSL

### 4.4 Deploy

1. Click "Deploy" to start the build process
2. Monitor the build logs for any issues
3. Once deployed, your application will be available at the configured URL

## Step 5: Post-Deployment

### 5.1 Verify Deployment

1. Check the application logs in Coolify
2. Test the application endpoints:
   - Main application: `https://your-domain.com`
   - MCP endpoint: `https://your-domain.com/mcp`
   - API endpoints: `https://your-domain.com/api/*`

### 5.2 Initial Setup

1. Access the application dashboard
2. Log in with default credentials:
   - **Username**: `admin`
   - **Password**: `admin123`
3. Change the default password immediately
4. Configure your MCP servers in the dashboard

## Step 6: Monitoring and Maintenance

### 6.1 Health Checks

Configure health check endpoint:
- **Path**: `/health`
- **Interval**: 30 seconds
- **Timeout**: 10 seconds

### 6.2 Logs

Monitor application logs through Coolify dashboard:
- Application logs
- Build logs
- Error logs

### 6.3 Updates

To update the application:
1. Push changes to your Git repository
2. Coolify will automatically detect changes
3. Trigger a new deployment from the dashboard

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check build logs for dependency issues
   - Ensure all required environment variables are set
   - Verify Dockerfile syntax

2. **Runtime Errors**:
   - Check application logs
   - Verify database connectivity
   - Ensure all environment variables are correctly set

3. **Port Issues**:
   - Verify port 3000 is exposed in Dockerfile
   - Check if port is already in use on the server

### Support

If you encounter issues:
1. Check the application logs in Coolify
2. Review the build logs for any errors
3. Verify all environment variables are correctly configured
4. Ensure database connectivity is working

## Additional Configuration

### Custom Nginx Configuration

If you need custom Nginx configuration, create a `nginx.conf` file in your repository and configure it in Coolify.

### SSL Configuration

Enable automatic SSL in Coolify for secure HTTPS connections.

### Backup Strategy

Configure regular backups for your database and application data through Coolify's backup features.
