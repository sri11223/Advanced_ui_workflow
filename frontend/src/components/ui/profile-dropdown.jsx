import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { 
  User, Settings, LogOut, Crown, Shield, Palette, 
  Moon, Sun, Globe, HelpCircle, ChevronRight, Star
} from 'lucide-react';
import useAuthStore from '../../store/authStore';

const ProfileDropdown = ({ isOpen, onClose, onToggle }) => {
  const dropdownRef = useRef(null);
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('dark');

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

  const handleLogout = async () => {
    await logout();
    navigate('/');
    onClose();
  };

  const menuItems = [
    {
      icon: User,
      label: 'Profile',
      description: 'Manage your account',
      action: () => navigate('/profile'),
      color: 'text-blue-400'
    },
    {
      icon: Settings,
      label: 'Settings',
      description: 'Preferences & privacy',
      action: () => navigate('/settings'),
      color: 'text-gray-400'
    },
    {
      icon: Crown,
      label: 'Upgrade to Pro',
      description: 'Unlock premium features',
      action: () => navigate('/pricing'),
      color: 'text-yellow-400',
      badge: 'Pro'
    },
    {
      icon: Palette,
      label: 'Appearance',
      description: 'Theme & display',
      action: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
      color: 'text-purple-400'
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      description: 'Get help and contact us',
      action: () => navigate('/help'),
      color: 'text-green-400'
    }
  ];

  return (
    <div className="relative">
      {/* Profile Avatar */}
      <button
        onClick={onToggle}
        className="flex items-center space-x-2 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-medium text-sm">
          {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
        </div>
        <span className="hidden md:block text-sm font-medium">
          {user?.name || 'User'}
        </span>
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            ref={dropdownRef}
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className="absolute right-0 mt-2 w-72 bg-gray-900 border border-white/20 rounded-2xl shadow-2xl backdrop-blur-sm z-50"
          >
            {/* Header */}
            <div className="p-4 border-b border-white/10">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                  {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-lg font-semibold text-white truncate">
                    {user?.name || 'User Name'}
                  </h3>
                  <p className="text-sm text-white/60 truncate">
                    {user?.email || 'user@example.com'}
                  </p>
                  <div className="flex items-center mt-1">
                    <div className="flex items-center space-x-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-xs text-yellow-400 font-medium">Free Plan</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="p-2">
              {menuItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <motion.button
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onClick={() => {
                      item.action();
                      onClose();
                    }}
                    className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-white/5 transition-all duration-200 group"
                  >
                    <div className={`w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white group-hover:text-blue-400 transition-colors">
                          {item.label}
                        </span>
                        {item.badge && (
                          <span className="px-2 py-1 bg-yellow-400/20 text-yellow-400 text-xs rounded-full font-medium">
                            {item.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50 mt-0.5">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-white/60 transition-colors" />
                  </motion.button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-2 border-t border-white/10">
              <button
                onClick={handleLogout}
                className="w-full flex items-center space-x-3 p-3 rounded-xl hover:bg-red-500/10 transition-all duration-200 group"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                  <LogOut className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <span className="text-sm font-medium text-white group-hover:text-red-400 transition-colors">
                    Sign Out
                  </span>
                  <p className="text-xs text-white/50 mt-0.5">
                    Sign out of your account
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;
