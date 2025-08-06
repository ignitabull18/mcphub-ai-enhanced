import { Tool } from '../types.js';
import { loadSettings, saveSettings } from '../../../config/index.js';
import { getService } from '../../../services/registry.js';
// import type McpService from '../../../services/mcpService.js';
// import type VectorSearchService from '../../../services/vectorSearchService.js';

export const toolManagementTools: Tool[] = [
  {
    name: 'list_all_tools',
    description: 'Get all tools across all servers with their status',
    inputSchema: {
      type: 'object',
      properties: {
        server: {
          type: 'string',
          description: 'Filter by specific server name',
        },
        includeDisabled: {
          type: 'boolean',
          description: 'Include disabled tools',
        },
      },
    },
    handler: async (args) => {
      const settings = await loadSettings();
      const mcpService = getService('mcpService') as any;
      
      const allTools: any[] = [];
      
      for (const [serverName, serverConfig] of Object.entries(settings.mcpServers || {})) {
        // Skip if filtering by server and this isn't the one
        if (args.server && serverName !== args.server) continue;
        
        // Skip disabled servers unless requested
        if (!serverConfig.enabled && !args.includeDisabled) continue;
        
        const client = mcpService.getClient(serverName);
        if (client) {
          try {
            const tools = await client.listTools();
            
            for (const tool of tools?.tools || []) {
              const toolConfig = serverConfig.tools?.[tool.name];
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
    },
  },
  
  {
    name: 'search_tools',
    description: 'Search for tools using semantic search (requires smart routing)',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Search query to find relevant tools',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results',
        },
      },
      required: ['query'],
    },
    handler: async (args) => {
      const vectorService = getService('vectorSearchService') as any;
      
      if (!vectorService) {
        throw new Error('Smart routing is not enabled. Enable it in system configuration.');
      }
      
      const results = await vectorService.searchTools(args.query, args.limit || 10);
      
      return results.map((r: any) => ({
        server: r.server,
        name: r.name,
        description: r.description,
        similarity: r.similarity,
      }));
    },
  },
  
  {
    name: 'toggle_tool',
    description: 'Enable or disable a specific tool',
    inputSchema: {
      type: 'object',
      properties: {
        server: {
          type: 'string',
          description: 'Server name',
        },
        toolName: {
          type: 'string',
          description: 'Name of the tool',
        },
        enabled: {
          type: 'boolean',
          description: 'Whether to enable or disable',
        },
      },
      required: ['server', 'toolName', 'enabled'],
    },
    handler: async (args) => {
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
    },
  },
  
  {
    name: 'update_tool_metadata',
    description: 'Update tool description or other metadata',
    inputSchema: {
      type: 'object',
      properties: {
        server: {
          type: 'string',
          description: 'Server name',
        },
        toolName: {
          type: 'string',
          description: 'Name of the tool',
        },
        description: {
          type: 'string',
          description: 'Custom description for the tool',
        },
      },
      required: ['server', 'toolName'],
    },
    handler: async (args) => {
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
      
      if (args.description !== undefined) {
        settings.mcpServers[args.server].tools![args.toolName].description = args.description;
      }
      
      await saveSettings(settings);
      
      // If smart routing is enabled, update embeddings
      const vectorService = getService('vectorSearchService') as any;
      if (vectorService) {
        await vectorService.syncEmbeddings();
      }
      
      return {
        success: true,
        message: `Tool metadata updated successfully`,
      };
    },
  },
  
  {
    name: 'test_tool',
    description: 'Test a tool execution with sample input',
    inputSchema: {
      type: 'object',
      properties: {
        server: {
          type: 'string',
          description: 'Server name',
        },
        toolName: {
          type: 'string',
          description: 'Name of the tool to test',
        },
        input: {
          type: 'object',
          description: 'Input arguments for the tool',
        },
      },
      required: ['server', 'toolName'],
    },
    handler: async (args) => {
      const mcpService = getService('mcpService') as any;
      const client = mcpService.getClient(args.server);
      
      if (!client) {
        throw new Error(`Server "${args.server}" not found or not connected`);
      }
      
      try {
        const result = await client.callTool(args.toolName, args.input || {});
        
        return {
          success: true,
          result,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
        };
      }
    },
  },
  
  {
    name: 'batch_toggle_tools',
    description: 'Enable or disable multiple tools at once',
    inputSchema: {
      type: 'object',
      properties: {
        updates: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              server: { type: 'string' },
              toolName: { type: 'string' },
              enabled: { type: 'boolean' },
            },
            required: ['server', 'toolName', 'enabled'],
          },
          description: 'List of tool updates to apply',
        },
      },
      required: ['updates'],
    },
    handler: async (args) => {
      const settings = await loadSettings();
      
      for (const update of args.updates) {
        if (!settings.mcpServers?.[update.server]) {
          continue; // Skip non-existent servers
        }
        
        if (!settings.mcpServers[update.server].tools) {
          settings.mcpServers[update.server].tools = {};
        }
        
        if (!settings.mcpServers[update.server].tools![update.toolName]) {
          settings.mcpServers[update.server].tools![update.toolName] = { enabled: true };
        }
        
        settings.mcpServers[update.server].tools![update.toolName].enabled = update.enabled;
      }
      
      await saveSettings(settings);
      
      return {
        success: true,
        message: `${args.updates.length} tools updated successfully`,
      };
    },
  },
];