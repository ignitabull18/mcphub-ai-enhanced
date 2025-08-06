import { Tool, SystemConfig } from '../types.js';
import { loadSettings, saveSettings } from '../../../config/index.js';
import { getService } from '../../../services/registry.js';

export const systemConfigTools: Tool[] = [
  {
    name: 'get_system_config',
    description: 'Get current system configuration',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const settings = await loadSettings();
      
      const config: SystemConfig = {
        routing: settings.systemConfig?.routing || {},
        smartRouting: (settings as any).smartRouting || {},
        install: settings.systemConfig?.install || {},
      } as any;
      
      return config;
    },
  },
  
  {
    name: 'update_system_config',
    description: 'Update system-wide configuration',
    inputSchema: {
      type: 'object',
      properties: {
        routing: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            defaultGroup: { type: 'string' },
          },
          description: 'Routing configuration',
        },
        smartRouting: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            openaiApiKey: { type: 'string' },
            embeddingModel: { type: 'string' },
          },
          description: 'Smart routing configuration',
        },
        install: {
          type: 'object',
          properties: {
            enabled: { type: 'boolean' },
            allowedNpmPackages: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          description: 'Package installation configuration',
        },
      },
    },
    handler: async (args) => {
      const settings = await loadSettings();
      
      // Update routing settings
      if (args.routing) {
        if (!settings.systemConfig) settings.systemConfig = {};
        if (!settings.systemConfig.routing) settings.systemConfig.routing = {};
        Object.assign(settings.systemConfig.routing, args.routing);
      }
      
      // Update smart routing settings
      if (args.smartRouting) {
        if (!(settings as any).smartRouting) (settings as any).smartRouting = {};
        Object.assign((settings as any).smartRouting, args.smartRouting);
      }
      
      // Update install settings
      if (args.install) {
        if (!settings.systemConfig) settings.systemConfig = {};
        if (!settings.systemConfig.install) settings.systemConfig.install = {};
        Object.assign(settings.systemConfig.install, args.install);
      }
      
      await saveSettings(settings);
      
      // Reinitialize services if needed
      if (args.smartRouting?.enabled) {
        const vectorService = getService('vectorSearchService');
        if (vectorService) {
          await (vectorService as any).initialize?.();
        }
      }
      
      return {
        success: true,
        message: 'System configuration updated successfully',
      };
    },
  },
  
  {
    name: 'get_runtime_config',
    description: 'Get current runtime configuration including environment variables',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      return {
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 3000,
        skipAuth: process.env.SKIP_AUTH === 'true',
        jwtSecret: process.env.JWT_SECRET ? 'SET' : 'NOT_SET',
        openaiApiKey: process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET',
        databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT_SET',
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        uptime: process.uptime(),
        memory: {
          used: process.memoryUsage().heapUsed,
          total: process.memoryUsage().heapTotal,
        },
      };
    },
  },
  
  {
    name: 'get_system_health',
    description: 'Get overall system health status',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const mcpService = getService('mcpService') as any;
      const settings = await loadSettings();
      
      const serverStatuses: any[] = [];
      let connectedCount = 0;
      let disconnectedCount = 0;
      
      for (const [name, config] of Object.entries(settings.mcpServers || {})) {
        if (!config.enabled) continue;
        
        const client = mcpService.getClient(name);
        const connected = client?.getServerCapabilities() !== undefined;
        
        serverStatuses.push({
          name,
          connected,
          type: config.type || 'stdio',
        });
        
        if (connected) connectedCount++;
        else disconnectedCount++;
      }
      
      const healthScore = connectedCount / (connectedCount + disconnectedCount) * 100;
      
      return {
        status: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'degraded' : 'unhealthy',
        healthScore: Math.round(healthScore),
        servers: {
          total: serverStatuses.length,
          connected: connectedCount,
          disconnected: disconnectedCount,
        },
        memory: {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          unit: 'MB',
        },
        uptime: {
          seconds: Math.round(process.uptime()),
          formatted: formatUptime(process.uptime()),
        },
      };
    },
  },
  
  {
    name: 'restart_hub',
    description: 'Gracefully restart the MCPHub (requires process manager support)',
    inputSchema: {
      type: 'object',
      properties: {
        delay: {
          type: 'number',
          description: 'Delay in seconds before restart',
        },
      },
    },
    handler: async (args) => {
      const delay = args.delay || 0;
      
      setTimeout(() => {
        // This would typically signal a process manager to restart
        // For safety, we'll just reinitialize services instead
        const mcpService = getService('mcpService') as any;
        mcpService.initialize();
      }, delay * 1000);
      
      return {
        success: true,
        message: delay > 0 
          ? `Hub will restart in ${delay} seconds` 
          : 'Hub restart initiated',
      };
    },
  },
  
  {
    name: 'get_version_info',
    description: 'Get version information for hub and servers',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const packageJson = require('../../../../package.json');
      
      return {
        hub: {
          name: packageJson.name,
          version: packageJson.version,
          description: packageJson.description,
        },
        node: process.version,
        platform: `${process.platform} ${process.arch}`,
        dependencies: {
          '@modelcontextprotocol/sdk': packageJson.dependencies['@modelcontextprotocol/sdk'],
          express: packageJson.dependencies.express,
          typescript: packageJson.devDependencies?.typescript,
        },
      };
    },
  },
];

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  const parts = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}