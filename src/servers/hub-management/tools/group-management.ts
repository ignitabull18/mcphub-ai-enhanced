import { Tool, Group } from '../types.js';
import { getService } from '../../../services/registry.js';
import { smartGroupAnalyzer } from '../../../services/smartGroupAnalyzer.js';
import { ConversationalGroupService } from '../../../services/conversationalGroupService.js';
import { memoryService } from '../../../services/memoryService.js';

export const groupManagementTools: Tool[] = [
  {
    name: 'list_groups',
    description: 'List all server groups',
    inputSchema: {
      type: 'object',
      properties: {
        includeServerDetails: {
          type: 'boolean',
          description: 'Include detailed server information',
        },
      },
    },
    handler: async (args) => {
      const groupService = getService('groupService') as any;
      const groups = await groupService.getGroups();
      
      if (!args.includeServerDetails) {
        return groups.map((g: any) => ({
          id: g.id,
          name: g.name,
          description: g.description,
          serverCount: g.servers?.length || 0,
        }));
      }
      
      return groups;
    },
  },
  
  {
    name: 'create_group',
    description: 'Create a new server group',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the group',
        },
        description: {
          type: 'string',
          description: 'Description of the group',
        },
        servers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              selectedTools: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          description: 'Initial servers to add to the group',
        },
      },
      required: ['name'],
    },
    handler: async (args) => {
      const groupService = getService('groupService') as any;
      
      const newGroup: Omit<Group, 'id'> = {
        name: args.name,
        description: args.description,
        servers: args.servers || [],
      };
      
      const createdGroup = await groupService.createGroup(newGroup);
      
      return {
        success: true,
        message: `Group "${args.name}" created successfully`,
        group: createdGroup,
      };
    },
  },
  
  {
    name: 'update_group',
    description: 'Update a server group',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the group to update',
        },
        name: {
          type: 'string',
          description: 'New name for the group',
        },
        description: {
          type: 'string',
          description: 'New description for the group',
        },
      },
      required: ['id'],
    },
    handler: async (args) => {
      const groupService = getService('groupService') as any;
      
      const updates: Partial<Group> = {};
      if (args.name !== undefined) updates.name = args.name;
      if (args.description !== undefined) updates.description = args.description;
      
      const updatedGroup = await groupService.updateGroup(args.id, updates as any);
      
      return {
        success: true,
        message: `Group updated successfully`,
        group: updatedGroup,
      };
    },
  },
  
  {
    name: 'delete_group',
    description: 'Delete a server group',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the group to delete',
        },
      },
      required: ['id'],
    },
    handler: async (args) => {
      const groupService = getService('groupService') as any;
      
      await groupService.deleteGroup(args.id);
      
      return {
        success: true,
        message: `Group deleted successfully`,
      };
    },
  },
  
  {
    name: 'add_server_to_group',
    description: 'Add a server to a group with optional tool selection',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'ID of the group',
        },
        serverName: {
          type: 'string',
          description: 'Name of the server to add',
        },
        selectedTools: {
          type: 'array',
          items: { type: 'string' },
          description: 'Specific tools to enable for this server in the group',
        },
      },
      required: ['groupId', 'serverName'],
    },
    handler: async (args) => {
      const groupService = getService('groupService') as any;
      
      await groupService.addServerToGroup(
        args.groupId,
        args.serverName,
        args.selectedTools
      );
      
      return {
        success: true,
        message: `Server "${args.serverName}" added to group successfully`,
      };
    },
  },
  
  {
    name: 'remove_server_from_group',
    description: 'Remove a server from a group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'ID of the group',
        },
        serverName: {
          type: 'string',
          description: 'Name of the server to remove',
        },
      },
      required: ['groupId', 'serverName'],
    },
    handler: async (args) => {
      const groupService = getService('groupService') as any;
      
      await groupService.removeServerFromGroup(args.groupId, args.serverName);
      
      return {
        success: true,
        message: `Server "${args.serverName}" removed from group successfully`,
      };
    },
  },
  
  {
    name: 'batch_update_group_servers',
    description: 'Update multiple servers in a group at once',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'ID of the group',
        },
        servers: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              selectedTools: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          description: 'New server configuration for the group',
        },
      },
      required: ['groupId', 'servers'],
    },
    handler: async (args) => {
      const groupService = getService('groupService') as any;
      
      await groupService.batchUpdateServers(args.groupId, args.servers);
      
      return {
        success: true,
        message: `Group servers updated successfully`,
      };
    },
  },
  
  {
    name: 'get_group_effective_tools',
    description: 'Get all available tools in a group',
    inputSchema: {
      type: 'object',
      properties: {
        groupId: {
          type: 'string',
          description: 'ID of the group',
        },
      },
      required: ['groupId'],
    },
    handler: async (args) => {
      const groupService = getService('groupService') as any;
      const group = await groupService.getGroup(args.groupId);
      
      if (!group) {
        throw new Error(`Group with ID "${args.groupId}" not found`);
      }
      
      // Get tools for each server in the group
      const tools: any[] = [];
      for (const server of group.servers || []) {
        const serverConfigs = await groupService.getServerConfigs(args.groupId);
        const config = serverConfigs.find((c: any) => c.name === server.name);
        
        if (config) {
          const selectedTools = server.selectedTools || [];
          config.tools?.forEach((tool: any) => {
            if (!selectedTools.length || selectedTools.includes(tool.name)) {
              tools.push({
                server: server.name,
                name: tool.name,
                description: tool.description,
              });
            }
          });
        }
      }
      
      return tools;
    },
  },

  // Smart Group Creation Tools
  {
    name: 'analyze_tools_for_smart_groups',
    description: 'Analyze available tools and suggest intelligent group configurations using vector clustering and workflow templates',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID for personalized analysis (optional)',
        },
        workflowHint: {
          type: 'string',
          description: 'Optional workflow hint (e.g., "web automation", "data processing")',
        },
        maxGroups: {
          type: 'number',
          description: 'Maximum number of suggested groups (default: 5)',
        },
      },
    },
    handler: async (args) => {
      try {
        const userPreferences = args.workflowHint ? [args.workflowHint] : [];
        const proposals = await smartGroupAnalyzer.analyzeAndProposeGroups(
          userPreferences,
          true
        );

        // Limit the number of proposals if requested
        const limitedProposals = proposals.slice(0, args.maxGroups || 5);

        // Add personalized context if user ID provided
        let personalizedInsights = {};
        if (args.userId) {
          personalizedInsights = await memoryService.getPersonalizedRecommendations(
            args.userId,
            args.workflowHint || 'general'
          );
        }

        return {
          success: true,
          proposedGroups: limitedProposals,
          personalizedInsights,
          message: `Found ${limitedProposals.length} intelligent group suggestions`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Analysis failed',
        };
      }
    },
  },

  {
    name: 'start_smart_group_conversation',
    description: 'Start an AI-powered conversational session for creating smart groups',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID for personalized conversation',
          default: 'mcp-user',
        },
        initialMessage: {
          type: 'string',
          description: 'Initial user message or intent (optional)',
        },
        context: {
          type: 'object',
          properties: {
            workflow: { type: 'string' },
            preferences: { type: 'array', items: { type: 'string' } },
          },
          description: 'Additional context for conversation',
        },
      },
    },
    handler: async (args) => {
      try {
        const conversationService = new ConversationalGroupService();
        const conversationState = await conversationService.startConversation(
          args.userId || 'mcp-user'
        );

        let response = {
          success: true,
          conversationId: conversationState.id,
          message: 'Smart group creation conversation started',
        };

        // Send initial message if provided
        if (args.initialMessage) {
          const aiResponse = await conversationService.processMessage(
            conversationState.id,
            args.initialMessage
          );
          response = { ...response, ...aiResponse };
        }

        return response;
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to start conversation',
        };
      }
    },
  },

  {
    name: 'send_smart_group_message',
    description: 'Send a message in an ongoing smart group creation conversation',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'Conversation ID from start_smart_group_conversation',
        },
        message: {
          type: 'string',
          description: 'User message or response',
        },
        context: {
          type: 'object',
          description: 'Additional context or metadata',
        },
      },
      required: ['conversationId', 'message'],
    },
    handler: async (args) => {
      try {
        const conversationService = new ConversationalGroupService();
        const response = await conversationService.processMessage(
          args.conversationId,
          args.message
        );

        return {
          success: true,
          ...response,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to send message',
        };
      }
    },
  },

  {
    name: 'get_smart_group_recommendations',
    description: 'Get AI-powered group recommendations based on user preferences and tool analysis',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID for personalized recommendations',
          default: 'mcp-user',
        },
        intent: {
          type: 'string',
          description: 'User intent or goal (e.g., "I want to automate web tasks")',
        },
        toolCategories: {
          type: 'array',
          items: { type: 'string' },
          description: 'Preferred tool categories',
        },
        includeMemory: {
          type: 'boolean',
          description: 'Include user memory and preferences in recommendations',
          default: true,
        },
      },
    },
    handler: async (args) => {
      try {
        const userId = args.userId || 'mcp-user';
        
        // Get smart analysis
        const userPreferences = args.intent ? [args.intent] : [];
        const recommendations = await smartGroupAnalyzer.analyzeAndProposeGroups(
          userPreferences,
          true
        );

        // Get personalized recommendations if memory is enabled
        let personalizedData: any = {};
        if (args.includeMemory) {
          personalizedData = await memoryService.getPersonalizedRecommendations(
            userId,
            args.intent || 'general'
          );

          // Get community insights
          const communityInsights = await memoryService.getCommunityInsights(
            args.intent || 'general',
            args.toolCategories || []
          );
          personalizedData.communityInsights = communityInsights;
        }

        return {
          success: true,
          recommendations,
          personalizedInsights: personalizedData,
          message: `Generated ${recommendations.length} smart group recommendations`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to get recommendations',
        };
      }
    },
  },

  {
    name: 'save_user_group_preference',
    description: 'Save user preferences and feedback about group creation for future learning',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'User ID',
          default: 'mcp-user',
        },
        preference: {
          type: 'string',
          description: 'User preference or feedback',
        },
        context: {
          type: 'object',
          properties: {
            groupName: { type: 'string' },
            tools: { type: 'array', items: { type: 'string' } },
            workflow: { type: 'string' },
            accepted: { type: 'boolean' },
          },
          description: 'Context about the preference',
        },
      },
      required: ['userId', 'preference'],
    },
    handler: async (args) => {
      try {
        const userId = args.userId || 'mcp-user';
        
        if (args.context?.accepted && args.context.groupName) {
          // Save successful group creation
          await memoryService.addSuccessfulGroup(
            userId,
            args.context.groupName,
            args.preference,
            args.context.tools || [],
            'Accepted via MCP tool'
          );
        } else {
          // Save general preference
          await memoryService.addUserPreference(
            userId,
            args.preference,
            JSON.stringify(args.context)
          );
        }

        return {
          success: true,
          message: 'User preference saved for future learning',
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to save preference',
        };
      }
    },
  },

  {
    name: 'create_smart_groups_from_conversation',
    description: 'Create actual groups from a completed smart group conversation',
    inputSchema: {
      type: 'object',
      properties: {
        conversationId: {
          type: 'string',
          description: 'Conversation ID from smart group session',
        },
        approvedGroups: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              servers: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    selectedTools: { type: 'array', items: { type: 'string' } },
                  },
                },
              },
            },
          },
          description: 'Groups approved by user for creation',
        },
        userId: {
          type: 'string',
          description: 'User ID for memory learning',
          default: 'mcp-user',
        },
      },
      required: ['conversationId', 'approvedGroups'],
    },
    handler: async (args) => {
      try {
        const groupService = getService('groupService') as any;
        const createdGroups = [];
        const userId = args.userId || 'mcp-user';

        for (const groupData of args.approvedGroups) {
          // Convert to the format expected by groupService
          const servers = groupData.servers.map((server: any) => ({
            name: server.name,
            tools: server.selectedTools?.length ? server.selectedTools : 'all',
          }));

          const newGroup = await groupService.createGroup(
            groupData.name,
            groupData.description,
            servers
          );

          if (newGroup) {
            createdGroups.push(newGroup);

            // Learn from successful creation
            const toolNames = servers.flatMap((s: any) => 
              Array.isArray(s.tools) ? s.tools : []
            );

            await memoryService.addSuccessfulGroup(
              userId,
              groupData.name,
              groupData.description || '',
              toolNames,
              'Created via smart group conversation'
            );
          }
        }

        return {
          success: true,
          createdGroups,
          message: `Successfully created ${createdGroups.length} smart groups`,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to create groups',
        };
      }
    },
  },
];