export interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties?: Record<string, any>;
    required?: string[];
  };
  handler: (args: any) => Promise<any>;
}

export interface ServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  type?: 'stdio' | 'sse' | 'streamable-http' | 'openapi';
  url?: string;
  openapi?: {
    url: string;
    schema?: string;
  };
  enabled?: boolean;
  tools?: Record<string, {
    enabled?: boolean;
    description?: string;
  }>;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  servers: Array<{
    name: string;
    selectedTools?: string[];
  }>;
}

export interface User {
  username: string;
  password?: string;
  role: 'admin' | 'user';
  apiKey?: string;
}

export interface SystemConfig {
  routing?: {
    enabled: boolean;
    defaultGroup?: string;
  };
  smartRouting?: {
    enabled: boolean;
    openaiApiKey?: string;
    embeddingModel?: string;
  };
  install?: {
    enabled: boolean;
    allowedNpmPackages?: string[];
  };
}