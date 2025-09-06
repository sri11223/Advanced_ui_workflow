const express = require('express');
const { db } = require('../config/database');
const { cacheService } = require('../utils/cache');
const { authenticateToken } = require('./auth');

const router = express.Router();

// Create new project
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, project_type = 'web' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }

    const projectData = {
      user_id: req.user.id,
      name,
      description: description || null,
      project_type,
      settings: {},
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const project = await db.createProject(projectData);

    // Cache project data
    await cacheService.set(`project:${project.id}`, project, 3600);

    res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all user projects
router.get('/', authenticateToken, async (req, res) => {
  try {
    const projects = await db.getUserProjects(req.user.id);

    // Cache each project
    for (const project of projects) {
      await cacheService.set(`project:${project.id}`, project, 3600);
    }

    res.json(projects);
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get specific project
router.get('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Check cache first
    const cachedProject = await cacheService.get(`project:${projectId}`);
    if (cachedProject && cachedProject.user_id === req.user.id) {
      return res.json(cachedProject);
    }

    const project = await db.getProjectById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Cache project data
    await cacheService.set(`project:${projectId}`, project, 3600);

    res.json(project);
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update project
router.put('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const updates = req.body;

    // Remove undefined values
    const cleanUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    if (Object.keys(cleanUpdates).length === 0) {
      return res.status(400).json({ error: 'No update data provided' });
    }

    cleanUpdates.updated_at = new Date().toISOString();

    const project = await db.updateProject(projectId, req.user.id, cleanUpdates);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Update cache
    await cacheService.set(`project:${projectId}`, project, 3600);

    res.json(project);
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete project (soft delete)
router.delete('/:projectId', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    const result = await db.deleteProject(projectId, req.user.id);
    if (!result) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Invalidate cache
    await cacheService.delete(`project:${projectId}`);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get project wireframes
router.get('/:projectId/wireframes', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;

    // Verify project ownership
    const project = await db.getProjectById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const wireframes = await db.getProjectWireframes(projectId);
    res.json(wireframes);
  } catch (error) {
    console.error('Get wireframes error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create wireframe for project
router.post('/:projectId/wireframes', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, content_structure, design_system } = req.body;

    // Verify project ownership
    const project = await db.getProjectById(projectId, req.user.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const wireframeData = {
      project_id: projectId,
      name: name || 'Untitled Wireframe',
      description: description || null,
      content_structure: content_structure || {},
      design_system: design_system || {},
      version_number: 1,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const wireframe = await db.createWireframe(wireframeData);
    res.status(201).json(wireframe);
  } catch (error) {
    console.error('Create wireframe error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
