#!/usr/bin/env node

/**
 * Smart Routing Setup Script
 * 
 * This script helps you configure Smart Routing for MCPHub.
 * Run this script to set up the necessary configuration.
 */

const fs = require('fs');
const path = require('path');

// Configuration template
const smartRoutingConfig = {
  systemConfig: {
    smartRouting: {
      enabled: true,
      dbUrl: process.env.DATABASE_URL || 'postgresql://mcphub:your_password@your_host:5432/mcphub',
      openaiApiBaseUrl: process.env.OPENAI_API_BASE_URL || 'https://api.openai.com/v1',
      openaiApiKey: process.env.OPENAI_API_KEY || 'sk-your-openai-api-key-here',
      openaiApiEmbeddingModel: process.env.OPENAI_API_EMBEDDING_MODEL || 'text-embedding-3-small'
    }
  }
};

// Function to update settings
function updateSettings() {
  const settingsPath = path.join(process.cwd(), 'mcp_settings.json');
  
  try {
    // Read existing settings
    let settings = {};
    if (fs.existsSync(settingsPath)) {
      const settingsData = fs.readFileSync(settingsPath, 'utf8');
      settings = JSON.parse(settingsData);
    }
    
    // Merge with smart routing config
    settings.systemConfig = {
      ...settings.systemConfig,
      ...smartRoutingConfig.systemConfig
    };
    
    // Write updated settings
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2), 'utf8');
    
    console.log('✅ Smart Routing configuration updated successfully!');
    console.log('📁 Settings saved to:', settingsPath);
    
    // Show the configuration
    console.log('\n🔧 Smart Routing Configuration:');
    console.log(JSON.stringify(settings.systemConfig.smartRouting, null, 2));
    
  } catch (error) {
    console.error('❌ Error updating settings:', error.message);
    process.exit(1);
  }
}

// Function to validate configuration
function validateConfig() {
  const config = smartRoutingConfig.systemConfig.smartRouting;
  
  console.log('🔍 Validating Smart Routing configuration...');
  
  if (!config.dbUrl || config.dbUrl.includes('your_password')) {
    console.log('⚠️  Warning: Database URL not configured');
    console.log('   Set DATABASE_URL environment variable or update the configuration');
  }
  
  if (!config.openaiApiKey || config.openaiApiKey.includes('your-openai-api-key')) {
    console.log('⚠️  Warning: OpenAI API key not configured');
    console.log('   Set OPENAI_API_KEY environment variable or update the configuration');
  }
  
  if (config.enabled) {
    console.log('✅ Smart Routing is enabled');
  } else {
    console.log('⚠️  Smart Routing is disabled');
  }
}

// Main execution
if (require.main === module) {
  console.log('🚀 MCPHub Smart Routing Setup');
  console.log('==============================\n');
  
  validateConfig();
  updateSettings();
  
  console.log('\n📋 Next Steps:');
  console.log('1. Set up a PostgreSQL database with pgvector extension');
  console.log('2. Get an OpenAI API key from https://platform.openai.com/api-keys');
  console.log('3. Update the configuration with your actual database URL and API key');
  console.log('4. Restart MCPHub to apply the changes');
  console.log('\n📖 For detailed instructions, see: smart-routing-setup.md');
}
