import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { db } from '../config/database';
import { aiService } from '../services/aiService';
import { authenticateToken } from '../middleware/auth';
import { logger } from '../utils/logger';
import { Export } from '../types';

const router = Router();

// Validation rules
const createExportValidation = [
  body('projectId').isUUID().withMessage('Invalid project ID'),
  body('exportType').isIn(['html', 'react', 'vue', 'angular', 'flutter', 'figma']).withMessage('Invalid export type'),
  body('exportName').isLength({ min: 1, max: 255 }).withMessage('Export name is required'),
  body('wireframeIds').isArray().withMessage('Wireframe IDs must be an array'),
  body('wireframeIds.*').isUUID().withMessage('Invalid wireframe ID'),
];

const exportIdValidation = [
  param('id').isUUID().withMessage('Invalid export ID'),
];

// Create export
router.post('/', authenticateToken, createExportValidation, async (req, res) => {
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

    const { projectId, exportType, exportName, wireframeIds, options = {} } = req.body;

    // Verify project ownership
    const project = await db.findById('projects', projectId);
    if (!project || project.user_id !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: 'Project not found',
        timestamp: new Date()
      });
    }

    // Verify wireframe ownership
    const wireframes = await Promise.all(
      wireframeIds.map((id: string) => db.findById('wireframes', id))
    );

    const invalidWireframes = wireframes.filter(w => !w || w.project_id !== projectId);
    if (invalidWireframes.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Some wireframes are invalid or not part of this project',
        timestamp: new Date()
      });
    }

    // Create export record
    const exportData = {
      project_id: projectId,
      user_id: req.user!.userId,
      export_type: exportType,
      export_name: exportName,
      wireframe_ids: wireframeIds,
      export_options: options,
      generation_status: 'pending',
      download_count: 0,
      share_count: 0,
      is_public: options.isPublic || false
    };

    const exportRecord = await db.create<Export>('exports', exportData);
    if (!exportRecord) {
      throw new Error('Failed to create export record');
    }

    // Generate export asynchronously
    generateExportAsync(exportRecord.id, wireframes, exportType, options);

    res.status(201).json({
      success: true,
      data: { export: exportRecord },
      message: 'Export generation started',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Create export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to create export',
      timestamp: new Date()
    });
  }
});

// Get user exports
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { projectId, exportType, status } = req.query;
    
    let filters: any = { user_id: req.user!.userId };
    if (projectId) filters.project_id = projectId;
    if (exportType) filters.export_type = exportType;
    if (status) filters.generation_status = status;

    const exports = await db.findMany<Export>('exports', filters, {
      orderBy: 'created_at',
      ascending: false
    });

    res.json({
      success: true,
      data: { exports },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get exports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get exports',
      timestamp: new Date()
    });
  }
});

// Get export by ID
router.get('/:id', authenticateToken, exportIdValidation, async (req, res) => {
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

    const exportRecord = await db.findById<Export>('exports', req.params.id);
    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found',
        timestamp: new Date()
      });
    }

    // Check access permissions
    if (!exportRecord.is_public && exportRecord.user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: { export: exportRecord },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export',
      timestamp: new Date()
    });
  }
});

// Download export
router.get('/:id/download', authenticateToken, exportIdValidation, async (req, res) => {
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

    const exportRecord = await db.findById<Export>('exports', req.params.id);
    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found',
        timestamp: new Date()
      });
    }

    // Check access permissions
    if (!exportRecord.is_public && exportRecord.user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    if (exportRecord.generation_status !== 'completed') {
      return res.status(400).json({
        success: false,
        error: 'Export is not ready for download',
        status: exportRecord.generation_status,
        timestamp: new Date()
      });
    }

    // Increment download count
    await db.update('exports', req.params.id, {
      download_count: (exportRecord.download_count || 0) + 1
    });

    // Set appropriate headers for file download
    const filename = `${exportRecord.export_name}.${getFileExtension(exportRecord.export_type)}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', getContentType(exportRecord.export_type));

    // Return the export data
    if (exportRecord.export_data && exportRecord.export_data.code) {
      res.send(exportRecord.export_data.code);
    } else if (exportRecord.export_data && exportRecord.export_data.files) {
      // For multi-file exports, return as ZIP (simplified as JSON for now)
      res.json(exportRecord.export_data.files);
    } else {
      throw new Error('Export data not available');
    }
  } catch (error: any) {
    logger.error('Download export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to download export',
      timestamp: new Date()
    });
  }
});

// Share export
router.post('/:id/share', authenticateToken, exportIdValidation, async (req, res) => {
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

    const exportRecord = await db.findById<Export>('exports', req.params.id);
    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found',
        timestamp: new Date()
      });
    }

    // Check ownership
    if (exportRecord.user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    const { isPublic = true } = req.body;

    // Update share settings
    const updatedExport = await db.update<Export>('exports', req.params.id, {
      is_public: isPublic,
      share_count: (exportRecord.share_count || 0) + 1
    });

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/exports/${req.params.id}`;

    res.json({
      success: true,
      data: {
        export: updatedExport,
        shareUrl,
        isPublic
      },
      message: 'Export shared successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Share export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to share export',
      timestamp: new Date()
    });
  }
});

// Delete export
router.delete('/:id', authenticateToken, exportIdValidation, async (req, res) => {
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

    const exportRecord = await db.findById<Export>('exports', req.params.id);
    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found',
        timestamp: new Date()
      });
    }

    // Check ownership
    if (exportRecord.user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    await db.delete('exports', req.params.id);

    res.json({
      success: true,
      message: 'Export deleted successfully',
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Delete export error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete export',
      timestamp: new Date()
    });
  }
});

// Get export status
router.get('/:id/status', authenticateToken, exportIdValidation, async (req, res) => {
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

    const exportRecord = await db.findById<Export>('exports', req.params.id);
    if (!exportRecord) {
      return res.status(404).json({
        success: false,
        error: 'Export not found',
        timestamp: new Date()
      });
    }

    // Check access permissions
    if (!exportRecord.is_public && exportRecord.user_id !== req.user!.userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        timestamp: new Date()
      });
    }

    res.json({
      success: true,
      data: {
        id: exportRecord.id,
        status: exportRecord.generation_status,
        progress: exportRecord.generation_progress || 0,
        error: exportRecord.generation_error,
        completedAt: exportRecord.completed_at
      },
      timestamp: new Date()
    });
  } catch (error: any) {
    logger.error('Get export status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get export status',
      timestamp: new Date()
    });
  }
});

// Helper functions
async function generateExportAsync(exportId: string, wireframes: any[], exportType: string, options: any) {
  try {
    // Update status to processing
    await db.update('exports', exportId, {
      generation_status: 'processing',
      generation_progress: 10
    });

    // Generate code using AI service
    const generatedCode = await aiService.generateCodeExport(
      {
        wireframes,
        contentStructure: wireframes.map(w => w.content_structure),
        designSystem: wireframes.map(w => w.design_system)
      },
      exportType,
      options
    );

    // Calculate file size
    const fileSizeBytes = Buffer.byteLength(generatedCode, 'utf8');

    // Update with completed export
    await db.update('exports', exportId, {
      generation_status: 'completed',
      generation_progress: 100,
      export_data: { code: generatedCode },
      file_size_bytes: fileSizeBytes,
      completed_at: new Date()
    });

    logger.info(`Export ${exportId} completed successfully`);
  } catch (error: any) {
    logger.error(`Export ${exportId} failed:`, error);
    
    await db.update('exports', exportId, {
      generation_status: 'failed',
      generation_error: error.message
    });
  }
}

function getFileExtension(exportType: string): string {
  const extensions: { [key: string]: string } = {
    html: 'html',
    react: 'jsx',
    vue: 'vue',
    angular: 'ts',
    flutter: 'dart',
    figma: 'json'
  };
  return extensions[exportType] || 'txt';
}

function getContentType(exportType: string): string {
  const contentTypes: { [key: string]: string } = {
    html: 'text/html',
    react: 'text/javascript',
    vue: 'text/javascript',
    angular: 'text/typescript',
    flutter: 'text/plain',
    figma: 'application/json'
  };
  return contentTypes[exportType] || 'text/plain';
}

export default router;
