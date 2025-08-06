import { getAllVectorizedTools } from './vectorSearchService.js';
import { VectorClusterer } from './clusteringAlgorithms.js';

// Types for smart group analysis
export interface AnalyzedTool {
  serverName: string;
  toolName: string;
  description: string;
  inputSchema: any;
  category?: string;
  keywords: string[];
}

export interface GroupProposal {
  name: string;
  description: string;
  category: string;
  servers: string[];
  tools: AnalyzedTool[];
  confidence: number;
  reasoning: string;
}

export interface ClusterResult {
  clusters: AnalyzedTool[][];
  labels: string[];
  confidence: number[];
}

// Common workflow templates
export const WORKFLOW_TEMPLATES = {
  WEB_AUTOMATION: {
    keywords: ['browser', 'web', 'navigate', 'click', 'screenshot', 'page', 'automation', 'scraping'],
    name: 'Web Automation',
    description: 'Tools for web browsing, scraping, and browser automation'
  },
  DATA_PROCESSING: {
    keywords: ['data', 'database', 'query', 'search', 'fetch', 'api', 'json', 'csv', 'file'],
    name: 'Data Processing',
    description: 'Tools for data fetching, processing, and file operations'
  },
  COMMUNICATION: {
    keywords: ['message', 'chat', 'email', 'slack', 'discord', 'notification', 'send', 'post'],
    name: 'Communication',
    description: 'Tools for messaging, notifications, and team communication'
  },
  LOCATION_SERVICES: {
    keywords: ['map', 'location', 'gps', 'address', 'weather', 'geo', 'navigation', 'route'],
    name: 'Location & Maps',
    description: 'Tools for location services, mapping, and weather information'
  },
  MEDIA_PROCESSING: {
    keywords: ['image', 'photo', 'video', 'media', 'convert', 'resize', 'upload', 'download'],
    name: 'Media Processing', 
    description: 'Tools for image, video, and media file processing'
  },
  DEVELOPMENT: {
    keywords: ['code', 'git', 'github', 'deploy', 'build', 'test', 'development', 'api', 'docker'],
    name: 'Development',
    description: 'Tools for software development, version control, and deployment'
  }
};

/**
 * Smart Group Analyzer Service
 * Uses vector embeddings and clustering algorithms to intelligently group tools
 */
export class SmartGroupAnalyzer {
  private tools: AnalyzedTool[] = [];
  private initialized = false;

  /**
   * Initialize the analyzer with all available tools
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log('Initializing SmartGroupAnalyzer...');
    
    // Get all vectorized tools from the database
    const vectorizedTools = await getAllVectorizedTools();
    
    // Convert to analyzed format with additional metadata
    this.tools = vectorizedTools.map(tool => ({
      ...tool,
      category: this.categorizeToolByKeywords(tool.description + ' ' + tool.toolName),
      keywords: this.extractKeywords(tool.description + ' ' + tool.toolName)
    }));

    console.log(`SmartGroupAnalyzer initialized with ${this.tools.length} tools`);
    this.initialized = true;
  }

  /**
   * Analyze all tools and generate intelligent group proposals
   */
  async analyzeAndProposeGroups(
    userPreferences?: string[],
    useVectorClustering: boolean = true
  ): Promise<GroupProposal[]> {
    await this.initialize();

    if (this.tools.length === 0) {
      return [];
    }

    const allProposals: GroupProposal[] = [];

    // First, try template-based grouping for common patterns
    const templateGroups = this.createTemplateBasedGroups();
    allProposals.push(...templateGroups);
    
    // If vector clustering is enabled and we have enough tools, use sophisticated clustering
    if (useVectorClustering && this.tools.length >= 6) {
      try {
        const vectorGroups = await this.createVectorBasedGroups();
        allProposals.push(...vectorGroups);
      } catch (error) {
        console.warn('Vector clustering failed, falling back to template-based only:', error);
      }
    }
    
    // Finally, create server-based groups for servers that don't fit other methods well
    const serverGroups = this.createServerBasedGroups(allProposals);
    allProposals.push(...serverGroups);
    
    // Remove duplicates and low-quality proposals
    const deduplicatedProposals = this.deduplicateProposals(allProposals);
    
    // Filter out empty groups and rank by quality
    const validProposals = deduplicatedProposals
      .filter(proposal => proposal.tools.length > 0)
      .sort((a, b) => b.confidence - a.confidence);

    // Apply user preferences if provided
    if (userPreferences && userPreferences.length > 0) {
      return this.rankByUserPreferences(validProposals, userPreferences);
    }

    return validProposals;
  }

  /**
   * Create groups using vector-based clustering algorithms
   */
  private async createVectorBasedGroups(): Promise<GroupProposal[]> {
    try {
      // Use the clustering algorithms to find natural groupings
      const clusterResult = await VectorClusterer.clusterToolsWithSmartNaming('kmeans');
      
      return clusterResult.clusters.map(cluster => {
        const serverNames = [...new Set(cluster.tools.map(t => t.metadata.serverName))];
        const analyzedTools = cluster.tools.map(point => ({
          serverName: point.metadata.serverName,
          toolName: point.metadata.toolName,
          description: point.metadata.description,
          inputSchema: point.metadata.inputSchema,
          category: this.categorizeToolByKeywords(point.metadata.description + ' ' + point.metadata.toolName),
          keywords: this.extractKeywords(point.metadata.description + ' ' + point.metadata.toolName)
        }));

        return {
          name: cluster.name,
          description: cluster.description,
          category: 'vector-clustered',
          servers: serverNames,
          tools: analyzedTools,
          confidence: cluster.confidence,
          reasoning: `Vector clustering found ${cluster.tools.length} semantically similar tools with keywords: ${cluster.keywords.join(', ')}`
        };
      });
    } catch (error) {
      console.error('Error in vector-based clustering:', error);
      return [];
    }
  }

  /**
   * Create groups based on workflow templates
   */
  private createTemplateBasedGroups(): GroupProposal[] {
    const proposals: GroupProposal[] = [];

    for (const [templateKey, template] of Object.entries(WORKFLOW_TEMPLATES)) {
      const matchingTools = this.tools.filter(tool => 
        this.toolMatchesTemplate(tool, template.keywords)
      );

      if (matchingTools.length > 0) {
        const uniqueServers = [...new Set(matchingTools.map(t => t.serverName))];
        
        proposals.push({
          name: template.name,
          description: template.description,
          category: templateKey.toLowerCase().replace('_', '-'),
          servers: uniqueServers,
          tools: matchingTools,
          confidence: this.calculateTemplateConfidence(matchingTools, template.keywords),
          reasoning: `Found ${matchingTools.length} tools matching ${template.name.toLowerCase()} patterns: ${template.keywords.slice(0, 3).join(', ')}`
        });
      }
    }

    return proposals;
  }

  /**
   * Create groups for servers that don't fit well into templates
   */
  private createServerBasedGroups(existingGroups: GroupProposal[]): GroupProposal[] {
    const proposals: GroupProposal[] = [];
    const usedServers = new Set<string>();
    
    // Track which servers are already well-represented in template groups
    existingGroups.forEach(group => {
      group.servers.forEach(server => {
        const serverToolsInGroup = group.tools.filter(t => t.serverName === server).length;
        const totalServerTools = this.tools.filter(t => t.serverName === server).length;
        
        // If majority of server's tools are in this group, mark as used
        if (serverToolsInGroup / totalServerTools > 0.7) {
          usedServers.add(server);
        }
      });
    });

    // Create server-based groups for unused servers with multiple tools
    const serverGroups = this.groupToolsByServer();
    
    for (const [serverName, tools] of Object.entries(serverGroups)) {
      if (!usedServers.has(serverName) && tools.length >= 3) {
        const serverCategory = this.inferServerCategory(tools);
        
        proposals.push({
          name: `${this.formatServerName(serverName)} Tools`,
          description: `All tools from the ${serverName} server`,
          category: serverCategory,
          servers: [serverName],
          tools,
          confidence: Math.min(0.8, tools.length / 10), // Lower confidence than template-based
          reasoning: `Server-based group for ${serverName} with ${tools.length} specialized tools`
        });
      }
    }

    return proposals;
  }

  /**
   * Check if a tool matches a template's keywords
   */
  private toolMatchesTemplate(tool: AnalyzedTool, templateKeywords: string[]): boolean {
    const toolText = (tool.description + ' ' + tool.toolName + ' ' + tool.keywords.join(' ')).toLowerCase();
    
    // Count keyword matches
    const matches = templateKeywords.filter(keyword => 
      toolText.includes(keyword.toLowerCase())
    ).length;
    
    // Require at least 2 keyword matches or 1 strong match
    return matches >= 2 || (matches >= 1 && templateKeywords.some(k => 
      toolText.includes(k) && (k.length > 6 || tool.toolName.toLowerCase().includes(k))
    ));
  }

  /**
   * Calculate confidence score for template-based grouping
   */
  private calculateTemplateConfidence(tools: AnalyzedTool[], templateKeywords: string[]): number {
    if (tools.length === 0) return 0;

    let totalMatches = 0;
    tools.forEach(tool => {
      const toolText = (tool.description + ' ' + tool.toolName).toLowerCase();
      const matches = templateKeywords.filter(k => toolText.includes(k.toLowerCase())).length;
      totalMatches += matches;
    });

    const avgMatches = totalMatches / tools.length;
    const sizeBonus = Math.min(tools.length / 5, 1); // Bonus for having multiple tools
    
    return Math.min(0.95, (avgMatches / templateKeywords.length) * 0.7 + sizeBonus * 0.3);
  }

  /**
   * Group tools by their server names
   */
  private groupToolsByServer(): Record<string, AnalyzedTool[]> {
    const groups: Record<string, AnalyzedTool[]> = {};
    
    this.tools.forEach(tool => {
      if (!groups[tool.serverName]) {
        groups[tool.serverName] = [];
      }
      groups[tool.serverName].push(tool);
    });

    return groups;
  }

  /**
   * Infer category for a server based on its tools
   */
  private inferServerCategory(tools: AnalyzedTool[]): string {
    const categories = tools.map(t => t.category).filter(Boolean);
    const categoryCount: Record<string, number> = {};
    
    categories.forEach(cat => {
      if (cat) {
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;
      }
    });

    // Return most common category or 'specialized'
    const mostCommon = Object.entries(categoryCount)
      .sort(([,a], [,b]) => b - a)[0];
    
    return mostCommon ? mostCommon[0] : 'specialized';
  }

  /**
   * Format server name for display
   */
  private formatServerName(serverName: string): string {
    return serverName
      .split(/[-_]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Categorize a tool based on keyword analysis
   */
  private categorizeToolByKeywords(text: string): string {
    const lowerText = text.toLowerCase();
    
    for (const [key, template] of Object.entries(WORKFLOW_TEMPLATES)) {
      const matches = template.keywords.filter(k => lowerText.includes(k)).length;
      if (matches >= 2) {
        return key.toLowerCase().replace('_', '-');
      }
    }
    
    return 'general';
  }

  /**
   * Extract keywords from tool text
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Remove common words
    const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'tool', 'api', 'get', 'set']);
    const keywords = words.filter(word => !stopWords.has(word));
    
    // Return unique keywords
    return [...new Set(keywords)];
  }

  /**
   * Remove duplicate and overlapping proposals
   */
  private deduplicateProposals(proposals: GroupProposal[]): GroupProposal[] {
    const deduplicated: GroupProposal[] = [];
    
    for (const proposal of proposals) {
      let isDuplicate = false;
      
      for (const existing of deduplicated) {
        // Calculate overlap between tool sets
        const proposalToolIds = new Set(proposal.tools.map(t => `${t.serverName}:${t.toolName}`));
        const existingToolIds = new Set(existing.tools.map(t => `${t.serverName}:${t.toolName}`));
        
        const intersection = new Set([...proposalToolIds].filter(x => existingToolIds.has(x)));
        const union = new Set([...proposalToolIds, ...existingToolIds]);
        
        const overlapRatio = intersection.size / union.size;
        
        // If >70% overlap, consider it a duplicate
        if (overlapRatio > 0.7) {
          isDuplicate = true;
          
          // Keep the higher confidence proposal
          if (proposal.confidence > existing.confidence) {
            const existingIndex = deduplicated.indexOf(existing);
            deduplicated[existingIndex] = proposal;
          }
          break;
        }
      }
      
      if (!isDuplicate) {
        deduplicated.push(proposal);
      }
    }
    
    return deduplicated;
  }

  /**
   * Rank proposals based on user preferences
   */
  private rankByUserPreferences(proposals: GroupProposal[], userPreferences: string[]): GroupProposal[] {
    return proposals.map(proposal => {
      // Check how well the proposal matches user preferences
      let preferenceScore = 0;
      const proposalText = (proposal.name + ' ' + proposal.description + ' ' + 
        proposal.tools.map(t => t.description).join(' ')).toLowerCase();
      
      userPreferences.forEach(pref => {
        if (proposalText.includes(pref.toLowerCase())) {
          preferenceScore += 0.3;
        }
      });

      return {
        ...proposal,
        confidence: Math.min(0.98, proposal.confidence + preferenceScore)
      };
    }).sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get detailed analysis of current tool distribution
   */
  async getToolAnalysis(): Promise<{
    totalTools: number;
    serverCount: number;
    categories: Record<string, number>;
    serverDistribution: Record<string, number>;
  }> {
    await this.initialize();

    const categories: Record<string, number> = {};
    const serverDistribution: Record<string, number> = {};

    this.tools.forEach(tool => {
      // Count categories
      const category = tool.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + 1;
      
      // Count server distribution
      serverDistribution[tool.serverName] = (serverDistribution[tool.serverName] || 0) + 1;
    });

    return {
      totalTools: this.tools.length,
      serverCount: Object.keys(serverDistribution).length,
      categories,
      serverDistribution
    };
  }
}

// Export singleton instance
export const smartGroupAnalyzer = new SmartGroupAnalyzer();