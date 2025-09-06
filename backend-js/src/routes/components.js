import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../config/database';
import { aiService } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { UIComponent } from '../types';

const router = Router();

// Validation rules
const createComponentValidation = [
  body('name').isLength({ min: 1, max: 255 }).withMessage('Component name is required'),
  body('componentType').isLength({ min: 1, max: 100 }).withMessage('Component type is required'),
  body('category').optional().isLength({ max: 100 }),
  body('description').optional().isLength({ max: 1000 }),
  body('htmlStructure').optional().isObject(),
  body('cssStyles').optional().isObject(),
  body('jsInteractions').optional().isObject(),
];

const componentIdValidation = [
  param('id').isUUID().withMessage('Invalid component ID'),
];

// Generate AI component
router.post('/generate', authenticateToken, async (req, res) => {
  try {
    const { componentType, requirements, platform = 'web' } = req.body;

    if (!componentType) {
      return res.status(400).json({
        success: false,
        error: 'Component type is required',
        timestamp: new Date()
      });
    }

    const generatedComponents = await aiService.generateUIComponents(componentType, {
      requirements: requirements || '',
      platform,
      userId: req.user!.userId
    });

    res.json({
      success: true,
      data: { components: generatedComponents },
      message: 'Components generated successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Generate component error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate components',
      timestamp: new Date()
    });
  }
});

// Create component
router.post('/', authenticateToken, createComponentValidation, async (req, res) => {
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

    const componentData = {
      ...req.body,
      created_by_user_id: req.user!.userId,
      usage_count: 0,
      is_public: req.body.isPublic || false,
      is_active: true,
      platform_support: req.body.platformSupport || ['web'],
      accessibility_features: req.body.accessibilityFeatures || {},
      performance_metrics: {},
      design_tokens: req.body.designTokens || {}
    };

    const component = await db.create<UIComponent>('ui_components', componentData);
    if (!component) {
      throw new Error('Failed to create component');
    }

    res.status(201).json({
      success: true,
      data: { component },
      message: 'Component created successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Create component error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create component',
      timestamp: new Date()
    });
  }
});

// Get user components
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { category, componentType, search, isPublic } = req.query;
    
    let filters: any = {};
    if (isPublic === 'true') {
      filters.is_public = true;
    } else {
      filters.created_by_user_id = req.user!.userId;
    }

    if (category) filters.category = category;
    if (componentType) filters.component_type = componentType;
    
    let components;
    if (search && typeof search === 'string') {
      // Search in name and description
      components = await db.searchComponents(search, filters);
    } else {
      components = await db.findMany<UIComponent>('ui_components', filters, {
        orderBy: 'updated_at',
        ascending: false
      });
    }

    res.json({
      success: true,
      data: { components },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get components error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get components',
      timestamp: new Date()
    });
  }
});

// Get component by ID
router.get('/:id', authenticateToken, componentIdValidation, async (req, res) => {
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

    const component = await db.findById<UIComponent>('ui_components', req.params.id);
    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
        timestamp: new Date()
      });
    }

    // Check access permissions
    if (!component.is_public && component.created_by_user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    // Increment usage count
    await db.update('ui_components', req.params.id, {
      usage_count: (component.usage_count || 0) + 1
    });

    res.json({
      success: true,
      data: { component },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get component error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get component',
      timestamp: new Date()
    });
  }
});

// Update component
router.put('/:id', authenticateToken, componentIdValidation, async (req, res) => {
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

    const component = await db.findById<UIComponent>('ui_components', req.params.id);
    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
        timestamp: new Date()
      });
    }

    // Check ownership
    if (component.created_by_user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    const updateData = { ...req.body };
    delete updateData.created_by_user_id; // Prevent changing owner
    delete updateData.usage_count; // Prevent manual usage count changes

    const updatedComponent = await db.update<UIComponent>('ui_components', req.params.id, updateData);
    if (!updatedComponent) {
      throw new Error('Failed to update component');
    }

    res.json({
      success: true,
      data: { component: updatedComponent },
      message: 'Component updated successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Update component error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update component',
      timestamp: new Date()
    });
  }
});

// Delete component
router.delete('/:id', authenticateToken, componentIdValidation, async (req, res) => {
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

    const component = await db.findById<UIComponent>('ui_components', req.params.id);
    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
        timestamp: new Date()
      });
    }

    // Check ownership
    if (component.created_by_user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    // Soft delete
    await db.update('ui_components', req.params.id, { is_active: false });

    res.json({
      success: true,
      message: 'Component deleted successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Delete component error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete component',
      timestamp: new Date()
    });
  }
});

// Get component categories
router.get('/meta/categories', authenticateToken, async (req, res) => {
  try {
    const categories = await db.getComponentCategories(req.user!.userId);

    res.json({
      success: true,
      data: { categories },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get component categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get categories',
      timestamp: new Date()
    });
  }
});

// Get popular components
router.get('/meta/popular', authenticateToken, async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const popularComponents = await db.findMany<UIComponent>(
      'ui_components',
      { is_public: true, is_active: true },
      {
        orderBy: 'usage_count',
        ascending: false,
        limit: parseInt(limit as string)
      }
    );

    res.json({
      success: true,
      data: { components: popularComponents },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get popular components error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get popular components',
      timestamp: new Date()
    });
  }
});

// Clone component
router.post('/:id/clone', authenticateToken, componentIdValidation, async (req, res) => {
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

    const component = await db.findById<UIComponent>('ui_components', req.params.id);
    if (!component) {
      return res.status(404).json({
        success: false,
        error: 'Component not found',
        timestamp: new Date()
      });
    }

    // Check access permissions
    if (!component.is_public && component.created_by_user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    const { newName } = req.body;
    const clonedData = {
      ...component,
      id: undefined, // Remove ID to create new
      name: newName || `${component.name} (Copy)`,
      created_by_user_id: req.user!.userId,
      usage_count: 0,
      is_public: false, // Cloned components are private by default
      created_at: undefined,
      updated_at: undefined
    };

    const clonedComponent = await db.create<UIComponent>('ui_components', clonedData);
    if (!clonedComponent) {
      throw new Error('Failed to clone component');
    }

    res.status(201).json({
      success: true,
      data: { component: clonedComponent },
      message: 'Component cloned successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Clone component error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to clone component',
      timestamp: new Date()
    });
  }
});

export default router;
