const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { config } = require('../config');
const { db } = require('../config/database');
const { cacheService } = require('../utils/cache');

class WebSocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> Set of socketIds
    this.projectRooms = new Map(); // projectId -> Set of userIds
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: true
      },
      transports: ['websocket', 'polling']
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    
    console.log('WebSocket service initialized');
  }

  setupMiddleware() {
    if (!this.io) return;

    // Authentication middleware
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.query.token;
        
        if (!token) {
          return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        socket.userId = decoded.userId;
        
        // Verify user exists
        const user = await db.getUserById(decoded.userId);
        if (!user) {
          return next(new Error('User not found'));
        }

        console.log(`User ${decoded.userId} connected via WebSocket`);
        next();
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        next(new Error('Authentication failed'));
      }
    });
  }

  setupEventHandlers() {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      
      socket.on('join_project', (data) => this.handleJoinProject(socket, data));
      socket.on('leave_project', (data) => this.handleLeaveProject(socket, data));
      socket.on('wireframe_update', (data) => this.handleWireframeUpdate(socket, data));
      socket.on('cursor_position', (data) => this.handleCursorPosition(socket, data));
      socket.on('selection_change', (data) => this.handleSelectionChange(socket, data));
      socket.on('component_drag', (data) => this.handleComponentDrag(socket, data));
      socket.on('chat_message', (data) => this.handleChatMessage(socket, data));
      socket.on('typing_start', (data) => this.handleTypingStart(socket, data));
      socket.on('typing_stop', (data) => this.handleTypingStop(socket, data));
      socket.on('disconnect', () => this.handleDisconnection(socket));
    });
  }

  handleConnection(socket) {
    const userId = socket.userId;
    
    // Track connected user
    if (!this.connectedUsers.has(userId)) {
      this.connectedUsers.set(userId, new Set());
    }
    this.connectedUsers.get(userId).add(socket.id);

    // Send connection confirmation
    socket.emit('connected', {
      socketId: socket.id,
      userId,
      timestamp: new Date()
    });

    console.log(`User ${userId} connected with socket ${socket.id}`);
  }

  async handleJoinProject(socket, data) {
    try {
      const { projectId } = data;
      const userId = socket.userId;

      // Verify project access
      const project = await db.getProjectById(projectId, userId);
      if (!project) {
        socket.emit('error', { message: 'Project not found' });
        return;
      }

      // Join project room
      socket.join(`project:${projectId}`);
      socket.projectId = projectId;

      // Track project room membership
      if (!this.projectRooms.has(projectId)) {
        this.projectRooms.set(projectId, new Set());
      }
      this.projectRooms.get(projectId).add(userId);

      // Get current project collaborators
      const collaborators = Array.from(this.projectRooms.get(projectId) || []);
      
      // Notify other users in the project
      socket.to(`project:${projectId}`).emit('user_joined', {
        userId,
        projectId,
        collaborators,
        timestamp: new Date()
      });

      // Send current project state to the joining user
      const projectState = await this.getProjectState(projectId);
      socket.emit('project_joined', {
        projectId,
        collaborators,
        state: projectState,
        timestamp: new Date()
      });

      console.log(`User ${userId} joined project ${projectId}`);
    } catch (error) {
      console.error('Join project error:', error);
      socket.emit('error', { message: 'Failed to join project' });
    }
  }

  handleLeaveProject(socket, data) {
    const { projectId } = data;
    const userId = socket.userId;

    socket.leave(`project:${projectId}`);
    
    // Remove from project room tracking
    if (this.projectRooms.has(projectId)) {
      this.projectRooms.get(projectId).delete(userId);
      if (this.projectRooms.get(projectId).size === 0) {
        this.projectRooms.delete(projectId);
      }
    }

    // Notify other users
    socket.to(`project:${projectId}`).emit('user_left', {
      userId,
      projectId,
      timestamp: new Date()
    });

    socket.projectId = undefined;
    console.log(`User ${userId} left project ${projectId}`);
  }

  async handleWireframeUpdate(socket, data) {
    try {
      const { projectId, wireframeId, changes, version } = data;
      const userId = socket.userId;

      // Verify access
      if (socket.projectId !== projectId) {
        socket.emit('error', { message: 'Not joined to this project' });
        return;
      }

      // Save changes to database
      await db.update('wireframes', wireframeId, {
        content_structure: changes.contentStructure,
        design_system: changes.designSystem,
        version_number: version + 1,
        updated_at: new Date().toISOString()
      });

      // Broadcast changes to other collaborators
      socket.to(`project:${projectId}`).emit('wireframe_updated', {
        wireframeId,
        changes,
        version: version + 1,
        updatedBy: userId,
        timestamp: new Date()
      });

      // Cache the update for conflict resolution
      await cacheService.set(
        `wireframe_update:${wireframeId}:${version + 1}`,
        { changes, updatedBy: userId, timestamp: new Date() },
        300 // 5 minutes
      );

      console.log(`Wireframe ${wireframeId} updated by user ${userId}`);
    } catch (error) {
      console.error('Wireframe update error:', error);
      socket.emit('error', { message: 'Failed to update wireframe' });
    }
  }

  handleCursorPosition(socket, data) {
    const { projectId, position, elementId } = data;
    const userId = socket.userId;

    if (socket.projectId !== projectId) return;

    // Broadcast cursor position to other collaborators
    socket.to(`project:${projectId}`).emit('cursor_moved', {
      userId,
      position,
      elementId,
      timestamp: new Date()
    });
  }

  handleSelectionChange(socket, data) {
    const { projectId, selectedElements } = data;
    const userId = socket.userId;

    if (socket.projectId !== projectId) return;

    // Broadcast selection to other collaborators
    socket.to(`project:${projectId}`).emit('selection_changed', {
      userId,
      selectedElements,
      timestamp: new Date()
    });
  }

  handleComponentDrag(socket, data) {
    const { projectId, componentId, position, isDragging } = data;
    const userId = socket.userId;

    if (socket.projectId !== projectId) return;

    // Broadcast drag state to other collaborators
    socket.to(`project:${projectId}`).emit('component_dragged', {
      userId,
      componentId,
      position,
      isDragging,
      timestamp: new Date()
    });
  }

  async handleChatMessage(socket, data) {
    try {
      const { projectId, message, messageType = 'text' } = data;
      const userId = socket.userId;

      if (socket.projectId !== projectId) {
        socket.emit('error', { message: 'Not joined to this project' });
        return;
      }

      // Save message to database
      const chatMessage = await db.create('project_messages', {
        project_id: projectId,
        user_id: userId,
        message_content: message,
        message_type: messageType,
        created_at: new Date().toISOString()
      });

      // Broadcast message to all project collaborators
      this.io.to(`project:${projectId}`).emit('chat_message', {
        id: chatMessage.id,
        userId,
        message,
        messageType,
        timestamp: new Date()
      });

      console.log(`Chat message sent in project ${projectId} by user ${userId}`);
    } catch (error) {
      console.error('Chat message error:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  }

  handleTypingStart(socket, data) {
    const { projectId } = data;
    const userId = socket.userId;

    if (socket.projectId !== projectId) return;

    socket.to(`project:${projectId}`).emit('user_typing', {
      userId,
      isTyping: true,
      timestamp: new Date()
    });
  }

  handleTypingStop(socket, data) {
    const { projectId } = data;
    const userId = socket.userId;

    if (socket.projectId !== projectId) return;

    socket.to(`project:${projectId}`).emit('user_typing', {
      userId,
      isTyping: false,
      timestamp: new Date()
    });
  }

  handleDisconnection(socket) {
    const userId = socket.userId;
    const projectId = socket.projectId;

    // Remove from connected users tracking
    if (this.connectedUsers.has(userId)) {
      this.connectedUsers.get(userId).delete(socket.id);
      if (this.connectedUsers.get(userId).size === 0) {
        this.connectedUsers.delete(userId);
      }
    }

    // Remove from project room if applicable
    if (projectId) {
      if (this.projectRooms.has(projectId)) {
        this.projectRooms.get(projectId).delete(userId);
        if (this.projectRooms.get(projectId).size === 0) {
          this.projectRooms.delete(projectId);
        }
      }

      // Notify other users in the project
      socket.to(`project:${projectId}`).emit('user_left', {
        userId,
        projectId,
        timestamp: new Date()
      });
    }

    console.log(`User ${userId} disconnected from socket ${socket.id}`);
  }

  async getProjectState(projectId) {
    try {
      // Get project wireframes and recent activity
      const wireframes = await db.getProjectWireframes(projectId);
      const recentMessages = await db.findMany('project_messages', 
        { project_id: projectId }, 
        { limit: 50, orderBy: 'created_at', ascending: false }
      );

      return {
        wireframes,
        recentMessages: recentMessages.reverse(), // Show oldest first
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Get project state error:', error);
      return { wireframes: [], recentMessages: [] };
    }
  }

  // Public methods for external use
  notifyProjectUpdate(projectId, event, data) {
    if (!this.io) return;
    
    this.io.to(`project:${projectId}`).emit(event, {
      ...data,
      timestamp: new Date()
    });
  }

  notifyUser(userId, event, data) {
    if (!this.io || !this.connectedUsers.has(userId)) return;

    const socketIds = this.connectedUsers.get(userId);
    socketIds.forEach(socketId => {
      this.io.to(socketId).emit(event, {
        ...data,
        timestamp: new Date()
      });
    });
  }

  getConnectedUsers() {
    return Array.from(this.connectedUsers.keys());
  }

  getProjectCollaborators(projectId) {
    return Array.from(this.projectRooms.get(projectId) || []);
  }

  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }
}

const websocketService = new WebSocketService();

module.exports = { websocketService };
