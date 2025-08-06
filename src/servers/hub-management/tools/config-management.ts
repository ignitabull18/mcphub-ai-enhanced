import { Tool } from '../types.js';
import { loadSettings, saveSettings } from '../../../config/index.js';
import fs from 'fs/promises';
import path from 'path';

export const configManagementTools: Tool[] = [
  {
    name: 'export_configuration',
    description: 'Export the complete hub configuration',
    inputSchema: {
      type: 'object',
      properties: {
        includeSecrets: {
          type: 'boolean',
          description: 'Include sensitive information like API keys',
        },
      },
    },
    handler: async (args) => {
      const settings = await loadSettings();
      
      if (!args.includeSecrets) {
        // Redact sensitive information
        const redacted = JSON.parse(JSON.stringify(settings));
        
        // Redact API keys and passwords
        if (redacted.smartRouting?.openaiApiKey) {
          redacted.smartRouting.openaiApiKey = '***REDACTED***';
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
    },
  },
  
  {
    name: 'import_configuration',
    description: 'Import a hub configuration',
    inputSchema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          description: 'The configuration to import',
        },
        validate: {
          type: 'boolean',
          description: 'Validate configuration before importing',
        },
        merge: {
          type: 'boolean',
          description: 'Merge with existing configuration instead of replacing',
        },
      },
      required: ['config'],
    },
    handler: async (args) => {
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
    },
  },
  
  {
    name: 'backup_configuration',
    description: 'Create a backup of the current configuration',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name for the backup',
        },
      },
    },
    handler: async (args) => {
      const settings = await loadSettings();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = args.name || `backup-${timestamp}`;
      
      const backupDir = path.join(process.cwd(), 'data', 'backups');
      await fs.mkdir(backupDir, { recursive: true });
      
      const backupPath = path.join(backupDir, `${backupName}.json`);
      
      await fs.writeFile(
        backupPath,
        JSON.stringify(settings, null, 2),
        'utf-8'
      );
      
      return {
        success: true,
        message: `Backup created: ${backupName}`,
        path: backupPath,
      };
    },
  },
  
  {
    name: 'restore_configuration',
    description: 'Restore configuration from a backup',
    inputSchema: {
      type: 'object',
      properties: {
        backupName: {
          type: 'string',
          description: 'Name of the backup to restore',
        },
      },
      required: ['backupName'],
    },
    handler: async (args) => {
      const backupPath = path.join(
        process.cwd(),
        'data',
        'backups',
        `${args.backupName}.json`
      );
      
      try {
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        const backupConfig = JSON.parse(backupContent);
        
        await saveSettings(backupConfig);
        
        return {
          success: true,
          message: `Configuration restored from backup: ${args.backupName}`,
        };
      } catch (error) {
        throw new Error(`Failed to restore backup: ${error instanceof Error ? error.message : String(error)}`);
      }
    },
  },
  
  {
    name: 'list_backups',
    description: 'List available configuration backups',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const backupDir = path.join(process.cwd(), 'data', 'backups');
      
      try {
        await fs.mkdir(backupDir, { recursive: true });
        const files = await fs.readdir(backupDir);
        
        const backups = await Promise.all(
          files
            .filter(f => f.endsWith('.json'))
            .map(async (file) => {
              const filePath = path.join(backupDir, file);
              const stats = await fs.stat(filePath);
              
              return {
                name: file.replace('.json', ''),
                created: stats.mtime.toISOString(),
                size: stats.size,
              };
            })
        );
        
        return backups.sort((a, b) => 
          new Date(b.created).getTime() - new Date(a.created).getTime()
        );
      } catch (error) {
        return [];
      }
    },
  },
  
  {
    name: 'validate_configuration',
    description: 'Validate a configuration without applying it',
    inputSchema: {
      type: 'object',
      properties: {
        config: {
          type: 'object',
          description: 'Configuration to validate',
        },
      },
      required: ['config'],
    },
    handler: async (args) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      
      // Check for required fields
      if (!args.config.mcpServers) {
        warnings.push('No MCP servers defined');
      }
      
      // Validate servers
      for (const [name, server] of Object.entries(args.config.mcpServers || {})) {
        const serverConfig = server as any;
        
        // Check server type
        if (!['stdio', 'sse', 'streamable-http', 'openapi'].includes(serverConfig.type || 'stdio')) {
          errors.push(`Server "${name}": Invalid type "${serverConfig.type}"`);
        }
        
        // Type-specific validation
        if (serverConfig.type === 'stdio' && !serverConfig.command) {
          errors.push(`Server "${name}": Command required for stdio type`);
        }
        
        if ((serverConfig.type === 'sse' || serverConfig.type === 'streamable-http') && !serverConfig.url) {
          errors.push(`Server "${name}": URL required for ${serverConfig.type} type`);
        }
        
        if (serverConfig.type === 'openapi' && !serverConfig.openapi?.url) {
          errors.push(`Server "${name}": OpenAPI URL required for openapi type`);
        }
      }
      
      // Validate groups
      for (const group of args.config.groups || []) {
        if (!group.name) {
          errors.push('Group missing name');
        }
        
        // Check if referenced servers exist
        for (const server of group.servers || []) {
          if (!args.config.mcpServers?.[server.name]) {
            warnings.push(`Group "${group.name}": References non-existent server "${server.name}"`);
          }
        }
      }
      
      // Validate smart routing
      if (args.config.smartRouting?.enabled && !args.config.smartRouting?.openaiApiKey) {
        warnings.push('Smart routing enabled but no OpenAI API key provided');
      }
      
      return {
        valid: errors.length === 0,
        errors,
        warnings,
      };
    },
  },
  
  {
    name: 'diff_configurations',
    description: 'Compare two configurations',
    inputSchema: {
      type: 'object',
      properties: {
        configA: {
          type: 'object',
          description: 'First configuration',
        },
        configB: {
          type: 'object',
          description: 'Second configuration',
        },
      },
      required: ['configA', 'configB'],
    },
    handler: async (args) => {
      const differences: any[] = [];
      
      // Compare servers
      const serversA = Object.keys(args.configA.mcpServers || {});
      const serversB = Object.keys(args.configB.mcpServers || {});
      
      const addedServers = serversB.filter(s => !serversA.includes(s));
      const removedServers = serversA.filter(s => !serversB.includes(s));
      const commonServers = serversA.filter(s => serversB.includes(s));
      
      if (addedServers.length > 0) {
        differences.push({
          type: 'added',
          category: 'servers',
          items: addedServers,
        });
      }
      
      if (removedServers.length > 0) {
        differences.push({
          type: 'removed',
          category: 'servers',
          items: removedServers,
        });
      }
      
      // Check for modified servers
      for (const server of commonServers) {
        const serverA = args.configA.mcpServers[server];
        const serverB = args.configB.mcpServers[server];
        
        if (JSON.stringify(serverA) !== JSON.stringify(serverB)) {
          differences.push({
            type: 'modified',
            category: 'server',
            name: server,
            changes: {
              before: serverA,
              after: serverB,
            },
          });
        }
      }
      
      // Compare groups
      const groupsA = args.configA.groups || [];
      const groupsB = args.configB.groups || [];
      
      if (groupsA.length !== groupsB.length) {
        differences.push({
          type: 'modified',
          category: 'groups',
          before: groupsA.length,
          after: groupsB.length,
        });
      }
      
      // Compare system settings
      const settingsToCompare = ['routing', 'smartRouting', 'install'];
      for (const setting of settingsToCompare) {
        if (JSON.stringify(args.configA[setting]) !== JSON.stringify(args.configB[setting])) {
          differences.push({
            type: 'modified',
            category: 'settings',
            name: setting,
            before: args.configA[setting],
            after: args.configB[setting],
          });
        }
      }
      
      return {
        identical: differences.length === 0,
        differences,
      };
    },
  },
];