import { Request, Response } from 'express';
import { conversationalGroupService } from '../services/conversationalGroupService.js';
import { smartGroupAnalyzer } from '../services/smartGroupAnalyzer.js';
import { memoryService } from '../services/memoryService.js';

/**
 * Start a new conversation for smart group creation
 */
export const startConversation = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const conversation = await conversationalGroupService.startConversation(userId);
    
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start conversation'
    });
  }
};

/**
 * Send a message to an existing conversation
 */
export const sendMessage = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const { message } = req.body;
    
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }
    
    const response = await conversationalGroupService.processMessage(conversationId, message);
    
    res.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error('Error processing message:', error);
    
    if (error instanceof Error && error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to process message'
    });
  }
};

/**
 * Get conversation details
 */
export const getConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const conversation = conversationalGroupService.getConversation(conversationId);
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      data: conversation
    });
  } catch (error) {
    console.error('Error getting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation'
    });
  }
};

/**
 * List conversations for a user
 */
export const listConversations = async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    const conversations = conversationalGroupService.listConversations(userId as string);
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Error listing conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to list conversations'
    });
  }
};

/**
 * Delete a conversation
 */
export const deleteConversation = async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;
    const deleted = conversationalGroupService.deleteConversation(conversationId);
    
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }
    
    res.json({
      success: true,
      data: { deleted: true }
    });
  } catch (error) {
    console.error('Error deleting conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation'
    });
  }
};

/**
 * Get tool analysis overview
 */
export const getToolAnalysis = async (req: Request, res: Response) => {
  try {
    const [analysis, memoryHealth] = await Promise.all([
      smartGroupAnalyzer.getToolAnalysis(),
      memoryService.healthCheck()
    ]);
    
    res.json({
      success: true,
      data: {
        ...analysis,
        memoryService: memoryHealth
      }
    });
  } catch (error) {
    console.error('Error getting tool analysis:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get tool analysis'
    });
  }
};

/**
 * Generate group proposals without conversation
 */
export const generateProposals = async (req: Request, res: Response) => {
  try {
    const { userPreferences, useVectorClustering = true } = req.body;
    
    const proposals = await smartGroupAnalyzer.analyzeAndProposeGroups(
      userPreferences,
      useVectorClustering
    );
    
    res.json({
      success: true,
      data: {
        proposals,
        totalTools: proposals.reduce((sum, p) => sum + p.tools.length, 0),
        categories: [...new Set(proposals.map(p => p.category))]
      }
    });
  } catch (error) {
    console.error('Error generating proposals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate group proposals'
    });
  }
};

/**
 * Cleanup old conversations (maintenance endpoint)
 */
export const cleanupConversations = async (req: Request, res: Response) => {
  try {
    conversationalGroupService.cleanupOldConversations();
    
    res.json({
      success: true,
      data: { message: 'Old conversations cleaned up' }
    });
  } catch (error) {
    console.error('Error cleaning up conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cleanup conversations'
    });
  }
};