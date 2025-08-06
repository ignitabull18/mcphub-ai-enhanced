import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface VirtualMcpServer {
  name: string;
  description?: string;
  listTools(): Promise<{ tools: Tool[] }>;
  callTool(name: string, args: any): Promise<{
    content: Array<{
      type: 'text' | 'image' | 'resource';
      text?: string;
      data?: string;
      mimeType?: string;
      uri?: string;
    }>;
  }>;
  getServerInfo?(): {
    name: string;
    version: string;
    protocolVersion: string;
    capabilities?: any;
  };
}

export interface VirtualClient {
  listTools(): Promise<{ tools: Tool[] }>;
  callTool(name: string, args: any): Promise<any>;
  getServerCapabilities(): any;
  close?(): Promise<void>;
}