import { Tool } from '../types.js';
import { loadSettings, saveSettings } from '../../../config/index.js';
import { getService } from '../../../services/registry.js';
// import type McpService from '../../../services/mcpService.js';

export const serverManagementTools: Tool[] = [
  {
    name: 'list_servers',
    description: 'List all registered MCP servers with their status and configuration',
    inputSchema: {
      type: 'object',
      properties: {
        includeDisabled: {
          type: 'boolean',
          description: 'Include disabled servers in the list',
        },
      },
    },
    handler: async (args) => {
      const settings = await loadSettings();
      const mcpService = getService('mcpService') as any;
      
      const servers = Object.entries(settings.mcpServers || {}).map(([name, config]) => {
        const client = mcpService.getClient(name);
        const connected = client?.getServerCapabilities() !== undefined;
        
        return {
          name,
          enabled: config.enabled !== false,
          connected,
          type: config.type || 'stdio',
          command: config.command,
          url: config.url,
          toolCount: Object.keys(config.tools || {}).length,
        };
      });
      
      if (!args.includeDisabled) {
        return servers.filter(s => s.enabled);
      }
      
      return servers;
    },
  },
  
  {
    name: 'add_server',
    description: 'Register a new MCP server',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Unique name for the server',
        },
        command: {
          type: 'string',
          description: 'Command to execute for stdio servers',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'Arguments for the command',
        },
        env: {
          type: 'object',
          description: 'Environment variables',
        },
        type: {
          type: 'string',
          enum: ['stdio', 'sse', 'streamable-http', 'openapi'],
          description: 'Server transport type',
        },
        url: {
          type: 'string',
          description: 'URL for SSE/HTTP/OpenAPI servers',
        },
        openapi: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            schema: { type: 'string' },
          },
          description: 'OpenAPI configuration',
        },
        enabled: {
          type: 'boolean',
          description: 'Whether to enable the server immediately',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const settings = await loadSettings();
      
      if (settings.mcpServers?.[args.name]) {
        throw new Error(`Server "${args.name}" already exists`);
      }
      
      const serverConfig: any = {
        command: args.command || '',
        args: args.args,
        env: args.env,
        type: args.type || 'stdio',
        url: args.url,
        openapi: args.openapi,
        enabled: args.enabled !== false,
        tools: {},
      };
      
      // Validate configuration based on type
      if (serverConfig.type === 'stdio' && !serverConfig.command) {
        throw new Error('Command is required for stdio servers');
      }
      if ((serverConfig.type === 'sse' || serverConfig.type === 'streamable-http') && !serverConfig.url) {
        throw new Error('URL is required for SSE/HTTP servers');
      }
      if (serverConfig.type === 'openapi' && !serverConfig.openapi?.url) {
        throw new Error('OpenAPI URL is required for OpenAPI servers');
      }
      
      settings.mcpServers = settings.mcpServers || {};
      settings.mcpServers[args.name] = serverConfig;
      
      await saveSettings(settings);
      
      // Initialize the new server
      const mcpService = getService('mcpService') as any;
      await mcpService.initialize();
      
      return {
        success: true,
        message: `Server "${args.name}" added successfully`,
      };
    },
  },
  
  {
    name: 'update_server',
    description: 'Update an existing MCP server configuration',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the server to update',
        },
        command: {
          type: 'string',
          description: 'New command for stdio servers',
        },
        args: {
          type: 'array',
          items: { type: 'string' },
          description: 'New arguments',
        },
        env: {
          type: 'object',
          description: 'New environment variables',
        },
        type: {
          type: 'string',
          enum: ['stdio', 'sse', 'streamable-http', 'openapi'],
          description: 'New server type',
        },
        url: {
          type: 'string',
          description: 'New URL for SSE/HTTP servers',
        },
        openapi: {
          type: 'object',
          properties: {
            url: { type: 'string' },
            schema: { type: 'string' },
          },
          description: 'New OpenAPI configuration',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const settings = await loadSettings();
      
      if (!settings.mcpServers?.[args.name]) {
        throw new Error(`Server "${args.name}" not found`);
      }
      
      const currentConfig = settings.mcpServers[args.name];
      
      // Update only provided fields
      if (args.command !== undefined) currentConfig.command = args.command;
      if (args.args !== undefined) currentConfig.args = args.args;
      if (args.env !== undefined) currentConfig.env = args.env;
      if (args.type !== undefined) currentConfig.type = args.type;
      if (args.url !== undefined) currentConfig.url = args.url;
      if (args.openapi !== undefined) currentConfig.openapi = args.openapi;
      
      await saveSettings(settings);
      
      // Reinitialize to apply changes
      const mcpService = getService('mcpService') as any;
      await mcpService.initialize();
      
      return {
        success: true,
        message: `Server "${args.name}" updated successfully`,
      };
    },
  },
  
  {
    name: 'delete_server',
    description: 'Remove an MCP server',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the server to delete',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const settings = await loadSettings();
      
      if (!settings.mcpServers?.[args.name]) {
        throw new Error(`Server "${args.name}" not found`);
      }
      
      delete settings.mcpServers[args.name];
      
      await saveSettings(settings);
      
      // Reinitialize to remove the server
      const mcpService = getService('mcpService') as any;
      await mcpService.initialize();
      
      return {
        success: true,
        message: `Server "${args.name}" deleted successfully`,
      };
    },
  },
  
  {
    name: 'toggle_server',
    description: 'Enable or disable an MCP server',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the server',
        },
        enabled: {
          type: 'boolean',
          description: 'Whether to enable or disable the server',
        },
      },
      required: ['name', 'enabled'],
    },
    handler: async (args) => {
      const settings = await loadSettings();
      
      if (!settings.mcpServers?.[args.name]) {
        throw new Error(`Server "${args.name}" not found`);
      }
      
      settings.mcpServers[args.name].enabled = args.enabled;
      
      await saveSettings(settings);
      
      // Reinitialize to apply the change
      const mcpService = getService('mcpService') as any;
      await mcpService.initialize();
      
      return {
        success: true,
        message: `Server "${args.name}" ${args.enabled ? 'enabled' : 'disabled'} successfully`,
      };
    },
  },
  
  {
    name: 'test_server',
    description: 'Test connection to an MCP server',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the server to test',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const mcpService = getService('mcpService') as any;
      const client = mcpService.getClient(args.name);
      
      if (!client) {
        return {
          success: false,
          message: `Server "${args.name}" not found or not initialized`,
        };
      }
      
      try {
        const capabilities = client.getServerCapabilities();
        const tools = await client.listTools();
        
        return {
          success: true,
          message: `Server "${args.name}" is connected`,
          details: {
            capabilities,
            toolCount: tools?.tools?.length || 0,
          },
        };
      } catch (error) {
        return {
          success: false,
          message: `Failed to connect to server "${args.name}"`,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
  
  {
    name: 'get_server_config',
    description: 'Get detailed configuration for a specific server',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the server',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const settings = await loadSettings();
      
      if (!settings.mcpServers?.[args.name]) {
        throw new Error(`Server "${args.name}" not found`);
      }
      
      return settings.mcpServers[args.name];
    },
  },
  
  {
    name: 'restart_server',
    description: 'Force restart an MCP server process',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the server to restart',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const mcpService = getService('mcpService') as any;
      
      // The reinitialize will restart all servers
      // In a production implementation, we'd want to restart just the specific server
      await mcpService.initialize();
      
      return {
        success: true,
        message: `Server "${args.name}" restarted successfully`,
      };
    },
  },
];