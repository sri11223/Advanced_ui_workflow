const { logger } = require('../utils/logger');

// Base Repository Pattern Implementation
class BaseRepository {
  constructor(tableName, dbConnection) {
    this.tableName = tableName;
    this.db = dbConnection;
    this.cache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  // Generic CRUD operations with caching
  async findById(id, useCache = true) {
    const cacheKey = `${this.tableName}:${id}`;
    
    if (useCache && this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.debug('Cache hit', { table: this.tableName, id });
        return cached.data;
      }
      this.cache.delete(cacheKey);
    }

    try {
      const result = await this.db.findById(this.tableName, id);
      
      if (result && useCache) {
        this.cache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
      }

      return result;
    } catch (error) {
      logger.error('Repository findById error', {
        table: this.tableName,
        id,
        error: error.message
      });
      throw error;
    }
  }

  async findMany(filters = {}, options = {}) {
    try {
      return await this.db.findMany(this.tableName, filters, options);
    } catch (error) {
      logger.error('Repository findMany error', {
        table: this.tableName,
        filters,
        error: error.message
      });
      throw error;
    }
  }

  async create(data) {
    try {
      const result = await this.db.create(this.tableName, {
        ...data,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      // Invalidate related cache
      this.invalidateCache();
      
      logger.info('Entity created', {
        table: this.tableName,
        id: result.id
      });

      return result;
    } catch (error) {
      logger.error('Repository create error', {
        table: this.tableName,
        error: error.message
      });
      throw error;
    }
  }

  async update(id, data) {
    try {
      const result = await this.db.update(this.tableName, id, {
        ...data,
        updated_at: new Date().toISOString()
      });

      // Invalidate cache for this entity
      this.cache.delete(`${this.tableName}:${id}`);
      
      logger.info('Entity updated', {
        table: this.tableName,
        id
      });

      return result;
    } catch (error) {
      logger.error('Repository update error', {
        table: this.tableName,
        id,
        error: error.message
      });
      throw error;
    }
  }

  async delete(id) {
    try {
      const result = await this.db.delete(this.tableName, id);
      
      // Remove from cache
      this.cache.delete(`${this.tableName}:${id}`);
      
      logger.info('Entity deleted', {
        table: this.tableName,
        id
      });

      return result;
    } catch (error) {
      logger.error('Repository delete error', {
        table: this.tableName,
        id,
        error: error.message
      });
      throw error;
    }
  }

  async softDelete(id) {
    return this.update(id, {
      is_active: false,
      deleted_at: new Date().toISOString()
    });
  }

  invalidateCache(pattern = null) {
    if (pattern) {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  // Transaction support
  async transaction(operations) {
    try {
      return await this.db.transaction(operations);
    } catch (error) {
      logger.error('Repository transaction error', {
        table: this.tableName,
        error: error.message
      });
      throw error;
    }
  }
}

// User Repository with specific business logic
class UserRepository extends BaseRepository {
  constructor(dbConnection) {
    super('users', dbConnection);
  }

  async findByEmail(email) {
    try {
      return await this.db.findOne(this.tableName, { email: email.toLowerCase() });
    } catch (error) {
      logger.error('UserRepository findByEmail error', { email, error: error.message });
      throw error;
    }
  }

  async findActiveUsers(limit = 100) {
    return this.findMany(
      { is_active: true },
      { limit, orderBy: 'created_at', ascending: false }
    );
  }

  async updateLastLogin(userId) {
    return this.update(userId, {
      last_login_at: new Date().toISOString()
    });
  }

  async createWithProfile(userData, profileData) {
    return this.transaction(async (trx) => {
      const user = await this.create(userData);
      const profile = await trx.create('user_profiles', {
        ...profileData,
        user_id: user.id
      });
      return { user, profile };
    });
  }
}

// Project Repository with business logic
class ProjectRepository extends BaseRepository {
  constructor(dbConnection) {
    super('projects', dbConnection);
  }

  async findByUserId(userId, includeInactive = false) {
    const filters = { user_id: userId };
    if (!includeInactive) {
      filters.is_active = true;
    }
    
    return this.findMany(filters, {
      orderBy: 'updated_at',
      ascending: false
    });
  }

  async findWithWireframes(projectId, userId) {
    try {
      const project = await this.findById(projectId);
      if (!project || project.user_id !== userId) {
        return null;
      }

      const wireframes = await this.db.findMany('wireframes', {
        project_id: projectId,
        is_active: true
      });

      return { ...project, wireframes };
    } catch (error) {
      logger.error('ProjectRepository findWithWireframes error', {
        projectId,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  async updateSettings(projectId, userId, settings) {
    const project = await this.findById(projectId);
    if (!project || project.user_id !== userId) {
      throw new Error('Project not found or access denied');
    }

    return this.update(projectId, {
      settings: { ...project.settings, ...settings }
    });
  }
}

// Wireframe Repository
class WireframeRepository extends BaseRepository {
  constructor(dbConnection) {
    super('wireframes', dbConnection);
  }

  async findByProjectId(projectId) {
    return this.findMany(
      { project_id: projectId, is_active: true },
      { orderBy: 'created_at', ascending: false }
    );
  }

  async createVersion(wireframeId, changes, userId) {
    return this.transaction(async (trx) => {
      const wireframe = await this.findById(wireframeId);
      if (!wireframe) {
        throw new Error('Wireframe not found');
      }

      // Create version record
      const version = await trx.create('wireframe_versions', {
        wireframe_id: wireframeId,
        version_number: wireframe.version_number + 1,
        changes,
        created_by: userId,
        created_at: new Date().toISOString()
      });

      // Update main wireframe
      const updatedWireframe = await this.update(wireframeId, {
        content_structure: changes.contentStructure || wireframe.content_structure,
        design_system: changes.designSystem || wireframe.design_system,
        version_number: wireframe.version_number + 1
      });

      return { wireframe: updatedWireframe, version };
    });
  }

  async getVersionHistory(wireframeId, limit = 10) {
    return this.db.findMany('wireframe_versions', 
      { wireframe_id: wireframeId },
      { 
        limit, 
        orderBy: 'version_number', 
        ascending: false 
      }
    );
  }
}

// Repository Factory Pattern
class RepositoryFactory {
  constructor(dbConnection) {
    this.db = dbConnection;
    this.repositories = new Map();
  }

  getRepository(entityType) {
    if (this.repositories.has(entityType)) {
      return this.repositories.get(entityType);
    }

    let repository;
    switch (entityType) {
      case 'user':
        repository = new UserRepository(this.db);
        break;
      case 'project':
        repository = new ProjectRepository(this.db);
        break;
      case 'wireframe':
        repository = new WireframeRepository(this.db);
        break;
      default:
        repository = new BaseRepository(entityType, this.db);
    }

    this.repositories.set(entityType, repository);
    return repository;
  }

  // Bulk operations across repositories
  async bulkCreate(entityType, dataArray) {
    const repository = this.getRepository(entityType);
    const results = [];
    
    for (const data of dataArray) {
      results.push(await repository.create(data));
    }
    
    return results;
  }

  async bulkUpdate(entityType, updates) {
    const repository = this.getRepository(entityType);
    const results = [];
    
    for (const { id, data } of updates) {
      results.push(await repository.update(id, data));
    }
    
    return results;
  }
}

module.exports = {
  BaseRepository,
  UserRepository,
  ProjectRepository,
  WireframeRepository,
  RepositoryFactory
};
