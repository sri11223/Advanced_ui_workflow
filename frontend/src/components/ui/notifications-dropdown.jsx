import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, X, Check, AlertCircle, Info, CheckCircle, 
  Clock, User, MessageSquare, Zap, Star
} from 'lucide-react';

const NotificationsDropdown = ({ isOpen, onClose, onToggle }) => {
  const dropdownRef = useRef(null);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      type: 'success',
      title: 'Project Created',
      message: 'Your new project "E-commerce App" has been created successfully',
      time: '2 minutes ago',
      read: false,
      icon: CheckCircle
    },
    {
      id: 2,
      type: 'info',
      title: 'Template Used',
      message: 'Analytics Dashboard template was applied to your project',
      time: '5 minutes ago',
      read: false,
      icon: Info
    },
    {
      id: 3,
      type: 'warning',
      title: 'Wireframe Generated',
      message: 'AI has generated 3 new wireframes for your landing page',
      time: '10 minutes ago',
      read: true,
      icon: Zap
    },
    {
      id: 4,
      type: 'info',
      title: 'Team Invitation',
      message: 'Srikrishna invited you to collaborate on "Mobile App UI"',
      time: '1 hour ago',
      read: true,
      icon: User
    },
    {
      id: 5,
      type: 'success',
      title: 'Export Complete',
      message: 'Your wireframe has been exported as PNG successfully',
      time: '2 hours ago',
      read: true,
      icon: CheckCircle
    }
  ]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const getTypeColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-400 bg-green-400/10';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10';
      case 'error': return 'text-red-400 bg-red-400/10';
      default: return 'text-blue-400 bg-blue-400/10';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <button
        onClick={onToggle}
        className="relative p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-2 w-80 bg-gray-900 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-sm z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <div className="flex items-center space-x-2">
                <Bell className="w-5 h-5 text-blue-400" />
                <h3 className="text-lg font-semibold text-white">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="w-12 h-12 text-white/20 mx-auto mb-3" />
                  <p className="text-white/60">No notifications yet</p>
                </div>
              ) : (
                <div className="p-2">
                  {notifications.map((notification) => {
                    const Icon = notification.icon;
                    return (
                      <motion.div
                        key={notification.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`group relative p-3 rounded-xl mb-2 transition-all duration-200 hover:bg-white/5 ${
                          !notification.read ? 'bg-blue-500/5 border border-blue-500/20' : ''
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${getTypeColor(notification.type)}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <h4 className={`text-sm font-medium ${!notification.read ? 'text-white' : 'text-white/80'}`}>
                                {notification.title}
                              </h4>
                              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                {!notification.read && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="p-1 text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                                    title="Mark as read"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="p-1 text-white/60 hover:text-red-400 hover:bg-red-400/10 rounded transition-colors"
                                  title="Delete"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                            <p className={`text-sm mt-1 ${!notification.read ? 'text-white/70' : 'text-white/50'}`}>
                              {notification.message}
                            </p>
                            <div className="flex items-center mt-2 text-xs text-white/40">
                              <Clock className="w-3 h-3 mr-1" />
                              {notification.time}
                            </div>
                          </div>
                        </div>
                        
                        {!notification.read && (
                          <div className="absolute top-3 right-3 w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-white/10">
                <button className="w-full text-center text-sm text-blue-400 hover:text-blue-300 transition-colors">
                  View all notifications
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NotificationsDropdown;
