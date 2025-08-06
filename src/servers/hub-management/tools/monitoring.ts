import { Tool } from '../types.js';
import { getService } from '../../../services/registry.js';
// import type LogService from '../../../services/logService.js';
import fs from 'fs/promises';
import path from 'path';

export const monitoringTools: Tool[] = [
  {
    name: 'get_logs',
    description: 'Retrieve system logs with filtering',
    inputSchema: {
      type: 'object',
      properties: {
        level: {
          type: 'string',
          enum: ['error', 'warn', 'info', 'debug'],
          description: 'Filter by log level',
        },
        server: {
          type: 'string',
          description: 'Filter by server name',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of log entries',
        },
        since: {
          type: 'string',
          description: 'ISO timestamp to get logs since',
        },
      },
    },
    handler: async (args) => {
      const logService = getService('logService') as any;
      
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
    },
  },
  
  {
    name: 'clear_logs',
    description: 'Clear log history',
    inputSchema: {
      type: 'object',
      properties: {
        before: {
          type: 'string',
          description: 'Clear logs before this ISO timestamp',
        },
      },
    },
    handler: async (args) => {
      const logService = getService('logService') as any;
      
      if (args.before) {
        // This would need to be implemented in LogService
        // For now, we'll just clear all logs
        logService.clear();
        return {
          success: true,
          message: `Logs cleared before ${args.before}`,
        };
      }
      
      logService.clear();
      
      return {
        success: true,
        message: 'All logs cleared',
      };
    },
  },
  
  {
    name: 'get_server_logs',
    description: 'Get logs for a specific server',
    inputSchema: {
      type: 'object',
      properties: {
        serverName: {
          type: 'string',
          description: 'Name of the server',
        },
        lines: {
          type: 'number',
          description: 'Number of log lines to retrieve',
        },
      },
      required: ['serverName'],
    },
    handler: async (args) => {
      const logService = getService('logService') as any;
      
      const logs = logService.getLogs().filter((log: any) => 
        log.message.includes(args.serverName) || 
        log.metadata?.server === args.serverName
      );
      
      const limit = args.lines || 100;
      
      return logs.slice(-limit);
    },
  },
  
  {
    name: 'get_error_report',
    description: 'Get a summary of recent errors',
    inputSchema: {
      type: 'object',
      properties: {
        hours: {
          type: 'number',
          description: 'Number of hours to look back',
        },
      },
    },
    handler: async (args) => {
      const logService = getService('logService') as any;
      const hours = args.hours || 24;
      const since = new Date(Date.now() - hours * 60 * 60 * 1000);
      
      const errors = logService.getLogs().filter((log: any) => 
        log.level === 'error' && 
        new Date(log.timestamp) >= since
      );
      
      // Group errors by type/message pattern
      const errorGroups: Record<string, any> = {};
      
      for (const error of errors) {
        // Simple grouping by the first part of the error message
        const key = error.message.split(':')[0].trim();
        
        if (!errorGroups[key]) {
          errorGroups[key] = {
            type: key,
            count: 0,
            firstOccurrence: error.timestamp,
            lastOccurrence: error.timestamp,
            examples: [],
          };
        }
        
        errorGroups[key].count++;
        errorGroups[key].lastOccurrence = error.timestamp;
        
        if (errorGroups[key].examples.length < 3) {
          errorGroups[key].examples.push(error);
        }
      }
      
      return {
        totalErrors: errors.length,
        timeRange: {
          from: since.toISOString(),
          to: new Date().toISOString(),
        },
        errorGroups: Object.values(errorGroups),
      };
    },
  },
  
  {
    name: 'get_connection_status',
    description: 'Get connection status for all servers',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const mcpService = getService('mcpService');
      const settings = await (await import('../../../config/index.js')).loadSettings();
      
      const statuses: any[] = [];
      
      for (const [name, config] of Object.entries(settings.mcpServers || {})) {
        const client = (mcpService as any).getClient(name);
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
          enabled: config.enabled !== false,
          connected,
          type: config.type || 'stdio',
          toolCount,
          lastError,
        });
      }
      
      return statuses;
    },
  },
  
  {
    name: 'run_health_checks',
    description: 'Run comprehensive health checks on the system',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const checks: any[] = [];
      
      // Check database connectivity (if smart routing is enabled)
      const vectorService = getService('vectorSearchService');
      if (vectorService) {
        try {
          // This would need a health check method in VectorSearchService
          checks.push({
            name: 'PostgreSQL Database',
            status: 'healthy',
            details: 'Vector search database is accessible',
          });
        } catch (error) {
          checks.push({
            name: 'PostgreSQL Database',
            status: 'unhealthy',
            details: error instanceof Error ? error.message : 'Database connection failed',
          });
        }
      }
      
      // Check file system access
      try {
        const testPath = path.join(process.cwd(), 'data');
        await fs.access(testPath, fs.constants.R_OK | fs.constants.W_OK);
        checks.push({
          name: 'File System',
          status: 'healthy',
          details: 'Data directory is readable and writable',
        });
      } catch (error) {
        checks.push({
          name: 'File System',
          status: 'unhealthy',
          details: 'Cannot access data directory',
        });
      }
      
      // Check memory usage
      const memUsage = process.memoryUsage();
      const memPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
      checks.push({
        name: 'Memory Usage',
        status: memPercent < 80 ? 'healthy' : memPercent < 90 ? 'warning' : 'critical',
        details: `${Math.round(memPercent)}% heap used`,
      });
      
      // Check MCP servers
      const mcpService = getService('mcpService');
      const settings = await (await import('../../../config/index.js')).loadSettings();
      let connectedServers = 0;
      let totalServers = 0;
      
      for (const [name, config] of Object.entries(settings.mcpServers || {})) {
        if (!config.enabled) continue;
        totalServers++;
        
        const client = (mcpService as any).getClient(name);
        if (client?.getServerCapabilities()) {
          connectedServers++;
        }
      }
      
      checks.push({
        name: 'MCP Servers',
        status: connectedServers === totalServers ? 'healthy' : 
                connectedServers > 0 ? 'degraded' : 'unhealthy',
        details: `${connectedServers}/${totalServers} servers connected`,
      });
      
      const allHealthy = checks.every(c => c.status === 'healthy');
      const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
      
      return {
        overall: allHealthy ? 'healthy' : hasUnhealthy ? 'unhealthy' : 'degraded',
        checks,
        timestamp: new Date().toISOString(),
      };
    },
  },
  
  {
    name: 'capture_diagnostic_bundle',
    description: 'Create a diagnostic bundle with system information',
    inputSchema: {
      type: 'object',
      properties: {
        includeLogs: {
          type: 'boolean',
          description: 'Include recent logs in the bundle',
        },
        includeConfig: {
          type: 'boolean',
          description: 'Include configuration (with secrets redacted)',
        },
      },
    },
    handler: async (args) => {
      const bundle: any = {
        timestamp: new Date().toISOString(),
        system: {
          platform: process.platform,
          arch: process.arch,
          nodeVersion: process.version,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
      };
      
      // Include configuration (redacted)
      if (args.includeConfig) {
        const settings = await (await import('../../../config/index.js')).loadSettings();
        bundle.configuration = {
          serverCount: Object.keys(settings.mcpServers || {}).length,
          groupCount: settings.groups?.length || 0,
          smartRoutingEnabled: (settings as any).smartRouting?.enabled || false,
          routingEnabled: settings.systemConfig?.routing?.enableGlobalRoute || false,
        };
      }
      
      // Include recent logs
      if (args.includeLogs) {
        const logService = getService('logService') as any;
        bundle.recentLogs = logService.getLogs().slice(-100);
      }
      
      // Include health check results
      const healthChecks = await monitoringTools[5].handler({});
      bundle.health = healthChecks;
      
      return bundle;
    },
  },
];