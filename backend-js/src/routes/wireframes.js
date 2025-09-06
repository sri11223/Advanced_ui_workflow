import { Router } from 'express';
import { body, param, validationResult } from 'express-validator';
import { db } from '../config/database';
import { aiService } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Wireframe, WireframeVersion } from '../types';

const router = Router();

// Validation rules
const createWireframeValidation = [
  body('projectId').isUUID().withMessage('Invalid project ID'),
  body('screenName').isLength({ min: 1, max: 255 }).withMessage('Screen name is required'),
  body('screenType').optional().isLength({ max: 100 }),
  body('deviceType').optional().isLength({ max: 50 }),
  body('generationPrompt').optional().isLength({ max: 2000 }),
];

const wireframeIdValidation = [
  param('id').isUUID().withMessage('Invalid wireframe ID'),
];

// Create wireframe
router.post('/', authenticateToken, createWireframeValidation, async (req, res) => {
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

    const { projectId, screenName, screenType, deviceType, generationPrompt } = req.body;

    // Verify project ownership
    const project = await db.findById('projects', projectId);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date()
      });
    }

    // Generate AI suggestions if prompt provided
    let aiSuggestions = null;
    if (generationPrompt) {
      try {
        aiSuggestions = await aiService.generateWireframeSuggestions(generationPrompt, {
          projectType: project.project_type,
          targetPlatform: project.target_platform,
          industry: project.industry
        });
      } catch (error) {
        logger.warn('AI suggestions generation failed:', error);
      }
    }

    const wireframeData = {
      project_id: projectId,
      screen_name: screenName,
      screen_type: screenType,
      device_type: deviceType,
      screen_size: deviceType === 'mobile' ? '375x812' : '1920x1080',
      content_structure: aiSuggestions?.[0]?.components || {},
      design_system: aiSuggestions?.[0]?.styling || {},
      ai_reasoning: aiSuggestions?.[0] || {},
      generation_prompt: generationPrompt,
      version_number: 1,
      is_active: true,
      status: 'draft'
    };

    const wireframe = await db.create<Wireframe>('wireframes', wireframeData);
    if (!wireframe) {
      throw new Error('Failed to create wireframe');
    }

    // Create initial version
    const versionData = {
      wireframe_id: wireframe.id,
      version_number: 1,
      components_snapshot: wireframe.content_structure,
      layout_snapshot: wireframe.design_system,
      change_description: 'Initial version',
      change_type: 'create',
      changed_by_user_id: req.user!.userId
    };

    await db.create<WireframeVersion>('wireframe_versions', versionData);

    res.status(201).json({
      success: true,
      data: { wireframe },
      message: 'Wireframe created successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Create wireframe error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create wireframe',
      timestamp: new Date()
    });
  }
});

// Get project wireframes
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

    const wireframes = await db.getProjectWireframes(projectId);

    res.json({
      success: true,
      data: { wireframes },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get project wireframes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wireframes',
      timestamp: new Date()
    });
  }
});

// Get wireframe by ID
router.get('/:id', authenticateToken, wireframeIdValidation, async (req, res) => {
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

    const wireframe = await db.findById<Wireframe>('wireframes', req.params.id);
    if (!wireframe) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    // Verify project ownership
    const project = await db.findById('projects', wireframe.project_id);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: { wireframe },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get wireframe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wireframe',
      timestamp: new Date()
    });
  }
});

// Update wireframe
router.put('/:id', authenticateToken, wireframeIdValidation, async (req, res) => {
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

    const wireframe = await db.findById<Wireframe>('wireframes', req.params.id);
    if (!wireframe) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    // Verify project ownership
    const project = await db.findById('projects', wireframe.project_id);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    const { screenName, contentStructure, designSystem, status } = req.body;
    const updateData: any = {};

    if (screenName) updateData.screen_name = screenName;
    if (contentStructure) updateData.content_structure = contentStructure;
    if (designSystem) updateData.design_system = designSystem;
    if (status) updateData.status = status;

    const updatedWireframe = await db.update<Wireframe>('wireframes', req.params.id, updateData);
    if (!updatedWireframe) {
      throw new Error('Failed to update wireframe');
    }

    // Create new version if content changed
    if (contentStructure || designSystem) {
      const newVersionNumber = wireframe.version_number + 1;
      
      await db.update('wireframes', req.params.id, { version_number: newVersionNumber });

      const versionData = {
        wireframe_id: wireframe.id,
        version_number: newVersionNumber,
        components_snapshot: contentStructure || wireframe.content_structure,
        layout_snapshot: designSystem || wireframe.design_system,
        change_description: 'Updated wireframe',
        change_type: 'update',
        changed_by_user_id: req.user!.userId
      };

      await db.create<WireframeVersion>('wireframe_versions', versionData);
    }

    res.json({
      success: true,
      data: { wireframe: updatedWireframe },
      message: 'Wireframe updated successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Update wireframe error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to update wireframe',
      timestamp: new Date()
    });
  }
});

// Delete wireframe
router.delete('/:id', authenticateToken, wireframeIdValidation, async (req, res) => {
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

    const wireframe = await db.findById<Wireframe>('wireframes', req.params.id);
    if (!wireframe) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    // Verify project ownership
    const project = await db.findById('projects', wireframe.project_id);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    // Soft delete
    await db.update('wireframes', req.params.id, { is_active: false });

    res.json({
      success: true,
      message: 'Wireframe deleted successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Delete wireframe error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete wireframe',
      timestamp: new Date()
    });
  }
});

// Get wireframe versions
router.get('/:id/versions', authenticateToken, wireframeIdValidation, async (req, res) => {
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

    const wireframe = await db.findById<Wireframe>('wireframes', req.params.id);
    if (!wireframe) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    // Verify project ownership
    const project = await db.findById('projects', wireframe.project_id);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    const versions = await db.getWireframeVersions(req.params.id);

    res.json({
      success: true,
      data: { versions },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get wireframe versions error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get wireframe versions',
      timestamp: new Date()
    });
  }
});

// Generate code export
router.post('/:id/export', authenticateToken, wireframeIdValidation, async (req, res) => {
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

    const { exportType = 'html' } = req.body;
    
    const wireframe = await db.findById<Wireframe>('wireframes', req.params.id);
    if (!wireframe) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    // Verify project ownership
    const project = await db.findById('projects', wireframe.project_id);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Wireframe not found',
        timestamp: new Date()
      });
    }

    const generatedCode = await aiService.generateCodeExport(
      {
        wireframe,
        contentStructure: wireframe.content_structure,
        designSystem: wireframe.design_system
      },
      exportType
    );

    // Save export record
    const exportData = {
      project_id: wireframe.project_id,
      user_id: req.user!.userId,
      export_type: exportType,
      export_name: `${wireframe.screen_name}_${exportType}`,
      wireframe_ids: [wireframe.id],
      export_data: { code: generatedCode },
      file_size_bytes: Buffer.byteLength(generatedCode, 'utf8'),
      download_count: 0,
      share_count: 0,
      generation_status: 'completed'
    };

    const exportRecord = await db.create('exports', exportData);

    res.json({
      success: true,
      data: {
        code: generatedCode,
        exportId: exportRecord?.id,
        exportType
      },
      message: 'Code generated successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Generate code export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate code',
      timestamp: new Date()
    });
  }
});

export default router;
