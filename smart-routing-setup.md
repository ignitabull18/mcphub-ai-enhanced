# Smart Routing Setup Guide

## 🎯 Overview

This guide will help you set up Smart Routing for MCPHub, which provides AI-powered tool discovery using vector semantic search.

## 📋 Prerequisites

### 1. PostgreSQL Database with pgvector

You have several options:

#### Option A: Cloud Database (Recommended)
- **Neon** (Free tier): https://neon.tech
- **Supabase** (Free tier): https://supabase.com
- **AWS RDS** with pgvector
- **Google Cloud SQL** with pgvector

#### Option B: Local Docker (When Docker is available)
```bash
docker run -d \
  --name mcphub-postgres \
  -e POSTGRES_DB=mcphub \
  -e POSTGRES_USER=mcphub \
  -e POSTGRES_PASSWORD=your_secure_password \
  -p 5432:5432 \
  pgvector/pgvector:pg16
```

#### Option C: Local PostgreSQL
```bash
# Install PostgreSQL with pgvector extension
# Then create database and enable extension:
CREATE DATABASE mcphub;
\c mcphub;
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. OpenAI API Key

Get an API key from:
- **OpenAI**: https://platform.openai.com/api-keys
- **Alternative**: SiliconFlow (free for Chinese users): https://cloud.siliconflow.cn/

## 🔧 Configuration

### Environment Variables

Set these environment variables in your deployment:

```bash
# Database Configuration
DATABASE_URL=postgresql://mcphub:your_password@your_host:5432/mcphub

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_EMBEDDING_MODEL=text-embedding-3-small

# Smart Routing
SMART_ROUTING_ENABLED=true
```

### MCPHub Settings Configuration

The Smart Routing configuration will be stored in MCPHub's settings. Here's the structure:

```json
{
  "systemConfig": {
    "smartRouting": {
      "enabled": true,
      "dbUrl": "postgresql://mcphub:your_password@your_host:5432/mcphub",
      "openaiApiBaseUrl": "https://api.openai.com/v1",
      "openaiApiKey": "sk-your-openai-api-key-here",
      "openaiApiEmbeddingModel": "text-embedding-3-small"
    }
  }
}
```

## 🚀 Setup Steps

### Step 1: Database Setup

1. **Create PostgreSQL database** with pgvector extension
2. **Note down connection details**:
   - Host: `your-database-host.com`
   - Port: `5432` (usually)
   - Database: `mcphub`
   - Username: `mcphub`
   - Password: `your_secure_password`

### Step 2: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

### Step 3: Configure MCPHub

#### Method A: Via Environment Variables (Recommended)

Set these environment variables in your Coolify deployment:

```bash
DATABASE_URL=postgresql://mcphub:your_password@your_host:5432/mcphub
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_EMBEDDING_MODEL=text-embedding-3-small
SMART_ROUTING_ENABLED=true
```

#### Method B: Via MCPHub Settings Page

1. Go to `https://mcp-nexus.ignitabull.org/app/settings`
2. Find the **Smart Routing** section
3. Fill in the configuration:
   - **Database URL**: `postgresql://mcphub:your_password@your_host:5432/mcphub`
   - **OpenAI API Key**: `sk-your-openai-api-key-here`
   - **OpenAI Base URL**: `https://api.openai.com/v1`
   - **Embedding Model**: `text-embedding-3-small`
4. **Enable Smart Routing** by toggling the switch
5. Click **Save**

### Step 4: Verify Setup

1. **Check Smart Routing Status**:
   ```bash
   curl -s "https://mcp-nexus.ignitabull.org/api/settings" | jq '.data.systemConfig.smartRouting'
   ```

2. **Test Smart Routing**:
   ```bash
   # Test the smart routing endpoint
   curl -X POST "https://mcp-nexus.ignitabull.org/mcp/\$smart" \
     -H "Content-Type: application/json" \
     -d '{
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/search",
       "params": {
         "query": "help me search the web"
       }
     }'
   ```

## 🎯 Usage Examples

### Smart Tool Discovery

Instead of manually specifying tools, you can now use natural language:

```bash
# Find tools for web scraping
curl -X POST "https://mcp-nexus.ignitabull.org/mcp/\$smart" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/search",
    "params": {
      "query": "scrape website content and extract data"
    }
  }'
```

### Tool Execution

Once you find relevant tools, execute them directly:

```bash
# Execute a found tool
curl -X POST "https://mcp-nexus.ignitabull.org/mcp/\$smart" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "fetch_html",
      "arguments": {
        "url": "https://example.com"
      }
    }
  }'
```

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   - Check DATABASE_URL format
   - Verify database is accessible
   - Ensure pgvector extension is installed

2. **OpenAI API Errors**:
   - Verify API key is correct
   - Check API key has sufficient credits
   - Ensure API key has embedding permissions

3. **Smart Routing Not Working**:
   - Check if Smart Routing is enabled in settings
   - Verify all required fields are configured
   - Check application logs for errors

### Debug Commands

```bash
# Check Smart Routing status
curl -s "https://mcp-nexus.ignitabull.org/api/settings" | jq '.data.systemConfig.smartRouting'

# Check database connection
curl -s "https://mcp-nexus.ignitabull.org/api/health" | jq '.'

# Check vector embeddings
curl -s "https://mcp-nexus.ignitabull.org/api/settings" | jq '.data.systemConfig'
```

## 🎉 What You Get

Once configured, you'll have:

1. **Smart Tool Discovery**: Natural language tool search
2. **Vector Memory**: AI-powered conversation memory
3. **Semantic Search**: Find tools by describing what you want to do
4. **Intelligent Routing**: Automatic tool selection based on context
5. **Performance Optimization**: Cached embeddings for faster searches

## 📞 Support

If you encounter issues:

1. Check the application logs
2. Verify all configuration is correct
3. Test database connectivity
4. Ensure OpenAI API key is valid

The Smart Routing system is fully implemented and ready to use - it just needs the database and API configuration!
