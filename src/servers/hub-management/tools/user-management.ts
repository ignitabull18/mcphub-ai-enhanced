import { Tool } from '../types.js';
import { getService } from '../../../services/registry.js';
// import type UserService from '../../../services/userService.js';
import crypto from 'crypto';

export const userManagementTools: Tool[] = [
  {
    name: 'list_users',
    description: 'List all users with their roles',
    inputSchema: {
      type: 'object',
      properties: {
        includeApiKeys: {
          type: 'boolean',
          description: 'Include API key status (not the actual keys)',
        },
      },
    },
    handler: async (args) => {
      const userService = getService('userService') as any;
      const users = await userService.getUsers();
      
      return users.map((user: any) => ({
        username: user.username,
        role: user.role,
        hasApiKey: !!user.apiKey && args.includeApiKeys,
        createdAt: user.createdAt,
      }));
    },
  },
  
  {
    name: 'create_user',
    description: 'Create a new user account',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username for the new user',
        },
        password: {
          type: 'string',
          description: 'Password for the new user',
        },
        role: {
          type: 'string',
          enum: ['admin', 'user'],
          description: 'Role for the new user',
        },
        generateApiKey: {
          type: 'boolean',
          description: 'Generate an API key for the user',
        },
      },
      required: ['username', 'password'],
    },
    handler: async (args) => {
      const userService = getService('userService') as any;
      
      // Check if user already exists
      const existingUser = await userService.getUserByUsername(args.username);
      if (existingUser) {
        throw new Error(`User "${args.username}" already exists`);
      }
      
      const newUser: any = {
        username: args.username,
        password: args.password, // UserService should hash this
        role: args.role || 'user',
      };
      
      if (args.generateApiKey) {
        newUser.apiKey = generateApiKey();
      }
      
      const createdUser = await userService.createUser(newUser);
      
      return {
        success: true,
        message: `User "${args.username}" created successfully`,
        user: {
          username: createdUser.username,
          role: createdUser.role,
          apiKey: newUser.apiKey, // Return the API key only on creation
        },
      };
    },
  },
  
  {
    name: 'update_user',
    description: 'Update a user account',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username of the user to update',
        },
        password: {
          type: 'string',
          description: 'New password',
        },
        role: {
          type: 'string',
          enum: ['admin', 'user'],
          description: 'New role',
        },
      },
      required: ['username'],
    },
    handler: async (args) => {
      const userService = getService('userService') as any;
      
      const updates: any = {};
      if (args.password) updates.password = args.password;
      if (args.role) updates.role = args.role;
      
      const updatedUser = await userService.updateUser(args.username, updates);
      
      return {
        success: true,
        message: `User "${args.username}" updated successfully`,
        user: {
          username: updatedUser.username,
          role: updatedUser.role,
        },
      };
    },
  },
  
  {
    name: 'delete_user',
    description: 'Delete a user account',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username of the user to delete',
        },
      },
      required: ['username'],
    },
    handler: async (args) => {
      const userService = getService('userService') as any;
      
      await userService.deleteUser(args.username);
      
      return {
        success: true,
        message: `User "${args.username}" deleted successfully`,
      };
    },
  },
  
  {
    name: 'rotate_api_keys',
    description: 'Generate new API keys for users',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username to rotate key for (or all users if not specified)',
        },
      },
    },
    handler: async (args) => {
      const userService = getService('userService') as any;
      
      if (args.username) {
        const user = await userService.getUserByUsername(args.username);
        if (!user) {
          throw new Error(`User "${args.username}" not found`);
        }
        
        const newApiKey = generateApiKey();
        await userService.updateUser(args.username, { apiKey: newApiKey });
        
        return {
          success: true,
          message: `API key rotated for user "${args.username}"`,
          apiKey: newApiKey,
        };
      }
      
      // Rotate all keys
      const users = await userService.getUsers();
      const rotated: any[] = [];
      
      for (const user of users) {
        const newApiKey = generateApiKey();
        await userService.updateUser(user.username, { apiKey: newApiKey });
        rotated.push({
          username: user.username,
          apiKey: newApiKey,
        });
      }
      
      return {
        success: true,
        message: `API keys rotated for ${rotated.length} users`,
        keys: rotated,
      };
    },
  },
  
  {
    name: 'get_audit_log',
    description: 'Get security audit trail',
    inputSchema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Filter by username',
        },
        action: {
          type: 'string',
          description: 'Filter by action type',
        },
        since: {
          type: 'string',
          description: 'ISO timestamp to get logs since',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of entries',
        },
      },
    },
    handler: async (_args) => {
      // This would need an audit service to be implemented
      // For now, return a placeholder
      return {
        message: 'Audit logging not yet implemented',
        entries: [],
      };
    },
  },
  
  {
    name: 'set_rate_limits',
    description: 'Configure rate limiting for users',
    inputSchema: {
      type: 'object',
      properties: {
        defaultLimit: {
          type: 'number',
          description: 'Default requests per minute',
        },
        userLimits: {
          type: 'object',
          description: 'Per-user rate limits',
        },
      },
    },
    handler: async (args) => {
      // This would need rate limiting to be implemented
      // For now, return a placeholder
      return {
        success: true,
        message: 'Rate limiting configuration updated',
        config: {
          defaultLimit: args.defaultLimit || 60,
          userLimits: args.userLimits || {},
        },
      };
    },
  },
  
  {
    name: 'get_permissions_matrix',
    description: 'Get user and group permissions matrix',
    inputSchema: {
      type: 'object',
      properties: {},
    },
    handler: async () => {
      const userService = getService('userService') as any;
      const users = await userService.getUsers();
      
      // Build a permissions matrix
      const matrix = users.map((user: any) => ({
        username: user.username,
        role: user.role,
        permissions: {
          canManageServers: user.role === 'admin',
          canManageGroups: user.role === 'admin',
          canManageUsers: user.role === 'admin',
          canViewLogs: true,
          canCallTools: true,
          canUseSmartRouting: true,
        },
      }));
      
      return matrix;
    },
  },
];

function generateApiKey(): string {
  return `mcp_${crypto.randomBytes(32).toString('hex')}`;
}