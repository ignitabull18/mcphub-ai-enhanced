# 🚀 Quick Smart Routing Setup

## ✅ What's Already Done

I've already configured Smart Routing in your MCPHub deployment with placeholder values. Here's what you need to do to complete the setup:

## 🔧 Complete the Configuration

### Step 1: Get a PostgreSQL Database

**Option A: Free Cloud Database (Recommended)**

1. **Neon** (Free tier): https://neon.tech
   - Sign up for free
   - Create a new project
   - Copy the connection string (it will look like: `postgresql://user:password@host:5432/database`)

2. **Supabase** (Free tier): https://supabase.com
   - Sign up for free
   - Create a new project
   - Go to Settings > Database
   - Copy the connection string

### Step 2: Get OpenAI API Key

1. Go to https://platform.openai.com/api-keys
2. Sign in or create account
3. Click "Create new secret key"
4. Copy the key (starts with `sk-`)

### Step 3: Update Configuration

**Method A: Via MCPHub Settings Page (Easiest)**

1. Go to: `https://mcp-nexus.ignitabull.org/app/settings`
2. Find the **Smart Routing** section
3. Update these fields:
   - **Database URL**: Replace `postgresql://mcphub:your_secure_password@your-database-host:5432/mcphub` with your actual database URL
   - **OpenAI API Key**: Replace `sk-your-openai-api-key-here` with your actual API key
   - **OpenAI Base URL**: Keep as `https://api.openai.com/v1`
   - **Embedding Model**: Keep as `text-embedding-3-small`
4. **Enable Smart Routing** by toggling the switch
5. Click **Save**

**Method B: Via Environment Variables**

Add these environment variables to your Coolify deployment:

```bash
DATABASE_URL=your_actual_database_url_here
OPENAI_API_KEY=sk-your_actual_openai_api_key_here
OPENAI_API_BASE_URL=https://api.openai.com/v1
OPENAI_API_EMBEDDING_MODEL=text-embedding-3-small
SMART_ROUTING_ENABLED=true
```

## 🎯 Test Smart Routing

Once configured, test it with:

```bash
# Test smart tool discovery
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

## 🎉 What You'll Get

- **Smart Tool Discovery**: Natural language tool search
- **Vector Memory**: AI-powered conversation memory  
- **Semantic Search**: Find tools by describing what you want to do
- **Intelligent Routing**: Automatic tool selection based on context

## 🔍 Troubleshooting

If you encounter issues:

1. **Check Smart Routing Status**:
   ```bash
   curl -s "https://mcp-nexus.ignitabull.org/api/settings" | jq '.data.systemConfig.smartRouting'
   ```

2. **Verify Database Connection**: Make sure your database URL is correct and accessible

3. **Check OpenAI API**: Ensure your API key is valid and has sufficient credits

4. **Check Logs**: Look at the application logs for any error messages

## 📞 Need Help?

- Check the detailed guide: `smart-routing-setup.md`
- Run the setup script: `node setup-smart-routing.js`
- Check the application logs for specific error messages

The Smart Routing system is fully implemented and ready to use - you just need to add your database URL and OpenAI API key!
