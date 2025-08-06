# MCP-Nexus Coolify Deployment Summary

## Overview

This document provides a complete guide for deploying your MCP-Hub variation as "mcp-nexus" on Coolify.

## 🎯 Quick Start

1. **Run the deployment script:**
   ```bash
   ./deploy-to-coolify.sh
   ```

2. **Follow the on-screen instructions** to deploy to Coolify

3. **Access your application** at the provided URL

## 📁 Files Created/Modified

### New Files Created:
- `coolify-deployment.md` - Comprehensive deployment guide
- `docker-compose.coolify.yml` - Docker Compose configuration for Coolify
- `deploy-to-coolify.sh` - Automated deployment script
- `COOLIFY_DEPLOYMENT_SUMMARY.md` - This summary document

### Modified Files:
- `src/routes/index.ts` - Added health check endpoint (`/health`)

## 🔧 Application Configuration

### Basic Settings:
- **Name**: `mcp-nexus`
- **Description**: `AI-Enhanced MCP Hub with intelligent group creation and vector-powered tool discovery`
- **Port**: `3000`
- **Build Pack**: `Dockerfile`

### Environment Variables:
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

## 🐳 Docker Configuration

### Dockerfile Features:
- Based on Python 3.13-slim-bookworm
- Node.js 22.x support
- pnpm package manager
- MCP server installations
- Frontend and backend build process
- Health check support

### Docker Compose:
- Multi-service setup with PostgreSQL
- Health checks for both application and database
- Volume mounts for data persistence
- Network isolation

## 🏥 Health Monitoring

### Health Check Endpoint:
- **URL**: `/health`
- **Method**: `GET`
- **Response**: JSON with status, uptime, memory usage, and version
- **Interval**: 30 seconds
- **Timeout**: 10 seconds
- **Retries**: 3

### Health Check Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.456,
  "memory": {
    "used": 45,
    "total": 128,
    "unit": "MB"
  },
  "version": "1.0.0",
  "environment": "production"
}
```

## 🗄️ Database Setup

### PostgreSQL Requirements:
- **Version**: 16 (with pgvector support)
- **Database**: `mcp_nexus`
- **User**: `postgres`
- **Extensions**: `pgvector` (for vector search)

### Database Environment Variables:
```bash
POSTGRES_HOST=your-database-host
POSTGRES_PORT=5432
POSTGRES_DB=mcp_nexus
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-database-password
```

## 🚀 Deployment Steps

### 1. Prepare Repository
```bash
# Run the deployment script
./deploy-to-coolify.sh
```

### 2. Coolify Configuration
1. Log into Coolify dashboard
2. Navigate to "Applications"
3. Click "Create Application"
4. Fill in application details:
   - **Project**: Select existing `mcp-hub` project
   - **Server**: Select target server
   - **Environment**: `production`
   - **Repository**: Your Git repository URL
   - **Branch**: `main`
   - **Build Pack**: `Dockerfile`
   - **Ports**: `3000`

### 3. Environment Variables
Add all environment variables from `.env.production` to Coolify.

### 4. Domain Configuration (Optional)
- **Domain**: `mcp-nexus.yourdomain.com`
- **SSL**: Enable automatic SSL

### 5. Deploy
1. Click "Deploy" to start build process
2. Monitor build logs
3. Verify deployment success

## 🔐 Security Considerations

### Default Credentials:
- **Username**: `admin`
- **Password**: `admin123`

### Security Recommendations:
1. Change default password immediately after deployment
2. Use strong JWT secrets (32+ characters)
3. Enable SSL/TLS in production
4. Configure proper firewall rules
5. Regular security updates

## 📊 Monitoring & Maintenance

### Logs:
- Application logs available in Coolify dashboard
- Build logs for troubleshooting
- Error logs for debugging

### Updates:
1. Push changes to Git repository
2. Coolify automatically detects changes
3. Trigger new deployment from dashboard

### Backup Strategy:
- Configure regular database backups
- Backup application data and configuration
- Test recovery procedures

## 🐛 Troubleshooting

### Common Issues:

1. **Build Failures**:
   - Check build logs for dependency issues
   - Verify all environment variables are set
   - Ensure Dockerfile syntax is correct

2. **Runtime Errors**:
   - Check application logs
   - Verify database connectivity
   - Ensure environment variables are correct

3. **Port Issues**:
   - Verify port 3000 is exposed in Dockerfile
   - Check if port is already in use

4. **Health Check Failures**:
   - Verify health endpoint is accessible
   - Check application startup time
   - Review health check configuration

### Support:
1. Check application logs in Coolify
2. Review build logs for errors
3. Verify environment variables
4. Test database connectivity

## 📞 Support

If you encounter issues:
1. Check the application logs in Coolify
2. Review the build logs for any errors
3. Verify all environment variables are correctly configured
4. Ensure database connectivity is working
5. Consult the `coolify-deployment.md` for detailed troubleshooting

## 🎉 Success Criteria

Your deployment is successful when:
- ✅ Application builds without errors
- ✅ Health check endpoint returns `200 OK`
- ✅ Dashboard is accessible at the configured URL
- ✅ Default login credentials work
- ✅ MCP servers can be configured
- ✅ All environment variables are properly set

## 📝 Next Steps

After successful deployment:
1. Change default admin password
2. Configure your MCP servers
3. Set up monitoring and alerts
4. Configure backup strategies
5. Test all functionality
6. Document any custom configurations

---

**Happy Deploying! 🚀**
