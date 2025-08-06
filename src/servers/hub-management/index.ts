#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError
} from '@modelcontextprotocol/sdk/types.js';
import { serverManagementTools } from './tools/server-management.js';
import { groupManagementTools } from './tools/group-management.js';
import { toolManagementTools } from './tools/tool-management.js';
import { systemConfigTools } from './tools/system-config.js';
import { monitoringTools } from './tools/monitoring.js';
import { configManagementTools } from './tools/config-management.js';
import { userManagementTools } from './tools/user-management.js';
import { smartRoutingTools } from './tools/smart-routing.js';

const server = new Server(
  {
    name: 'hub-management',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Combine all tools
const allTools = [
  ...serverManagementTools,
  ...groupManagementTools,
  ...toolManagementTools,
  ...systemConfigTools,
  ...monitoringTools,
  ...configManagementTools,
  ...userManagementTools,
  ...smartRoutingTools,
];

// Create a map for quick tool lookup
const toolMap = new Map(allTools.map(tool => [tool.name, tool]));

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: allTools.map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
    })),
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  const tool = toolMap.get(name);
  if (!tool) {
    throw new McpError(
      ErrorCode.MethodNotFound,
      `Tool "${name}" not found`
    );
  }

  try {
    const result = await tool.handler(args || {});
    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    if (error instanceof McpError) {
      throw error;
    }
    
    throw new McpError(
      ErrorCode.InternalError,
      `Error executing tool "${name}": ${error instanceof Error ? error.message : String(error)}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Log to stderr to avoid interfering with stdio communication
  console.error('MCPHub Management Server started');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});