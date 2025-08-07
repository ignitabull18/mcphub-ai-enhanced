import { VirtualMcpServer } from './types.js';
import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { loadSettings, saveSettings } from '../../config/index.js';
import * as mcpService from '../mcpService.js';
import * as groupService from '../groupService.js';
import logService from '../logService.js';
import { getService } from '../registry.js';

export class HubManagementVirtualServer implements VirtualMcpServer {
  name = '@hub-management';
  description = 'MCPHub Management Server - Control the hub itself';

  private tools: Tool[] = [];

  constructor() {
    this.initializeTools();
  }

  private initializeTools() {
    // Server Management Tools
    this.tools.push(
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
      },
      {
        name: 'add_server',
        description: 'Register a new MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Unique name for the server' },
            command: { type: 'string', description: 'Command to execute for stdio servers' },
            args: { type: 'array', items: { type: 'string' }, description: 'Arguments for the command' },
            env: { type: 'object', description: 'Environment variables' },
            type: { type: 'string', enum: ['stdio', 'sse', 'streamable-http', 'openapi'], description: 'Server transport type' },
            url: { type: 'string', description: 'URL for SSE/HTTP/OpenAPI servers' },
            enabled: { type: 'boolean', description: 'Whether to enable the server immediately' },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_server',
        description: 'Update an existing MCP server configuration',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the server to update' },
            command: { type: 'string', description: 'New command for stdio servers' },
            args: { type: 'array', items: { type: 'string' }, description: 'New arguments' },
            env: { type: 'object', description: 'New environment variables' },
            type: { type: 'string', enum: ['stdio', 'sse', 'streamable-http', 'openapi'], description: 'New server type' },
            url: { type: 'string', description: 'New URL for SSE/HTTP servers' },
          },
          required: ['name'],
        },
      },
      {
        name: 'delete_server',
        description: 'Remove an MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the server to delete' },
          },
          required: ['name'],
        },
      },
      {
        name: 'toggle_server',
        description: 'Enable or disable an MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the server' },
            enabled: { type: 'boolean', description: 'Whether to enable or disable the server' },
          },
          required: ['name', 'enabled'],
        },
      },
      {
        name: 'test_server',
        description: 'Test connection to an MCP server',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the server to test' },
          },
          required: ['name'],
        },
      }
    );

    // Group Management Tools
    this.tools.push(
      {
        name: 'list_groups',
        description: 'List all server groups',
        inputSchema: {
          type: 'object',
          properties: {
            includeServerDetails: { type: 'boolean', description: 'Include detailed server information' },
          },
        },
      },
      {
        name: 'create_group',
        description: 'Create a new server group',
        inputSchema: {
          type: 'object',
          properties: {
            name: { type: 'string', description: 'Name of the group' },
            description: { type: 'string', description: 'Description of the group' },
            servers: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  selectedTools: { type: 'array', items: { type: 'string' } },
                },
              },
              description: 'Initial servers to add to the group',
            },
          },
          required: ['name'],
        },
      },
      {
        name: 'update_group',
        description: 'Update a server group',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID of the group to update' },
            name: { type: 'string', description: 'New name for the group' },
            description: { type: 'string', description: 'New description for the group' },
          },
          required: ['id'],
        },
      },
      {
        name: 'delete_group',
        description: 'Delete a server group',
        inputSchema: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'ID of the group to delete' },
          },
          required: ['id'],
        },
      }
    );

    // System Configuration Tools
    this.tools.push(
      {
        name: 'get_system_config',
        description: 'Get current system configuration',
        inputSchema: { type: 'object', properties: {} },
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
          },
        },
      },
      {
        name: 'get_system_health',
        description: 'Get overall system health status',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'restart_hub',
        description: 'Gracefully restart the MCPHub',
        inputSchema: {
          type: 'object',
          properties: {
            delay: { type: 'number', description: 'Delay in seconds before restart' },
          },
        },
      }
    );

    // Tool Management
    this.tools.push(
      {
        name: 'list_all_tools',
        description: 'Get all tools across all servers with their status',
        inputSchema: {
          type: 'object',
          properties: {
            server: { type: 'string', description: 'Filter by specific server name' },
            includeDisabled: { type: 'boolean', description: 'Include disabled tools' },
          },
        },
      },
      {
        name: 'toggle_tool',
        description: 'Enable or disable a specific tool',
        inputSchema: {
          type: 'object',
          properties: {
            server: { type: 'string', description: 'Server name' },
            toolName: { type: 'string', description: 'Name of the tool' },
            enabled: { type: 'boolean', description: 'Whether to enable or disable' },
          },
          required: ['server', 'toolName', 'enabled'],
        },
      }
    );

    // Monitoring Tools
    this.tools.push(
      {
        name: 'get_logs',
        description: 'Retrieve system logs with filtering',
        inputSchema: {
          type: 'object',
          properties: {
            level: { type: 'string', enum: ['error', 'warn', 'info', 'debug'], description: 'Filter by log level' },
            server: { type: 'string', description: 'Filter by server name' },
            limit: { type: 'number', description: 'Maximum number of log entries' },
            since: { type: 'string', description: 'ISO timestamp to get logs since' },
          },
        },
      },
      {
        name: 'get_connection_status',
        description: 'Get connection status for all servers',
        inputSchema: { type: 'object', properties: {} },
      }
    );

    // Configuration Management
    this.tools.push(
      {
        name: 'export_configuration',
        description: 'Export the complete hub configuration',
        inputSchema: {
          type: 'object',
          properties: {
            includeSecrets: { type: 'boolean', description: 'Include sensitive information like API keys' },
          },
        },
      },
      {
        name: 'import_configuration',
        description: 'Import a hub configuration',
        inputSchema: {
          type: 'object',
          properties: {
            config: { type: 'object', description: 'The configuration to import' },
            validate: { type: 'boolean', description: 'Validate configuration before importing' },
            merge: { type: 'boolean', description: 'Merge with existing configuration instead of replacing' },
          },
          required: ['config'],
        },
      }
    );
  }

  async listTools(): Promise<{ tools: Tool[] }> {
    return { tools: this.tools };
  }

  async callTool(name: string, args: any): Promise<any> {
    try {
      const result = await this.executeTool(name, args);
      return {
        content: [
          {
            type: 'text',
            text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Error: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
      };
    }
  }

  private async executeTool(name: string, args: any): Promise<any> {
    // Services are imported at the top of the file

    switch (name) {
      // Server Management
      case 'list_servers': {
        const settings = await loadSettings();
        const servers = Object.entries(settings.mcpServers || {}).map(([name, config]: [string, any]) => {
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
      }

      case 'add_server': {
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
        
        settings.mcpServers = settings.mcpServers || {};
        settings.mcpServers[args.name] = serverConfig;
        
        await saveSettings(settings);
        await mcpService.initializeClientsFromSettings(false);
        
        return {
          success: true,
          message: `Server "${args.name}" added successfully`,
        };
      }

      case 'update_server': {
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
        
        await saveSettings(settings);
        await mcpService.initializeClientsFromSettings(false);
        
        return {
          success: true,
          message: `Server "${args.name}" updated successfully`,
        };
      }

      case 'delete_server': {
        const settings = await loadSettings();
        
        if (!settings.mcpServers?.[args.name]) {
          throw new Error(`Server "${args.name}" not found`);
        }
        
        delete settings.mcpServers[args.name];
        
        await saveSettings(settings);
        await mcpService.initializeClientsFromSettings(false);
        
        return {
          success: true,
          message: `Server "${args.name}" deleted successfully`,
        };
      }

      case 'toggle_server': {
        const settings = await loadSettings();
        
        if (!settings.mcpServers?.[args.name]) {
          throw new Error(`Server "${args.name}" not found`);
        }
        
        settings.mcpServers[args.name].enabled = args.enabled;
        
        await saveSettings(settings);
        await mcpService.initializeClientsFromSettings(false);
        
        return {
          success: true,
          message: `Server "${args.name}" ${args.enabled ? 'enabled' : 'disabled'} successfully`,
        };
      }

      case 'test_server': {
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
      }

      // Group Management
      case 'list_groups': {
        const groups = groupService.getAllGroups();
        
        if (!args.includeServerDetails) {
          return groups.map((g: any) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            serverCount: g.servers?.length || 0,
          }));
        }
        
        return groups;
      }

      case 'create_group': {
        const newGroup = {
          name: args.name,
          description: args.description,
          servers: args.servers || [],
        };
        
        const createdGroup = groupService.createGroup(
          args.name,
          args.description,
          args.servers || []
        );
        
        return {
          success: true,
          message: `Group "${args.name}" created successfully`,
          group: createdGroup,
        };
      }

      case 'update_group': {
        const updates: any = {};
        if (args.name !== undefined) updates.name = args.name;
        if (args.description !== undefined) updates.description = args.description;
        
        const updatedGroup = groupService.updateGroup(args.id, updates);
        
        return {
          success: true,
          message: `Group updated successfully`,
          group: updatedGroup,
        };
      }

      case 'delete_group': {
        groupService.deleteGroup(args.id);
        
        return {
          success: true,
          message: `Group deleted successfully`,
        };
      }

      // System Configuration
      case 'get_system_config': {
        const settings = await loadSettings();
        
        return {
          routing: settings.systemConfig?.routing || {},
          smartRouting: (settings as any).smartRouting || {},
          install: settings.systemConfig?.install || {},
        };
      }

      case 'update_system_config': {
        const settings = await loadSettings();
        
        if (args.routing) {
          if (!settings.systemConfig) settings.systemConfig = {};
          if (!settings.systemConfig.routing) settings.systemConfig.routing = {};
          Object.assign(settings.systemConfig.routing, args.routing);
        }
        
        if (args.smartRouting) {
          if (!(settings as any).smartRouting) (settings as any).smartRouting = {};
          Object.assign((settings as any).smartRouting, args.smartRouting);
        }
        
        await saveSettings(settings);
        
        // Reinitialize services if needed
        if (args.smartRouting?.enabled) {
          const vectorService = getService('vectorSearchService') as any;
          if (vectorService) {
            await vectorService.initialize?.();
          }
        }
        
        return {
          success: true,
          message: 'System configuration updated successfully',
        };
      }

      case 'get_system_health': {
        const settings = await loadSettings();
        
        const serverStatuses: any[] = [];
        let connectedCount = 0;
        let disconnectedCount = 0;
        
        for (const [name, config] of Object.entries(settings.mcpServers || {})) {
          if (!(config as any).enabled) continue;
          
          const client = mcpService.getClient(name);
          const connected = client?.getServerCapabilities() !== undefined;
          
          serverStatuses.push({
            name,
            connected,
            type: (config as any).type || 'stdio',
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
            formatted: this.formatUptime(process.uptime()),
          },
        };
      }

      case 'restart_hub': {
        const delay = args.delay || 0;
        
        setTimeout(() => {
          mcpService.initializeClientsFromSettings(false);
        }, delay * 1000);
        
        return {
          success: true,
          message: delay > 0 
            ? `Hub will restart in ${delay} seconds` 
            : 'Hub restart initiated',
        };
      }

      // Tool Management
      case 'list_all_tools': {
        const settings = await loadSettings();
        const allTools: any[] = [];
        
        for (const [serverName, serverConfig] of Object.entries(settings.mcpServers || {})) {
          // Skip if filtering by server and this isn't the one
          if (args.server && serverName !== args.server) continue;
          
          // Skip disabled servers unless requested
          if (!(serverConfig as any).enabled && !args.includeDisabled) continue;
          
          const client = mcpService.getClient(serverName);
          if (client) {
            try {
              const tools = await client.listTools();
              
              for (const tool of tools?.tools || []) {
                const toolConfig = (serverConfig as any).tools?.[tool.name];
                const enabled = toolConfig?.enabled !== false;
                
                if (!enabled && !args.includeDisabled) continue;
                
                allTools.push({
                  server: serverName,
                  name: tool.name,
                  description: toolConfig?.description || tool.description,
                  enabled,
                  customDescription: !!toolConfig?.description,
                });
              }
            } catch (error) {
              // Server might not be connected
              console.error(`Failed to get tools from ${serverName}:`, error);
            }
          }
        }
        
        return allTools;
      }

      case 'toggle_tool': {
        const settings = await loadSettings();
        
        if (!settings.mcpServers?.[args.server]) {
          throw new Error(`Server "${args.server}" not found`);
        }
        
        if (!settings.mcpServers[args.server].tools) {
          settings.mcpServers[args.server].tools = {};
        }
        
        if (!settings.mcpServers[args.server].tools![args.toolName]) {
          settings.mcpServers[args.server].tools![args.toolName] = { enabled: true };
        }
        
        settings.mcpServers[args.server].tools![args.toolName].enabled = args.enabled;
        
        await saveSettings(settings);
        
        return {
          success: true,
          message: `Tool "${args.toolName}" ${args.enabled ? 'enabled' : 'disabled'} successfully`,
        };
      }

      // Monitoring
      case 'get_logs': {
        let logs = logService.getLogs();
        
        // Apply filters
        if (args.level) {
          logs = logs.filter((log: any) => log.level === args.level);
        }
        
        if (args.server) {
          logs = logs.filter((log: any) => 
            log.message.includes(args.server) || 
            log.metadata?.server === args.server
          );
        }
        
        if (args.since) {
          const sinceTime = new Date(args.since).getTime();
          logs = logs.filter((log: any) => new Date(log.timestamp).getTime() >= sinceTime);
        }
        
        // Apply limit
        if (args.limit) {
          logs = logs.slice(-args.limit);
        }
        
        return logs;
      }

      case 'get_connection_status': {
        const settings = await loadSettings();
        const statuses: any[] = [];
        
        for (const [name, config] of Object.entries(settings.mcpServers || {})) {
          const client = mcpService.getClient(name);
          const connected = client?.getServerCapabilities() !== undefined;
          
          let toolCount = 0;
          let lastError = null;
          
          if (connected) {
            try {
              const tools = await client.listTools();
              toolCount = tools?.tools?.length || 0;
            } catch (error) {
              lastError = error instanceof Error ? error.message : String(error);
            }
          }
          
          statuses.push({
            name,
            enabled: (config as any).enabled !== false,
            connected,
            type: (config as any).type || 'stdio',
            toolCount,
            lastError,
          });
        }
        
        return statuses;
      }

      // Configuration Management
      case 'export_configuration': {
        const settings = await loadSettings();
        
        if (!args.includeSecrets) {
          // Redact sensitive information
          const redacted = JSON.parse(JSON.stringify(settings));
          
          // Redact API keys and passwords
          if ((redacted as any).smartRouting?.openaiApiKey) {
            (redacted as any).smartRouting.openaiApiKey = '***REDACTED***';
          }
          
          // Redact environment variables that might contain secrets
          for (const server of Object.values(redacted.mcpServers || {})) {
            if ((server as any).env) {
              for (const key of Object.keys((server as any).env)) {
                if (key.toLowerCase().includes('key') || 
                    key.toLowerCase().includes('secret') || 
                    key.toLowerCase().includes('password')) {
                  (server as any).env[key] = '***REDACTED***';
                }
              }
            }
          }
          
          return redacted;
        }
        
        return settings;
      }

      case 'import_configuration': {
        if (args.validate) {
          // Basic validation
          if (!args.config.mcpServers && !args.config.groups) {
            throw new Error('Configuration must contain mcpServers or groups');
          }
          
          // Validate server configurations
          for (const [name, server] of Object.entries(args.config.mcpServers || {})) {
            const serverConfig = server as any;
            if (serverConfig.type === 'stdio' && !serverConfig.command) {
              throw new Error(`Server "${name}" requires a command for stdio type`);
            }
            if ((serverConfig.type === 'sse' || serverConfig.type === 'streamable-http') && !serverConfig.url) {
              throw new Error(`Server "${name}" requires a URL for ${serverConfig.type} type`);
            }
          }
        }
        
        if (args.merge) {
          const currentSettings = await loadSettings();
          
          // Merge configurations
          const merged = {
            ...currentSettings,
            ...args.config,
            mcpServers: {
              ...currentSettings.mcpServers,
              ...args.config.mcpServers,
            },
          };
          
          await saveSettings(merged);
          
          return {
            success: true,
            message: 'Configuration merged successfully',
          };
        }
        
        await saveSettings(args.config);
        
        return {
          success: true,
          message: 'Configuration imported successfully',
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  private formatUptime(seconds: number): string {
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

  getServerInfo() {
    return {
      name: this.name,
      version: '1.0.0',
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
      },
    };
  }
}