import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../config/database';
import { aiService } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Conversation } from '../types';

const router = Router();

// Validation rules
const createConversationValidation = [
  body('projectId').isUUID().withMessage('Invalid project ID'),
  body('messageContent').isObject().withMessage('Message content is required'),
];

const conversationIdValidation = [
  param('id').isUUID().withMessage('Invalid conversation ID'),
];

// Create conversation message
router.post('/', authenticateToken, createConversationValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date()
      });
    }

    const { projectId, messageContent } = req.body;

    // Verify project ownership
    const project = await db.findById('projects', projectId);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date()
      });
    }

    // Analyze user intent using AI service
    let intentAnalysis = null;
    let aiResponse = null;
    let generatedWireframeId = null;

    try {
      // Get project context for better AI understanding
      const projectContext = {
        projectType: project.project_type,
        targetPlatform: project.target_platform,
        industry: project.industry,
        targetAudience: project.target_audience,
        aiContext: project.ai_context
      };

      // Analyze user intent
      intentAnalysis = await aiService.analyzeUserIntent(
        messageContent.text || messageContent.message || '',
        projectContext
      );

      // Generate AI response based on intent
      if (intentAnalysis.intent === 'create' || intentAnalysis.intent === 'wireframe') {
        // Generate wireframe suggestions
        const wireframeSuggestions = await aiService.generateWireframeSuggestions(
          messageContent.text || messageContent.message || '',
          projectContext
        );

        aiResponse = {
          type: 'wireframe_suggestions',
          suggestions: wireframeSuggestions,
          message: 'I\'ve generated some wireframe suggestions based on your request.',
          confidence: intentAnalysis.confidence || 0.8
        };

        // Auto-create wireframe if confidence is high
        if (intentAnalysis.confidence > 0.8 && wireframeSuggestions.length > 0) {
          const wireframeData = {
            project_id: projectId,
            screen_name: intentAnalysis.screenName || 'AI Generated Screen',
            screen_type: intentAnalysis.screenType || 'page',
            device_type: intentAnalysis.deviceType || 'desktop',
            content_structure: wireframeSuggestions[0].components || {},
            design_system: wireframeSuggestions[0].styling || {},
            ai_reasoning: wireframeSuggestions[0],
            generation_prompt: messageContent.text || messageContent.message,
            version_number: 1,
            is_active: true,
            status: 'draft'
          };

          const wireframe = await db.create('wireframes', wireframeData);
          if (wireframe) {
            generatedWireframeId = wireframe.id;
            aiResponse.generatedWireframeId = wireframe.id;
          }
        }
      } else if (intentAnalysis.intent === 'component') {
        // Generate component suggestions
        const componentSuggestions = await aiService.generateUIComponents(
          intentAnalysis.componentType || 'button',
          { requirements: messageContent.text || messageContent.message }
        );

        aiResponse = {
          type: 'component_suggestions',
          suggestions: componentSuggestions,
          message: 'Here are some component suggestions for your request.',
          confidence: intentAnalysis.confidence || 0.7
        };
      } else {
        // General AI response
        aiResponse = {
          type: 'general_response',
          message: 'I understand your request. How would you like me to help you with your wireframe?',
          suggestions: [],
          confidence: intentAnalysis.confidence || 0.5
        };
      }
    } catch (error) {
      logger.warn('AI processing failed, using fallback response:', error);
      aiResponse = {
        type: 'fallback_response',
        message: 'I received your message. Could you provide more details about what you\'d like to create?',
        confidence: 0.3
      };
    }

    // Save conversation
    const conversationData = {
      project_id: projectId,
      user_id: req.user!.userId,
      message_content: messageContent,
      ai_response: aiResponse,
      intent_analysis: intentAnalysis,
      context_used: project.ai_context || {},
      generated_wireframe_id: generatedWireframeId
    };

    const conversation = await db.create<Conversation>('conversations', conversationData);
    if (!conversation) {
      throw new Error('Failed to create conversation');
    }

    res.status(201).json({
      success: true,
      data: { 
        conversation,
        aiResponse,
        generatedWireframeId
      },
      message: 'Message processed successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Create conversation error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to process message',
      timestamp: new Date()
    });
  }
});

// Get project conversations
router.get('/project/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project ownership
    const project = await db.findById('projects', projectId);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date()
      });
    }

    const conversations = await db.getProjectConversations(projectId);

    res.json({
      success: true,
      data: { conversations },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get project conversations error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversations',
      timestamp: new Date()
    });
  }
});

// Get conversation by ID
router.get('/:id', authenticateToken, conversationIdValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date()
      });
    }

    const conversation = await db.findById<Conversation>('conversations', req.params.id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      });
    }

    // Verify project ownership
    const project = await db.findById('projects', conversation.project_id);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: { conversation },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation',
      timestamp: new Date()
    });
  }
});

// Delete conversation
router.delete('/:id', authenticateToken, conversationIdValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date()
      });
    }

    const conversation = await db.findById<Conversation>('conversations', req.params.id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      });
    }

    // Verify project ownership
    const project = await db.findById('projects', conversation.project_id);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      });
    }

    await db.delete('conversations', req.params.id);

    res.json({
      success: true,
      message: 'Conversation deleted successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Delete conversation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete conversation',
      timestamp: new Date()
    });
  }
});

// Get conversation context for AI
router.get('/project/:projectId/context', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { limit = 10 } = req.query;

    // Verify project ownership
    const project = await db.findById('projects', projectId);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date()
      });
    }

    const conversations = await db.findMany<Conversation>(
      'conversations',
      { project_id: projectId },
      { 
        limit: parseInt(limit as string), 
        orderBy: 'created_at', 
        ascending: false 
      }
    );

    // Extract context from recent conversations
    const context = {
      recentMessages: conversations.map(c => ({
        userMessage: c.message_content,
        aiResponse: c.ai_response,
        intent: c.intent_analysis,
        timestamp: c.created_at
      })),
      projectContext: {
        type: project.project_type,
        platform: project.target_platform,
        industry: project.industry,
        audience: project.target_audience
      }
    };

    res.json({
      success: true,
      data: { context },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get conversation context error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get conversation context',
      timestamp: new Date()
    });
  }
});

// Regenerate AI response
router.post('/:id/regenerate', authenticateToken, conversationIdValidation, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array(),
        timestamp: new Date()
      });
    }

    const conversation = await db.findById<Conversation>('conversations', req.params.id);
    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      });
    }

    // Verify project ownership
    const project = await db.findById('projects', conversation.project_id);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found',
        timestamp: new Date()
      });
    }

    // Regenerate AI response
    const projectContext = {
      projectType: project.project_type,
      targetPlatform: project.target_platform,
      industry: project.industry,
      targetAudience: project.target_audience,
      aiContext: project.ai_context
    };

    const newIntentAnalysis = await aiService.analyzeUserIntent(
      conversation.message_content.text || conversation.message_content.message || '',
      projectContext
    );

    let newAiResponse;
    if (newIntentAnalysis.intent === 'create' || newIntentAnalysis.intent === 'wireframe') {
      const wireframeSuggestions = await aiService.generateWireframeSuggestions(
        conversation.message_content.text || conversation.message_content.message || '',
        projectContext
      );

      newAiResponse = {
        type: 'wireframe_suggestions',
        suggestions: wireframeSuggestions,
        message: 'Here are some updated wireframe suggestions.',
        confidence: newIntentAnalysis.confidence || 0.8
      };
    } else {
      newAiResponse = {
        type: 'general_response',
        message: 'Let me provide you with a different perspective on your request.',
        confidence: newIntentAnalysis.confidence || 0.5
      };
    }

    // Update conversation
    const updatedConversation = await db.update<Conversation>('conversations', req.params.id, {
      ai_response: newAiResponse,
      intent_analysis: newIntentAnalysis
    });

    res.json({
      success: true,
      data: { 
        conversation: updatedConversation,
        aiResponse: newAiResponse
      },
      message: 'AI response regenerated successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Regenerate AI response error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to regenerate response',
      timestamp: new Date()
    });
  }
});

export default router;
