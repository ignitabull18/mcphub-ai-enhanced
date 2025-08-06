// Import Mem0 with proper type handling
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Memory } = require('mem0ai');
import { getSmartRoutingConfig } from '../utils/smartRouting.js';

// Types for memory operations
export interface UserMemory {
  content: string;
  metadata?: {
    category?: 'preference' | 'workflow' | 'group_success' | 'tool_relationship' | 'naming_convention';
    confidence?: number;
    timestamp?: Date;
    session_id?: string;
    tool_names?: string[];
    group_name?: string;
  };
}

export interface MemorySearchResult {
  content: string;
  score: number;
  metadata?: any;
  created_at?: string;
}

/**
 * Memory Service using Mem0 for persistent user learning and context
 * Enhances smart group creation with cross-session memory and personalization
 */
export class MemoryService {
  private memory: any;
  private isInitialized: boolean = false;

  constructor() {
    // Initialize will be called lazily to avoid blocking startup
    this.memory = new Memory();
  }

  /**
   * Initialize Mem0 with PostgreSQL/PGVector configuration
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      const config = getSmartRoutingConfig();
      
      if (!config.enabled || !config.dbUrl) {
        console.warn('Memory service disabled: Smart routing not configured');
        return;
      }

      // Parse database URL to get connection details
      const dbConfig = this.parseDatabaseUrl(config.dbUrl);
      
      // Configure Mem0 to use our existing PostgreSQL + pgvector setup
      const memoryConfig = {
        vector_store: {
          provider: 'pgvector',
          config: {
            user: dbConfig.user,
            password: dbConfig.password,
            host: dbConfig.host,
            port: dbConfig.port,
            database: dbConfig.database,
          },
        },
        llm: {
          provider: 'openai',
          config: {
            model: 'gpt-4o-mini',
            api_key: config.openaiApiKey,
            base_url: config.openaiApiBaseUrl,
          },
        },
        embedder: {
          provider: 'openai',
          config: {
            model: 'text-embedding-3-small',
            api_key: config.openaiApiKey,
            base_url: config.openaiApiBaseUrl,
          },
        },
      };

      this.memory = Memory.from_config(memoryConfig);
      this.isInitialized = true;
      
      console.log('🧠 Memory service initialized successfully with PGVector backend');
    } catch (error) {
      console.warn('Failed to initialize memory service:', error);
      // Fall back to in-memory mode for development
      this.memory = new Memory();
    }
  }

  /**
   * Add user memory with automatic categorization
   */
  async addUserMemory(
    content: string,
    userId: string,
    metadata?: UserMemory['metadata']
  ): Promise<void> {
    try {
      await this.initialize();
      
      const memoryData = {
        messages: [{ role: 'user', content }],
        user_id: userId,
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString(),
          source: 'smart_group_creator',
        },
      };

      await this.memory.add(memoryData);
      
      console.log(`💾 Added user memory for ${userId}: ${content.slice(0, 50)}...`);
    } catch (error) {
      console.warn('Failed to add user memory:', error);
    }
  }

  /**
   * Search relevant memories for a user
   */
  async searchUserMemories(
    query: string,
    userId: string,
    limit: number = 5
  ): Promise<MemorySearchResult[]> {
    try {
      await this.initialize();
      
      const results = await this.memory.search(query, { user_id: userId, limit });
      
      return results.map((result: any) => ({
        content: result.content || result.text || '',
        score: result.score || result.relevance_score || 0,
        metadata: result.metadata,
        created_at: result.created_at,
      }));
    } catch (error) {
      console.warn('Failed to search user memories:', error);
      return [];
    }
  }

  /**
   * Get all memories for a specific category
   */
  async getUserMemoriesByCategory(
    userId: string,
    category: string,
    limit: number = 10
  ): Promise<MemorySearchResult[]> {
    try {
      // Search with category-specific query
      const categoryQueries = {
        preference: 'user preferences tool grouping workflow',
        workflow: 'workflow process tools usage patterns',
        group_success: 'successful group creation accepted proposals',
        tool_relationship: 'tool relationships connections dependencies',
        naming_convention: 'group names naming conventions preferences',
      };

      const query = categoryQueries[category as keyof typeof categoryQueries] || category;
      return await this.searchUserMemories(query, userId, limit);
    } catch (error) {
      console.warn(`Failed to get ${category} memories:`, error);
      return [];
    }
  }

  /**
   * Add workflow pattern memory
   */
  async addWorkflowPattern(
    userId: string,
    workflow: string,
    toolsUsed: string[],
    successfulGroups: string[]
  ): Promise<void> {
    const content = `User's workflow: ${workflow}. Successfully uses tools: ${toolsUsed.join(', ')}. Prefers groups: ${successfulGroups.join(', ')}`;
    
    await this.addUserMemory(content, userId, {
      category: 'workflow',
      tool_names: toolsUsed,
      confidence: 0.8,
    });
  }

  /**
   * Add successful group creation memory
   */
  async addSuccessfulGroup(
    userId: string,
    groupName: string,
    description: string,
    tools: string[],
    userFeedback?: string
  ): Promise<void> {
    const content = `Successfully created group "${groupName}": ${description}. Contains tools: ${tools.join(', ')}.${userFeedback ? ` User feedback: ${userFeedback}` : ''}`;
    
    await this.addUserMemory(content, userId, {
      category: 'group_success',
      group_name: groupName,
      tool_names: tools,
      confidence: 0.9,
    });
  }

  /**
   * Add user preference memory
   */
  async addUserPreference(
    userId: string,
    preference: string,
    context?: string
  ): Promise<void> {
    const content = `User preference: ${preference}${context ? ` Context: ${context}` : ''}`;
    
    await this.addUserMemory(content, userId, {
      category: 'preference',
      confidence: 0.7,
    });
  }

  /**
   * Get personalized recommendations based on user's memory
   */
  async getPersonalizedRecommendations(
    userId: string,
    _currentContext: string
  ): Promise<{
    preferences: string[];
    similarPatterns: string[];
    namingConventions: string[];
  }> {
    try {
      const [preferences, workflows, naming] = await Promise.all([
        this.getUserMemoriesByCategory(userId, 'preference', 3),
        this.getUserMemoriesByCategory(userId, 'workflow', 3),
        this.getUserMemoriesByCategory(userId, 'naming_convention', 3),
      ]);

      return {
        preferences: preferences.map(m => m.content),
        similarPatterns: workflows.map(m => m.content),
        namingConventions: naming.map(m => m.content),
      };
    } catch (error) {
      console.warn('Failed to get personalized recommendations:', error);
      return {
        preferences: [],
        similarPatterns: [],
        namingConventions: [],
      };
    }
  }

  /**
   * Learn from cross-user patterns (aggregate insights)
   */
  async getCommunityInsights(
    workflow: string,
    toolCategories: string[]
  ): Promise<string[]> {
    try {
      // Search across all users for similar patterns (no user_id filter)
      const query = `${workflow} ${toolCategories.join(' ')} successful groups`;
      const results = await this.memory.search(query, { limit: 5 });
      
      return results.map((result: any) => result.content || result.text || '');
    } catch (error) {
      console.warn('Failed to get community insights:', error);
      return [];
    }
  }

  /**
   * Parse database URL into connection components
   */
  private parseDatabaseUrl(dbUrl: string): {
    user: string;
    password: string;
    host: string;
    port: string;
    database: string;
  } {
    try {
      const url = new URL(dbUrl);
      return {
        user: url.username || 'postgres',
        password: url.password || '',
        host: url.hostname || 'localhost',
        port: url.port || '5432',
        database: url.pathname.slice(1) || 'mcphub', // Remove leading slash
      };
    } catch (error) {
      console.warn('Failed to parse database URL, using defaults:', error);
      return {
        user: 'postgres',
        password: '',
        host: 'localhost',
        port: '5432',
        database: 'mcphub',
      };
    }
  }

  /**
   * Health check for memory service
   */
  async healthCheck(): Promise<{ status: string; initialized: boolean; backend: string }> {
    try {
      await this.initialize();
      return {
        status: 'healthy',
        initialized: this.isInitialized,
        backend: this.isInitialized ? 'pgvector' : 'in-memory',
      };
    } catch (error) {
      return {
        status: 'error',
        initialized: false,
        backend: 'none',
      };
    }
  }
}

// Export singleton instance
export const memoryService = new MemoryService();