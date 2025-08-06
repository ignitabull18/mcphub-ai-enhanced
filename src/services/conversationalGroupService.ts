import OpenAI from 'openai';
import { getSmartRoutingConfig } from '../utils/smartRouting.js';
import { smartGroupAnalyzer, GroupProposal } from './smartGroupAnalyzer.js';
import { createGroup } from './groupService.js';
import { memoryService } from './memoryService.js';

// Types for conversational group creation
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    preferences?: string[];
    proposals?: GroupProposal[];
    analysis?: any;
  };
}

export interface ConversationState {
  id: string;
  userId?: string;
  stage: 'greeting' | 'collecting_preferences' | 'analyzing' | 'presenting_proposals' | 'refining' | 'creating' | 'completed' | 'error';
  messages: ChatMessage[];
  userPreferences: string[];
  toolAnalysis?: any;
  proposals?: GroupProposal[];
  selectedProposals?: GroupProposal[];
  createdGroups?: any[];
  lastActivity: Date;
}

export interface ChatResponse {
  message: string;
  suggestions?: string[];
  proposals?: GroupProposal[];
  requiresUserInput?: boolean;
  nextStage?: string;
  metadata?: any;
}

/**
 * Conversational Group Service
 * Handles AI-powered conversations for intelligent group creation
 */
export class ConversationalGroupService {
  private openai: OpenAI;
  private conversations: Map<string, ConversationState> = new Map();

  constructor() {
    const config = getSmartRoutingConfig();
    this.openai = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiApiBaseUrl,
    });
  }

  /**
   * Start a new conversation for group creation
   */
  async startConversation(userId?: string): Promise<ConversationState> {
    const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const conversation: ConversationState = {
      id: conversationId,
      userId,
      stage: 'greeting',
      messages: [],
      userPreferences: [],
      lastActivity: new Date()
    };

    // Load user's previous preferences and patterns from memory
    if (userId) {
      try {
        const recommendations = await memoryService.getPersonalizedRecommendations(
          userId,
          'starting new group creation conversation'
        );
        
        // Pre-populate preferences from memory
        if (recommendations.preferences.length > 0) {
          conversation.userPreferences = recommendations.preferences
            .map(pref => pref.split(':').pop()?.trim())
            .filter(Boolean) as string[];
        }
      } catch (error) {
        console.warn('Failed to load user memory for conversation start:', error);
      }
    }

    this.conversations.set(conversationId, conversation);

    // Add initial greeting message
    const greetingResponse = await this.generateGreeting(userId);
    const greetingMessage: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'assistant',
      content: greetingResponse.message,
      timestamp: new Date(),
      metadata: {
        analysis: greetingResponse.metadata
      }
    };

    conversation.messages.push(greetingMessage);
    conversation.stage = 'collecting_preferences';

    return conversation;
  }

  /**
   * Process a user message and generate response
   */
  async processMessage(conversationId: string, userMessage: string): Promise<ChatResponse> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Add user message to conversation
    const userMsg: ChatMessage = {
      id: `msg_${Date.now()}`,
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    conversation.messages.push(userMsg);
    conversation.lastActivity = new Date();

    try {
      // Process based on current stage
      let response: ChatResponse;
      
      switch (conversation.stage) {
        case 'collecting_preferences':
          response = await this.handlePreferenceCollection(conversation, userMessage);
          break;
        case 'presenting_proposals':
          response = await this.handleProposalDiscussion(conversation, userMessage);
          break;
        case 'refining':
          response = await this.handleRefinement(conversation, userMessage);
          break;
        case 'creating':
          response = await this.handleGroupCreation(conversation, userMessage);
          break;
        default:
          response = await this.handleGeneralChat(conversation, userMessage);
      }

      // Add assistant response to conversation
      const assistantMsg: ChatMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.message,
        timestamp: new Date(),
        metadata: {
          preferences: conversation.userPreferences,
          proposals: response.proposals,
          analysis: response.metadata
        }
      };
      conversation.messages.push(assistantMsg);

      // Update conversation stage if specified
      if (response.nextStage) {
        conversation.stage = response.nextStage as any;
      }

      return response;
    } catch (error) {
      console.error('Error processing message:', error);
      conversation.stage = 'error';
      
      return {
        message: "I'm sorry, I encountered an error while processing your request. Let's try again or start over.",
        requiresUserInput: true,
        nextStage: 'collecting_preferences'
      };
    }
  }

  /**
   * Generate initial greeting with tool analysis
   */
  private async generateGreeting(userId?: string): Promise<ChatResponse> {
    try {
      // Get overview of available tools
      const analysis = await smartGroupAnalyzer.getToolAnalysis();
      
      // Get personalized context from user's memory
      let personalizedContext = '';
      let personalizedSuggestions = [
        "I do web scraping and data analysis",
        "I manage social media and communication", 
        "I build web applications",
        "Analyze all my tools automatically"
      ];

      if (userId) {
        try {
          const recommendations = await memoryService.getPersonalizedRecommendations(
            userId,
            'greeting for group creation'
          );

          if (recommendations.preferences.length > 0 || recommendations.similarPatterns.length > 0) {
            personalizedContext = `\n\n💡 **Based on our previous conversations**, I remember you work with: ${recommendations.preferences.slice(0, 2).join(', ')}.`;
            
            // Customize suggestions based on memory
            personalizedSuggestions = [
              "Continue with my previous workflow preferences",
              "Create groups similar to what worked before",
              "I have new requirements to discuss",
              "Analyze all my tools automatically"
            ];
          }
        } catch (error) {
          console.warn('Failed to get personalized context for greeting:', error);
        }
      }
      
      const message = `Hi! I'm here to help you create intelligent groups for your ${analysis.totalTools} tools across ${analysis.serverCount} servers.${personalizedContext}

I can analyze your tools and suggest groups based on:
• **Web Automation** - Browser tools, scraping, navigation
• **Data Processing** - APIs, databases, file operations  
• **Communication** - Messaging, notifications, team tools
• **Location Services** - Maps, weather, geolocation
• **Media Processing** - Images, videos, file conversion
• **Development** - Code, deployment, version control

Tell me about your workflow! What do you mainly use these tools for? For example:
- "I do a lot of web scraping and data analysis"
- "I manage social media and customer communication"  
- "I build web applications and need development tools organized"

Or just say "analyze all my tools" and I'll automatically group them for you!`;

      return {
        message,
        suggestions: personalizedSuggestions,
        requiresUserInput: true,
        metadata: analysis
      };
    } catch (error) {
      console.error('Error generating greeting:', error);
      return {
        message: "Hi! I'm here to help you create intelligent groups for your tools. Tell me about your workflow and what you'd like to accomplish with your tool groups.",
        requiresUserInput: true
      };
    }
  }

  /**
   * Handle preference collection stage
   */
  private async handlePreferenceCollection(conversation: ConversationState, userMessage: string): Promise<ChatResponse> {
    // Store the user message in memory for learning
    if (conversation.userId) {
      await memoryService.addUserPreference(
        conversation.userId,
        userMessage,
        'preference collection during group creation'
      );
    }

    // Parse user preferences using AI
    const preferences = await this.extractPreferencesFromMessage(userMessage);
    conversation.userPreferences.push(...preferences);

    // Check for memory-based shortcuts
    if (conversation.userId && (userMessage.toLowerCase().includes('previous') || userMessage.toLowerCase().includes('before') || userMessage.toLowerCase().includes('continue'))) {
      // User wants to use previous preferences
      const recommendations = await memoryService.getPersonalizedRecommendations(
        conversation.userId,
        'continue with previous workflow'
      );
      
      if (recommendations.preferences.length > 0) {
        conversation.userPreferences.push(...recommendations.preferences);
        return await this.performAnalysisAndGenerateProposals(conversation, []);
      }
    }

    // Check if we should analyze automatically or collect more preferences
    if (userMessage.toLowerCase().includes('analyze all') || userMessage.toLowerCase().includes('automatic')) {
      // User wants automatic analysis
      return await this.performAnalysisAndGenerateProposals(conversation, []);
    }

    if (conversation.userPreferences.length > 0) {
      // We have some preferences, ask if they want to add more or proceed
      const message = `Great! I understand you're interested in: **${conversation.userPreferences.join(', ')}**.

Would you like to:
1. **Analyze now** - I'll create group proposals based on what you've told me
2. **Add more details** - Tell me about other workflows or specific needs
3. **See all available tools** - Get an overview of what's available first

What would you prefer?`;

      return {
        message,
        suggestions: [
          "Analyze now and create proposals",
          "Let me add more details about my workflow",
          "Show me what tools are available first"
        ],
        requiresUserInput: true,
        nextStage: 'collecting_preferences'
      };
    } else {
      // No clear preferences extracted, ask for clarification
      const message = `I'd love to help you create the perfect groups! Could you tell me a bit more about what you use your tools for? 

For example:
- What kind of work do you do? (web development, data analysis, content creation, etc.)
- Are there specific workflows you want to optimize?
- Do you have favorite tools that should be grouped together?

The more you tell me, the better I can tailor the groups to your needs!`;

      return {
        message,
        requiresUserInput: true,
        nextStage: 'collecting_preferences'
      };
    }
  }

  /**
   * Perform tool analysis and generate group proposals
   */
  private async performAnalysisAndGenerateProposals(conversation: ConversationState, additionalPrefs: string[]): Promise<ChatResponse> {
    conversation.stage = 'analyzing';
    
    try {
      const allPreferences = [...conversation.userPreferences, ...additionalPrefs];
      
      // Generate proposals using the smart group analyzer
      const proposals = await smartGroupAnalyzer.analyzeAndProposeGroups(
        allPreferences.length > 0 ? allPreferences : undefined,
        true // Use vector clustering
      );

      conversation.proposals = proposals;
      conversation.stage = 'presenting_proposals';

      if (proposals.length === 0) {
        return {
          message: "I couldn't find enough tools to create meaningful groups. This might be because:\n• No tools are currently vectorized in the database\n• All servers are disconnected\n• The smart routing system isn't properly configured\n\nWould you like me to try a different approach or help you troubleshoot?",
          requiresUserInput: true,
          nextStage: 'error'
        };
      }

      // Format proposals for display
      let message = `Perfect! I've analyzed your ${proposals.reduce((sum, p) => sum + p.tools.length, 0)} tools and created **${proposals.length} intelligent group proposals**:\n\n`;

      proposals.forEach((proposal, index) => {
        const serverList = proposal.servers.length <= 3 
          ? proposal.servers.join(', ')
          : `${proposal.servers.slice(0, 2).join(', ')} +${proposal.servers.length - 2} more`;
        
        message += `**${index + 1}. ${proposal.name}** (${Math.round(proposal.confidence * 100)}% match)\n`;
        message += `   📋 ${proposal.description}\n`;
        message += `   🛠 ${proposal.tools.length} tools from: ${serverList}\n`;
        message += `   💡 ${proposal.reasoning}\n\n`;
      });

      message += `What would you like to do?\n`;
      message += `• **Create all groups** - I'll set up all ${proposals.length} groups for you\n`;
      message += `• **Customize** - Let me know which groups you want to modify\n`;
      message += `• **Create selected** - Tell me which specific groups to create\n`;
      message += `• **Start over** - Let's try a different approach`;

      return {
        message,
        proposals,
        suggestions: [
          "Create all groups",
          "Let me customize some groups first", 
          "Create only the top 3 groups",
          "Show me more details about the proposals"
        ],
        requiresUserInput: true,
        nextStage: 'presenting_proposals'
      };
    } catch (error) {
      console.error('Error during analysis:', error);
      return {
        message: "I encountered an issue while analyzing your tools. This might be because the vector database isn't ready or there's a configuration issue. Would you like to try again or proceed with a simpler grouping approach?",
        requiresUserInput: true,
        nextStage: 'error'
      };
    }
  }

  /**
   * Handle proposal discussion stage
   */
  private async handleProposalDiscussion(conversation: ConversationState, userMessage: string): Promise<ChatResponse> {
    const message = userMessage.toLowerCase();

    if (message.includes('create all') || message.includes('all groups')) {
      // User wants to create all groups
      conversation.selectedProposals = conversation.proposals || [];
      return await this.createSelectedGroups(conversation);
    } 
    
    if (message.includes('customize') || message.includes('modify')) {
      // User wants to customize
      conversation.stage = 'refining';
      return {
        message: "Great! Let's customize your groups. You can:\n\n• **Rename groups** - \"Rename 'Web Automation' to 'Browser Tools'\"\n• **Merge groups** - \"Combine groups 1 and 3\"\n• **Remove groups** - \"Don't create the Media Processing group\"\n• **Move tools** - \"Move the slack tools to Communication\"\n\nWhat would you like to change?",
        proposals: conversation.proposals,
        requiresUserInput: true,
        nextStage: 'refining'
      };
    }
    
    if (message.includes('top') || message.includes('selected') || /\d+/.test(message)) {
      // User wants to create selected groups
      return await this.handleGroupSelection(conversation, userMessage);
    }
    
    if (message.includes('details') || message.includes('more info')) {
      // User wants more details
      return await this.provideDetailedProposals(conversation);
    }
    
    if (message.includes('start over') || message.includes('different')) {
      // User wants to start over
      conversation.stage = 'collecting_preferences';
      conversation.userPreferences = [];
      conversation.proposals = [];
      
      return {
        message: "No problem! Let's start fresh. Tell me about your workflow and what you'd like to accomplish with your tool groups.",
        requiresUserInput: true,
        nextStage: 'collecting_preferences'
      };
    }

    // Default: ask for clarification
    return {
      message: "I'm not sure what you'd like to do. Could you choose one of these options?\n\n• **Create all groups** - Set up all the proposed groups\n• **Customize** - Modify the groups before creating\n• **Create selected** - Choose specific groups to create\n• **Start over** - Try a different approach",
      suggestions: [
        "Create all groups",
        "Let me customize first",
        "Create only the top 3 groups"
      ],
      requiresUserInput: true
    };
  }

  /**
   * Handle refinement stage
   */
  private async handleRefinement(_conversation: ConversationState, _userMessage: string): Promise<ChatResponse> {
    // This would implement group customization logic
    // For now, let's provide a simplified response
    return {
      message: "Group customization is being processed. For now, would you like me to create the groups as originally proposed?",
      suggestions: ["Yes, create the original groups", "Let me think about it more"],
      requiresUserInput: true
    };
  }

  /**
   * Handle group creation
   */
  private async handleGroupCreation(conversation: ConversationState, _userMessage: string): Promise<ChatResponse> {
    return await this.createSelectedGroups(conversation);
  }

  /**
   * Handle general chat
   */
  private async handleGeneralChat(_conversation: ConversationState, _userMessage: string): Promise<ChatResponse> {
    return {
      message: "I'm here to help you create intelligent tool groups. Would you like to start the group creation process?",
      suggestions: ["Yes, let's create groups", "Tell me more about how this works"],
      requiresUserInput: true,
      nextStage: 'collecting_preferences'
    };
  }

  /**
   * Extract user preferences from message using AI
   */
  private async extractPreferencesFromMessage(message: string): Promise<string[]> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert at understanding user workflows and tool preferences. Extract key workflow keywords and preferences from the user's message. 

Common categories include:
- web automation, web scraping, browser automation
- data processing, data analysis, database operations  
- communication, messaging, social media
- location services, mapping, weather
- media processing, image editing, video conversion
- development, coding, deployment, version control

Return only the relevant keywords/phrases as a JSON array, or empty array if no clear preferences.`
          },
          {
            role: 'user', 
            content: message
          }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const content = response.choices[0]?.message?.content?.trim();
      if (content) {
        try {
          return JSON.parse(content);
        } catch {
          // If not valid JSON, try to extract keywords manually
          return this.extractKeywordsManually(message);
        }
      }
      
      return this.extractKeywordsManually(message);
    } catch (error) {
      console.warn('AI preference extraction failed, using manual extraction:', error);
      return this.extractKeywordsManually(message);
    }
  }

  /**
   * Manual keyword extraction as fallback
   */
  private extractKeywordsManually(message: string): string[] {
    const keywords = [
      'web scraping', 'web automation', 'browser', 'playwright', 'scraping',
      'data analysis', 'data processing', 'database', 'api', 'data',
      'communication', 'messaging', 'slack', 'social media', 'email',
      'location', 'mapping', 'maps', 'weather', 'geo',
      'media', 'image', 'video', 'photo', 'media processing',
      'development', 'coding', 'github', 'deployment', 'build'
    ];

    const lowerMessage = message.toLowerCase();
    return keywords.filter(keyword => lowerMessage.includes(keyword));
  }

  /**
   * Handle group selection from user input
   */
  private async handleGroupSelection(conversation: ConversationState, userMessage: string): Promise<ChatResponse> {
    const proposals = conversation.proposals || [];
    if (proposals.length === 0) {
      return {
        message: "No proposals available to select from. Let's start over.",
        nextStage: 'collecting_preferences'
      };
    }

    // Extract numbers from message
    const numbers = userMessage.match(/\d+/g)?.map(n => parseInt(n) - 1) || [];
    
    if (numbers.length === 0) {
      // Default to top 3 if no specific numbers mentioned
      conversation.selectedProposals = proposals.slice(0, 3);
    } else {
      // Select specified groups
      conversation.selectedProposals = numbers
        .filter(n => n >= 0 && n < proposals.length)
        .map(n => proposals[n]);
    }

    return await this.createSelectedGroups(conversation);
  }

  /**
   * Provide detailed information about proposals
   */
  private async provideDetailedProposals(conversation: ConversationState): Promise<ChatResponse> {
    const proposals = conversation.proposals || [];
    if (proposals.length === 0) {
      return {
        message: "No proposals available. Let's create some first!",
        nextStage: 'collecting_preferences'
      };
    }

    let message = "Here are the detailed breakdowns for each proposed group:\n\n";

    proposals.forEach((proposal, index) => {
      message += `**${index + 1}. ${proposal.name}** (${Math.round(proposal.confidence * 100)}% confidence)\n`;
      message += `📋 **Description**: ${proposal.description}\n`;
      message += `🎯 **Category**: ${proposal.category}\n`;
      message += `🛠 **Tools** (${proposal.tools.length} total):\n`;
      
      proposal.tools.slice(0, 5).forEach(tool => {
        message += `   • ${tool.toolName} (${tool.serverName}): ${tool.description.slice(0, 60)}...\n`;
      });
      
      if (proposal.tools.length > 5) {
        message += `   • ... and ${proposal.tools.length - 5} more tools\n`;
      }
      
      message += `💡 **Why this grouping**: ${proposal.reasoning}\n\n`;
    });

    message += "Ready to create these groups?";

    return {
      message,
      proposals,
      suggestions: [
        "Create all these groups",
        "Create only selected groups", 
        "Let me customize some groups"
      ],
      requiresUserInput: true
    };
  }

  /**
   * Create the selected groups
   */
  private async createSelectedGroups(conversation: ConversationState): Promise<ChatResponse> {
    const selectedProposals = conversation.selectedProposals || conversation.proposals || [];
    
    if (selectedProposals.length === 0) {
      return {
        message: "No groups selected to create. Would you like to start over?",
        nextStage: 'collecting_preferences'
      };
    }

    conversation.stage = 'creating';
    const createdGroups: any[] = [];
    const errors: string[] = [];

    for (const proposal of selectedProposals) {
      try {
        // Convert proposal to group format
        const serverConfigs = proposal.servers.map(serverName => ({
          name: serverName,
          tools: proposal.tools
            .filter(t => t.serverName === serverName)
            .map(t => t.toolName)
        }));

        const group = createGroup(
          proposal.name,
          proposal.description,
          serverConfigs,
          conversation.userId || 'smart-group-creator'
        );

        if (group) {
          createdGroups.push(group);
        } else {
          errors.push(`Failed to create group: ${proposal.name}`);
        }
      } catch (error) {
        console.error(`Error creating group ${proposal.name}:`, error);
        errors.push(`Error creating group ${proposal.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    conversation.createdGroups = createdGroups;
    conversation.stage = 'completed';

    let message = '';
    if (createdGroups.length > 0) {
      message += `🎉 **Success!** Created ${createdGroups.length} intelligent groups:\n\n`;
      createdGroups.forEach(group => {
        message += `✅ **${group.name}** - ${group.servers?.length || 0} servers configured\n`;
      });
      message += `\nYour groups are now available in MCPHub! You can:\n`;
      message += `• Use them immediately via the API endpoints\n`;
      message += `• View and manage them in the Groups section\n`;
      message += `• Modify the tool selections if needed\n\n`;
      
      // Store successful groups in memory for future learning
      if (conversation.userId) {
        for (const group of createdGroups) {
          await memoryService.addSuccessfulGroup(
            conversation.userId,
            group.name,
            group.description || 'User-created group',
            group.servers?.flatMap((s: any) => s.tools || []) || [],
            'Group successfully created and confirmed by user'
          );
        }

        // Store workflow pattern
        if (conversation.userPreferences.length > 0) {
          const toolsInGroups = createdGroups.flatMap(g => 
            g.servers?.flatMap((s: any) => s.tools || []) || []
          );
          
          await memoryService.addWorkflowPattern(
            conversation.userId,
            conversation.userPreferences.join(', '),
            toolsInGroups,
            createdGroups.map(g => g.name)
          );
        }
      }
    }

    if (errors.length > 0) {
      message += `⚠️ **Issues encountered:**\n`;
      errors.forEach(error => message += `• ${error}\n`);
      message += '\n';
    }

    if (createdGroups.length === 0) {
      message += "Unfortunately, I wasn't able to create any groups. This might be due to configuration issues or naming conflicts. Would you like to try again with different names?";
      return {
        message,
        requiresUserInput: true,
        nextStage: 'error'
      };
    }

    message += "Would you like to create more groups or is there anything else I can help you with?";

    return {
      message,
      suggestions: [
        "Create more groups with different preferences",
        "Show me what groups I have now",
        "That's all, thanks!"
      ],
      requiresUserInput: false,
      nextStage: 'completed',
      metadata: { createdGroups, errors }
    };
  }

  /**
   * Get conversation by ID
   */
  getConversation(conversationId: string): ConversationState | undefined {
    return this.conversations.get(conversationId);
  }

  /**
   * List all active conversations
   */
  listConversations(userId?: string): ConversationState[] {
    const conversations = Array.from(this.conversations.values());
    if (userId) {
      return conversations.filter(c => c.userId === userId);
    }
    return conversations;
  }

  /**
   * Delete a conversation
   */
  deleteConversation(conversationId: string): boolean {
    return this.conversations.delete(conversationId);
  }

  /**
   * Clean up old conversations (older than 24 hours)
   */
  cleanupOldConversations(): void {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    for (const [id, conversation] of this.conversations.entries()) {
      if (conversation.lastActivity < oneDayAgo) {
        this.conversations.delete(id);
      }
    }
  }
}

// Export singleton instance
export const conversationalGroupService = new ConversationalGroupService();