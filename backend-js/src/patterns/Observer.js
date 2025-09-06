const { logger } = require('../utils/logger');

// Event Types for the system
const EventTypes = {
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',
  PROJECT_CREATED: 'project.created',
  PROJECT_UPDATED: 'project.updated',
  PROJECT_DELETED: 'project.deleted',
  WIREFRAME_CREATED: 'wireframe.created',
  WIREFRAME_UPDATED: 'wireframe.updated',
  WIREFRAME_VERSION_CREATED: 'wireframe.version.created',
  COLLABORATION_JOIN: 'collaboration.join',
  COLLABORATION_LEAVE: 'collaboration.leave',
  SYSTEM_ERROR: 'system.error',
  PERFORMANCE_WARNING: 'performance.warning'
};

// Base Event class
class Event {
  constructor(type, data, metadata = {}) {
    this.id = this.generateId();
    this.type = type;
    this.data = data;
    this.metadata = {
      timestamp: new Date().toISOString(),
      source: 'backend-api',
      ...metadata
    };
  }

  generateId() {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Observer interface
class Observer {
  constructor(name) {
    this.name = name;
  }

  async handle(event) {
    throw new Error('Observer must implement handle method');
  }

  shouldHandle(event) {
    return true; // Override in specific observers
  }
}

// Event Bus implementation
class EventBus {
  constructor() {
    this.observers = new Map();
    this.eventHistory = [];
    this.maxHistorySize = 1000;
  }

  subscribe(eventType, observer) {
    if (!this.observers.has(eventType)) {
      this.observers.set(eventType, new Set());
    }
    
    this.observers.get(eventType).add(observer);
    
    logger.debug('Observer subscribed', {
      eventType,
      observerName: observer.name
    });
  }

  unsubscribe(eventType, observer) {
    if (this.observers.has(eventType)) {
      this.observers.get(eventType).delete(observer);
      
      if (this.observers.get(eventType).size === 0) {
        this.observers.delete(eventType);
      }
    }
  }

  async emit(eventType, data, metadata = {}) {
    const event = new Event(eventType, data, metadata);
    
    // Store in history
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistorySize) {
      this.eventHistory.shift();
    }

    logger.debug('Event emitted', {
      eventId: event.id,
      eventType,
      observerCount: this.observers.get(eventType)?.size || 0
    });

    // Notify observers
    if (this.observers.has(eventType)) {
      const observers = Array.from(this.observers.get(eventType));
      
      await Promise.allSettled(
        observers.map(async (observer) => {
          try {
            if (observer.shouldHandle(event)) {
              await observer.handle(event);
            }
          } catch (error) {
            logger.error('Observer error', {
              eventId: event.id,
              eventType,
              observerName: observer.name,
              error: error.message
            });
          }
        })
      );
    }

    return event;
  }

  getEventHistory(eventType = null, limit = 100) {
    let events = this.eventHistory;
    
    if (eventType) {
      events = events.filter(event => event.type === eventType);
    }
    
    return events.slice(-limit);
  }

  getObserverStats() {
    const stats = {};
    
    for (const [eventType, observers] of this.observers.entries()) {
      stats[eventType] = {
        observerCount: observers.size,
        observerNames: Array.from(observers).map(o => o.name)
      };
    }
    
    return stats;
  }
}

// Specific Observer implementations

// Audit Log Observer
class AuditLogObserver extends Observer {
  constructor() {
    super('AuditLogObserver');
    this.auditLogs = [];
  }

  shouldHandle(event) {
    // Log all user actions and system events
    return event.type.startsWith('user.') || 
           event.type.startsWith('project.') || 
           event.type.startsWith('wireframe.');
  }

  async handle(event) {
    const auditEntry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      eventId: event.id,
      eventType: event.type,
      userId: event.data.userId || event.metadata.userId,
      action: this.getActionFromEventType(event.type),
      resource: this.getResourceFromEvent(event),
      timestamp: event.metadata.timestamp,
      ipAddress: event.metadata.ipAddress,
      userAgent: event.metadata.userAgent,
      details: event.data
    };

    this.auditLogs.push(auditEntry);
    
    // Keep only last 10000 audit logs in memory
    if (this.auditLogs.length > 10000) {
      this.auditLogs.shift();
    }

    logger.info('Audit log created', {
      auditId: auditEntry.id,
      action: auditEntry.action,
      userId: auditEntry.userId
    });
  }

  getActionFromEventType(eventType) {
    const [resource, action] = eventType.split('.');
    return action.toUpperCase();
  }

  getResourceFromEvent(event) {
    if (event.type.startsWith('user.')) return 'USER';
    if (event.type.startsWith('project.')) return 'PROJECT';
    if (event.type.startsWith('wireframe.')) return 'WIREFRAME';
    return 'UNKNOWN';
  }

  getAuditLogs(userId = null, limit = 100) {
    let logs = this.auditLogs;
    
    if (userId) {
      logs = logs.filter(log => log.userId === userId);
    }
    
    return logs.slice(-limit);
  }
}

// Notification Observer
class NotificationObserver extends Observer {
  constructor(websocketService) {
    super('NotificationObserver');
    this.websocketService = websocketService;
  }

  shouldHandle(event) {
    // Handle collaboration and project events
    return event.type.startsWith('collaboration.') || 
           event.type.startsWith('project.') ||
           event.type.startsWith('wireframe.');
  }

  async handle(event) {
    const notification = this.createNotification(event);
    
    if (notification) {
      await this.sendNotification(notification, event);
    }
  }

  createNotification(event) {
    switch (event.type) {
      case EventTypes.PROJECT_CREATED:
        return {
          type: 'project_created',
          title: 'New Project Created',
          message: `Project "${event.data.name}" has been created`,
          userId: event.data.userId
        };
        
      case EventTypes.COLLABORATION_JOIN:
        return {
          type: 'user_joined',
          title: 'User Joined Project',
          message: `${event.data.userName} joined the project`,
          projectId: event.data.projectId,
          excludeUserId: event.data.userId
        };
        
      case EventTypes.WIREFRAME_UPDATED:
        return {
          type: 'wireframe_updated',
          title: 'Wireframe Updated',
          message: `Wireframe "${event.data.name}" has been updated`,
          projectId: event.data.projectId,
          excludeUserId: event.data.updatedBy
        };
        
      default:
        return null;
    }
  }

  async sendNotification(notification, event) {
    try {
      if (notification.userId) {
        // Send to specific user
        this.websocketService.notifyUser(notification.userId, 'notification', notification);
      } else if (notification.projectId) {
        // Send to all project collaborators
        this.websocketService.notifyProjectUpdate(
          notification.projectId, 
          'notification', 
          notification
        );
      }
      
      logger.debug('Notification sent', {
        type: notification.type,
        eventId: event.id
      });
    } catch (error) {
      logger.error('Failed to send notification', {
        error: error.message,
        notification
      });
    }
  }
}

// Analytics Observer
class AnalyticsObserver extends Observer {
  constructor(metricsCollector) {
    super('AnalyticsObserver');
    this.metricsCollector = metricsCollector;
    this.analytics = {
      userActions: new Map(),
      projectStats: new Map(),
      systemEvents: []
    };
  }

  async handle(event) {
    // Track user actions
    if (event.data.userId) {
      this.trackUserAction(event.data.userId, event.type);
    }

    // Track project statistics
    if (event.data.projectId) {
      this.trackProjectActivity(event.data.projectId, event.type);
    }

    // Track system events
    this.trackSystemEvent(event);
  }

  trackUserAction(userId, eventType) {
    if (!this.analytics.userActions.has(userId)) {
      this.analytics.userActions.set(userId, {
        totalActions: 0,
        actionTypes: {},
        lastActivity: null
      });
    }

    const userStats = this.analytics.userActions.get(userId);
    userStats.totalActions++;
    userStats.actionTypes[eventType] = (userStats.actionTypes[eventType] || 0) + 1;
    userStats.lastActivity = new Date().toISOString();
  }

  trackProjectActivity(projectId, eventType) {
    if (!this.analytics.projectStats.has(projectId)) {
      this.analytics.projectStats.set(projectId, {
        totalActivity: 0,
        activityTypes: {},
        lastActivity: null
      });
    }

    const projectStats = this.analytics.projectStats.get(projectId);
    projectStats.totalActivity++;
    projectStats.activityTypes[eventType] = (projectStats.activityTypes[eventType] || 0) + 1;
    projectStats.lastActivity = new Date().toISOString();
  }

  trackSystemEvent(event) {
    this.analytics.systemEvents.push({
      eventId: event.id,
      eventType: event.type,
      timestamp: event.metadata.timestamp
    });

    // Keep only last 1000 system events
    if (this.analytics.systemEvents.length > 1000) {
      this.analytics.systemEvents.shift();
    }
  }

  getAnalytics() {
    return {
      userActions: Object.fromEntries(this.analytics.userActions),
      projectStats: Object.fromEntries(this.analytics.projectStats),
      systemEvents: this.analytics.systemEvents.slice(-100)
    };
  }
}

// Performance Monitor Observer
class PerformanceMonitorObserver extends Observer {
  constructor(metricsCollector) {
    super('PerformanceMonitorObserver');
    this.metricsCollector = metricsCollector;
    this.thresholds = {
      responseTime: 2000, // 2 seconds
      errorRate: 5, // 5%
      memoryUsage: 85 // 85%
    };
  }

  shouldHandle(event) {
    return event.type === EventTypes.PERFORMANCE_WARNING || 
           event.type === EventTypes.SYSTEM_ERROR;
  }

  async handle(event) {
    if (event.type === EventTypes.PERFORMANCE_WARNING) {
      await this.handlePerformanceWarning(event);
    } else if (event.type === EventTypes.SYSTEM_ERROR) {
      await this.handleSystemError(event);
    }
  }

  async handlePerformanceWarning(event) {
    const metrics = this.metricsCollector.getMetrics();
    
    logger.warn('Performance warning detected', {
      eventId: event.id,
      metrics: {
        responseTime: metrics.performance.responseTime.avg,
        errorRate: this.metricsCollector.getErrorRate(),
        memoryUsage: metrics.system.memory.usage
      }
    });

    // Could trigger alerts, scaling, etc.
  }

  async handleSystemError(event) {
    logger.error('System error tracked', {
      eventId: event.id,
      error: event.data.error,
      context: event.data.context
    });

    // Could trigger incident management, notifications, etc.
  }
}

// Factory for creating and configuring the event system
class EventSystemFactory {
  static create(dependencies = {}) {
    const eventBus = new EventBus();
    
    // Create observers
    const auditLogObserver = new AuditLogObserver();
    const analyticsObserver = new AnalyticsObserver(dependencies.metricsCollector);
    const performanceMonitorObserver = new PerformanceMonitorObserver(dependencies.metricsCollector);
    
    let notificationObserver;
    if (dependencies.websocketService) {
      notificationObserver = new NotificationObserver(dependencies.websocketService);
    }

    // Subscribe observers to events
    Object.values(EventTypes).forEach(eventType => {
      eventBus.subscribe(eventType, auditLogObserver);
      eventBus.subscribe(eventType, analyticsObserver);
      
      if (notificationObserver) {
        eventBus.subscribe(eventType, notificationObserver);
      }
    });

    // Performance-specific subscriptions
    eventBus.subscribe(EventTypes.PERFORMANCE_WARNING, performanceMonitorObserver);
    eventBus.subscribe(EventTypes.SYSTEM_ERROR, performanceMonitorObserver);

    return {
      eventBus,
      observers: {
        auditLog: auditLogObserver,
        analytics: analyticsObserver,
        notification: notificationObserver,
        performanceMonitor: performanceMonitorObserver
      }
    };
  }
}

module.exports = {
  EventTypes,
  Event,
  Observer,
  EventBus,
  AuditLogObserver,
  NotificationObserver,
  AnalyticsObserver,
  PerformanceMonitorObserver,
  EventSystemFactory
};
