import { db } from '../config/database';
import { Project, CreateProjectRequest } from '../types';
import { logger } from '../utils/logger';
import { cacheService } from '../utils/cache';

export class ProjectService {
  private static instance: ProjectService;

  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  async createProject(userId: string, projectData: CreateProjectRequest): Promise<Project> {
    try {
      const newProject = {
        user_id: userId,
        title: projectData.title,
        description: projectData.description,
        project_type: projectData.project_type,
        target_platform: projectData.target_platform,
        industry: projectData.industry,
        target_audience: projectData.target_audience,
        collaboration_enabled: false,
        is_template: false,
      };

      const project = await db.create<Project>('projects', newProject);
      if (!project) {
        throw new Error('Failed to create project');
      }

      // Cache the project
      await cacheService.set(`project:${project.id}`, project, 3600);

      // Invalidate user projects cache
      await cacheService.delete(`user_projects:${userId}`);

      logger.info(`Project created: ${project.id} by user ${userId}`);
      return project;
    } catch (error) {
      logger.error('Create project error:', error);
      throw error;
    }
  }

  async getProject(projectId: string, userId: string): Promise<Project | null> {
    try {
      // Try cache first
      const cachedProject = await cacheService.get<Project>(`project:${projectId}`);
      if (cachedProject && cachedProject.user_id === userId) {
        return cachedProject;
      }

      // Fetch from database
      const project = await db.findById<Project>('projects', projectId);
      if (!project || project.user_id !== userId) {
        return null;
      }

      // Cache the project
      await cacheService.set(`project:${projectId}`, project, 3600);

      return project;
    } catch (error) {
      logger.error('Get project error:', error);
      return null;
    }
  }

  async getUserProjects(userId: string): Promise<Project[]> {
    try {
      // Try cache first
      const cacheKey = `user_projects:${userId}`;
      const cachedProjects = await cacheService.get<Project[]>(cacheKey);
      if (cachedProjects) {
        return cachedProjects;
      }

      // Fetch from database
      const projects = await db.getUserProjects(userId);

      // Cache the projects
      await cacheService.set(cacheKey, projects, 1800); // 30 minutes

      return projects;
    } catch (error) {
      logger.error('Get user projects error:', error);
      return [];
    }
  }

  async updateProject(projectId: string, userId: string, updateData: Partial<Project>): Promise<Project | null> {
    try {
      // Verify ownership
      const existingProject = await this.getProject(projectId, userId);
      if (!existingProject) {
        return null;
      }

      // Update project
      const updatedProject = await db.update<Project>('projects', projectId, updateData);
      if (!updatedProject) {
        return null;
      }

      // Update cache
      await cacheService.set(`project:${projectId}`, updatedProject, 3600);

      // Invalidate user projects cache
      await cacheService.delete(`user_projects:${userId}`);

      logger.info(`Project updated: ${projectId} by user ${userId}`);
      return updatedProject;
    } catch (error) {
      logger.error('Update project error:', error);
      throw error;
    }
  }

  async deleteProject(projectId: string, userId: string): Promise<boolean> {
    try {
      // Verify ownership
      const project = await this.getProject(projectId, userId);
      if (!project) {
        return false;
      }

      // Soft delete - mark as inactive
      const deleted = await db.update('projects', projectId, { is_active: false });
      if (!deleted) {
        return false;
      }

      // Clear caches
      await cacheService.delete(`project:${projectId}`);
      await cacheService.delete(`user_projects:${userId}`);

      logger.info(`Project deleted: ${projectId} by user ${userId}`);
      return true;
    } catch (error) {
      logger.error('Delete project error:', error);
      throw error;
    }
  }

  async updateProjectContext(projectId: string, userId: string, aiContext: Record<string, any>): Promise<Project | null> {
    try {
      const updateData = {
        ai_context: aiContext,
        updated_at: new Date(),
      };

      return await this.updateProject(projectId, userId, updateData);
    } catch (error) {
      logger.error('Update project context error:', error);
      throw error;
    }
  }

  async enableCollaboration(projectId: string, userId: string): Promise<Project | null> {
    try {
      return await this.updateProject(projectId, userId, { collaboration_enabled: true });
    } catch (error) {
      logger.error('Enable collaboration error:', error);
      throw error;
    }
  }

  async disableCollaboration(projectId: string, userId: string): Promise<Project | null> {
    try {
      return await this.updateProject(projectId, userId, { collaboration_enabled: false });
    } catch (error) {
      logger.error('Disable collaboration error:', error);
      throw error;
    }
  }

  async getProjectStats(projectId: string, userId: string): Promise<any> {
    try {
      const project = await this.getProject(projectId, userId);
      if (!project) {
        return null;
      }

      // Get related data counts
      const [wireframes, conversations] = await Promise.all([
        db.getProjectWireframes(projectId),
        db.getProjectConversations(projectId),
      ]);

      return {
        project,
        stats: {
          wireframeCount: wireframes.length,
          conversationCount: conversations.length,
          lastActivity: Math.max(
            new Date(project.updated_at).getTime(),
            wireframes.length > 0 ? Math.max(...wireframes.map(w => new Date(w.updated_at).getTime())) : 0,
            conversations.length > 0 ? Math.max(...conversations.map(c => new Date(c.created_at).getTime())) : 0
          ),
        },
      };
    } catch (error) {
      logger.error('Get project stats error:', error);
      return null;
    }
  }

  async searchProjects(userId: string, query: string): Promise<Project[]> {
    try {
      const userProjects = await this.getUserProjects(userId);
      
      if (!query.trim()) {
        return userProjects;
      }

      const searchTerm = query.toLowerCase();
      return userProjects.filter(project => 
        project.title.toLowerCase().includes(searchTerm) ||
        (project.description && project.description.toLowerCase().includes(searchTerm)) ||
        (project.industry && project.industry.toLowerCase().includes(searchTerm)) ||
        (project.target_audience && project.target_audience.toLowerCase().includes(searchTerm))
      );
    } catch (error) {
      logger.error('Search projects error:', error);
      return [];
    }
  }

  async duplicateProject(projectId: string, userId: string, newTitle?: string): Promise<Project | null> {
    try {
      const originalProject = await this.getProject(projectId, userId);
      if (!originalProject) {
        return null;
      }

      const duplicateData = {
        user_id: userId,
        title: newTitle || `${originalProject.title} (Copy)`,
        description: originalProject.description,
        project_type: originalProject.project_type,
        target_platform: originalProject.target_platform,
        industry: originalProject.industry,
        target_audience: originalProject.target_audience,
        key_features: originalProject.key_features,
        user_personas: originalProject.user_personas,
        project_goals: originalProject.project_goals,
        constraints: originalProject.constraints,
        ai_context: originalProject.ai_context,
        collaboration_enabled: false,
        is_template: false,
      };

      const duplicatedProject = await db.create<Project>('projects', duplicateData);
      if (!duplicatedProject) {
        throw new Error('Failed to duplicate project');
      }

      // Invalidate user projects cache
      await cacheService.delete(`user_projects:${userId}`);

      logger.info(`Project duplicated: ${projectId} -> ${duplicatedProject.id} by user ${userId}`);
      return duplicatedProject;
    } catch (error) {
      logger.error('Duplicate project error:', error);
      throw error;
    }
  }
}

export const projectService = ProjectService.getInstance();
